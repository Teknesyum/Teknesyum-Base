use std::ffi::OsString;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use futures_util::StreamExt;
use reqwest::header::{ACCEPT, AUTHORIZATION};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::commands::AppState;
use crate::error::{AppError, AppResult, ErrorCode};
use crate::logic;
use crate::paths::{read_json, write_json};
use crate::store::{self, HttpCacheEntry, RateSnapshot};

pub const UPDATE_EVENT: &str = "update://state";

const REPO: &str = if cfg!(feature = "pro") {
    "Teknesyum/Teknesyum-Private"
} else {
    "Teknesyum/Teknesyum-Base"
};
const TAG_PREFIX: &str = if cfg!(feature = "pro") { "base-pro-v" } else { "v" };
const ASSET: &str = if cfg!(feature = "pro") {
    "Teknesyum-Base-Pro.exe"
} else {
    "Teknesyum-Base.exe"
};
const FEED_ENV: &str = "TEKNESYUM_BASE_UPDATE_FEED";
const DRY_ENV: &str = "TEKNESYUM_BASE_UPDATE_DRY";
const DRY_DIR: &str = "teknesyum-base-update-dry";
const FIRST_CHECK: Duration = Duration::from_secs(10);
const CHECK_EVERY: Duration = Duration::from_secs(6 * 60 * 60);
const INSTALL_PAUSE: Duration = Duration::from_millis(1500);
const CHECK_FILE: &str = "guncelleme-denetim.json";
const FEED_ACCEPT: &str = "application/vnd.github+json";

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CheckMark {
    checked_at: i64,
}

fn check_file(cache: &Path) -> PathBuf {
    cache.join(CHECK_FILE)
}

fn last_check(cache: &Path) -> Option<i64> {
    read_json::<CheckMark>(&check_file(cache)).map(|m| m.checked_at)
}

fn mark_checked(cache: &Path, now: i64) {
    let _ = write_json(&check_file(cache), &CheckMark { checked_at: now });
}

pub fn first_wait(last: Option<i64>, now: i64, feed: bool) -> Duration {
    if feed {
        return FIRST_CHECK;
    }
    let every = CHECK_EVERY.as_secs() as i64;
    let left = last.map(|t| every - (now - t)).filter(|l| (0..=every).contains(l)).unwrap_or(0);
    FIRST_CHECK.max(Duration::from_secs(left as u64))
}

fn header_u64(h: &reqwest::header::HeaderMap, name: &str) -> Option<u64> {
    h.get(name)?.to_str().ok()?.trim().parse().ok()
}

pub struct FeedFetch {
    pub releases: Vec<FeedRelease>,
    #[cfg_attr(not(test), allow(dead_code))]
    pub status: u16,
    pub rate: Option<RateSnapshot>,
}

pub async fn fetch_feed(
    http: &reqwest::Client,
    url: &str,
    token: Option<&str>,
    cache: Option<&Path>,
) -> AppResult<FeedFetch> {
    let cache_file = cache.map(|d| store::http_cache_file(d, url, FEED_ACCEPT, token.is_some()));
    let cached = cache_file.as_deref().and_then(store::load_http);
    let mut req = http
        .get(url)
        .header(ACCEPT, FEED_ACCEPT)
        .header("X-GitHub-Api-Version", "2022-11-28")
        .timeout(Duration::from_secs(30));
    if let Some(t) = token {
        req = req.header(AUTHORIZATION, format!("Bearer {t}"));
    }
    if let Some(c) = &cached {
        for (name, value) in c.validators() {
            req = req.header(name, value);
        }
    }
    let resp = req.send().await?;
    let status = resp.status();
    let h = resp.headers().clone();
    let now = chrono::Utc::now().timestamp();
    let rate = match (header_u64(&h, "x-ratelimit-remaining"), header_u64(&h, "x-ratelimit-reset")) {
        (Some(remaining), Some(reset)) => Some(RateSnapshot {
            remaining,
            reset: reset as i64,
            saved_at: now,
        }),
        _ => None,
    };
    if status == StatusCode::NOT_MODIFIED {
        if let Some(c) = cached {
            return Ok(FeedFetch {
                releases: serde_json::from_str(&c.body)?,
                status: 304,
                rate,
            });
        }
    }
    if !status.is_success() {
        return Err(status_error(status));
    }
    let etag = h.get(reqwest::header::ETAG).and_then(|v| v.to_str().ok()).map(str::to_string);
    let modified = h
        .get(reqwest::header::LAST_MODIFIED)
        .and_then(|v| v.to_str().ok())
        .map(str::to_string);
    let body = resp.text().await?;
    let releases = serde_json::from_str::<Vec<FeedRelease>>(&body)?;
    if let (Some(f), Some(entry)) = (&cache_file, HttpCacheEntry::new(etag, modified, body, None)) {
        let _ = store::save_http(f, &entry);
    }
    Ok(FeedFetch {
        releases,
        status: status.as_u16(),
        rate,
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum UpdatePhase {
    Idle,
    Checking,
    Available,
    Downloading,
    Ready,
    Installing,
    Error,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateState {
    pub phase: UpdatePhase,
    pub current: String,
    pub latest: Option<String>,
    pub notes: Option<String>,
    pub percent: u8,
    pub message: Option<String>,
    pub checked_at: Option<String>,
    pub dry_run: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FeedAsset {
    pub name: String,
    #[serde(default)]
    pub size: u64,
    #[serde(default)]
    pub browser_download_url: String,
    #[serde(default)]
    pub url: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FeedRelease {
    pub tag_name: String,
    #[serde(default)]
    pub body: Option<String>,
    #[serde(default)]
    pub draft: bool,
    #[serde(default)]
    pub prerelease: bool,
    #[serde(default)]
    pub assets: Vec<FeedAsset>,
}

#[derive(Debug, Clone)]
struct Pick {
    version: String,
    asset: FeedAsset,
    sha: Option<FeedAsset>,
}

pub struct Updater {
    state: Mutex<UpdateState>,
    pick: Mutex<Option<Pick>>,
    cancel: Mutex<Arc<AtomicBool>>,
}

fn lock<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

fn dry_run_enabled() -> bool {
    std::env::var(DRY_ENV)
        .map(|v| {
            let v = v.trim();
            !v.is_empty() && v != "0" && !v.eq_ignore_ascii_case("false")
        })
        .unwrap_or(false)
}

fn feed_url() -> Option<String> {
    std::env::var(FEED_ENV)
        .ok()
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

impl Updater {
    pub fn new() -> Self {
        Self {
            state: Mutex::new(UpdateState {
                phase: UpdatePhase::Idle,
                current: env!("CARGO_PKG_VERSION").to_string(),
                latest: None,
                notes: None,
                percent: 0,
                message: None,
                checked_at: None,
                dry_run: dry_run_enabled(),
            }),
            pick: Mutex::new(None),
            cancel: Mutex::new(Arc::new(AtomicBool::new(false))),
        }
    }

    pub fn snapshot(&self) -> UpdateState {
        lock(&self.state).clone()
    }

    fn set(&self, app: &AppHandle, f: impl FnOnce(&mut UpdateState)) -> UpdateState {
        let snap = {
            let mut s = lock(&self.state);
            f(&mut s);
            s.clone()
        };
        let _ = app.emit(UPDATE_EVENT, snap.clone());
        snap
    }
}

impl Default for Updater {
    fn default() -> Self {
        Self::new()
    }
}

pub fn parse_version(tag: &str, prefix: &str) -> Option<String> {
    let rest = tag.trim().strip_prefix(prefix)?;
    let parts: Vec<&str> = rest.split('.').collect();
    if parts.len() != 3
        || parts
            .iter()
            .any(|p| p.is_empty() || !p.bytes().all(|b| b.is_ascii_digit()))
    {
        return None;
    }
    Some(rest.to_string())
}

pub fn pick_latest<'a>(releases: &'a [FeedRelease], prefix: &str) -> Option<(&'a FeedRelease, String)> {
    releases
        .iter()
        .filter(|r| !r.draft && !r.prerelease)
        .filter_map(|r| parse_version(&r.tag_name, prefix).map(|v| (r, v)))
        .max_by(|a, b| logic::compare_versions(&a.1, &b.1))
}

pub fn is_newer(candidate: &str, current: &str) -> bool {
    logic::compare_versions(candidate, current) == std::cmp::Ordering::Greater
}

pub fn parse_sha(text: &str) -> Option<String> {
    let word = text.split_whitespace().next()?.trim_start_matches('\u{feff}');
    (word.len() == 64 && word.bytes().all(|b| b.is_ascii_hexdigit())).then(|| word.to_ascii_lowercase())
}

pub fn sibling(exe: &Path, suffix: &str) -> PathBuf {
    let mut s: OsString = exe.as_os_str().to_owned();
    s.push(suffix);
    PathBuf::from(s)
}

pub fn cleanup_leftovers(exe: &Path) {
    let _ = std::fs::remove_file(sibling(exe, ".old"));
    let _ = std::fs::remove_file(sibling(exe, ".new"));
}

pub fn swap_in(exe: &Path) -> std::io::Result<()> {
    let old = sibling(exe, ".old");
    let new = sibling(exe, ".new");
    if !new.is_file() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("{} bulunamadı", new.display()),
        ));
    }
    if old.exists() {
        std::fs::remove_file(&old)?;
    }
    std::fs::rename(exe, &old)?;
    if let Err(e) = std::fs::rename(&new, exe) {
        let _ = std::fs::rename(&old, exe);
        return Err(e);
    }
    Ok(())
}

fn swap_back(exe: &Path) {
    let old = sibling(exe, ".old");
    let new = sibling(exe, ".new");
    if std::fs::rename(exe, &new).is_ok() {
        let _ = std::fs::rename(&old, exe);
    }
}

pub fn dry_swap(exe: &Path, dir: &Path) -> std::io::Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let name = exe.file_name().unwrap_or_else(|| std::ffi::OsStr::new(ASSET));
    let target = dir.join(name);
    cleanup_leftovers(&target);
    std::fs::copy(exe, &target)?;
    let src_new = sibling(exe, ".new");
    std::fs::copy(&src_new, sibling(&target, ".new"))?;
    std::fs::remove_file(&src_new)?;
    swap_in(&target)?;
    Ok(target)
}

pub fn finish_download(path: &Path, actual: &str, expected: Option<&str>) -> AppResult<()> {
    match expected {
        Some(exp) if !exp.eq_ignore_ascii_case(actual) => {
            let _ = std::fs::remove_file(path);
            Err(AppError::new(
                ErrorCode::Checksum,
                "İndirilen güncellemenin SHA-256 özeti tutmadı; dosya silindi.",
            ))
        }
        _ => Ok(()),
    }
}

fn status_error(status: StatusCode) -> AppError {
    match status {
        StatusCode::UNAUTHORIZED => AppError::new(ErrorCode::Auth, "Güncelleme denetimi: token geçersiz."),
        StatusCode::FORBIDDEN | StatusCode::TOO_MANY_REQUESTS => {
            AppError::new(ErrorCode::RateLimit, "Güncelleme denetimi: GitHub isteği reddetti ya da sınır doldu.")
        }
        StatusCode::NOT_FOUND => AppError::new(ErrorCode::NotFound, "Güncelleme deposu bulunamadı."),
        s => AppError::new(ErrorCode::Network, format!("Güncelleme sunucusu {s} döndü.")),
    }
}

struct Source {
    http: reqwest::Client,
    token: Option<String>,
    feed: Option<String>,
    cache: PathBuf,
}

impl Source {
    fn from_app(app: &AppHandle) -> AppResult<Self> {
        let st = app.state::<AppState>();
        let feed = feed_url();
        let token = st.token();
        if cfg!(feature = "pro") && feed.is_none() && token.is_none() {
            return Err(AppError::new(
                ErrorCode::Auth,
                "Pro güncelleme denetimi için GitHub token gerekli.",
            ));
        }
        Ok(Self {
            http: st.http(),
            token,
            feed,
            cache: st.paths.cache.clone(),
        })
    }

    async fn releases(&self) -> AppResult<Vec<FeedRelease>> {
        if let Some(feed) = &self.feed {
            return Ok(fetch_feed(&self.http, feed, None, None).await?.releases);
        }
        let url = format!("https://api.github.com/repos/{REPO}/releases?per_page=20");
        let token = self.token.as_deref();
        let result = fetch_feed(&self.http, &url, token, Some(&self.cache)).await;
        let now = chrono::Utc::now().timestamp();
        let responded = !matches!(&result, Err(e) if e.code == ErrorCode::Network);
        if responded {
            mark_checked(&self.cache, now);
        }
        if let Ok(f) = &result {
            if let Some(snap) = &f.rate {
                let _ = store::save_rate(&store::rate_file(&self.cache, token.is_some()), snap);
            }
        }
        result.map(|f| f.releases)
    }

    fn budget_ok(&self) -> bool {
        if self.feed.is_some() {
            return true;
        }
        let now = chrono::Utc::now().timestamp();
        store::load_rate(&store::rate_file(&self.cache, self.token.is_some()), now)
            .is_none_or(|s| store::budget_allows(s.remaining, 1))
    }

    fn asset_request(&self, asset: &FeedAsset) -> reqwest::RequestBuilder {
        if self.feed.is_some() || asset.url.is_empty() {
            return self.http.get(&asset.browser_download_url);
        }
        let mut req = self
            .http
            .get(&asset.url)
            .header(ACCEPT, "application/octet-stream");
        if let Some(t) = &self.token {
            req = req.header(AUTHORIZATION, format!("Bearer {t}"));
        }
        req
    }
}

async fn check(app: &AppHandle, background: bool) -> AppResult<UpdateState> {
    let up = app.state::<Updater>();
    let phase = up.snapshot().phase;
    let skip = if background {
        matches!(phase, UpdatePhase::Downloading | UpdatePhase::Ready | UpdatePhase::Installing)
    } else {
        matches!(phase, UpdatePhase::Downloading | UpdatePhase::Installing)
    };
    if skip {
        return Ok(up.snapshot());
    }
    up.set(app, |s| {
        s.phase = UpdatePhase::Checking;
        s.message = None;
    });
    let result = async {
        let src = Source::from_app(app)?;
        if background && !src.budget_ok() {
            return Err(AppError::new(
                ErrorCode::RateLimit,
                "Güncelleme denetimi ertelendi: GitHub istek sınırı azaldı.",
            ));
        }
        let releases = src.releases().await?;
        Ok::<_, AppError>(pick_latest(&releases, TAG_PREFIX).map(|(r, v)| (r.clone(), v)))
    }
    .await;
    let now = chrono::Utc::now().to_rfc3339();
    match result {
        Err(e) => {
            let st = up.set(app, |s| {
                s.phase = if phase == UpdatePhase::Ready {
                    UpdatePhase::Ready
                } else if background {
                    UpdatePhase::Idle
                } else {
                    UpdatePhase::Error
                };
                s.message = Some(e.message.clone());
                s.checked_at = Some(now);
            });
            if background {
                Ok(st)
            } else {
                Err(e)
            }
        }
        Ok(found) => {
            let current = env!("CARGO_PKG_VERSION");
            let newer = found.filter(|(_, v)| is_newer(v, current));
            let Some((rel, version)) = newer else {
                *lock(&up.pick) = None;
                return Ok(up.set(app, |s| {
                    s.phase = UpdatePhase::Idle;
                    s.latest = None;
                    s.notes = None;
                    s.percent = 0;
                    s.checked_at = Some(now);
                }));
            };
            let asset = rel.assets.iter().find(|a| a.name.eq_ignore_ascii_case(ASSET)).cloned();
            let Some(asset) = asset else {
                let msg = format!("{} sürümünde {ASSET} dosyası yok.", rel.tag_name);
                return Ok(up.set(app, |s| {
                    s.phase = UpdatePhase::Idle;
                    s.message = Some(msg);
                    s.checked_at = Some(now);
                }));
            };
            let sha_name = format!("{ASSET}.sha256");
            let sha = rel.assets.iter().find(|a| a.name.eq_ignore_ascii_case(&sha_name)).cloned();
            let keep_ready = phase == UpdatePhase::Ready
                && lock(&up.pick).as_ref().is_some_and(|p| p.version == version);
            if !keep_ready {
                *lock(&up.pick) = Some(Pick {
                    version: version.clone(),
                    asset,
                    sha,
                });
            }
            Ok(up.set(app, |s| {
                s.phase = if keep_ready { UpdatePhase::Ready } else { UpdatePhase::Available };
                s.latest = Some(version);
                s.notes = rel.body.clone().filter(|b| !b.trim().is_empty());
                if !keep_ready {
                    s.percent = 0;
                }
                s.checked_at = Some(now);
            }))
        }
    }
}

async fn fetch_sha(src: &Source, asset: &FeedAsset) -> AppResult<String> {
    let resp = src.asset_request(asset).timeout(Duration::from_secs(30)).send().await?;
    if !resp.status().is_success() {
        return Err(status_error(resp.status()));
    }
    let text = resp.text().await?;
    parse_sha(&text).ok_or_else(|| AppError::new(ErrorCode::Checksum, "SHA-256 dosyası okunamadı."))
}

async fn download(app: &AppHandle, pick: Pick, cancel: Arc<AtomicBool>) -> AppResult<()> {
    let up = app.state::<Updater>();
    let src = Source::from_app(app)?;
    let exe = std::env::current_exe()?;
    let target = sibling(&exe, ".new");
    let expected = match &pick.sha {
        Some(a) => Some(fetch_sha(&src, a).await?),
        None => None,
    };
    let resp = src.asset_request(&pick.asset).send().await?;
    if !resp.status().is_success() {
        return Err(status_error(resp.status()));
    }
    let total = resp.content_length().filter(|n| *n > 0).or(Some(pick.asset.size).filter(|n| *n > 0));
    let mut file = std::fs::File::create(&target)?;
    let mut hasher = Sha256::new();
    let mut stream = resp.bytes_stream();
    let mut done: u64 = 0;
    let mut last_pct: u8 = 0;
    let mut last_mark: u64 = 0;
    let outcome: AppResult<()> = async {
        while let Some(chunk) = stream.next().await {
            if cancel.load(Ordering::SeqCst) {
                return Err(AppError::cancelled());
            }
            let chunk = chunk?;
            file.write_all(&chunk)?;
            hasher.update(&chunk);
            done += chunk.len() as u64;
            match total {
                Some(t) => {
                    let pct = ((done.min(t) * 100) / t) as u8;
                    if pct > last_pct {
                        last_pct = pct;
                        up.set(app, |s| s.percent = pct.min(99));
                    }
                }
                None => {
                    if done - last_mark >= 1 << 20 {
                        last_mark = done;
                        up.set(app, |_| {});
                    }
                }
            }
            tokio::task::yield_now().await;
        }
        file.flush()?;
        file.sync_all()?;
        Ok(())
    }
    .await;
    drop(file);
    if let Err(e) = outcome {
        let _ = std::fs::remove_file(&target);
        return Err(e);
    }
    let actual = format!("{:x}", hasher.finalize());
    finish_download(&target, &actual, expected.as_deref())
}

pub fn start(app: &AppHandle) {
    if let Ok(exe) = std::env::current_exe() {
        cleanup_leftovers(&exe);
    }
    let app = app.clone();
    let cache = app.state::<AppState>().paths.cache.clone();
    let last = last_check(&cache);
    if let Some(iso) = last
        .and_then(|t| chrono::DateTime::from_timestamp(t, 0))
        .map(|d| d.to_rfc3339())
    {
        lock(&app.state::<Updater>().state).checked_at = Some(iso);
    }
    let wait = first_wait(last, chrono::Utc::now().timestamp(), feed_url().is_some());
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(wait).await;
        let mut tick = tokio::time::interval(CHECK_EVERY);
        loop {
            tick.tick().await;
            let _ = check(&app, true).await;
        }
    });
}

#[tauri::command]
pub fn update_state(up: State<'_, Updater>) -> UpdateState {
    up.snapshot()
}

#[tauri::command]
pub async fn update_check(app: AppHandle) -> AppResult<UpdateState> {
    check(&app, false).await
}

#[tauri::command]
pub fn update_download(app: AppHandle, up: State<'_, Updater>) -> AppResult<UpdateState> {
    let phase = up.snapshot().phase;
    if matches!(phase, UpdatePhase::Downloading | UpdatePhase::Installing) {
        return Ok(up.snapshot());
    }
    let pick = lock(&up.pick)
        .clone()
        .ok_or_else(|| AppError::new(ErrorCode::NotFound, "İndirilecek yeni sürüm yok. Önce denetleyin."))?;
    let cancel = Arc::new(AtomicBool::new(false));
    *lock(&up.cancel) = cancel.clone();
    let st = up.set(&app, |s| {
        s.phase = UpdatePhase::Downloading;
        s.percent = 0;
        s.message = None;
    });
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        let result = download(&handle, pick, cancel).await;
        let up = handle.state::<Updater>();
        match result {
            Ok(()) => {
                up.set(&handle, |s| {
                    s.phase = UpdatePhase::Ready;
                    s.percent = 100;
                    s.message = None;
                });
            }
            Err(e) if e.code == ErrorCode::Cancelled => {
                up.set(&handle, |s| {
                    s.phase = UpdatePhase::Available;
                    s.percent = 0;
                    s.message = Some(e.message);
                });
            }
            Err(e) => {
                up.set(&handle, |s| {
                    s.phase = UpdatePhase::Error;
                    s.percent = 0;
                    s.message = Some(e.message);
                });
            }
        }
    });
    Ok(st)
}

#[tauri::command]
pub fn update_cancel(up: State<'_, Updater>) -> UpdateState {
    lock(&up.cancel).store(true, Ordering::SeqCst);
    up.snapshot()
}

#[tauri::command]
pub async fn update_install(app: AppHandle) -> AppResult<UpdateState> {
    let up = app.state::<Updater>();
    if up.snapshot().phase != UpdatePhase::Ready {
        return Err(AppError::new(ErrorCode::NotFound, "Kurulacak indirilmiş güncelleme yok."));
    }
    if app.state::<AppState>().running_tasks() > 0 {
        return Err(AppError::new(
            ErrorCode::Unknown,
            "Süren bir kurulum görevi var; bitince yeniden deneyin.",
        ));
    }
    let exe = std::env::current_exe()?;
    if !sibling(&exe, ".new").is_file() {
        up.set(&app, |s| {
            s.phase = UpdatePhase::Available;
            s.percent = 0;
        });
        return Err(AppError::new(ErrorCode::NotFound, "İndirilen güncelleme dosyası bulunamadı."));
    }
    let dry = up.snapshot().dry_run;
    up.set(&app, |s| {
        s.phase = UpdatePhase::Installing;
        s.message = None;
    });
    tokio::time::sleep(INSTALL_PAUSE).await;
    if dry {
        let dir = std::env::temp_dir().join(DRY_DIR);
        return match dry_swap(&exe, &dir) {
            Ok(path) => {
                println!("update dry-run: {}", path.display());
                *lock(&up.pick) = None;
                Ok(up.set(&app, |s| {
                    s.phase = UpdatePhase::Idle;
                    s.percent = 0;
                    s.message = Some(format!("dry-run: {}", path.display()));
                }))
            }
            Err(e) => {
                let err = AppError::from(e);
                up.set(&app, |s| {
                    s.phase = UpdatePhase::Error;
                    s.message = Some(err.message.clone());
                });
                Err(err)
            }
        };
    }
    let fail = |app: &AppHandle, err: AppError| {
        app.state::<Updater>().set(app, |s| {
            s.phase = UpdatePhase::Error;
            s.message = Some(err.message.clone());
        });
        err
    };
    if let Err(e) = swap_in(&exe) {
        return Err(fail(&app, e.into()));
    }
    tauri_plugin_single_instance::destroy(&app);
    if let Err(e) = std::process::Command::new(&exe).spawn() {
        swap_back(&exe);
        return Err(fail(&app, e.into()));
    }
    app.exit(0);
    Ok(up.snapshot())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rel(tag: &str, draft: bool, pre: bool) -> FeedRelease {
        FeedRelease {
            tag_name: tag.into(),
            body: None,
            draft,
            prerelease: pre,
            assets: Vec::new(),
        }
    }

    fn scratch(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("tk-updater-test-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn first_wait_respects_last_check() {
        let every = CHECK_EVERY.as_secs() as i64;
        assert_eq!(first_wait(None, 1_000_000, false), FIRST_CHECK);
        assert_eq!(first_wait(Some(1_000_000 - every), 1_000_000, false), FIRST_CHECK);
        assert_eq!(first_wait(Some(1_000_000 - 3600), 1_000_000, false), Duration::from_secs((every - 3600) as u64));
        assert_eq!(first_wait(Some(1_000_000 - 3600), 1_000_000, true), FIRST_CHECK);
        assert_eq!(first_wait(Some(1_000_000 + 50), 1_000_000, false), FIRST_CHECK);
        let dir = scratch("mark");
        assert!(last_check(&dir).is_none());
        mark_checked(&dir, 42);
        assert_eq!(last_check(&dir), Some(42));
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn parses_prefixed_versions() {
        assert_eq!(parse_version("v3.0.1", "v").as_deref(), Some("3.0.1"));
        assert_eq!(parse_version("base-pro-v3.2.10", "base-pro-v").as_deref(), Some("3.2.10"));
        assert!(parse_version("base-pro-v3.0.1", "v").is_none());
        assert!(parse_version("v3.0", "v").is_none());
        assert!(parse_version("v3.0.1-beta", "v").is_none());
        assert!(parse_version("3.0.1", "v").is_none());
    }

    #[test]
    fn picks_highest_stable_with_prefix() {
        let list = vec![
            rel("v3.0.9", false, false),
            rel("v3.0.10", false, false),
            rel("v3.1.0", true, false),
            rel("v3.2.0", false, true),
            rel("base-pro-v9.0.0", false, false),
            rel("v2.67.0", false, false),
        ];
        let (_, v) = pick_latest(&list, "v").unwrap();
        assert_eq!(v, "3.0.10");
        let (_, v) = pick_latest(&list, "base-pro-v").unwrap();
        assert_eq!(v, "9.0.0");
        assert!(pick_latest(&list, "x-").is_none());
    }

    #[test]
    fn compares_with_current() {
        assert!(is_newer("3.0.1", "3.0.0"));
        assert!(is_newer("3.10.0", "3.9.9"));
        assert!(!is_newer("3.0.0", "3.0.0"));
        assert!(!is_newer("2.67.0", "3.0.0"));
    }

    #[test]
    fn reads_sha_file() {
        let hex = "A".repeat(64);
        assert_eq!(parse_sha(&format!("{hex}  Teknesyum-Base.exe\n")), Some("a".repeat(64)));
        assert!(parse_sha("abc Teknesyum-Base.exe").is_none());
        assert!(parse_sha("").is_none());
    }

    #[test]
    fn sha_mismatch_removes_file() {
        let dir = scratch("sha");
        let f = dir.join("app.exe.new");
        std::fs::write(&f, b"payload").unwrap();
        let actual = format!("{:x}", Sha256::digest(b"payload"));
        assert!(finish_download(&f, &actual, Some(&actual.to_uppercase())).is_ok());
        assert!(f.exists());
        assert!(finish_download(&f, &actual, None).is_ok());
        let err = finish_download(&f, &actual, Some(&"0".repeat(64))).unwrap_err();
        assert_eq!(err.code, ErrorCode::Checksum);
        assert!(!f.exists());
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn cleans_old_and_new() {
        let dir = scratch("clean");
        let exe = dir.join("app.exe");
        std::fs::write(&exe, b"cur").unwrap();
        std::fs::write(sibling(&exe, ".old"), b"old").unwrap();
        std::fs::write(sibling(&exe, ".new"), b"new").unwrap();
        cleanup_leftovers(&exe);
        assert!(exe.exists());
        assert!(!sibling(&exe, ".old").exists());
        assert!(!sibling(&exe, ".new").exists());
        cleanup_leftovers(&exe);
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn swap_moves_files_and_replaces_stale_old() {
        let dir = scratch("swap");
        let exe = dir.join("app.exe");
        std::fs::write(&exe, b"v1").unwrap();
        std::fs::write(sibling(&exe, ".old"), b"v0").unwrap();
        std::fs::write(sibling(&exe, ".new"), b"v2").unwrap();
        swap_in(&exe).unwrap();
        assert_eq!(std::fs::read(&exe).unwrap(), b"v2");
        assert_eq!(std::fs::read(sibling(&exe, ".old")).unwrap(), b"v1");
        assert!(!sibling(&exe, ".new").exists());
        assert!(swap_in(&exe).is_err());
        assert_eq!(std::fs::read(&exe).unwrap(), b"v2");
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn dry_swap_leaves_real_exe_untouched() {
        let dir = scratch("dry-src");
        let out = scratch("dry-out");
        let exe = dir.join("Teknesyum-Base.exe");
        std::fs::write(&exe, b"current").unwrap();
        std::fs::write(sibling(&exe, ".new"), b"fresh").unwrap();
        let target = dry_swap(&exe, &out).unwrap();
        assert_eq!(target, out.join("Teknesyum-Base.exe"));
        assert_eq!(std::fs::read(&exe).unwrap(), b"current");
        assert!(!sibling(&exe, ".old").exists());
        assert!(!sibling(&exe, ".new").exists());
        assert_eq!(std::fs::read(&target).unwrap(), b"fresh");
        assert_eq!(std::fs::read(sibling(&target, ".old")).unwrap(), b"current");
        let _ = std::fs::remove_dir_all(dir);
        let _ = std::fs::remove_dir_all(out);
    }

    #[test]
    fn serializes_contract_shape() {
        let up = Updater::new();
        let v = serde_json::to_value(up.snapshot()).unwrap();
        assert_eq!(v["phase"], "idle");
        assert_eq!(v["current"], env!("CARGO_PKG_VERSION"));
        for key in ["latest", "notes", "percent", "message", "checkedAt", "dryRun"] {
            assert!(v.get(key).is_some(), "{key}");
        }
        let phases = [
            (UpdatePhase::Checking, "checking"),
            (UpdatePhase::Available, "available"),
            (UpdatePhase::Downloading, "downloading"),
            (UpdatePhase::Ready, "ready"),
            (UpdatePhase::Installing, "installing"),
            (UpdatePhase::Error, "error"),
        ];
        for (p, s) in phases {
            assert_eq!(serde_json::to_value(p).unwrap(), s);
        }
    }
}
