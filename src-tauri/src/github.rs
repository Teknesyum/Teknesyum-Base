use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use futures_util::{stream, StreamExt};
use reqwest::header::{HeaderMap, ACCEPT, AUTHORIZATION, ETAG, LAST_MODIFIED, LINK, USER_AGENT};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult, ErrorCode};
use crate::logic::{self, AssetRef};
use crate::model::{Manifest, MediaDates, Release, ReleaseAsset, Repo, RepoList};
use crate::paths::now_iso;
use crate::store::{self, HttpCacheEntry, RateSnapshot, RepoMemo};

pub const API: &str = "https://api.github.com";
pub const UA: &str = "Teknesyum-Base";
const ACCEPT_JSON: &str = "application/vnd.github+json";
const ACCEPT_HTML: &str = "application/vnd.github.html+json";
const ACCEPT_RAW: &str = "application/vnd.github.raw+json";
const CONCURRENCY: usize = 6;
const UI_OWNER: &str = "Teknesyum";
const UI_REPO: &str = "Teknesyum-UI";
const CORE_REPO: &str = "Teknesyum-Core";
const MEDIA_MAX: usize = 20 * 1024 * 1024;
pub const MANIFEST_DIR_PATH: &str = ".teknesyum/teknesyum.json";
pub const INDEX_URL: &str = "https://raw.githubusercontent.com/Teknesyum/Teknesyum-Base/katalog/index.json";
const INDEX_MAX_AGE: i64 = 6 * 3600;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogIndex {
    pub generated_at: String,
    #[serde(default)]
    pub ui_latest: Option<String>,
    #[serde(default)]
    pub core_latest: Option<String>,
    #[serde(default)]
    pub repos: Vec<IndexEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexEntry {
    pub full_name: String,
    pub pushed_at: String,
    #[serde(default)]
    release: Option<GhRelease>,
    #[serde(default)]
    manifest: Option<Manifest>,
    #[serde(default)]
    ui: Option<String>,
    #[serde(default)]
    media: Option<MediaDates>,
}

impl CatalogIndex {
    pub fn is_fresh(&self, now: i64) -> bool {
        chrono::DateTime::parse_from_rfc3339(&self.generated_at)
            .is_ok_and(|t| (0..INDEX_MAX_AGE).contains(&(now - t.timestamp())))
    }

    fn entry_for(&self, gh: &GhRepo) -> Option<&IndexEntry> {
        let pushed = gh.pushed_at.as_deref().filter(|p| !p.is_empty())?;
        self.repos
            .iter()
            .find(|e| e.full_name.eq_ignore_ascii_case(&gh.full_name) && e.pushed_at == pushed)
    }
}

#[derive(Debug, Clone, Default)]
pub struct RateInfo {
    pub remaining: Option<u64>,
    pub reset_at: Option<String>,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct CallStats {
    pub fresh: u64,
    pub not_modified: u64,
}

#[derive(Default)]
struct Counters {
    fresh: AtomicU64,
    not_modified: AtomicU64,
}

#[derive(Clone)]
pub struct GitHub {
    http: reqwest::Client,
    cache_dir: PathBuf,
    token: Option<String>,
    rate: Arc<Mutex<RateInfo>>,
    counters: Arc<Counters>,
    use_index: bool,
    #[cfg(test)]
    trace: Arc<Mutex<Vec<String>>>,
}

struct Resp {
    status: u16,
    body: String,
    next: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GhOwner {
    pub login: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GhLicense {
    pub spdx_id: Option<String>,
    pub name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GhRepo {
    pub name: String,
    pub full_name: String,
    pub owner: GhOwner,
    pub description: Option<String>,
    #[serde(default)]
    pub private: bool,
    #[serde(default)]
    pub archived: bool,
    #[serde(default)]
    pub fork: bool,
    #[serde(default)]
    pub stargazers_count: u64,
    #[serde(default)]
    pub forks_count: u64,
    #[serde(default)]
    pub open_issues_count: u64,
    pub language: Option<String>,
    #[serde(default)]
    pub topics: Vec<String>,
    pub license: Option<GhLicense>,
    pub homepage: Option<String>,
    pub html_url: String,
    pub pushed_at: Option<String>,
    pub updated_at: Option<String>,
    #[serde(default)]
    pub size: u64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GhAsset {
    pub id: u64,
    pub name: String,
    #[serde(default)]
    pub size: u64,
    pub browser_download_url: String,
    pub url: String,
    #[serde(default)]
    pub download_count: u64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GhRelease {
    pub tag_name: String,
    pub name: Option<String>,
    pub published_at: Option<String>,
    #[serde(default)]
    pub body_html: Option<String>,
    #[serde(default)]
    pub prerelease: bool,
    #[serde(default)]
    pub draft: bool,
    #[serde(default)]
    pub assets: Vec<GhAsset>,
}

impl GhRelease {
    pub fn asset_refs(&self) -> Vec<AssetRef> {
        self.assets
            .iter()
            .map(|a| AssetRef {
                name: a.name.clone(),
                size: a.size,
            })
            .collect()
    }

    pub fn to_release(&self) -> Release {
        Release {
            tag: self.tag_name.clone(),
            name: self
                .name
                .clone()
                .filter(|n| !n.trim().is_empty())
                .unwrap_or_else(|| self.tag_name.clone()),
            published_at: self.published_at.clone().unwrap_or_default(),
            notes_html: self.body_html.clone().unwrap_or_default(),
            prerelease: self.prerelease,
            assets: self
                .assets
                .iter()
                .map(|a| ReleaseAsset {
                    name: a.name.clone(),
                    size: a.size,
                    url: a.browser_download_url.clone(),
                    downloads: a.download_count,
                })
                .collect(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MemoData {
    release: Option<GhRelease>,
    manifest: Option<Manifest>,
    #[serde(default)]
    ui_checked: bool,
    #[serde(default)]
    ui: Option<String>,
    #[serde(default)]
    media_checked: bool,
    #[serde(default)]
    media: Option<MediaDates>,
}

#[derive(Debug, Clone)]
pub struct RepoDetails {
    pub gh: GhRepo,
    pub release: Option<GhRelease>,
    pub manifest: Option<Manifest>,
    pub ui: Option<String>,
    pub media: Option<MediaDates>,
}

pub fn build_http() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent(UA)
        .connect_timeout(Duration::from_secs(15))
        .build()
        .expect("http client")
}

fn header_u64(h: &HeaderMap, name: &str) -> Option<u64> {
    h.get(name)?.to_str().ok()?.trim().parse().ok()
}

fn reset_iso(epoch: u64) -> Option<String> {
    chrono::DateTime::from_timestamp(epoch as i64, 0)
        .map(|d| d.to_rfc3339_opts(chrono::SecondsFormat::Secs, true))
}

fn reset_local(epoch: u64) -> String {
    chrono::DateTime::from_timestamp(epoch as i64, 0)
        .map(|d| d.with_timezone(&chrono::Local).format("%H:%M").to_string())
        .unwrap_or_else(|| "bilinmiyor".into())
}

fn header_str(h: &HeaderMap, name: reqwest::header::HeaderName) -> Option<String> {
    h.get(name)?.to_str().ok().map(str::to_string)
}

fn is_rate_limited(status: StatusCode, remaining: Option<u64>, retry_after: Option<u64>) -> bool {
    status == StatusCode::TOO_MANY_REQUESTS
        || (status == StatusCode::FORBIDDEN && (remaining == Some(0) || retry_after.is_some()))
}

fn parse_next(h: &HeaderMap) -> Option<String> {
    let link = h.get(LINK)?.to_str().ok()?;
    link.split(',').find_map(|part| {
        let (url, rel) = part.split_once(';')?;
        rel.contains("rel=\"next\"")
            .then(|| url.trim().trim_start_matches('<').trim_end_matches('>').to_string())
    })
}

pub fn parse_ui_version(text: &str) -> Option<String> {
    let v: serde_json::Value = serde_json::from_str(text.trim_start_matches('\u{feff}')).ok()?;
    let pick = |x: &serde_json::Value| x.as_str().map(str::trim).filter(|s| !s.is_empty()).map(str::to_string);
    v.get("plugin").and_then(pick).or_else(|| v.get("uc").and_then(|u| u.get("surum")).and_then(pick))
}

pub fn parse_manifest(text: &str) -> Option<Manifest> {
    serde_json::from_str::<Manifest>(text.trim_start_matches('\u{feff}')).ok()
}

impl GitHub {
    pub fn new(http: reqwest::Client, cache_dir: PathBuf, token: Option<String>) -> Self {
        Self {
            http,
            cache_dir,
            token,
            rate: Arc::new(Mutex::new(RateInfo::default())),
            counters: Arc::new(Counters::default()),
            use_index: true,
            #[cfg(test)]
            trace: Arc::new(Mutex::new(Vec::new())),
        }
    }

    #[cfg_attr(not(test), allow(dead_code))]
    pub fn stats(&self) -> CallStats {
        CallStats {
            fresh: self.counters.fresh.load(Ordering::Relaxed),
            not_modified: self.counters.not_modified.load(Ordering::Relaxed),
        }
    }

    pub fn without_index(mut self) -> Self {
        self.use_index = false;
        self
    }

    pub async fn catalog_index(&self) -> Option<CatalogIndex> {
        if !self.use_index {
            return None;
        }
        let r = self.get(INDEX_URL, "application/json").await.ok()?;
        if r.status != 200 {
            return None;
        }
        serde_json::from_str(&r.body).ok()
    }

    pub async fn build_index(&self, account: &str) -> AppResult<CatalogIndex> {
        let details = self.repo_details(account).await?;
        let repos = details
            .into_iter()
            .filter(|d| !d.gh.private)
            .filter_map(|d| {
                Some(IndexEntry {
                    full_name: d.gh.full_name.clone(),
                    pushed_at: d.gh.pushed_at.clone().filter(|p| !p.is_empty())?,
                    release: d.release,
                    manifest: d.manifest,
                    ui: d.ui,
                    media: d.media,
                })
            })
            .collect();
        Ok(CatalogIndex {
            generated_at: now_iso(),
            ui_latest: self.ui_latest().await,
            core_latest: self.core_latest().await,
            repos,
        })
    }

    pub fn has_token(&self) -> bool {
        self.token.is_some()
    }

    pub fn token(&self) -> Option<&str> {
        self.token.as_deref()
    }

    pub fn rate(&self) -> RateInfo {
        self.rate.lock().map(|r| r.clone()).unwrap_or_default()
    }

    fn mark_limited(&self, reset_epoch: Option<u64>, retry_after: Option<u64>) {
        if let Ok(mut r) = self.rate.lock() {
            r.remaining = Some(0);
            let reset = reset_epoch.and_then(reset_iso).or_else(|| {
                let secs = retry_after.unwrap_or(60) as i64;
                Some(
                    (chrono::Utc::now() + chrono::Duration::seconds(secs))
                        .to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
                )
            });
            if reset.is_some() {
                r.reset_at = reset;
            }
        }
    }

    fn record_rate(&self, h: &HeaderMap) {
        let remaining = header_u64(h, "x-ratelimit-remaining");
        let reset = header_u64(h, "x-ratelimit-reset");
        if remaining.is_none() && reset.is_none() {
            return;
        }
        if let Ok(mut r) = self.rate.lock() {
            let new_reset = reset.and_then(reset_iso);
            let same_window = new_reset.is_none() || new_reset == r.reset_at;
            if let Some(rem) = remaining {
                r.remaining = Some(match (same_window, r.remaining) {
                    (true, Some(old)) => old.min(rem),
                    _ => rem,
                });
            }
            if new_reset.is_some() {
                r.reset_at = new_reset;
            }
        }
    }

    pub async fn core_budget(&self) -> Option<RateSnapshot> {
        let mut req = self
            .http
            .get(format!("{API}/rate_limit"))
            .header(USER_AGENT, UA)
            .header(ACCEPT, ACCEPT_JSON)
            .header("X-GitHub-Api-Version", "2022-11-28")
            .timeout(Duration::from_secs(15));
        if let Some(token) = &self.token {
            req = req.header(AUTHORIZATION, format!("Bearer {token}"));
        }
        let resp = req.send().await.ok()?;
        if !resp.status().is_success() {
            return None;
        }
        let v: serde_json::Value = resp.json().await.ok()?;
        let core = &v["resources"]["core"];
        let snap = RateSnapshot {
            remaining: core["remaining"].as_u64()?,
            reset: core["reset"].as_i64()?,
            saved_at: chrono::Utc::now().timestamp(),
        };
        if let Ok(mut r) = self.rate.lock() {
            r.remaining = Some(snap.remaining);
            r.reset_at = snap.reset_iso();
        }
        Some(snap)
    }

    async fn get_recent(&self, url: &str, accept: &str) -> AppResult<Resp> {
        let file = store::http_cache_file(&self.cache_dir, url, accept, self.token.is_some());
        let secs = if self.token.is_some() { 30 * 60 } else { 6 * 60 * 60 };
        let recent = std::fs::metadata(&file)
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| t.elapsed().ok())
            .is_some_and(|age| age.as_secs() < secs);
        if recent {
            if let Some(c) = store::load_http(&file) {
                return Ok(Resp { status: 200, body: c.body, next: c.next });
            }
        }
        self.get(url, accept).await
    }

    async fn get(&self, url: &str, accept: &str) -> AppResult<Resp> {
        let is_github = url.starts_with(API) || url.starts_with("https://raw.githubusercontent.com/");
        let cache_file = store::http_cache_file(&self.cache_dir, url, accept, self.token.is_some());
        let cached = store::load_http(&cache_file);
        let mut req = self
            .http
            .get(url)
            .header(USER_AGENT, UA)
            .header(ACCEPT, accept)
            .timeout(Duration::from_secs(30));
        if url.starts_with(API) {
            req = req.header("X-GitHub-Api-Version", "2022-11-28");
        }
        if let (Some(token), true) = (&self.token, is_github) {
            req = req.header(AUTHORIZATION, format!("Bearer {token}"));
        }
        if let Some(c) = &cached {
            for (name, value) in c.validators() {
                req = req.header(name, value);
            }
        }
        let resp = req.send().await?;
        let status = resp.status();
        let headers = resp.headers().clone();
        if url.starts_with(API) {
            self.record_rate(&headers);
        }
        #[cfg(test)]
        if let Ok(mut t) = self.trace.lock() {
            t.push(format!(
                "{} {} remaining={:?} used={:?}",
                status.as_u16(),
                url,
                header_u64(&headers, "x-ratelimit-remaining"),
                header_u64(&headers, "x-ratelimit-used")
            ));
        }
        if status == StatusCode::NOT_MODIFIED {
            if let Some(c) = cached {
                self.counters.not_modified.fetch_add(1, Ordering::Relaxed);
                let _ = store::save_http(&cache_file, &c);
                return Ok(Resp {
                    status: 200,
                    body: c.body,
                    next: c.next.or_else(|| parse_next(&headers)),
                });
            }
        }
        if status == StatusCode::NOT_FOUND {
            return Ok(Resp {
                status: 404,
                body: String::new(),
                next: None,
            });
        }
        if status == StatusCode::UNAUTHORIZED {
            return Err(AppError::new(
                ErrorCode::Auth,
                "GitHub token geçersiz ya da süresi dolmuş. Ayarlardan yenileyin.",
            ));
        }
        if status == StatusCode::FORBIDDEN || status == StatusCode::TOO_MANY_REQUESTS {
            let remaining = header_u64(&headers, "x-ratelimit-remaining");
            let retry_after = header_u64(&headers, "retry-after");
            if is_rate_limited(status, remaining, retry_after) {
                let reset_epoch = header_u64(&headers, "x-ratelimit-reset");
                if url.starts_with(API) {
                    self.mark_limited(reset_epoch, retry_after);
                }
                let when = reset_epoch
                    .map(reset_local)
                    .unwrap_or_else(|| {
                        let secs = retry_after.unwrap_or(60);
                        (chrono::Local::now() + chrono::Duration::seconds(secs as i64))
                            .format("%H:%M")
                            .to_string()
                    });
                let hint = if self.token.is_some() {
                    ""
                } else {
                    " Token eklerseniz sınır saatte 5000 isteğe çıkar."
                };
                return Err(AppError::new(
                    ErrorCode::RateLimit,
                    format!("GitHub istek sınırı doldu. Sınır {when} saatinde sıfırlanır.{hint}"),
                ));
            }
            return Err(AppError::new(
                ErrorCode::Auth,
                "GitHub erişimi reddetti. Token izinlerini denetleyin.",
            ));
        }
        if !status.is_success() {
            return Err(AppError::new(
                ErrorCode::Network,
                format!("GitHub beklenmeyen yanıt verdi: HTTP {}", status.as_u16()),
            ));
        }
        self.counters.fresh.fetch_add(1, Ordering::Relaxed);
        let etag = header_str(&headers, ETAG);
        let last_modified = header_str(&headers, LAST_MODIFIED);
        let next = parse_next(&headers);
        let body = resp.text().await?;
        if let Some(entry) = HttpCacheEntry::new(etag, last_modified, body.clone(), next.clone()) {
            let _ = store::save_http(&cache_file, &entry);
        }
        Ok(Resp {
            status: status.as_u16(),
            body,
            next,
        })
    }

    async fn get_paged<T: serde::de::DeserializeOwned>(&self, first: String) -> AppResult<Vec<T>> {
        let mut out = Vec::new();
        let mut url = Some(first);
        let mut guard = 0;
        while let Some(u) = url.take() {
            let r = self.get(&u, ACCEPT_JSON).await?;
            if r.status == 404 {
                return Err(AppError::new(
                    ErrorCode::NotFound,
                    "Bu GitHub hesabı bulunamadı.",
                ));
            }
            let mut page: Vec<T> = serde_json::from_str(&r.body)?;
            out.append(&mut page);
            guard += 1;
            if guard < 50 {
                url = r.next;
            }
        }
        Ok(out)
    }

    pub async fn token_login(&self) -> Option<String> {
        self.token.as_ref()?;
        let r = self.get(&format!("{API}/user"), ACCEPT_JSON).await.ok()?;
        if r.status != 200 {
            return None;
        }
        serde_json::from_str::<GhOwner>(&r.body).ok().map(|o| o.login)
    }

    pub async fn list_account_repos(&self, account: &str) -> AppResult<Vec<GhRepo>> {
        let use_private = cfg!(feature = "pro")
            && self
                .token_login()
                .await
                .is_some_and(|login| login.eq_ignore_ascii_case(account));
        let first = if use_private {
            format!("{API}/user/repos?affiliation=owner&visibility=all&per_page=100")
        } else {
            format!("{API}/users/{account}/repos?per_page=100&type=owner")
        };
        let mut repos: Vec<GhRepo> = self.get_paged(first).await?;
        if cfg!(feature = "pro") {
            repos.retain(|r| !r.name.eq_ignore_ascii_case(crate::detect::OWN_REPO));
        } else {
            repos.retain(|r| !r.private);
        }
        Ok(repos)
    }

    pub async fn latest_release(&self, owner: &str, name: &str) -> AppResult<Option<GhRelease>> {
        let (so, sn) = logic::source_of(owner, name);
        let r = self
            .get(
                &format!("{API}/repos/{so}/{sn}/releases?per_page=10"),
                ACCEPT_JSON,
            )
            .await?;
        if r.status == 404 {
            return Ok(None);
        }
        let list: Vec<GhRelease> = serde_json::from_str(&r.body)?;
        Ok(list
            .into_iter()
            .find(|x| !x.draft && !x.prerelease)
            .map(|x| with_source_zip(owner, name, x)))
    }

    pub async fn manifest(&self, owner: &str, name: &str, private: bool) -> AppResult<Option<Manifest>> {
        for path in [MANIFEST_DIR_PATH, "teknesyum.json"] {
            if let Some(body) = self.repo_file(owner, name, private, path).await? {
                return Ok(parse_manifest(&body));
            }
        }
        Ok(None)
    }

    async fn repo_file(&self, owner: &str, name: &str, private: bool, path: &str) -> AppResult<Option<String>> {
        let r = if self.token.is_some() || private {
            self.get(&format!("{API}/repos/{owner}/{name}/contents/{path}"), ACCEPT_RAW).await?
        } else {
            self.get(&format!("https://raw.githubusercontent.com/{owner}/{name}/HEAD/{path}"), "text/plain").await?
        };
        Ok((r.status == 200).then_some(r.body))
    }

    async fn last_commit_at(&self, owner: &str, name: &str, path: &str) -> Option<String> {
        let r = self
            .get(&format!("{API}/repos/{owner}/{name}/commits?path={path}&per_page=1"), ACCEPT_JSON)
            .await
            .ok()
            .filter(|r| r.status == 200)?;
        let list: Vec<serde_json::Value> = serde_json::from_str(&r.body).ok()?;
        list.first()?.pointer("/commit/committer/date")?.as_str().map(str::to_string)
    }

    pub async fn media_dates(&self, owner: &str, name: &str, manifest: Option<&Manifest>) -> Option<MediaDates> {
        if logic::upstream_of(owner, name).is_some() {
            return None;
        }
        let icon = manifest.and_then(|m| m.icon.clone()).unwrap_or_else(|| ".teknesyum/icon.png".into());
        let shot = manifest.and_then(|m| m.screenshot.clone()).unwrap_or_else(|| ".teknesyum/shot.jpg".into());
        let (icon_at, shot_at, readme_at) = futures_util::join!(
            self.last_commit_at(owner, name, &icon),
            self.last_commit_at(owner, name, &shot),
            self.last_commit_at(owner, name, "README.md"),
        );
        Some(MediaDates { icon_at, shot_at, readme_at })
    }

    pub async fn ui_version(&self, owner: &str, name: &str, private: bool) -> AppResult<Option<String>> {
        Ok(self
            .repo_file(owner, name, private, ".claude/teknesyum-ui.json")
            .await?
            .and_then(|b| parse_ui_version(&b)))
    }

    async fn plugin_latest(&self, repo: &str, path: &str) -> Option<String> {
        let body = self.repo_file(UI_OWNER, repo, false, path).await.ok()??;
        let v: serde_json::Value = serde_json::from_str(body.trim_start_matches('\u{feff}')).ok()?;
        v.get("version")?.as_str().map(str::to_string)
    }

    pub async fn ui_latest(&self) -> Option<String> {
        self.plugin_latest(UI_REPO, "ui/.claude-plugin/plugin.json").await
    }

    pub async fn core_latest(&self) -> Option<String> {
        self.plugin_latest(CORE_REPO, "core/.claude-plugin/plugin.json").await
    }

    pub async fn media(&self, owner: &str, name: &str, private: bool, path: &str) -> AppResult<Option<Vec<u8>>> {
        let path = path.trim().trim_start_matches('/');
        if path.is_empty() || path.contains("..") || path.contains(':') || path.contains('\\') {
            return Err(AppError::io("Geçersiz görsel yolu."));
        }
        let api = self.token.is_some() || private;
        let url = if api {
            format!("{API}/repos/{owner}/{name}/contents/{path}")
        } else {
            format!("https://raw.githubusercontent.com/{owner}/{name}/HEAD/{path}")
        };
        let dir = self.cache_dir.join("media");
        let key = store::http_cache_file(&dir, &url, "media", api);
        let bin = key.with_extension("bin");
        let tag_file = key.with_extension("etag");
        let cached_tag = std::fs::read_to_string(&tag_file).ok().filter(|_| bin.exists());
        let mut req = self
            .http
            .get(&url)
            .header(USER_AGENT, UA)
            .header(ACCEPT, if api { ACCEPT_RAW } else { "*/*" })
            .timeout(Duration::from_secs(60));
        if api {
            req = req.header("X-GitHub-Api-Version", "2022-11-28");
            if let Some(token) = &self.token {
                req = req.header(AUTHORIZATION, format!("Bearer {token}"));
            }
        }
        if let Some(tag) = &cached_tag {
            req = req.header(reqwest::header::IF_NONE_MATCH, tag.as_str());
        }
        let resp = match req.send().await {
            Ok(r) => r,
            Err(e) => {
                return match std::fs::read(&bin) {
                    Ok(b) if cached_tag.is_some() => Ok(Some(b)),
                    _ => Err(e.into()),
                }
            }
        };
        if api {
            self.record_rate(resp.headers());
        }
        let status = resp.status();
        if status == StatusCode::NOT_MODIFIED && cached_tag.is_some() {
            return Ok(std::fs::read(&bin).ok());
        }
        if status == StatusCode::NOT_FOUND {
            return Ok(None);
        }
        if !status.is_success() {
            return Ok(std::fs::read(&bin).ok());
        }
        let etag = header_str(resp.headers(), ETAG);
        let bytes = resp.bytes().await?.to_vec();
        if bytes.len() > MEDIA_MAX {
            return Err(AppError::io("Görsel çok büyük."));
        }
        if std::fs::create_dir_all(&dir).is_ok() && std::fs::write(&bin, &bytes).is_ok() {
            match etag {
                Some(t) => {
                    let _ = std::fs::write(&tag_file, t);
                }
                None => {
                    let _ = std::fs::remove_file(&tag_file);
                }
            }
        }
        Ok(Some(bytes))
    }

    pub async fn repo_details(&self, account: &str) -> AppResult<Vec<RepoDetails>> {
        let repos = self.list_account_repos(account).await?;
        let now = chrono::Utc::now().timestamp();
        let index = Arc::new(self.catalog_index().await.filter(|i| i.is_fresh(now)));
        let results: Vec<AppResult<RepoDetails>> = stream::iter(repos.into_iter().map(|gh| {
            let this = self.clone();
            let index = index.clone();
            async move {
                if let Some(e) = index.as_ref().as_ref().and_then(|i| i.entry_for(&gh)) {
                    return Ok(RepoDetails {
                        release: e.release.clone(),
                        manifest: e.manifest.clone(),
                        ui: e.ui.clone(),
                        media: e.media.clone(),
                        gh,
                    });
                }
                let owner = gh.owner.login.clone();
                let memo_file = store::memo_file(&this.cache_dir, &gh.full_name, this.token.is_some());
                let now = chrono::Utc::now().timestamp();
                let upstream = logic::upstream_of(&owner, &gh.name).is_some();
                if let Some(m) = store::load_memo::<MemoData>(&memo_file).filter(|_| !upstream) {
                    if m.data.ui_checked && m.data.media_checked && m.usable(gh.pushed_at.as_deref(), now, this.token.is_some()) {
                        return Ok(RepoDetails {
                            gh,
                            release: m.data.release,
                            manifest: m.data.manifest,
                            ui: m.data.ui,
                            media: m.data.media,
                        });
                    }
                }
                let release = this.latest_release(&owner, &gh.name).await?;
                let manifest = this.manifest(&owner, &gh.name, gh.private).await?;
                let ui = this.ui_version(&owner, &gh.name, gh.private).await?;
                let media = this.media_dates(&owner, &gh.name, manifest.as_ref()).await;
                if let Some(pushed_at) = gh.pushed_at.clone().filter(|p| !p.is_empty() && !upstream) {
                    let _ = store::save_memo(
                        &memo_file,
                        &RepoMemo {
                            pushed_at,
                            saved_at: now,
                            data: MemoData {
                                release: release.clone(),
                                manifest: manifest.clone(),
                                ui_checked: true,
                                ui: ui.clone(),
                                media_checked: true,
                                media: media.clone(),
                            },
                        },
                    );
                }
                Ok(RepoDetails {
                    gh,
                    release,
                    manifest,
                    ui,
                    media,
                })
            }
        }))
        .buffered(CONCURRENCY)
        .collect()
        .await;
        results.into_iter().collect()
    }

    pub async fn releases(&self, owner: &str, name: &str) -> AppResult<Vec<Release>> {
        let (owner, name) = logic::source_of(owner, name);
        let r = self
            .get_recent(
                &format!("{API}/repos/{owner}/{name}/releases?per_page=30"),
                ACCEPT_HTML,
            )
            .await?;
        if r.status == 404 {
            return Err(AppError::new(ErrorCode::NotFound, "Depo bulunamadı."));
        }
        let list: Vec<GhRelease> = serde_json::from_str(&r.body)?;
        Ok(list
            .iter()
            .filter(|x| !x.draft)
            .map(GhRelease::to_release)
            .collect())
    }

    pub async fn readme(&self, owner: &str, name: &str, path: Option<&str>) -> AppResult<String> {
        let url = match path {
            Some(p) => format!("{API}/repos/{owner}/{name}/contents/{p}"),
            None => format!("{API}/repos/{owner}/{name}/readme"),
        };
        let r = self.get_recent(&url, ACCEPT_HTML).await?;
        if r.status == 404 {
            return Ok(String::new());
        }
        let dir = path.and_then(|p| p.rsplit_once('/')).map(|(d, _)| d).unwrap_or("");
        Ok(absolutize_html_in(&r.body, owner, name, dir))
    }
}

pub fn with_source_zip(owner: &str, name: &str, mut r: GhRelease) -> GhRelease {
    if let Some(u) = logic::upstream_of(owner, name) {
        if r.assets.is_empty() {
            let url = format!("https://codeload.github.com/{}/{}/zip/refs/tags/{}", u.owner, u.name, r.tag_name);
            r.assets.push(GhAsset {
                id: 0,
                name: format!("{}-{}.zip", u.name, r.tag_name),
                size: 0,
                browser_download_url: url.clone(),
                url,
                download_count: 0,
            });
        }
    }
    r
}

pub fn doc_path_ok(p: &str) -> bool {
    !p.is_empty()
        && p.len() <= 200
        && p.to_ascii_lowercase().ends_with(".md")
        && !p.starts_with('/')
        && p.split('/').all(|s| !s.is_empty() && s != "." && s != "..")
        && p.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-' | '/'))
}

fn is_absolute_ref(v: &str) -> bool {
    let l = v.to_ascii_lowercase();
    v.is_empty()
        || v.starts_with('#')
        || v.starts_with("//")
        || l.starts_with("http:")
        || l.starts_with("https:")
        || l.starts_with("mailto:")
        || l.starts_with("data:")
        || l.starts_with("tel:")
}

#[cfg(test)]
pub fn absolutize_html(html: &str, owner: &str, name: &str) -> String {
    absolutize_html_in(html, owner, name, "")
}

pub fn absolutize_html_in(html: &str, owner: &str, name: &str, dir: &str) -> String {
    let prefix = if dir.is_empty() { String::new() } else { format!("{dir}/") };
    let mut out = String::with_capacity(html.len() + 256);
    let mut rest = html;
    loop {
        let next = ["src=\"", "href=\"", "srcset=\""]
            .iter()
            .filter_map(|attr| rest.find(attr).map(|i| (i, *attr)))
            .min_by_key(|(i, _)| *i);
        let Some((i, attr)) = next else {
            out.push_str(rest);
            break;
        };
        let preceded_ok = i == 0
            || rest[..i]
                .chars()
                .next_back()
                .is_some_and(|c| c.is_whitespace());
        let start = i + attr.len();
        out.push_str(&rest[..start]);
        rest = &rest[start..];
        let Some(end) = rest.find('"') else {
            out.push_str(rest);
            break;
        };
        let value = &rest[..end];
        if preceded_ok && !is_absolute_ref(value) {
            let rooted = value.starts_with('/');
            let path = value.trim_start_matches("./").trim_start_matches('/');
            let base = if attr == "href=\"" {
                format!("https://github.com/{owner}/{name}/blob/HEAD/")
            } else {
                format!("https://raw.githubusercontent.com/{owner}/{name}/HEAD/")
            };
            out.push_str(&base);
            if !rooted {
                out.push_str(&prefix);
            }
            out.push_str(path);
        } else {
            out.push_str(value);
        }
        rest = &rest[end..];
    }
    out
}

pub fn to_repo(d: &RepoDetails) -> Repo {
    let gh = &d.gh;
    let release = d.release.clone().map(|r| with_source_zip(&gh.owner.login, &gh.name, r));
    let assets = release.as_ref().map(|r| r.asset_refs()).unwrap_or_default();
    let license = gh.license.as_ref().and_then(|l| {
        l.spdx_id
            .clone()
            .filter(|s| !s.is_empty() && s != "NOASSERTION")
            .or_else(|| l.name.clone())
    });
    Repo {
        owner: gh.owner.login.clone(),
        name: gh.name.clone(),
        full_name: gh.full_name.clone(),
        description: gh.description.clone().unwrap_or_default(),
        private: gh.private,
        archived: gh.archived,
        fork: gh.fork,
        stars: gh.stargazers_count,
        forks: gh.forks_count,
        open_issues: gh.open_issues_count,
        language: gh.language.clone(),
        topics: gh.topics.clone(),
        license,
        homepage: gh.homepage.clone().filter(|h| !h.trim().is_empty()),
        html_url: gh.html_url.clone(),
        pushed_at: gh.pushed_at.clone().unwrap_or_default(),
        updated_at: gh.updated_at.clone().unwrap_or_default(),
        size_kb: gh.size,
        latest_tag: release.as_ref().map(|r| r.tag_name.clone()),
        latest_published_at: release.as_ref().and_then(|r| r.published_at.clone()),
        has_windows_asset: logic::has_windows_asset(&assets, d.manifest.as_ref()),
        manifest: d.manifest.clone(),
        category: logic::category(d.manifest.as_ref(), &gh.topics, gh.language.as_deref()),
        install_state: crate::model::InstallState::NotInstalled,
        installed_tag: None,
        local_tags: Vec::new(),
        ui_version: d.ui.clone(),
        plugin: None,
        media: d.media.as_ref().map(|m| logic::media_state(m, d.release.as_ref().and_then(|r| r.published_at.as_deref()))),
    }
}

pub fn new_list(account: &str, repos: Vec<Repo>, rate: RateInfo) -> RepoList {
    RepoList {
        account: account.to_string(),
        fetched_at: now_iso(),
        from_cache: false,
        rate_remaining: rate.remaining,
        rate_reset_at: rate.reset_at,
        budget_skipped: false,
        ui_latest: None,
        core_latest: None,
        claude_code: false,
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        repos,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn absolutizes_relative_links() {
        let html = r##"<img src="docs/a.png"><a href="./LICENSE">L</a><a href="https://x.y">x</a><a href="#top">t</a>"##;
        let out = absolutize_html(html, "Teknesyum", "Base");
        assert!(out.contains(r#"src="https://raw.githubusercontent.com/Teknesyum/Base/HEAD/docs/a.png""#));
        assert!(out.contains(r#"href="https://github.com/Teknesyum/Base/blob/HEAD/LICENSE""#));
        assert!(out.contains(r#"href="https://x.y""#));
        assert!(out.contains(r##"href="#top""##));
    }

    #[test]
    fn absolutizes_in_subdir_and_checks_doc_path() {
        let out = absolutize_html_in(r#"<a href="b.md">b</a><a href="/c.md">c</a>"#, "T", "B", "docs");
        assert!(out.contains(r#"href="https://github.com/T/B/blob/HEAD/docs/b.md""#));
        assert!(out.contains(r#"href="https://github.com/T/B/blob/HEAD/c.md""#));
        assert!(doc_path_ok("README.tr.md"));
        assert!(doc_path_ok("docs/README_TR.md"));
        assert!(!doc_path_ok("../x.md"));
        assert!(!doc_path_ok("README.tr.md?ref=x"));
        assert!(!doc_path_ok("a.txt"));
    }

    #[test]
    fn webband_takes_source_zip_from_upstream() {
        let r: GhRelease = serde_json::from_str(r#"{"tag_name":"v2.4.0","draft":false,"prerelease":false,"assets":[]}"#).unwrap();
        let out = with_source_zip("Teknesyum", "Webband", r.clone());
        assert_eq!(out.assets[0].browser_download_url, "https://codeload.github.com/srknzl/Webband/zip/refs/tags/v2.4.0");
        assert_eq!(out.assets[0].id, 0);
        assert!(with_source_zip("Teknesyum", "Other", r).assets.is_empty());
        assert_eq!(logic::source_of("teknesyum", "webband").0, "srknzl");
    }

    #[test]
    fn parses_manifest_camel_case() {
        let m = parse_manifest(r#"{"name":"X","method":"portable","silentArgs":["/S"]}"#).unwrap();
        assert_eq!(m.method, Some(crate::model::InstallMethod::Portable));
        assert_eq!(m.silent_args.unwrap(), vec!["/S"]);
    }

    #[test]
    fn detects_rate_limit_responses() {
        assert!(is_rate_limited(StatusCode::TOO_MANY_REQUESTS, None, None));
        assert!(is_rate_limited(StatusCode::FORBIDDEN, Some(0), None));
        assert!(is_rate_limited(StatusCode::FORBIDDEN, Some(5), Some(30)));
        assert!(!is_rate_limited(StatusCode::FORBIDDEN, Some(12), None));
        assert!(!is_rate_limited(StatusCode::OK, Some(0), None));
    }

    #[test]
    fn mark_limited_fills_reset() {
        let gh = GitHub::new(build_http(), std::env::temp_dir(), None);
        gh.mark_limited(Some(1790466044), None);
        let r = gh.rate();
        assert_eq!(r.remaining, Some(0));
        assert_eq!(r.reset_at.as_deref(), Some("2026-09-26T23:40:44Z"));
        let gh = GitHub::new(build_http(), std::env::temp_dir(), None);
        gh.mark_limited(None, Some(120));
        assert!(gh.rate().reset_at.is_some());
    }

    async fn core_remaining(http: &reqwest::Client) -> (u64, u64) {
        let v: serde_json::Value = http
            .get(format!("{API}/rate_limit"))
            .header(USER_AGENT, UA)
            .send()
            .await
            .expect("rate_limit")
            .json()
            .await
            .expect("rate_limit json");
        let core = &v["resources"]["core"];
        (core["remaining"].as_u64().unwrap_or(0), core["used"].as_u64().unwrap_or(0))
    }

    #[tokio::test]
    #[ignore]
    async fn live_etag_second_refresh() {
        let dir = std::env::temp_dir().join(format!("teknesyum-base-etag-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let http = build_http();
        let (r0, u0) = core_remaining(&http).await;
        println!("tokensiz=evet hesap=Teknesyum onbellek=bos");
        println!("baslangic: core remaining={r0} used={u0}");
        let first = GitHub::new(http.clone(), dir.clone(), None);
        let d1 = first.repo_details("Teknesyum").await.expect("ilk yenileme");
        let s1 = first.stats();
        let (r1, u1) = core_remaining(&http).await;
        println!(
            "ilk yenileme: repo={} yanit200={} yanit304={} core remaining={r1} used={u1} harcanan={}",
            d1.len(),
            s1.fresh,
            s1.not_modified,
            r0 as i64 - r1 as i64
        );
        let second = GitHub::new(http.clone(), dir.clone(), None);
        let d2 = second.repo_details("Teknesyum").await.expect("ikinci yenileme");
        let s2 = second.stats();
        let (r2, u2) = core_remaining(&http).await;
        println!(
            "ikinci yenileme (pushed_at + ETag): repo={} yanit200={} yanit304={} core remaining={r2} used={u2} harcanan={}",
            d2.len(),
            s2.fresh,
            s2.not_modified,
            r1 as i64 - r2 as i64
        );
        for e in std::fs::read_dir(&dir).expect("dir").flatten() {
            if e.file_name().to_string_lossy().starts_with("surum-") {
                let _ = std::fs::remove_file(e.path());
            }
        }
        let third = GitHub::new(http.clone(), dir.clone(), None);
        let d3 = third.repo_details("Teknesyum").await.expect("ucuncu yenileme");
        let s3 = third.stats();
        let (r3, u3) = core_remaining(&http).await;
        println!(
            "ucuncu yenileme (surum onbellegi silindi, yalniz ETag): repo={} yanit200={} yanit304={} core remaining={r3} used={u3} harcanan={}",
            d3.len(),
            s3.fresh,
            s3.not_modified,
            r2 as i64 - r3 as i64
        );
        let _ = std::fs::remove_dir_all(&dir);
        assert_eq!(d1.len(), d2.len());
        assert_eq!(d1.len(), d3.len());
    }

    fn audit_dir() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("teknesyum-base-audit-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("audit dir");
        if let Ok(src) = std::env::var("TKB_AUDIT_CACHE") {
            for e in std::fs::read_dir(src).expect("kaynak onbellek").flatten() {
                let _ = std::fs::copy(e.path(), dir.join(e.file_name()));
            }
        }
        dir
    }

    fn dump_trace(label: &str, gh: &GitHub) {
        let t = gh.trace.lock().map(|t| t.clone()).unwrap_or_default();
        println!("{label}: istek={}", t.len());
        for line in t {
            println!("  {line}");
        }
    }

    async fn raw_get(http: &reqwest::Client, url: &str) -> String {
        let r = http
            .get(url)
            .header(USER_AGENT, UA)
            .header(ACCEPT, ACCEPT_JSON)
            .send()
            .await
            .expect("raw get");
        let h = r.headers().clone();
        format!(
            "{} {url} remaining={:?} used={:?}",
            r.status().as_u16(),
            header_u64(&h, "x-ratelimit-remaining"),
            header_u64(&h, "x-ratelimit-used")
        )
    }

    #[tokio::test]
    #[ignore]
    async fn live_request_audit_before() {
        let dir = audit_dir();
        let http = build_http();
        let (r0, u0) = core_remaining(&http).await;
        println!("tokensiz=evet hesap=Teknesyum onbellek_kopya={}", std::env::var("TKB_AUDIT_CACHE").is_ok());
        println!("baslangic: core remaining={r0} used={u0}");
        let open = GitHub::new(http.clone(), dir.clone(), None);
        let d = open.repo_details("Teknesyum").await.expect("acilis");
        dump_trace(&format!("acilis list_repos(force=true) repo={}", d.len()), &open);
        let upd = raw_get(&http, "https://api.github.com/repos/Teknesyum/Teknesyum-Base/releases?per_page=20").await;
        println!("acilis guncelleyici denetimi (ETag yok): istek=1
  {upd}");
        let (r1, u1) = core_remaining(&http).await;
        println!("acilis sonu: core remaining={r1} used={u1} harcanan={}", r0 as i64 - r1 as i64);
        let tz = GitHub::new(http.clone(), dir.clone(), None);
        tz.repo_details("Teknesyum").await.expect("tazele");
        dump_trace("tazele list_repos(force=true)", &tz);
        let (r2, u2) = core_remaining(&http).await;
        println!("tazele sonu: core remaining={r2} used={u2} harcanan={}", r1 as i64 - r2 as i64);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    #[ignore]
    async fn live_request_audit_after() {
        let dir = audit_dir();
        let list_file = dir.join("liste-teknesyum.json");
        let http = build_http();
        let (r0, u0) = core_remaining(&http).await;
        println!("tokensiz=evet hesap=Teknesyum onbellek_kopya={}", std::env::var("TKB_AUDIT_CACHE").is_ok());
        println!("baslangic: core remaining={r0} used={u0}");
        let tz = GitHub::new(http.clone(), dir.clone(), None);
        let l = crate::commands::load_list(&tz, &dir, &list_file, "Teknesyum", true, false)
            .await
            .expect("tazele");
        dump_trace(
            &format!("tazele (force=true, rate_limit + butce) repo={} budget_skipped={} from_cache={}", l.repos.len(), l.budget_skipped, l.from_cache),
            &tz,
        );
        let (r1, u1) = core_remaining(&http).await;
        println!("tazele sonu: core remaining={r1} used={u1} harcanan={}", r0 as i64 - r1 as i64);
        let feed = "https://api.github.com/repos/Teknesyum/Teknesyum-Base/releases?per_page=20";
        for n in 1..=2 {
            let op = GitHub::new(http.clone(), dir.clone(), None);
            let l = crate::commands::load_list(&op, &dir, &list_file, "Teknesyum", true, true)
                .await
                .expect("acilis");
            dump_trace(&format!("acilis#{n} liste (auto, taze onbellek) from_cache={}", l.from_cache), &op);
            let now = chrono::Utc::now().timestamp();
            let last = std::fs::read_to_string(dir.join("guncelleme-denetim.json"))
                .ok()
                .and_then(|t| serde_json::from_str::<serde_json::Value>(&t).ok())
                .and_then(|v| v["checkedAt"].as_i64());
            let wait = crate::updater::first_wait(last, now, false);
            if wait.as_secs() > 60 {
                println!("acilis#{n} guncelleyici: son denetim yeni, ilk denetim {} sn sonra; istek=0", wait.as_secs());
            } else {
                let r = crate::updater::fetch_feed(&http, feed, None, Some(&dir)).await;
                std::fs::write(dir.join("guncelleme-denetim.json"), format!("{{\"checkedAt\":{now}}}")).expect("mark");
                match r {
                    Ok(f) => println!("acilis#{n} guncelleyici: istek=1 durum={} rate={:?}", f.status, f.rate.map(|s| s.remaining)),
                    Err(e) => println!("acilis#{n} guncelleyici: istek=1 hata={:?} {}", e.code, e.message),
                }
            }
            let (r, u) = core_remaining(&http).await;
            println!("acilis#{n} sonu: core remaining={r} used={u}");
        }
        let tz2 = GitHub::new(http.clone(), dir.clone(), None);
        let l2 = crate::commands::load_list(&tz2, &dir, &list_file, "Teknesyum", true, false)
            .await
            .expect("tazele2");
        dump_trace(&format!("tazele#2 (degisiklik yok) budget_skipped={}", l2.budget_skipped), &tz2);
        let (r3, u3) = core_remaining(&http).await;
        println!("tazele#2 sonu: core remaining={r3} used={u3}");
        let _ = std::fs::remove_dir_all(&dir);
    }

    fn live_client() -> GitHub {
        let dir = std::env::temp_dir().join("teknesyum-base-live-test");
        GitHub::new(build_http(), dir, std::env::var("GITHUB_TOKEN").ok())
    }

    #[tokio::test]
    #[ignore]
    async fn live_list_teknesyum() {
        let gh = live_client();
        let details = gh.repo_details("Teknesyum").await.expect("list");
        let with_rel = details.iter().filter(|d| d.release.is_some()).count();
        let with_win = details
            .iter()
            .filter(|d| to_repo(d).has_windows_asset)
            .count();
        let with_manifest = details.iter().filter(|d| d.manifest.is_some()).count();
        let rate = gh.rate();
        println!(
            "repos={} releases={} windows={} manifest={} rate_remaining={:?} reset={:?}",
            details.len(),
            with_rel,
            with_win,
            with_manifest,
            rate.remaining,
            rate.reset_at
        );
        for d in &details {
            let r = to_repo(d);
            println!("  {} tag={:?} win={} cat={}", r.full_name, r.latest_tag, r.has_windows_asset, r.category);
        }
        assert!(!details.is_empty());
    }
}
