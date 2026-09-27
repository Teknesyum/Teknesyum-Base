use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use reqwest::header::{ACCEPT, AUTHORIZATION, USER_AGENT};
use sha2::{Digest, Sha256};

use crate::detect;
use crate::error::{AppError, AppResult, ErrorCode};
use crate::github::{GhAsset, GitHub, UA};
use crate::logic::{self, AssetKind};
use crate::model::{InstallMethod, Installed, TaskEvent, TaskKind, TaskStatus, TaskStep};
use crate::paths::{now_iso, Paths};
use crate::store::{self, InstalledRecord};

pub type Emitter = Arc<dyn Fn(TaskEvent) + Send + Sync>;

#[derive(Clone)]
pub struct Env {
    pub paths: Paths,
    pub gh: GitHub,
    pub http: reqwest::Client,
    pub install_dir: PathBuf,
    pub clone_dir: PathBuf,
    pub desktop_shortcut: bool,
}

#[derive(Clone)]
pub struct Task {
    pub id: String,
    pub full_name: String,
    pub kind: TaskKind,
    pub cancel: Arc<AtomicBool>,
    emit: Emitter,
}

impl Task {
    pub fn new(id: String, full_name: String, kind: TaskKind, cancel: Arc<AtomicBool>, emit: Emitter) -> Self {
        Self {
            id,
            full_name,
            kind,
            cancel,
            emit,
        }
    }

    fn send(&self, step: TaskStep, percent: u8, message: &str, status: TaskStatus, log: bool) {
        (self.emit)(TaskEvent {
            task_id: self.id.clone(),
            full_name: self.full_name.clone(),
            kind: self.kind,
            step,
            percent: percent.min(100),
            message: message.to_string(),
            status,
            log_line: log.then(|| message.to_string()),
        });
    }

    pub fn log(&self, step: TaskStep, percent: u8, line: &str) {
        self.send(step, percent, line, TaskStatus::Running, true);
    }

    fn progress(&self, step: TaskStep, percent: u8, message: &str) {
        self.send(step, percent, message, TaskStatus::Running, false);
    }

    pub fn check(&self) -> AppResult<()> {
        if self.cancel.load(Ordering::Relaxed) {
            Err(AppError::cancelled())
        } else {
            Ok(())
        }
    }

    pub fn finish(&self, result: AppResult<String>) {
        match result {
            Ok(msg) => self.send(TaskStep::Done, 100, &msg, TaskStatus::Done, true),
            Err(e) if e.code == ErrorCode::Cancelled => {
                self.send(TaskStep::Done, 0, &e.message, TaskStatus::Cancelled, true)
            }
            Err(e) => self.send(TaskStep::Done, 0, &e.message, TaskStatus::Error, true),
        }
    }
}

struct TempDir(PathBuf);

impl Drop for TempDir {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
        if let Some(parent) = self.0.parent() {
            let _ = fs::remove_dir(parent);
        }
    }
}

fn mb(bytes: u64) -> String {
    format!("{:.1} MB", bytes as f64 / 1_048_576.0)
}

fn lerp(from: u8, to: u8, done: u64, total: u64) -> u8 {
    if total == 0 {
        return from;
    }
    let ratio = (done as f64 / total as f64).clamp(0.0, 1.0);
    from + ((to - from) as f64 * ratio) as u8
}

pub fn probe_writable(dir: &Path) -> AppResult<()> {
    fs::create_dir_all(dir).map_err(|e| {
        AppError::io(format!("Klasör oluşturulamadı ({}): {e}", dir.display()))
    })?;
    let probe = dir.join(".teknesyum-yazma-denemesi");
    fs::write(&probe, b"ok").map_err(|e| {
        AppError::io(format!(
            "Kurulum klasörüne yazılamıyor ({}): {e}. Ayarlardan başka bir klasör seçin.",
            dir.display()
        ))
    })?;
    let _ = fs::remove_file(probe);
    Ok(())
}

fn is_within(child: &Path, root: &Path) -> bool {
    match (dunce(child), dunce(root)) {
        (Some(c), Some(r)) => c.starts_with(&r) && c != r,
        _ => false,
    }
}

fn dunce(p: &Path) -> Option<PathBuf> {
    let c = fs::canonicalize(p).ok()?;
    let s = c.to_string_lossy();
    Some(PathBuf::from(s.strip_prefix(r"\\?\").unwrap_or(&s).to_string()))
}

pub fn path_allowed(path: &Path, roots: &[&Path]) -> bool {
    let Some(target) = dunce(path) else {
        return false;
    };
    roots
        .iter()
        .filter_map(|r| dunce(r))
        .any(|r| target.starts_with(&r))
}

async fn download(
    env: &Env,
    task: &Task,
    asset: &GhAsset,
    dest: &Path,
    from: u8,
    to: u8,
) -> AppResult<String> {
    let authed = env.gh.has_token() && asset.id != 0;
    let mut req = env.http.get(if authed {
        asset.url.as_str()
    } else {
        asset.browser_download_url.as_str()
    });
    req = req.header(USER_AGENT, UA);
    if let Some(token) = env.gh.token().filter(|_| authed) {
        req = req
            .header(AUTHORIZATION, format!("Bearer {token}"))
            .header(ACCEPT, "application/octet-stream");
    }
    let resp = req.send().await?;
    if !resp.status().is_success() {
        return Err(AppError::new(
            ErrorCode::Network,
            format!("Dosya indirilemedi: HTTP {}", resp.status().as_u16()),
        ));
    }
    let total = resp.content_length().unwrap_or(asset.size);
    let mut file = fs::File::create(dest)?;
    let mut hasher = Sha256::new();
    let mut done: u64 = 0;
    let mut last = Instant::now();
    let mut stream = resp.bytes_stream();
    while let Some(chunk) = stream.next().await {
        task.check()?;
        let chunk = chunk?;
        file.write_all(&chunk)?;
        hasher.update(&chunk);
        done += chunk.len() as u64;
        if last.elapsed() >= Duration::from_millis(120) {
            last = Instant::now();
            task.progress(
                TaskStep::Download,
                lerp(from, to, done, total),
                &format!("İndiriliyor: {} / {}", mb(done), mb(total)),
            );
        }
    }
    file.flush()?;
    drop(file);
    task.log(TaskStep::Download, to, &format!("İndirme bitti: {}", mb(done)));
    Ok(hasher
        .finalize()
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect())
}

async fn fetch_text(env: &Env, asset: &GhAsset) -> AppResult<String> {
    let mut req = env.http.get(if env.gh.has_token() {
        asset.url.as_str()
    } else {
        asset.browser_download_url.as_str()
    });
    req = req.header(USER_AGENT, UA);
    if let Some(token) = env.gh.token() {
        req = req
            .header(AUTHORIZATION, format!("Bearer {token}"))
            .header(ACCEPT, "application/octet-stream");
    }
    let resp = req.send().await?;
    if !resp.status().is_success() {
        return Err(AppError::new(
            ErrorCode::Network,
            format!("Sağlama dosyası indirilemedi: HTTP {}", resp.status().as_u16()),
        ));
    }
    Ok(resp.text().await?)
}

fn extract_zip(zip_path: &Path, out: &Path, cancel: &AtomicBool) -> AppResult<()> {
    let file = fs::File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file)?;
    fs::create_dir_all(out)?;
    for i in 0..archive.len() {
        if cancel.load(Ordering::Relaxed) {
            return Err(AppError::cancelled());
        }
        let mut entry = archive.by_index(i)?;
        let Some(rel) = entry.enclosed_name() else {
            continue;
        };
        let target = out.join(rel);
        if entry.is_dir() {
            fs::create_dir_all(&target)?;
            continue;
        }
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)?;
        }
        let mut dst = fs::File::create(&target)?;
        let mut buf = vec![0u8; 64 * 1024];
        loop {
            let n = entry.read(&mut buf)?;
            if n == 0 {
                break;
            }
            dst.write_all(&buf[..n])?;
        }
    }
    Ok(())
}

fn single_root(dir: &Path) -> PathBuf {
    let entries: Vec<_> = fs::read_dir(dir)
        .map(|r| r.filter_map(Result::ok).collect())
        .unwrap_or_default();
    if entries.len() == 1 && entries[0].path().is_dir() {
        entries[0].path()
    } else {
        dir.to_path_buf()
    }
}

fn find_main_exe(dir: &Path, repo: &str, run: Option<&str>) -> Option<PathBuf> {
    if let Some(run) = run.map(str::trim).filter(|r| !r.is_empty()) {
        let p = dir.join(run.trim_start_matches(['/', '\\']));
        if p.is_file() {
            return Some(p);
        }
    }
    let mut exes = Vec::new();
    detect::collect_runnables(dir, dir, 3, &mut exes);
    logic::pick_main_exe(repo, &exes).map(|rel| dir.join(rel))
}

fn swap_into(stage: &Path, target: &Path, scratch: &Path) -> AppResult<()> {
    let backup = scratch.join("onceki");
    let had_old = target.exists();
    if had_old {
        fs::rename(target, &backup).map_err(|e| {
            AppError::io(format!(
                "Eski sürüm taşınamadı; program açık olabilir, kapatıp yeniden deneyin. ({e})"
            ))
        })?;
    }
    if let Err(e) = fs::rename(stage, target) {
        if had_old {
            let _ = fs::rename(&backup, target);
        }
        return Err(AppError::io(format!("Dosyalar yerine konamadı: {e}")));
    }
    Ok(())
}

#[cfg(windows)]
fn no_window(cmd: &mut Command) {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(0x0800_0000);
}

#[cfg(not(windows))]
fn no_window(_cmd: &mut Command) {}

pub fn git_available() -> bool {
    let mut cmd = Command::new("git");
    cmd.arg("--version")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    no_window(&mut cmd);
    cmd.status().map(|s| s.success()).unwrap_or(false)
}

fn run_visible(program: &Path, args: &[String], cwd: &Path) -> AppResult<Option<i32>> {
    let mut cmd = Command::new(program);
    cmd.args(args).current_dir(cwd);
    match cmd.status() {
        Ok(s) => Ok(s.code()),
        Err(e) if e.raw_os_error() == Some(740) => {
            tauri_plugin_opener::open_path(program.to_string_lossy().as_ref(), None::<&str>)
                .map_err(|e| AppError::unknown(format!("Kurucu açılamadı: {e}")))?;
            Ok(None)
        }
        Err(e) => Err(AppError::unknown(format!("Kurucu başlatılamadı: {e}"))),
    }
}

fn quote_arg(a: &str) -> String {
    if a.is_empty() || a.contains([' ', '\t', '"']) {
        format!("\"{}\"", a.replace('"', "\\\""))
    } else {
        a.to_string()
    }
}

#[cfg(windows)]
fn shell_run_wait(program: &Path, params: &str, cwd: &Path) -> AppResult<i32> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Threading::{GetExitCodeProcess, WaitForSingleObject, INFINITE};
    use windows_sys::Win32::UI::Shell::{
        ShellExecuteExW, SEE_MASK_NOASYNC, SEE_MASK_NOCLOSEPROCESS, SHELLEXECUTEINFOW,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    let wide = |s: &std::ffi::OsStr| -> Vec<u16> { s.encode_wide().chain(Some(0)).collect() };
    let file = wide(program.as_os_str());
    let args = wide(std::ffi::OsStr::new(params));
    let dir = wide(cwd.as_os_str());
    let mut info = SHELLEXECUTEINFOW {
        cbSize: std::mem::size_of::<SHELLEXECUTEINFOW>() as u32,
        fMask: SEE_MASK_NOCLOSEPROCESS | SEE_MASK_NOASYNC,
        lpFile: file.as_ptr(),
        lpParameters: args.as_ptr(),
        lpDirectory: dir.as_ptr(),
        nShow: SW_SHOWNORMAL,
        ..Default::default()
    };
    unsafe {
        if ShellExecuteExW(&mut info) == 0 {
            return Err(AppError::unknown(format!(
                "Program başlatılamadı: {}",
                std::io::Error::last_os_error()
            )));
        }
        if info.hProcess.is_null() {
            return Ok(0);
        }
        WaitForSingleObject(info.hProcess, INFINITE);
        let mut code = 0u32;
        GetExitCodeProcess(info.hProcess, &mut code);
        CloseHandle(info.hProcess);
        Ok(code as i32)
    }
}

#[cfg(not(windows))]
fn shell_run_wait(_program: &Path, _params: &str, _cwd: &Path) -> AppResult<i32> {
    Err(AppError::unknown("Yalnız Windows'ta desteklenir."))
}

fn run_wait(program: &Path, args: &[String], raw_tail: Option<&str>, cwd: &Path) -> AppResult<i32> {
    let mut cmd = Command::new(program);
    cmd.args(args).current_dir(cwd);
    #[cfg(windows)]
    if let Some(tail) = raw_tail {
        use std::os::windows::process::CommandExt;
        cmd.raw_arg(tail);
    }
    match cmd.status() {
        Ok(s) => Ok(s.code().unwrap_or(-1)),
        Err(e) if e.raw_os_error() == Some(740) => {
            let mut params: Vec<String> = args.iter().map(|a| quote_arg(a)).collect();
            if let Some(tail) = raw_tail {
                params.push(tail.to_string());
            }
            shell_run_wait(program, &params.join(" "), cwd)
        }
        Err(e) => Err(AppError::unknown(format!("Program başlatılamadı: {e}"))),
    }
}

pub const SELF_UNINSTALL: &str =
    "Çalışan Teknesyum Base kendini kaldıramaz. Kapatıp Windows Ayarlar > Uygulamalar'dan kaldırın.";

fn removable(path: &Path, env: &Env) -> bool {
    let target = dunce(path);
    let guarded = std::iter::once(&env.paths.shared)
        .chain(env.paths.scan_roots.iter())
        .chain(std::iter::once(&env.install_dir));
    for g in guarded {
        if is_within(g, path) || dunce(g) == target {
            return false;
        }
    }
    is_within(path, &env.install_dir) || env.paths.scan_roots.iter().any(|r| is_within(path, r))
}

fn msiexec(flag: &str, msi: &Path) -> AppResult<i32> {
    let status = Command::new("msiexec")
        .arg(flag)
        .arg(msi)
        .arg("/passive")
        .status()
        .map_err(|e| AppError::unknown(format!("msiexec başlatılamadı: {e}")))?;
    Ok(status.code().unwrap_or(-1))
}

fn check_msi_code(code: i32) -> AppResult<()> {
    match code {
        0 | 3010 | 1641 => Ok(()),
        1602 => Err(AppError::cancelled()),
        1618 => Err(AppError::unknown(
            "Başka bir Windows kurulumu sürüyor. Bitince yeniden deneyin.",
        )),
        c => Err(AppError::unknown(format!(
            "Windows Installer kurulumu başarısız oldu (kod {c})."
        ))),
    }
}

fn write_shortcut(env: &Env, name: &str, exe: &Path) -> AppResult<PathBuf> {
    fs::create_dir_all(&env.paths.shortcuts)?;
    let lnk = env
        .paths
        .shortcuts
        .join(format!("{}.lnk", logic::safe_dir_name(name)));
    shell_link(exe, &lnk)?;
    Ok(lnk)
}

pub fn is_program(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| ["exe", "bat", "cmd", "com"].contains(&e.to_ascii_lowercase().as_str()))
}

fn shell_link(target: &Path, lnk: &Path) -> AppResult<()> {
    let mut link = mslnk::ShellLink::new(target)
        .map_err(|e| AppError::io(format!("Kısayol hazırlanamadı: {e}")))?;
    if let Some(dir) = target.parent() {
        link.set_working_dir(Some(dir.to_string_lossy().into_owned()));
        if !is_program(target) {
            if let Some(ico) = fs::read_dir(dir).ok().and_then(|rd| {
                rd.flatten()
                    .map(|e| e.path())
                    .find(|p| p.extension().is_some_and(|x| x.eq_ignore_ascii_case("ico")))
            }) {
                link.set_icon_location(Some(ico.to_string_lossy().into_owned()));
            }
        }
    }
    link.create_lnk(lnk)
        .map_err(|e| AppError::io(format!("Kısayol yazılamadı: {e}")))
}

pub fn desktop_lnk(full_name: &str) -> Option<PathBuf> {
    let name = full_name.rsplit('/').next().filter(|n| !n.is_empty())?;
    Some(dirs::desktop_dir()?.join(format!("{}.lnk", logic::safe_dir_name(name))))
}

pub fn write_desktop_shortcut(full_name: &str, exe: &Path) -> AppResult<PathBuf> {
    let lnk = desktop_lnk(full_name).ok_or_else(|| AppError::io("Masaüstü klasörü bulunamadı."))?;
    if !exe.is_file() {
        return Err(AppError::io("Programın exe dosyası bulunamadı."));
    }
    shell_link(exe, &lnk)?;
    Ok(lnk)
}

pub async fn install(env: Env, task: Task, owner: String, name: String, prefer_setup: bool) -> AppResult<String> {
    let dry = env.paths.dry_run;
    task.log(TaskStep::Resolve, 1, &format!("{owner}/{name} için son sürüm aranıyor"));
    if dry {
        task.log(TaskStep::Resolve, 1, "Prova kipi: kısayol yazılmaz, kurucular çalıştırılmaz");
    }
    let release = env
        .gh
        .latest_release(&owner, &name)
        .await?
        .ok_or_else(|| {
            AppError::new(
                ErrorCode::NoAsset,
                "Bu deponun yayımlanmış bir sürümü yok. Klonlayarak kullanabilirsiniz.",
            )
        })?;
    let manifest = env.gh.manifest(&owner, &name, false).await.ok().flatten();
    task.check()?;
    let refs = release.asset_refs();
    let picked = if prefer_setup && manifest.as_ref().and_then(|m| m.asset.as_deref()).is_none() {
        logic::select_setup(&refs).or_else(|| logic::select_asset(&refs, manifest.as_ref()))
    } else {
        logic::select_asset(&refs, manifest.as_ref())
    };
    let (chosen, kind) = picked.ok_or_else(|| {
        AppError::new(
            ErrorCode::NoAsset,
            "Sürümde Windows için kurulabilir dosya (.zip, .exe, .msi) yok.",
        )
    })?;
    let asset = release
        .assets
        .iter()
        .find(|a| a.name == chosen.name)
        .cloned()
        .ok_or_else(|| AppError::new(ErrorCode::NoAsset, "Seçilen dosya sürümde bulunamadı."))?;
    task.log(
        TaskStep::Resolve,
        4,
        &format!("Sürüm {}, dosya {} ({})", release.tag_name, asset.name, mb(asset.size)),
    );

    probe_writable(&env.install_dir)?;
    let dir_name = logic::safe_dir_name(&name);
    let target = env.install_dir.join(&dir_name);
    let scratch_root = env.install_dir.join(".teknesyum-tmp");
    let scratch = scratch_root.join(&task.id);
    fs::create_dir_all(&scratch)?;
    let _guard = TempDir(scratch.clone());
    let file = scratch.join(logic::safe_dir_name(&asset.name));

    task.log(TaskStep::Download, 5, &format!("İndiriliyor: {}", asset.name));
    let hash = download(&env, &task, &asset, &file, 5, 80).await?;
    task.check()?;

    task.log(TaskStep::Verify, 82, "Sağlama (sha256) denetleniyor");
    let mut verified = false;
    for cand in logic::checksum_candidates(&refs, &asset.name) {
        let Some(gh_asset) = release.assets.iter().find(|a| a.name == cand.name) else {
            continue;
        };
        let single = !logic::is_multi_checksum(&cand.name);
        let text = fetch_text(&env, gh_asset).await?;
        if let Some(expected) = logic::parse_checksum(&text, &asset.name, single) {
            if expected != hash {
                let _ = fs::remove_file(&file);
                return Err(AppError::new(
                    ErrorCode::Checksum,
                    format!(
                        "Sağlama uyuşmadı; indirilen dosya silindi. Beklenen {}…, gelen {}…",
                        &expected[..12],
                        &hash[..12]
                    ),
                ));
            }
            task.log(TaskStep::Verify, 88, &format!("Sağlama doğru ({})", cand.name));
            verified = true;
            break;
        }
    }
    if !verified {
        task.log(TaskStep::Verify, 88, &format!("Sağlama dosyası yok; sha256 {}", &hash[..16]));
    }
    task.check()?;

    let stage = scratch.join("yeni");
    let method = kind.method();
    let mut installed_dir = target.clone();
    let (exe, package) = match kind {
        AssetKind::Zip => {
            task.log(TaskStep::Install, 89, "Arşiv açılıyor");
            let cancel = task.cancel.clone();
            let (zip, out) = (file.clone(), scratch.join("acilan"));
            let out2 = out.clone();
            tauri::async_runtime::spawn_blocking(move || extract_zip(&zip, &out2, &cancel))
                .await
                .map_err(|e| AppError::unknown(format!("Arşiv açma durdu: {e}")))??;
            task.check()?;
            let root = single_root(&out);
            let run = manifest
                .as_ref()
                .and_then(|m| m.run.as_deref())
                .or(logic::upstream_of(&owner, &name).map(|u| u.entry));
            let main = find_main_exe(&root, &name, run).ok_or_else(|| {
                AppError::new(
                    ErrorCode::NoAsset,
                    "Arşivde Windows için çalıştırılabilir dosya (.exe, .bat) yok; kurulum yapılmadı.",
                )
            })?;
            let rel = main.strip_prefix(&root).unwrap_or(&main).to_path_buf();
            fs::rename(&root, &stage)?;
            swap_into(&stage, &target, &scratch)?;
            task.log(TaskStep::Install, 95, &format!("Dosyalar yerleşti: {}", target.display()));
            (Some(target.join(rel)), None)
        }
        AssetKind::Portable => {
            fs::create_dir_all(&stage)?;
            fs::rename(&file, stage.join(&asset.name))?;
            swap_into(&stage, &target, &scratch)?;
            task.log(TaskStep::Install, 95, &format!("Program yerleşti: {}", target.display()));
            (Some(target.join(&asset.name)), None)
        }
        AssetKind::Msi => {
            fs::create_dir_all(&stage)?;
            fs::rename(&file, stage.join(&asset.name))?;
            swap_into(&stage, &target, &scratch)?;
            let msi = target.join(&asset.name);
            if dry {
                task.log(TaskStep::Install, 95, "Prova: msiexec çalıştırılmadı");
            } else {
                task.log(TaskStep::Install, 90, "Windows Installer açılıyor (msiexec /passive)");
                let m = msi.clone();
                let code = tauri::async_runtime::spawn_blocking(move || msiexec("/i", &m))
                    .await
                    .map_err(|e| AppError::unknown(e.to_string()))??;
                check_msi_code(code)?;
                task.log(TaskStep::Install, 95, "Windows Installer bitti");
            }
            (None, Some(msi.to_string_lossy().into_owned()))
        }
        AssetKind::Setup => {
            fs::create_dir_all(&stage)?;
            fs::rename(&file, stage.join(&asset.name))?;
            swap_into(&stage, &target, &scratch)?;
            let setup = target.join(&asset.name);
            let manifest_args = manifest.as_ref().and_then(|m| m.silent_args.clone());
            let silent = match manifest_args {
                Some(_) => None,
                None => logic::silent_install_args(detect::installer_kind_of(&setup)),
            };
            let args = manifest_args.unwrap_or_default();
            let mut found_exe = None;
            if dry {
                task.log(TaskStep::Install, 95, "Prova: kurucu çalıştırılmadı");
            } else if let Some(silent) = silent {
                task.log(
                    TaskStep::Install,
                    90,
                    &format!("Kurucu sessiz çalışıyor ({})", silent.join(" ")),
                );
                let (s, cwd) = (setup.clone(), target.clone());
                let code = tauri::async_runtime::spawn_blocking(move || run_wait(&s, &silent, None, &cwd))
                    .await
                    .map_err(|e| AppError::unknown(e.to_string()))??;
                if code != 0 {
                    return Err(AppError::unknown(format!("Kurucu hata koduyla kapandı ({code}).")));
                }
                task.log(TaskStep::Install, 94, "Kurucu bitti");
                let skip = vec![env.paths.shared.clone(), env.install_dir.clone()];
                let manifest_name = manifest.as_ref().and_then(|m| m.name.as_deref());
                match detect::find_in_roots(&env.paths.scan_roots, &skip, &name, manifest_name) {
                    Some(found) => {
                        task.log(TaskStep::Install, 95, &format!("Kurulan program: {}", found.exe.display()));
                        installed_dir = found.dir;
                        found_exe = Some(found.exe);
                    }
                    None => task.log(TaskStep::Install, 95, "Kurulan programın yeri bulunamadı"),
                }
            } else {
                task.log(TaskStep::Install, 90, "Kurucu kendi penceresinde açılıyor");
                let (s, cwd) = (setup.clone(), target.clone());
                let code = tauri::async_runtime::spawn_blocking(move || run_visible(&s, &args, &cwd))
                    .await
                    .map_err(|e| AppError::unknown(e.to_string()))??;
                match code {
                    None => task.log(
                        TaskStep::Install,
                        95,
                        "Kurucu yönetici izni istedi ve kendi penceresinde açıldı",
                    ),
                    Some(0) => task.log(TaskStep::Install, 95, "Kurucu bitti"),
                    Some(c) => {
                        return Err(AppError::unknown(format!(
                            "Kurucu hata koduyla kapandı ({c})."
                        )))
                    }
                }
            }
            (found_exe, Some(setup.to_string_lossy().into_owned()))
        }
    };

    let display = manifest
        .as_ref()
        .and_then(|m| m.name.clone())
        .filter(|n| !n.trim().is_empty())
        .unwrap_or_else(|| name.clone());
    let mut shortcut = None;
    if matches!(kind, AssetKind::Zip | AssetKind::Portable) {
        match (&exe, dry) {
            (Some(_), true) => task.log(TaskStep::Shortcut, 97, "Prova: kısayol yazılmadı"),
            (Some(exe), false) => {
                let lnk = write_shortcut(&env, &display, exe)?;
                task.log(TaskStep::Shortcut, 97, &format!("Başlat menüsü kısayolu: {}", lnk.display()));
                shortcut = Some(lnk.to_string_lossy().into_owned());
            }
            (None, _) => task.log(TaskStep::Shortcut, 97, "Çalıştırılacak exe bulunamadı; kısayol yazılmadı"),
        }
    }

    let full = format!("{owner}/{name}");
    let mut desktop = false;
    if let (Some(exe), true, false) = (&exe, env.desktop_shortcut, dry) {
        match write_desktop_shortcut(&full, exe) {
            Ok(lnk) => {
                task.log(TaskStep::Shortcut, 98, &format!("Masaüstü kısayolu: {}", lnk.display()));
                desktop = true;
            }
            Err(e) => task.log(TaskStep::Shortcut, 98, &e.message),
        }
    }

    store::upsert_installed(
        &env.paths,
        InstalledRecord {
            info: Installed {
                full_name: full,
                tag: release.tag_name.clone(),
                method,
                path: installed_dir.to_string_lossy().into_owned(),
                exe: exe.map(|e| e.to_string_lossy().into_owned()),
                installed_at: now_iso(),
                desktop_shortcut: desktop,
            },
            shortcut,
            package,
        },
    )?;
    Ok(format!("{display} {} kuruldu", release.tag_name))
}

fn wait_gone(path: &Path, limit: Duration) {
    let start = Instant::now();
    while path.exists() && start.elapsed() < limit {
        std::thread::sleep(Duration::from_millis(250));
    }
}

async fn run_uninstaller(task: &Task, dir: &Path, exe: Option<&Path>) -> AppResult<bool> {
    let Some(uninst) = detect::find_uninstaller(dir) else {
        return Ok(false);
    };
    let file_name = uninst
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    let kind = logic::uninstaller_kind(&file_name, detect::installer_kind_of(&uninst));
    let args = logic::silent_uninstall_args(kind);
    let tail = (kind == logic::InstallerKind::Nsis).then(|| format!("_?={}", dir.display()));
    task.log(
        TaskStep::Install,
        30,
        &format!("Kaldırıcı sessiz çalışıyor: {file_name} {}", args.join(" ")),
    );
    let (u, cwd) = (uninst.clone(), dir.to_path_buf());
    let watch = exe.map(Path::to_path_buf);
    let code = tauri::async_runtime::spawn_blocking(move || {
        let code = run_wait(&u, &args, tail.as_deref(), &cwd);
        if let Some(w) = watch {
            wait_gone(&w, Duration::from_secs(30));
        }
        code
    })
    .await
    .map_err(|e| AppError::unknown(e.to_string()))??;
    if code != 0 {
        return Err(AppError::unknown(format!("Kaldırıcı hata koduyla kapandı ({code}).")));
    }
    task.log(TaskStep::Install, 70, "Kaldırıcı bitti");
    Ok(true)
}

pub async fn uninstall(env: Env, task: Task, rec: InstalledRecord) -> AppResult<String> {
    let dry = env.paths.dry_run;
    let full_name = rec.info.full_name.clone();
    task.log(TaskStep::Resolve, 5, &format!("{full_name} kaydı okunuyor"));
    let path = PathBuf::from(&rec.info.path);
    if rec.info.method != InstallMethod::Clone && detect::is_running_from(&path) {
        return Err(AppError::io(SELF_UNINSTALL));
    }

    if rec.info.method == InstallMethod::Clone {
        store::remove_installed(&env.paths, &full_name)?;
        task.log(
            TaskStep::Install,
            90,
            &format!("Klon klasörü yerinde bırakıldı: {}", path.display()),
        );
        return Ok(format!("{full_name} listeden çıkarıldı"));
    }

    task.check()?;
    match rec.info.method {
        InstallMethod::Msi => {
            if let Some(msi) = rec.package.as_ref().map(PathBuf::from).filter(|p| p.is_file()) {
                if dry {
                    task.log(TaskStep::Install, 50, "Prova: msiexec /x çalıştırılmadı");
                } else {
                    task.log(TaskStep::Install, 20, "Windows Installer kaldırıcısı açılıyor");
                    let code = tauri::async_runtime::spawn_blocking(move || msiexec("/x", &msi))
                        .await
                        .map_err(|e| AppError::unknown(e.to_string()))??;
                    check_msi_code(code)?;
                    task.log(TaskStep::Install, 60, "Windows Installer kaldırdı");
                }
            } else {
                task.log(
                    TaskStep::Install,
                    40,
                    "MSI dosyası bulunamadı; programı Windows Ayarlar > Uygulamalar'dan kaldırın",
                );
            }
        }
        InstallMethod::Exe | InstallMethod::External => {
            let exe = rec.info.exe.as_ref().map(PathBuf::from);
            if dry {
                task.log(TaskStep::Install, 50, "Prova: kaldırıcı çalıştırılmadı");
            } else if !run_uninstaller(&task, &path, exe.as_deref()).await? {
                task.log(TaskStep::Install, 40, "Kaldırıcı yok; klasör siliniyor");
            }
            if let Some(setup_dir) = rec
                .package
                .as_ref()
                .map(PathBuf::from)
                .and_then(|p| p.parent().map(Path::to_path_buf))
                .filter(|d| d != &path && d.exists() && is_within(d, &env.install_dir))
            {
                let _ = fs::remove_dir_all(&setup_dir);
                task.log(TaskStep::Install, 75, &format!("Kurucu klasörü silindi: {}", setup_dir.display()));
            }
        }
        _ => {}
    }

    if path.exists() {
        if !removable(&path, &env) {
            task.log(
                TaskStep::Install,
                80,
                &format!("Klasör kurulum dizini dışında, silinmedi: {}", path.display()),
            );
        } else {
            fs::remove_dir_all(&path).map_err(|e| {
                AppError::io(format!(
                    "Klasör silinemedi; program açık olabilir, kapatıp yeniden deneyin. ({e})"
                ))
            })?;
            task.log(TaskStep::Install, 85, &format!("Klasör silindi: {}", path.display()));
        }
    }

    if let Some(lnk) = rec.shortcut.as_ref().map(PathBuf::from) {
        if lnk.exists() {
            fs::remove_file(&lnk)?;
            task.log(TaskStep::Shortcut, 95, "Başlat menüsü kısayolu silindi");
        }
    }
    if let Some(lnk) = desktop_lnk(&full_name).filter(|l| l.exists()) {
        if fs::remove_file(&lnk).is_ok() {
            task.log(TaskStep::Shortcut, 96, "Masaüstü kısayolu silindi");
        }
    }
    store::remove_installed(&env.paths, &full_name)?;
    Ok(format!("{full_name} kaldırıldı"))
}

fn parse_git_progress(line: &str) -> Option<(u8, u8)> {
    let line = line.strip_prefix("remote: ").unwrap_or(line);
    let (phase_from, phase_to) = if line.starts_with("Receiving objects") {
        (5, 88)
    } else if line.starts_with("Resolving deltas") {
        (88, 97)
    } else if line.starts_with("Counting objects") || line.starts_with("Compressing objects") {
        (2, 4)
    } else {
        return None;
    };
    let pct_end = line.find('%')?;
    let start = line[..pct_end]
        .rfind(|c: char| !c.is_ascii_digit())
        .map(|i| i + 1)
        .unwrap_or(0);
    let pct: u64 = line[start..pct_end].parse().ok()?;
    Some((lerp(phase_from, phase_to, pct, 100), pct as u8))
}

pub fn spawn_clone_process(env: &Env, owner: &str, name: &str, dest: &Path) -> AppResult<std::process::Child> {
    let mut cmd = Command::new("git");
    cmd.arg("clone")
        .arg("--progress")
        .arg(format!("https://github.com/{owner}/{name}.git"))
        .arg(dest)
        .env("GIT_TERMINAL_PROMPT", "0")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped());
    if let Some(token) = env.gh.token() {
        use base64::Engine;
        let basic = base64::engine::general_purpose::STANDARD.encode(format!("x-access-token:{token}"));
        cmd.env("GIT_CONFIG_COUNT", "1")
            .env("GIT_CONFIG_KEY_0", "http.https://github.com/.extraheader")
            .env("GIT_CONFIG_VALUE_0", format!("Authorization: Basic {basic}"));
    }
    no_window(&mut cmd);
    cmd.spawn().map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            AppError::new(ErrorCode::GitMissing, "Git bulunamadı. Klonlamak için Git for Windows kurun.")
        } else {
            AppError::unknown(format!("git başlatılamadı: {e}"))
        }
    })
}

fn run_clone_blocking(env: Env, task: Task, owner: String, name: String, dest: PathBuf) -> AppResult<()> {
    let mut child = spawn_clone_process(&env, &owner, &name, &dest)?;
    let stderr = child.stderr.take();
    let reader_task = task.clone();
    let reader = std::thread::spawn(move || {
        let mut tail: Vec<String> = Vec::new();
        let Some(mut err) = stderr else {
            return tail;
        };
        let mut buf = [0u8; 4096];
        let mut line = Vec::new();
        let mut last = Instant::now() - Duration::from_secs(1);
        let mut last_phase = String::new();
        let mut cur: u8 = 1;
        while let Ok(n) = err.read(&mut buf) {
            if n == 0 {
                break;
            }
            for &b in &buf[..n] {
                if b == b'\r' || b == b'\n' {
                    let text = String::from_utf8_lossy(&line).trim().to_string();
                    line.clear();
                    if text.is_empty() {
                        continue;
                    }
                    if let Some((overall, _)) = parse_git_progress(&text) {
                        let overall = overall.max(cur);
                        cur = overall;
                        let phase = text.split(':').next().unwrap_or("").to_string();
                        if phase != last_phase || text.ends_with("done.") {
                            last_phase = phase;
                            reader_task.log(TaskStep::Download, overall, &text);
                        } else if last.elapsed() >= Duration::from_millis(150) {
                            last = Instant::now();
                            reader_task.progress(TaskStep::Download, overall, &text);
                        }
                    } else {
                        reader_task.log(TaskStep::Download, cur, &text);
                        tail.push(text);
                        if tail.len() > 6 {
                            tail.remove(0);
                        }
                    }
                } else {
                    line.push(b);
                }
            }
        }
        tail
    });
    let status = loop {
        if task.cancel.load(Ordering::Relaxed) {
            let _ = child.kill();
            let _ = child.wait();
            let _ = reader.join();
            let _ = fs::remove_dir_all(&dest);
            return Err(AppError::cancelled());
        }
        match child.try_wait()? {
            Some(s) => break s,
            None => std::thread::sleep(Duration::from_millis(100)),
        }
    };
    let tail = reader.join().unwrap_or_default();
    if !status.success() {
        let _ = fs::remove_dir_all(&dest);
        let detail = tail.last().cloned().unwrap_or_default();
        let lower = detail.to_ascii_lowercase();
        let code = if lower.contains("could not resolve host") || lower.contains("unable to access") {
            ErrorCode::Network
        } else if lower.contains("authentication") || lower.contains("not found") {
            ErrorCode::Auth
        } else {
            ErrorCode::Unknown
        };
        return Err(AppError::new(code, format!("git clone başarısız oldu: {detail}")));
    }
    Ok(())
}

pub async fn clone(env: Env, task: Task, owner: String, name: String) -> AppResult<String> {
    fs::create_dir_all(&env.clone_dir).map_err(|e| {
        AppError::io(format!("Klon klasörü oluşturulamadı ({}): {e}", env.clone_dir.display()))
    })?;
    let dest = env.clone_dir.join(logic::safe_dir_name(&name));
    if dest.exists() && fs::read_dir(&dest).map(|mut d| d.next().is_some()).unwrap_or(true) {
        return Err(AppError::io(format!("Hedef klasör zaten dolu: {}", dest.display())));
    }
    task.log(
        TaskStep::Resolve,
        1,
        &format!("git clone https://github.com/{owner}/{name}.git → {}", dest.display()),
    );
    let (e2, t2, o2, n2, d2) = (env.clone(), task.clone(), owner.clone(), name.clone(), dest.clone());
    tauri::async_runtime::spawn_blocking(move || run_clone_blocking(e2, t2, o2, n2, d2))
        .await
        .map_err(|e| AppError::unknown(e.to_string()))??;
    let tag = env
        .gh
        .latest_release(&owner, &name)
        .await
        .ok()
        .flatten()
        .map(|r| r.tag_name)
        .unwrap_or_default();
    store::upsert_installed(
        &env.paths,
        InstalledRecord {
            info: Installed {
                full_name: format!("{owner}/{name}"),
                tag,
                method: InstallMethod::Clone,
                path: dest.to_string_lossy().into_owned(),
                exe: None,
                installed_at: now_iso(),
                desktop_shortcut: false,
            },
            shortcut: None,
            package: None,
        },
    )?;
    Ok(format!("{owner}/{name} klonlandı: {}", dest.display()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_git_progress_lines() {
        assert_eq!(
            parse_git_progress("Receiving objects:  50% (5/10), 1.00 MiB | 2 MiB/s").map(|x| x.1),
            Some(50)
        );
        assert!(parse_git_progress("Cloning into 'x'...").is_none());
        let (overall, _) = parse_git_progress("Resolving deltas: 100% (3/3), done.").unwrap();
        assert_eq!(overall, 97);
    }

    #[test]
    fn lerp_maps_bytes() {
        assert_eq!(lerp(5, 80, 0, 100), 5);
        assert_eq!(lerp(5, 80, 50, 100), 42);
        assert_eq!(lerp(5, 80, 100, 100), 80);
        assert_eq!(lerp(5, 80, 10, 0), 5);
    }

    #[tokio::test]
    #[ignore]
    async fn live_dry_run_install_uninstall() {
        let repo = std::env::var("TEKNESYUM_TEST_REPO").unwrap_or_else(|_| "HeadsetBatteryTray".into());
        let root = std::env::temp_dir().join("teknesyum-base-prova");
        let _ = fs::remove_dir_all(&root);
        let paths = Paths::under_root(root.clone());
        let env = Env {
            gh: GitHub::new(crate::github::build_http(), paths.cache.clone(), std::env::var("GITHUB_TOKEN").ok()),
            http: crate::github::build_http(),
            install_dir: paths.default_install.clone(),
            desktop_shortcut: false,
            clone_dir: paths.default_clone.clone(),
            paths,
        };
        let emit: Emitter = Arc::new(|ev: TaskEvent| {
            if let Some(l) = ev.log_line {
                println!("[{:?} {:>3}%] {l}", ev.step, ev.percent);
            }
        });
        let full = format!("Teknesyum/{repo}");
        let task = Task::new("t1".into(), full.clone(), TaskKind::Install, Arc::new(AtomicBool::new(false)), emit.clone());
        let r = install(env.clone(), task.clone(), "Teknesyum".into(), repo.clone(), false).await;
        println!("install => {:?}", r.as_ref().map_err(|e| &e.message));
        let rec = store::load_installed(&env.paths)
            .into_iter()
            .find(|r| r.info.full_name.eq_ignore_ascii_case(&full))
            .expect("record");
        println!("record path={} exe={:?} method={:?}", rec.info.path, rec.info.exe, rec.info.method);
        assert!(r.is_ok());
        let task = Task::new("t2".into(), full.clone(), TaskKind::Uninstall, Arc::new(AtomicBool::new(false)), emit);
        let r = uninstall(env.clone(), task, rec.clone()).await;
        println!("uninstall => {:?}", r.as_ref().map_err(|e| &e.message));
        assert!(r.is_ok());
        assert!(!Path::new(&rec.info.path).exists());
        assert!(!env.install_dir.join(".teknesyum-tmp").exists());
        let _ = fs::remove_dir_all(&root);
    }

    #[tokio::test]
    #[ignore]
    async fn live_dry_run_clone() {
        let root = std::env::temp_dir().join("teknesyum-base-prova-klon");
        let _ = fs::remove_dir_all(&root);
        let paths = Paths::under_root(root.clone());
        let env = Env {
            gh: GitHub::new(crate::github::build_http(), paths.cache.clone(), None),
            http: crate::github::build_http(),
            install_dir: paths.default_install.clone(),
            desktop_shortcut: false,
            clone_dir: paths.default_clone.clone(),
            paths,
        };
        let emit: Emitter = Arc::new(|ev: TaskEvent| {
            if let Some(l) = ev.log_line {
                println!("[{:?} {:>3}%] {l}", ev.step, ev.percent);
            }
        });
        let task = Task::new("t3".into(), "Teknesyum/.github".into(), TaskKind::Clone, Arc::new(AtomicBool::new(false)), emit);
        let r = clone(env.clone(), task, "Teknesyum".into(), ".github".into()).await;
        println!("clone => {:?}", r.as_ref().map_err(|e| &e.message));
        assert!(r.is_ok());
        assert!(env.clone_dir.join(".github").join(".git").exists());
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn path_guard_rejects_outside() {
        let base = std::env::temp_dir().join("teknesyum-base-guard");
        let inside = base.join("apps").join("x");
        fs::create_dir_all(&inside).unwrap();
        assert!(path_allowed(&inside, &[&base.join("apps")]));
        assert!(!path_allowed(&std::env::temp_dir(), &[&base.join("apps")]));
        assert!(is_within(&inside, &base.join("apps")));
        assert!(!is_within(&base.join("apps"), &base.join("apps")));
        let _ = fs::remove_dir_all(&base);
    }
}
