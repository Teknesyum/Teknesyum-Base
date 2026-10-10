use std::collections::HashMap;
use std::future::Future;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use tauri::{AppHandle, Emitter, Manager, State};

use crate::error::{AppError, AppResult, ErrorCode};
use crate::github::{self, GitHub};
use crate::installer::{self, Env, Task};
use crate::logic;
use crate::claude;
use crate::detect;
use crate::model::{AppInfo, Edition, InstallMethod, InstallState, Installed, Release, Repo, RepoList, TaskEvent, TaskKind};
use crate::paths::{read_json, write_json, Paths};
use crate::settings::{self, Settings};
use crate::store::{self, InstalledRecord};

pub const TASK_EVENT: &str = "task://progress";
pub const LIST_PROGRESS_EVENT: &str = "list://progress";

struct TaskEntry {
    full_name: String,
    cancel: Arc<AtomicBool>,
}

pub struct AppState {
    pub paths: Paths,
    http: reqwest::Client,
    token: Mutex<Option<String>>,
    settings: Mutex<Settings>,
    tasks: Mutex<HashMap<String, TaskEntry>>,
    counter: AtomicU64,
    scans: Mutex<Option<(Instant, String, Vec<InstalledRecord>)>>,
}

static GIT: OnceLock<bool> = OnceLock::new();
const SCAN_TTL: Duration = Duration::from_secs(30);

pub fn warm_git() {
    std::thread::spawn(|| {
        GIT.get_or_init(installer::git_available);
    });
}

fn lock<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

impl AppState {
    pub fn new() -> Self {
        let paths = Paths::detect();
        let _ = store::migrate_installed(&paths);
        let token = settings::token();
        let s = settings::load(&paths, token.is_some());
        Self {
            http: github::build_http(),
            token: Mutex::new(token),
            settings: Mutex::new(s),
            tasks: Mutex::new(HashMap::new()),
            counter: AtomicU64::new(1),
            scans: Mutex::new(None),
            paths,
        }
    }

    pub fn settings(&self) -> Settings {
        let mut s = lock(&self.settings).clone();
        s.has_token = lock(&self.token).is_some();
        s
    }

    pub fn running_tasks(&self) -> usize {
        lock(&self.tasks).len()
    }

    pub fn http(&self) -> reqwest::Client {
        self.http.clone()
    }

    pub fn token(&self) -> Option<String> {
        lock(&self.token).clone()
    }

    fn gh(&self) -> GitHub {
        GitHub::new(
            self.http.clone(),
            self.paths.cache.clone(),
            lock(&self.token).clone(),
        )
    }

    fn env(&self) -> Env {
        let s = self.settings();
        Env {
            paths: self.paths.clone(),
            gh: self.gh(),
            http: self.http.clone(),
            install_dir: PathBuf::from(s.install_dir),
            clone_dir: PathBuf::from(s.clone_dir),
            desktop_shortcut: s.desktop_shortcut,
        }
    }

    fn list_cache_file(&self, account: &str) -> PathBuf {
        self.paths
            .cache
            .join(format!("liste-{}.json", logic::safe_dir_name(&account.to_lowercase())))
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

fn targets_of(repos: &[Repo]) -> Vec<detect::Target> {
    repos
        .iter()
        .map(|r| detect::Target {
            owner: r.owner.clone(),
            name: r.name.clone(),
            manifest_name: r.manifest.as_ref().and_then(|m| m.name.clone()),
        })
        .collect()
}

fn scan_disk(paths: &Paths, install_dir: &Path, targets: &[detect::Target]) -> Vec<InstalledRecord> {
    let skip = vec![paths.shared.clone(), install_dir.to_path_buf()];
    let mut found = detect::detect_external(&paths.scan_roots, &skip, targets);
    found.extend(detect::detect_checkouts(&detect::shortcut_dirs(), targets));
    found
}

fn scan_key(install_dir: &Path, targets: &[detect::Target]) -> String {
    let mut names: Vec<String> = targets
        .iter()
        .map(|t| format!("{}/{}/{}", t.owner, t.name, t.manifest_name.as_deref().unwrap_or("")).to_lowercase())
        .collect();
    names.sort();
    format!("{}|{}", install_dir.display(), names.join(","))
}

impl AppState {
    fn installed_for(&self, targets: &[detect::Target]) -> Vec<InstalledRecord> {
        let install_dir = PathBuf::from(self.settings().install_dir);
        let key = scan_key(&install_dir, targets);
        let cached = lock(&self.scans)
            .as_ref()
            .filter(|(at, k, _)| *k == key && at.elapsed() < SCAN_TTL)
            .map(|(_, _, v)| v.clone());
        let found = match cached {
            Some(v) => v,
            None => {
                let v = scan_disk(&self.paths, &install_dir, targets);
                *lock(&self.scans) = Some((Instant::now(), key, v.clone()));
                v
            }
        };
        let mut extra: Vec<InstalledRecord> = detect::own_record().into_iter().collect();
        extra.extend(found);
        let mut all = store::merge_installed(store::load_installed(&self.paths), extra);
        if cfg!(feature = "pro") {
            let own = format!("/{}", detect::OWN_REPO.to_ascii_lowercase());
            all.retain(|r| !r.info.full_name.to_ascii_lowercase().ends_with(&own));
        }
        all
    }

    pub fn forget_lists(&self) {
        if let Ok(rd) = std::fs::read_dir(&self.paths.cache) {
            for e in rd.flatten() {
                let name = e.file_name().to_string_lossy().to_string();
                if name.starts_with("liste-") && name.ends_with(".json") {
                    let _ = std::fs::remove_file(e.path());
                }
            }
        }
    }

    pub fn forget_scans(&self) {
        *lock(&self.scans) = None;
    }

    fn known_targets(&self) -> Vec<detect::Target> {
        let s = self.settings();
        let mut accounts = vec![s.account.clone()];
        accounts.extend(s.extra_accounts.iter().cloned());
        let mut repos: Vec<Repo> = Vec::new();
        for a in accounts {
            if let Some(list) = read_json::<RepoList>(&self.list_cache_file(&a)) {
                repos.extend(list.repos);
            }
        }
        targets_of(&repos)
    }

    fn installed(&self) -> Vec<InstalledRecord> {
        self.installed_for(&self.known_targets())
    }

    fn find_installed(&self, full_name: &str) -> Option<InstalledRecord> {
        self.installed()
            .into_iter()
            .find(|r| r.info.full_name.eq_ignore_ascii_case(full_name))
    }
}

fn decorate(state: &AppState, list: &mut RepoList) {
    let paths = &state.paths;
    let installed = state.installed_for(&targets_of(&list.repos));
    let tags = store::load_tags(paths);
    for repo in &mut list.repos {
        let rec = installed
            .iter()
            .find(|r| r.info.full_name.eq_ignore_ascii_case(&repo.full_name));
        repo.install_state = logic::install_state(
            rec.map(|r| (r.info.method, r.info.tag.as_str())),
            repo.latest_tag.as_deref(),
        );
        if rec.is_some_and(detect::is_checkout_link) {
            repo.install_state = InstallState::Installed;
        }
        repo.installed_tag = rec
            .filter(|r| r.info.method != InstallMethod::Clone)
            .map(|r| r.info.tag.clone());
        repo.local_tags = store::tags_for(&tags, &repo.full_name);
        if let Some(plugin) = claude::plugin_of(&repo.name) {
            let latest = if plugin == "teknesyum-core" { list.core_latest.clone() } else { list.ui_latest.clone() };
            let have = claude::installed_version(plugin);
            repo.install_state = logic::install_state(
                have.as_deref().map(|v| (InstallMethod::External, v)),
                latest.as_deref(),
            );
            repo.installed_tag = have;
            repo.plugin = Some(plugin.to_string());
            repo.has_windows_asset = true;
        }
    }
    list.claude_code = claude::claude_exe().is_some();
}

fn check_part(v: &str, what: &str) -> AppResult<()> {
    let ok = !v.is_empty()
        && v.len() <= 100
        && v.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
        && v != "."
        && v != "..";
    if ok {
        Ok(())
    } else {
        Err(AppError::new(ErrorCode::NotFound, format!("Geçersiz {what}: {v}")))
    }
}

fn split_full(full: &str) -> AppResult<(String, String)> {
    let (o, n) = full
        .split_once('/')
        .ok_or_else(|| AppError::new(ErrorCode::NotFound, format!("Geçersiz depo adı: {full}")))?;
    check_part(o, "hesap adı")?;
    check_part(n, "depo adı")?;
    Ok((o.to_string(), n.to_string()))
}

fn start_task<F, Fut>(app: &AppHandle, state: &AppState, full_name: String, kind: TaskKind, work: F) -> AppResult<String>
where
    F: FnOnce(Env, Task) -> Fut + Send + 'static,
    Fut: Future<Output = AppResult<String>> + Send + 'static,
{
    let cancel = Arc::new(AtomicBool::new(false));
    let id = {
        let mut tasks = lock(&state.tasks);
        if tasks
            .values()
            .any(|t| t.full_name.eq_ignore_ascii_case(&full_name))
        {
            return Err(AppError::unknown(format!("{full_name} için süren bir iş var.")));
        }
        let id = format!(
            "t{}-{}",
            chrono::Utc::now().timestamp_millis(),
            state.counter.fetch_add(1, Ordering::Relaxed)
        );
        tasks.insert(
            id.clone(),
            TaskEntry {
                full_name: full_name.clone(),
                cancel: cancel.clone(),
            },
        );
        id
    };
    let emit_app = app.clone();
    let emitter: installer::Emitter = Arc::new(move |ev: TaskEvent| {
        let _ = emit_app.emit(TASK_EVENT, ev);
    });
    let task = Task::new(id.clone(), full_name, kind, cancel, emitter);
    let env = state.env();
    let app = app.clone();
    let task_id = id.clone();
    tauri::async_runtime::spawn(async move {
        let result = work(env, task.clone()).await;
        let st = app.state::<AppState>();
        st.forget_scans();
        lock(&st.tasks).remove(&task_id);
        task.finish(result);
    });
    Ok(id)
}

#[tauri::command]
pub async fn app_info() -> AppResult<AppInfo> {
    let git = tauri::async_runtime::spawn_blocking(|| *GIT.get_or_init(installer::git_available))
        .await
        .unwrap_or(false);
    Ok(AppInfo {
        edition: if cfg!(feature = "pro") {
            Edition::Pro
        } else {
            Edition::Normal
        },
        version: env!("CARGO_PKG_VERSION").to_string(),
        git_available: git,
        kare: std::env::args().find_map(|a| a.strip_prefix("--kare=").map(str::to_string)),
    })
}

#[tauri::command]
pub async fn list_repos(
    app: AppHandle,
    state: State<'_, AppState>,
    account: Option<String>,
    force: bool,
    auto: Option<bool>,
) -> AppResult<RepoList> {
    let account = account
        .map(|a| a.trim().to_string())
        .filter(|a| !a.is_empty())
        .unwrap_or_else(|| state.settings().account);
    check_part(&account, "hesap adı")?;
    let emit_app = app.clone();
    let gh = state.gh().with_progress(Arc::new(move |done, total| {
        let _ = emit_app.emit(LIST_PROGRESS_EVENT, serde_json::json!({ "done": done, "total": total }));
    }));
    let mut list = load_list(
        &gh,
        &state.paths.cache,
        &state.list_cache_file(&account),
        &account,
        force,
        auto.unwrap_or(false),
    )
    .await?;
    let list = tauri::async_runtime::spawn_blocking(move || {
        decorate(&app.state::<AppState>(), &mut list);
        list
    })
    .await
    .map_err(|e| AppError::unknown(e.to_string()))?;
    Ok(list)
}

pub async fn load_list(
    gh: &GitHub,
    cache_dir: &Path,
    cache_file: &Path,
    account: &str,
    force: bool,
    auto: bool,
) -> AppResult<RepoList> {
    let cached = read_json::<RepoList>(cache_file);
    let authed = gh.has_token();
    let rate_file = store::rate_file(cache_dir, authed);
    let now = chrono::Utc::now().timestamp();
    let current = cached.as_ref().is_some_and(|l| l.app_version == env!("CARGO_PKG_VERSION"));
    let stay_offline = match &cached {
        Some(_) if !force => true,
        Some(_) if !current => false,
        Some(list) => store::list_is_fresh(&list.fetched_at, now, store::list_window(authed, auto)),
        None => false,
    };
    if stay_offline {
        if let Some(mut list) = cached {
            list.from_cache = true;
            if let Some(snap) = store::load_rate(&rate_file, now) {
                list.rate_remaining = Some(snap.remaining);
                list.rate_reset_at = snap.reset_iso();
            }
            return Ok(list);
        }
    }
    let budget = match gh.core_budget().await {
        Some(snap) => {
            let _ = store::save_rate(&rate_file, &snap);
            Some(snap)
        }
        None => store::load_rate(&rate_file, now),
    };
    if let Some(snap) = budget {
        let cost = store::refresh_cost(cached.as_ref(), cache_dir, authed, now);
        let short = if cached.is_some() {
            !store::budget_allows(snap.remaining, cost)
        } else {
            snap.remaining == 0
        };
        if short {
            if let Some(list) = cached {
                return Ok(store::budget_skip(list, &snap));
            }
            let when = snap
                .reset_iso()
                .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
                .map(|d| d.with_timezone(&chrono::Local).format("%H:%M").to_string())
                .unwrap_or_default();
            return Err(AppError::new(
                ErrorCode::RateLimit,
                format!("GitHub istek sınırı doldu. Sınır {when} saatinde sıfırlanır."),
            ));
        }
    }
    let result = gh.repo_details(account).await;
    let rate = gh.rate();
    if let Some(snap) = rate
        .remaining
        .and_then(|r| store::RateSnapshot::from_iso(r, rate.reset_at.as_deref(), now))
    {
        let _ = store::save_rate(&rate_file, &snap);
    }
    let details = match result {
        Ok(d) => d,
        Err(err) => {
            return store::list_fallback(err, cached, rate.reset_at);
        }
    };
    let repos = details.iter().map(github::to_repo).collect();
    let mut list = github::new_list(account, repos, rate);
    list.ui_latest = gh.ui_latest().await.or_else(|| cached.as_ref().and_then(|c| c.ui_latest.clone()));
    list.core_latest = gh.core_latest().await.or_else(|| cached.as_ref().and_then(|c| c.core_latest.clone()));
    let _ = write_json(cache_file, &list);
    Ok(list)
}

#[tauri::command]
pub async fn repo_readme(state: State<'_, AppState>, owner: String, name: String, path: Option<String>) -> AppResult<String> {
    check_part(&owner, "hesap adı")?;
    check_part(&name, "depo adı")?;
    if let Some(p) = &path {
        if !crate::github::doc_path_ok(p) {
            return Err(AppError::new(ErrorCode::NotFound, format!("Geçersiz belge yolu: {p}")));
        }
    }
    state.gh().readme(&owner, &name, path.as_deref()).await
}

#[tauri::command]
pub async fn repo_media(
    state: State<'_, AppState>,
    owner: String,
    name: String,
    private: bool,
    path: String,
) -> AppResult<tauri::ipc::Response> {
    check_part(&owner, "hesap adı")?;
    check_part(&name, "depo adı")?;
    let bytes = state
        .gh()
        .media(&owner, &name, private, &path)
        .await?
        .ok_or_else(|| AppError::new(ErrorCode::NotFound, "Görsel bulunamadı."))?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
pub async fn desktop_shortcut(state: State<'_, AppState>, full_name: String) -> AppResult<()> {
    split_full(&full_name)?;
    let rec = state
        .find_installed(&full_name)
        .ok_or_else(|| AppError::new(ErrorCode::NotFound, "Bu program kurulu görünmüyor."))?;
    let exe = rec
        .info
        .exe
        .ok_or_else(|| AppError::io("Programın exe dosyası bilinmiyor; kısayol yazılamadı."))?;
    installer::write_desktop_shortcut(&full_name, Path::new(&exe)).map(|_| ())
}

#[tauri::command]
pub async fn repo_releases(state: State<'_, AppState>, owner: String, name: String) -> AppResult<Vec<Release>> {
    check_part(&owner, "hesap adı")?;
    check_part(&name, "depo adı")?;
    state.gh().releases(&owner, &name).await
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> AppResult<Settings> {
    Ok(state.settings())
}

#[tauri::command]
pub async fn save_settings(state: State<'_, AppState>, settings: Settings) -> AppResult<Settings> {
    let has_token = lock(&state.token).is_some();
    let clean = settings.normalize(&state.paths, has_token);
    check_part(&clean.account, "hesap adı")?;
    for a in &clean.extra_accounts {
        check_part(a, "hesap adı")?;
    }
    settings::save(&state.paths, &clean)?;
    *lock(&state.settings) = clean;
    Ok(state.settings())
}

#[tauri::command]
pub async fn set_token(state: State<'_, AppState>, token: String) -> AppResult<Settings> {
    let token = token.trim().to_string();
    if token.is_empty() || token.chars().any(char::is_whitespace) {
        return Err(AppError::new(ErrorCode::Auth, "Token boş ya da geçersiz."));
    }
    if cfg!(feature = "pro") {
        return Err(AppError::new(ErrorCode::Auth, "Pro'nun anahtarı exe içinde; buradan değiştirilmez."));
    }
    settings::write_token(&token)?;
    *lock(&state.token) = Some(token);
    Ok(state.settings())
}

#[tauri::command]
pub async fn clear_token(state: State<'_, AppState>) -> AppResult<Settings> {
    if cfg!(feature = "pro") {
        return Err(AppError::new(ErrorCode::Auth, "Pro'nun anahtarı exe içinde; buradan silinmez."));
    }
    settings::delete_token()?;
    *lock(&state.token) = None;
    Ok(state.settings())
}

#[tauri::command]
pub async fn list_installed(state: State<'_, AppState>) -> AppResult<Vec<Installed>> {
    Ok(state
        .installed()
        .into_iter()
        .map(|r| {
            let mut info = r.info;
            info.desktop_shortcut = installer::desktop_lnk(&info.full_name).is_some_and(|l| l.exists());
            info
        })
        .collect())
}

#[tauri::command]
pub async fn install_repo(
    app: AppHandle,
    state: State<'_, AppState>,
    owner: String,
    name: String,
    with_claude: Option<bool>,
    prereqs: Option<bool>,
) -> AppResult<String> {
    check_part(&owner, "hesap adı")?;
    check_part(&name, "depo adı")?;
    let full = format!("{owner}/{name}");
    if let Some(plugin) = claude::plugin_of(&name) {
        let kind = if claude::installed_version(plugin).is_some() { TaskKind::Update } else { TaskKind::Install };
        let with_claude = with_claude.unwrap_or(false);
        return start_task(&app, &state, full, kind, move |_env, task| async move {
            tauri::async_runtime::spawn_blocking(move || claude::install_plugin(&task, plugin, with_claude))
                .await
                .map_err(|e| AppError::unknown(e.to_string()))?
        });
    }
    let existing = state.find_installed(&full);
    let prefer_setup = matches!(&existing, Some(r) if r.info.method == InstallMethod::External);
    let kind = match existing {
        Some(r) if r.info.method != InstallMethod::Clone => TaskKind::Update,
        _ => TaskKind::Install,
    };
    let prereqs = prereqs.unwrap_or(false);
    start_task(&app, &state, full, kind, move |env, task| async move {
        if prereqs {
            with_prereqs(&env, &task, &owner, &name, false).await?;
        }
        installer::install(env, task, owner, name, prefer_setup).await
    })
}

async fn prereq_ids(gh: &crate::github::GitHub, owner: &str, name: &str, clone: bool) -> Vec<String> {
    let mut ids = gh
        .manifest(owner, name, false)
        .await
        .ok()
        .flatten()
        .and_then(|m| m.requires)
        .unwrap_or_default();
    if clone {
        ids.insert(0, "git".to_string());
    }
    ids
}

async fn with_prereqs(env: &Env, task: &installer::Task, owner: &str, name: &str, clone: bool) -> AppResult<()> {
    let ids = prereq_ids(&env.gh, owner, name, clone).await;
    let scratch = env.install_dir.join(".teknesyum-tmp").join(format!("{}-onkosul", task.id));
    let r = crate::prereq::install_missing(env, task, &ids, &scratch).await;
    let _ = std::fs::remove_dir_all(&scratch);
    r
}

#[tauri::command]
pub async fn repo_keys(state: State<'_, AppState>, full_names: Vec<String>) -> AppResult<Vec<crate::repokey::KeyStatus>> {
    let http = state.http.clone();
    let checks = full_names.into_iter().map(|full_name| {
        let http = http.clone();
        async move {
            let state = crate::repokey::check(&http, &full_name).await;
            crate::repokey::KeyStatus { full_name, state }
        }
    });
    Ok(futures_util::future::join_all(checks).await)
}

#[tauri::command]
pub async fn user_repo_keys(state: State<'_, AppState>) -> AppResult<Vec<crate::repokey::KeyStatus>> {
    let names = crate::repokey::user_repos();
    repo_keys(state, names).await
}

#[tauri::command]
pub async fn add_repo_key(state: State<'_, AppState>, key: String) -> AppResult<Vec<String>> {
    let found = crate::repokey::add(&state.http, &key).await?;
    if !found.is_empty() {
        state.forget_lists();
    }
    Ok(found)
}

#[tauri::command]
pub async fn remove_repo_key(state: State<'_, AppState>, full_name: String) -> AppResult<()> {
    crate::repokey::remove(&full_name)?;
    state.forget_lists();
    Ok(())
}

#[tauri::command]
pub async fn drive_list(state: State<'_, AppState>) -> AppResult<Vec<crate::drive::DriveItem>> {
    Ok(crate::drive::list(&state.paths))
}

#[tauri::command]
pub async fn drive_add(state: State<'_, AppState>, link: String) -> AppResult<crate::drive::DriveItem> {
    crate::drive::add(&state.http, &state.paths, &link).await
}

#[tauri::command]
pub async fn drive_remove(state: State<'_, AppState>, id: String) -> AppResult<()> {
    crate::drive::remove(&state.paths, &id)
}

#[tauri::command]
pub async fn drive_download(app: AppHandle, state: State<'_, AppState>, id: String) -> AppResult<String> {
    crate::drive::start(app, state.http.clone(), &state.paths, id)
}

#[tauri::command]
pub async fn drive_reveal(app: AppHandle, path: String) -> AppResult<()> {
    use tauri_plugin_opener::OpenerExt;
    let target = PathBuf::from(&path);
    if !crate::drive::revealable(&target) {
        return Err(AppError::io("Yalnız İndirilenler klasöründeki dosyalar gösterilebilir."));
    }
    let r = if target.is_file() {
        app.opener().reveal_item_in_dir(&target)
    } else {
        app.opener().open_path(crate::drive::downloads_dir().to_string_lossy(), None::<&str>)
    };
    r.map_err(|e| AppError::io(format!("Klasör açılamadı: {e}")))
}

#[tauri::command]
pub async fn missing_prereqs(
    state: State<'_, AppState>,
    owner: String,
    name: String,
    clone: bool,
) -> AppResult<Vec<crate::prereq::PrereqInfo>> {
    check_part(&owner, "hesap adı")?;
    check_part(&name, "depo adı")?;
    if claude::plugin_of(&name).is_some() {
        return Ok(Vec::new());
    }
    let ids = prereq_ids(&state.gh(), &owner, &name, clone).await;
    Ok(tauri::async_runtime::spawn_blocking(move || crate::prereq::missing(&ids))
        .await
        .unwrap_or_default())
}

#[tauri::command]
pub async fn uninstall_repo(app: AppHandle, state: State<'_, AppState>, full_name: String) -> AppResult<String> {
    let (_, name) = split_full(&full_name)?;
    if let Some(plugin) = claude::plugin_of(&name) {
        if claude::installed_version(plugin).is_none() {
            return Err(AppError::new(ErrorCode::NotFound, "Bu eklenti kurulu görünmüyor."));
        }
        return start_task(&app, &state, full_name, TaskKind::Uninstall, move |_env, task| async move {
            tauri::async_runtime::spawn_blocking(move || claude::uninstall_plugin(&task, plugin))
                .await
                .map_err(|e| AppError::unknown(e.to_string()))?
        });
    }
    let rec = state
        .find_installed(&full_name)
        .ok_or_else(|| AppError::new(ErrorCode::NotFound, "Bu program kurulu görünmüyor."))?;
    if detect::is_checkout_link(&rec) {
        return Err(AppError::io(
            "Bu program kaynak klasöründen çalışıyor; Base bu klasörü silmez. Kısayolu ve klasörü elle kaldırın.",
        ));
    }
    if rec.info.method != InstallMethod::Clone && detect::is_running_from(Path::new(&rec.info.path)) {
        return Err(AppError::io(installer::SELF_UNINSTALL));
    }
    start_task(&app, &state, full_name, TaskKind::Uninstall, move |env, task| {
        installer::uninstall(env, task, rec)
    })
}

#[tauri::command]
pub async fn clone_repo(
    app: AppHandle,
    state: State<'_, AppState>,
    owner: String,
    name: String,
    prereqs: Option<bool>,
) -> AppResult<String> {
    check_part(&owner, "hesap adı")?;
    check_part(&name, "depo adı")?;
    let prereqs = prereqs.unwrap_or(false);
    let git = prereqs
        || tauri::async_runtime::spawn_blocking(installer::git_available)
            .await
            .unwrap_or(false);
    if !git {
        return Err(AppError::new(
            ErrorCode::GitMissing,
            "Git bulunamadı. Klonlamak için Git for Windows kurun.",
        ));
    }
    let full = format!("{owner}/{name}");
    start_task(&app, &state, full, TaskKind::Clone, move |env, task| async move {
        if prereqs {
            with_prereqs(&env, &task, &owner, &name, true).await?;
        }
        installer::clone(env, task, owner, name).await
    })
}

#[tauri::command]
pub async fn cancel_task(state: State<'_, AppState>, task_id: String) -> AppResult<()> {
    if let Some(t) = lock(&state.tasks).get(&task_id) {
        t.cancel.store(true, Ordering::Relaxed);
    }
    Ok(())
}

#[tauri::command]
pub async fn launch_installed(state: State<'_, AppState>, full_name: String) -> AppResult<()> {
    let rec = state
        .find_installed(&full_name)
        .ok_or_else(|| AppError::new(ErrorCode::NotFound, "Bu program kurulu görünmüyor."))?;
    let mut exe = rec
        .info
        .exe
        .as_deref()
        .map(PathBuf::from)
        .filter(|p| p.is_file())
        .ok_or_else(|| {
            AppError::new(
                ErrorCode::NotFound,
                "Bu program için başlatılacak dosya bilinmiyor; Başlat menüsünden açın.",
            )
        })?;
    if rec.info.method == InstallMethod::Zip {
        if let Ok((owner, name)) = split_full(&rec.info.full_name) {
            let gh = state.gh();
            let run = tokio::time::timeout(std::time::Duration::from_secs(3), gh.manifest(&owner, &name, false))
                .await
                .ok()
                .and_then(|r| r.ok())
                .flatten()
                .and_then(|m| m.run);
            if let Some(fixed) = installer::run_target(Path::new(&rec.info.path), &exe, run.as_deref()) {
                let _ = installer::repair_exe(&state.paths, rec.clone(), &fixed);
                exe = fixed;
            }
        }
    }
    if !installer::is_program(&exe) {
        return tauri_plugin_opener::open_path(exe.to_string_lossy().as_ref(), None::<&str>)
            .map_err(|e| AppError::io(format!("Program açılamadı: {e}")));
    }
    let dir = exe.parent().map(Path::to_path_buf).unwrap_or_default();
    let mut cmd = std::process::Command::new(&exe);
    cmd.current_dir(dir);
    crate::repokey::lend(&mut cmd, &rec.info.full_name);
    cmd.spawn()
        .map_err(|e| AppError::io(format!("Program başlatılamadı: {e}")))?;
    Ok(())
}

#[tauri::command]
pub async fn set_local_tags(state: State<'_, AppState>, full_name: String, tags: Vec<String>) -> AppResult<()> {
    split_full(&full_name)?;
    store::set_tags(&state.paths, &full_name, tags)
}

#[tauri::command]
pub async fn open_path(app: AppHandle, state: State<'_, AppState>, path: String) -> AppResult<()> {
    let s = state.settings();
    let target = PathBuf::from(&path);
    let install = PathBuf::from(&s.install_dir);
    let clone = PathBuf::from(&s.clone_dir);
    let known: Vec<PathBuf> = state.installed().into_iter().map(|r| PathBuf::from(r.info.path)).collect();
    let mut roots: Vec<&Path> = vec![install.as_path(), clone.as_path()];
    roots.extend(known.iter().filter(|p| !p.as_os_str().is_empty()).map(|p| p.as_path()));
    if !installer::path_allowed(&target, &roots) {
        return Err(AppError::io(
            "Yalnız kurulum ve klon klasörlerinin altındaki yollar açılabilir.",
        ));
    }
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_path(target.to_string_lossy(), None::<&str>)
        .map_err(|e| AppError::io(format!("Klasör açılamadı: {e}")))
}

