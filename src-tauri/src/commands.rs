use std::collections::HashMap;
use std::future::Future;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Emitter, Manager, State};

use crate::error::{AppError, AppResult, ErrorCode};
use crate::github::{self, GitHub};
use crate::installer::{self, Env, Task};
use crate::logic;
use crate::detect;
use crate::model::{AppInfo, Edition, InstallMethod, Installed, Release, Repo, RepoList, TaskEvent, TaskKind};
use crate::paths::{read_json, write_json, Paths};
use crate::settings::{self, Settings};
use crate::store::{self, InstalledRecord};

pub const TASK_EVENT: &str = "task://progress";

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
}

fn lock<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

impl AppState {
    pub fn new() -> Self {
        let paths = Paths::detect();
        let _ = store::migrate_installed(&paths);
        let token = settings::read_token();
        let s = settings::load(&paths, token.is_some());
        Self {
            http: github::build_http(),
            token: Mutex::new(token),
            settings: Mutex::new(s),
            tasks: Mutex::new(HashMap::new()),
            counter: AtomicU64::new(1),
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

pub fn installed_view(paths: &Paths, install_dir: &Path, targets: &[detect::Target]) -> Vec<InstalledRecord> {
    let skip = vec![paths.shared.clone(), install_dir.to_path_buf()];
    let mut extra: Vec<InstalledRecord> = detect::own_record().into_iter().collect();
    extra.extend(detect::detect_external(&paths.scan_roots, &skip, targets));
    store::merge_installed(store::load_installed(paths), extra)
}

impl AppState {
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
        let install_dir = PathBuf::from(self.settings().install_dir);
        installed_view(&self.paths, &install_dir, &self.known_targets())
    }

    fn find_installed(&self, full_name: &str) -> Option<InstalledRecord> {
        self.installed()
            .into_iter()
            .find(|r| r.info.full_name.eq_ignore_ascii_case(full_name))
    }
}

fn decorate(state: &AppState, list: &mut RepoList) {
    let paths = &state.paths;
    let install_dir = PathBuf::from(state.settings().install_dir);
    let installed = installed_view(paths, &install_dir, &targets_of(&list.repos));
    let tags = store::load_tags(paths);
    for repo in &mut list.repos {
        let rec = installed
            .iter()
            .find(|r| r.info.full_name.eq_ignore_ascii_case(&repo.full_name));
        repo.install_state = logic::install_state(
            rec.map(|r| (r.info.method, r.info.tag.as_str())),
            repo.latest_tag.as_deref(),
        );
        repo.installed_tag = rec
            .filter(|r| r.info.method != InstallMethod::Clone)
            .map(|r| r.info.tag.clone());
        repo.local_tags = store::tags_for(&tags, &repo.full_name);
    }
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
        lock(&app.state::<AppState>().tasks).remove(&task_id);
        task.finish(result);
    });
    Ok(id)
}

#[tauri::command]
pub async fn app_info() -> AppResult<AppInfo> {
    let git = tauri::async_runtime::spawn_blocking(installer::git_available)
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
    })
}

#[tauri::command]
pub async fn list_repos(
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
    let gh = state.gh();
    let mut list = load_list(
        &gh,
        &state.paths.cache,
        &state.list_cache_file(&account),
        &account,
        force,
        auto.unwrap_or(false),
    )
    .await?;
    decorate(&state, &mut list);
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
    let stay_offline = match &cached {
        Some(_) if !force => true,
        Some(list) => auto && store::list_is_fresh(&list.fetched_at, now),
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
pub async fn repo_readme(state: State<'_, AppState>, owner: String, name: String) -> AppResult<String> {
    check_part(&owner, "hesap adı")?;
    check_part(&name, "depo adı")?;
    state.gh().readme(&owner, &name).await
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
    settings::write_token(&token)?;
    *lock(&state.token) = Some(token);
    Ok(state.settings())
}

#[tauri::command]
pub async fn clear_token(state: State<'_, AppState>) -> AppResult<Settings> {
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
pub async fn install_repo(app: AppHandle, state: State<'_, AppState>, owner: String, name: String) -> AppResult<String> {
    check_part(&owner, "hesap adı")?;
    check_part(&name, "depo adı")?;
    let full = format!("{owner}/{name}");
    let existing = state.find_installed(&full);
    let prefer_setup = matches!(&existing, Some(r) if r.info.method == InstallMethod::External);
    let kind = match existing {
        Some(r) if r.info.method != InstallMethod::Clone => TaskKind::Update,
        _ => TaskKind::Install,
    };
    start_task(&app, &state, full, kind, move |env, task| {
        installer::install(env, task, owner, name, prefer_setup)
    })
}

#[tauri::command]
pub async fn uninstall_repo(app: AppHandle, state: State<'_, AppState>, full_name: String) -> AppResult<String> {
    split_full(&full_name)?;
    let rec = state
        .find_installed(&full_name)
        .ok_or_else(|| AppError::new(ErrorCode::NotFound, "Bu program kurulu görünmüyor."))?;
    if rec.info.method != InstallMethod::Clone && detect::is_running_from(Path::new(&rec.info.path)) {
        return Err(AppError::io(installer::SELF_UNINSTALL));
    }
    start_task(&app, &state, full_name, TaskKind::Uninstall, move |env, task| {
        installer::uninstall(env, task, rec)
    })
}

#[tauri::command]
pub async fn clone_repo(app: AppHandle, state: State<'_, AppState>, owner: String, name: String) -> AppResult<String> {
    check_part(&owner, "hesap adı")?;
    check_part(&name, "depo adı")?;
    let git = tauri::async_runtime::spawn_blocking(installer::git_available)
        .await
        .unwrap_or(false);
    if !git {
        return Err(AppError::new(
            ErrorCode::GitMissing,
            "Git bulunamadı. Klonlamak için Git for Windows kurun.",
        ));
    }
    let full = format!("{owner}/{name}");
    start_task(&app, &state, full, TaskKind::Clone, move |env, task| {
        installer::clone(env, task, owner, name)
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
    let exe = rec
        .info
        .exe
        .map(PathBuf::from)
        .filter(|p| p.is_file())
        .ok_or_else(|| {
            AppError::new(
                ErrorCode::NotFound,
                "Bu program için başlatılacak dosya bilinmiyor; Başlat menüsünden açın.",
            )
        })?;
    let dir = exe.parent().map(Path::to_path_buf).unwrap_or_default();
    std::process::Command::new(&exe)
        .current_dir(dir)
        .spawn()
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

