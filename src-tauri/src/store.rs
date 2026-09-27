use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::error::{AppError, AppResult, ErrorCode};
use crate::model::{Installed, RepoList};
use crate::paths::{read_json, write_json, Paths};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledRecord {
    #[serde(flatten)]
    pub info: Installed,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub shortcut: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub package: Option<String>,
}

static LOCK: Mutex<()> = Mutex::new(());

pub fn load_installed(paths: &Paths) -> Vec<InstalledRecord> {
    read_json(&paths.installed_file()).unwrap_or_default()
}

pub fn find_installed(paths: &Paths, full_name: &str) -> Option<InstalledRecord> {
    load_installed(paths)
        .into_iter()
        .find(|r| r.info.full_name.eq_ignore_ascii_case(full_name))
}

pub fn upsert_installed(paths: &Paths, record: InstalledRecord) -> AppResult<()> {
    let _g = LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let mut all = load_installed(paths);
    all.retain(|r| !r.info.full_name.eq_ignore_ascii_case(&record.info.full_name));
    all.push(record);
    all.sort_by_key(|r| r.info.full_name.to_lowercase());
    write_json(&paths.installed_file(), &all)
}

pub fn remove_installed(paths: &Paths, full_name: &str) -> AppResult<()> {
    let _g = LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let mut all = load_installed(paths);
    all.retain(|r| !r.info.full_name.eq_ignore_ascii_case(full_name));
    write_json(&paths.installed_file(), &all)
}

pub fn load_tags(paths: &Paths) -> BTreeMap<String, Vec<String>> {
    read_json(&paths.tags_file()).unwrap_or_default()
}

pub fn set_tags(paths: &Paths, full_name: &str, tags: Vec<String>) -> AppResult<()> {
    let _g = LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let mut all = load_tags(paths);
    let mut clean: Vec<String> = Vec::new();
    for t in tags.into_iter().map(|t| t.trim().to_string()).filter(|t| !t.is_empty()) {
        if !clean.iter().any(|c| c.eq_ignore_ascii_case(&t)) {
            clean.push(t);
        }
    }
    let key = all
        .keys()
        .find(|k| k.eq_ignore_ascii_case(full_name))
        .cloned()
        .unwrap_or_else(|| full_name.to_string());
    if clean.is_empty() {
        all.remove(&key);
    } else {
        all.insert(key, clean);
    }
    write_json(&paths.tags_file(), &all)
}

pub fn tags_for(all: &BTreeMap<String, Vec<String>>, full_name: &str) -> Vec<String> {
    all.iter()
        .find(|(k, _)| k.eq_ignore_ascii_case(full_name))
        .map(|(_, v)| v.clone())
        .unwrap_or_default()
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpCacheEntry {
    #[serde(default)]
    pub etag: Option<String>,
    #[serde(default)]
    pub last_modified: Option<String>,
    pub body: String,
    #[serde(default)]
    pub next: Option<String>,
}

impl HttpCacheEntry {
    pub fn new(etag: Option<String>, last_modified: Option<String>, body: String, next: Option<String>) -> Option<Self> {
        let clean = |v: Option<String>| v.map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
        let etag = clean(etag);
        let last_modified = clean(last_modified);
        if etag.is_none() && last_modified.is_none() {
            return None;
        }
        Some(Self {
            etag,
            last_modified,
            body,
            next,
        })
    }

    pub fn validators(&self) -> Vec<(&'static str, &str)> {
        let mut out = Vec::new();
        if let Some(e) = &self.etag {
            out.push(("If-None-Match", e.as_str()));
        }
        if let Some(l) = &self.last_modified {
            out.push(("If-Modified-Since", l.as_str()));
        }
        out
    }
}

pub fn http_cache_file(dir: &Path, url: &str, accept: &str, authed: bool) -> PathBuf {
    let mut h = Sha256::new();
    h.update(url.as_bytes());
    h.update(b"|");
    h.update(accept.as_bytes());
    h.update(b"|");
    h.update(if authed { b"t" } else { b"a" });
    let digest = h.finalize();
    let name: String = digest.iter().take(12).map(|b| format!("{b:02x}")).collect();
    dir.join(format!("{name}.json"))
}

pub fn load_http(file: &Path) -> Option<HttpCacheEntry> {
    read_json::<HttpCacheEntry>(file).filter(|e| e.etag.is_some() || e.last_modified.is_some())
}

pub fn save_http(file: &Path, entry: &HttpCacheEntry) -> AppResult<()> {
    write_json(file, entry)
}

pub const MEMO_TTL_SECS: i64 = 6 * 60 * 60;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoMemo<T> {
    pub pushed_at: String,
    pub saved_at: i64,
    pub data: T,
}

impl<T> RepoMemo<T> {
    pub fn usable(&self, pushed_at: Option<&str>, now: i64) -> bool {
        let age = now - self.saved_at;
        pushed_at.is_some_and(|p| !p.is_empty() && p == self.pushed_at) && (0..MEMO_TTL_SECS).contains(&age)
    }
}

pub fn memo_file(dir: &Path, full_name: &str, authed: bool) -> PathBuf {
    let mut h = Sha256::new();
    h.update(b"memo|");
    h.update(full_name.to_lowercase().as_bytes());
    h.update(if authed { b"|t" } else { b"|a" });
    let digest = h.finalize();
    let name: String = digest.iter().take(12).map(|b| format!("{b:02x}")).collect();
    dir.join(format!("surum-{name}.json"))
}

pub fn load_memo<T: serde::de::DeserializeOwned>(file: &Path) -> Option<RepoMemo<T>> {
    read_json(file)
}

pub fn save_memo<T: Serialize>(file: &Path, memo: &RepoMemo<T>) -> AppResult<()> {
    write_json(file, memo)
}

pub const RATE_BUFFER: u64 = 5;
pub const LIST_FRESH_SECS: i64 = 10 * 60;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RateSnapshot {
    pub remaining: u64,
    pub reset: i64,
    pub saved_at: i64,
}

impl RateSnapshot {
    pub fn live(&self, now: i64) -> bool {
        self.reset > now
    }

    pub fn reset_iso(&self) -> Option<String> {
        chrono::DateTime::from_timestamp(self.reset, 0)
            .map(|d| d.to_rfc3339_opts(chrono::SecondsFormat::Secs, true))
    }

    pub fn from_iso(remaining: u64, reset_at: Option<&str>, now: i64) -> Option<Self> {
        let reset = chrono::DateTime::parse_from_rfc3339(reset_at?).ok()?.timestamp();
        Some(Self {
            remaining,
            reset,
            saved_at: now,
        })
    }
}

pub fn rate_file(dir: &Path, authed: bool) -> PathBuf {
    dir.join(if authed { "sinir-t.json" } else { "sinir-a.json" })
}

pub fn load_rate(file: &Path, now: i64) -> Option<RateSnapshot> {
    read_json::<RateSnapshot>(file).filter(|s| s.live(now))
}

pub fn save_rate(file: &Path, snap: &RateSnapshot) -> AppResult<()> {
    write_json(file, snap)
}

pub fn budget_allows(remaining: u64, cost: u64) -> bool {
    remaining >= RATE_BUFFER && remaining - RATE_BUFFER >= cost
}

pub fn list_is_fresh(fetched_at: &str, now: i64) -> bool {
    chrono::DateTime::parse_from_rfc3339(fetched_at)
        .map(|d| (0..LIST_FRESH_SECS).contains(&(now - d.timestamp())))
        .unwrap_or(false)
}

pub fn refresh_cost(cached: Option<&RepoList>, dir: &Path, authed: bool, now: i64) -> u64 {
    let login = u64::from(authed && cfg!(feature = "pro"));
    let Some(list) = cached else {
        return 1 + login;
    };
    let pages = (list.repos.len() as u64).div_ceil(100).max(1);
    let per_repo = if authed { 2 } else { 1 };
    let stale = list
        .repos
        .iter()
        .filter(|r| {
            let memo = load_memo::<serde::de::IgnoredAny>(&memo_file(dir, &r.full_name, authed));
            !memo.is_some_and(|m| (0..MEMO_TTL_SECS).contains(&(now - m.saved_at)))
        })
        .count() as u64;
    login + pages + stale * per_repo
}

pub fn budget_skip(mut list: RepoList, snap: &RateSnapshot) -> RepoList {
    list.from_cache = true;
    list.budget_skipped = true;
    list.rate_remaining = Some(snap.remaining);
    list.rate_reset_at = snap.reset_iso();
    list
}

pub fn list_fallback(err: AppError, cached: Option<RepoList>, rate_reset_at: Option<String>) -> AppResult<RepoList> {
    if !matches!(err.code, ErrorCode::RateLimit | ErrorCode::Network) {
        return Err(err);
    }
    let Some(mut list) = cached else {
        return Err(err);
    };
    list.from_cache = true;
    list.rate_remaining = Some(0);
    if rate_reset_at.is_some() {
        list.rate_reset_at = rate_reset_at;
    }
    if list.rate_reset_at.is_none() {
        list.rate_reset_at = Some(
            (chrono::Utc::now() + chrono::Duration::hours(1)).to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
        );
    }
    Ok(list)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp_dir(tag: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("tkb-store-{tag}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        d
    }

    fn sample_list() -> RepoList {
        RepoList {
            account: "Teknesyum".into(),
            fetched_at: "2026-09-27T00:00:00Z".into(),
            from_cache: false,
            rate_remaining: Some(42),
            rate_reset_at: Some("2026-09-27T01:00:00Z".into()),
            budget_skipped: false,
            repos: Vec::new(),
        }
    }

    #[test]
    fn budget_rules() {
        assert!(!budget_allows(4, 0));
        assert!(!budget_allows(5, 1));
        assert!(budget_allows(6, 1));
        assert!(budget_allows(23, 18));
        assert!(!budget_allows(22, 18));
        assert!(budget_allows(5000, 40));
    }

    #[test]
    fn list_freshness() {
        let t = chrono::DateTime::parse_from_rfc3339("2026-09-27T03:00:00Z").unwrap().timestamp();
        assert!(list_is_fresh("2026-09-27T03:00:00Z", t));
        assert!(list_is_fresh("2026-09-27T03:00:00Z", t + LIST_FRESH_SECS - 1));
        assert!(!list_is_fresh("2026-09-27T03:00:00Z", t + LIST_FRESH_SECS));
        assert!(!list_is_fresh("2026-09-27T03:00:00Z", t - 5));
        assert!(!list_is_fresh("bozuk", t));
    }

    #[test]
    fn rate_snapshot_roundtrip_and_expiry() {
        let dir = tmp_dir("rate");
        let f = rate_file(&dir, false);
        assert_ne!(f, rate_file(&dir, true));
        let s = RateSnapshot::from_iso(12, Some("2026-09-27T04:21:31Z"), 100).unwrap();
        assert_eq!(s.reset_iso().as_deref(), Some("2026-09-27T04:21:31Z"));
        save_rate(&f, &s).unwrap();
        assert_eq!(load_rate(&f, s.reset - 1), Some(s));
        assert_eq!(load_rate(&f, s.reset), None);
        assert!(RateSnapshot::from_iso(1, None, 0).is_none());
        let l = budget_skip(sample_list(), &s);
        assert!(l.from_cache && l.budget_skipped);
        assert_eq!(l.rate_remaining, Some(12));
        assert_eq!(l.rate_reset_at.as_deref(), Some("2026-09-27T04:21:31Z"));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn refresh_cost_counts_stale_memos() {
        let dir = tmp_dir("cost");
        let login = u64::from(cfg!(feature = "pro"));
        assert_eq!(refresh_cost(None, &dir, false, 0), 1);
        let mut list = sample_list();
        let repo: crate::model::Repo = serde_json::from_value(serde_json::json!({
            "owner": "Teknesyum", "name": "A", "fullName": "Teknesyum/A", "description": "",
            "private": false, "archived": false, "fork": false, "stars": 0, "forks": 0, "openIssues": 0,
            "language": null, "topics": [], "license": null, "homepage": null, "htmlUrl": "",
            "pushedAt": "", "updatedAt": "", "sizeKb": 0, "latestTag": null, "latestPublishedAt": null,
            "hasWindowsAsset": false, "manifest": null, "category": "", "installState": "not-installed",
            "installedTag": null, "localTags": []
        }))
        .unwrap();
        let mut b = repo.clone();
        b.full_name = "Teknesyum/B".into();
        list.repos = vec![repo, b];
        assert_eq!(refresh_cost(Some(&list), &dir, false, 1_000), 3);
        assert_eq!(refresh_cost(Some(&list), &dir, true, 1_000), 5 + login);
        let memo = RepoMemo {
            pushed_at: "p".into(),
            saved_at: 900,
            data: 0u8,
        };
        save_memo(&memo_file(&dir, "Teknesyum/A", false), &memo).unwrap();
        assert_eq!(refresh_cost(Some(&list), &dir, false, 1_000), 2);
        assert_eq!(refresh_cost(Some(&list), &dir, false, 900 + MEMO_TTL_SECS), 3);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn memo_rules() {
        let m = RepoMemo {
            pushed_at: "2026-09-20T10:00:00Z".to_string(),
            saved_at: 1_000_000,
            data: 7u8,
        };
        assert!(m.usable(Some("2026-09-20T10:00:00Z"), 1_000_000));
        assert!(m.usable(Some("2026-09-20T10:00:00Z"), 1_000_000 + MEMO_TTL_SECS - 1));
        assert!(!m.usable(Some("2026-09-20T10:00:00Z"), 1_000_000 + MEMO_TTL_SECS));
        assert!(!m.usable(Some("2026-09-21T10:00:00Z"), 1_000_100));
        assert!(!m.usable(None, 1_000_100));
        assert!(!m.usable(Some("2026-09-20T10:00:00Z"), 999_000));
    }

    #[test]
    fn memo_roundtrip_and_keys() {
        let dir = tmp_dir("memo");
        let f = memo_file(&dir, "Teknesyum/Base", false);
        assert_eq!(f, memo_file(&dir, "teknesyum/base", false));
        assert_ne!(f, memo_file(&dir, "Teknesyum/Base", true));
        assert!(load_memo::<Vec<String>>(&f).is_none());
        let m = RepoMemo {
            pushed_at: "p".into(),
            saved_at: 5,
            data: vec!["a".to_string()],
        };
        save_memo(&f, &m).unwrap();
        let back = load_memo::<Vec<String>>(&f).unwrap();
        assert_eq!((back.pushed_at.as_str(), back.saved_at, back.data), ("p", 5, vec!["a".to_string()]));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn entry_needs_a_validator() {
        assert!(HttpCacheEntry::new(None, None, "x".into(), None).is_none());
        assert!(HttpCacheEntry::new(Some("  ".into()), None, "x".into(), None).is_none());
        let e = HttpCacheEntry::new(None, Some("Sat, 26 Sep 2026 10:00:00 GMT".into()), "x".into(), None).unwrap();
        assert_eq!(e.validators(), vec![("If-Modified-Since", "Sat, 26 Sep 2026 10:00:00 GMT")]);
        let e = HttpCacheEntry::new(Some("W/\"abc\"".into()), Some("L".into()), "x".into(), None).unwrap();
        assert_eq!(e.validators(), vec![("If-None-Match", "W/\"abc\""), ("If-Modified-Since", "L")]);
    }

    #[test]
    fn http_cache_roundtrip_and_keys() {
        let dir = tmp_dir("rt");
        let f = http_cache_file(&dir, "https://api.github.com/x", "application/json", false);
        assert_ne!(f, http_cache_file(&dir, "https://api.github.com/x", "application/json", true));
        assert_ne!(f, http_cache_file(&dir, "https://api.github.com/x", "text/plain", false));
        assert_ne!(f, http_cache_file(&dir, "https://api.github.com/y", "application/json", false));
        assert!(load_http(&f).is_none());
        let e = HttpCacheEntry::new(Some("\"e1\"".into()), None, "[1,2]".into(), Some("https://n".into())).unwrap();
        save_http(&f, &e).unwrap();
        assert_eq!(load_http(&f), Some(e));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn reads_legacy_cache_entry() {
        let dir = tmp_dir("legacy");
        std::fs::create_dir_all(&dir).unwrap();
        let f = dir.join("old.json");
        std::fs::write(&f, r#"{"etag":"\"old\"","body":"[]","next":null}"#).unwrap();
        let e = load_http(&f).unwrap();
        assert_eq!(e.etag.as_deref(), Some("\"old\""));
        assert_eq!(e.body, "[]");
        std::fs::write(&f, r#"{"body":"[]"}"#).unwrap();
        assert!(load_http(&f).is_none());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn fallback_serves_cached_list_on_rate_limit() {
        let err = AppError::new(ErrorCode::RateLimit, "doldu");
        let l = list_fallback(err, Some(sample_list()), Some("2026-09-27T02:40:44Z".into())).unwrap();
        assert!(l.from_cache);
        assert_eq!(l.rate_remaining, Some(0));
        assert_eq!(l.rate_reset_at.as_deref(), Some("2026-09-27T02:40:44Z"));
    }

    #[test]
    fn fallback_serves_cached_list_on_network_error() {
        let err = AppError::new(ErrorCode::Network, "yok");
        let l = list_fallback(err, Some(sample_list()), None).unwrap();
        assert!(l.from_cache);
        assert_eq!(l.rate_remaining, Some(0));
        assert_eq!(l.rate_reset_at.as_deref(), Some("2026-09-27T01:00:00Z"));
        let mut bare = sample_list();
        bare.rate_reset_at = None;
        let l = list_fallback(AppError::new(ErrorCode::Network, "yok"), Some(bare), None).unwrap();
        assert!(l.rate_reset_at.is_some());
    }

    #[test]
    fn fallback_keeps_error_without_cache_or_for_other_codes() {
        let e = list_fallback(AppError::new(ErrorCode::RateLimit, "doldu"), None, None).unwrap_err();
        assert_eq!(e.code, ErrorCode::RateLimit);
        let e = list_fallback(AppError::new(ErrorCode::Auth, "red"), Some(sample_list()), None).unwrap_err();
        assert_eq!(e.code, ErrorCode::Auth);
        let e = list_fallback(AppError::new(ErrorCode::NotFound, "yok"), Some(sample_list()), None).unwrap_err();
        assert_eq!(e.code, ErrorCode::NotFound);
    }
}
