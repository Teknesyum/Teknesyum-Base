use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use serde::Serialize;

use crate::error::{AppError, AppResult, ErrorCode};
use crate::github::GhAsset;
use crate::installer::{self, Env, Task};
use crate::model::TaskStep;

const MICROSOFT: &str = "Microsoft Corporation";

enum Source {
    Url(&'static str),
    GitForWindows,
    NodeLts,
}

struct Prereq {
    id: &'static str,
    label: &'static str,
    winget: &'static str,
    source: Source,
    signer: &'static str,
    args: &'static [&'static str],
}

const TABLE: &[Prereq] = &[
    Prereq {
        id: "webview2",
        label: "Microsoft Edge WebView2",
        winget: "Microsoft.EdgeWebView2Runtime",
        source: Source::Url("https://go.microsoft.com/fwlink/p/?LinkId=2124703"),
        signer: MICROSOFT,
        args: &["/silent", "/install"],
    },
    Prereq {
        id: "dotnet-desktop-8",
        label: ".NET 8 Desktop Runtime",
        winget: "Microsoft.DotNet.DesktopRuntime.8",
        source: Source::Url("https://aka.ms/dotnet/8.0/windowsdesktop-runtime-win-x64.exe"),
        signer: MICROSOFT,
        args: &["/install", "/quiet", "/norestart"],
    },
    Prereq {
        id: "vcredist-x64",
        label: "Visual C++ 2015-2022 (x64)",
        winget: "Microsoft.VCRedist.2015+.x64",
        source: Source::Url("https://aka.ms/vs/17/release/vc_redist.x64.exe"),
        signer: MICROSOFT,
        args: &["/install", "/quiet", "/norestart"],
    },
    Prereq {
        id: "git",
        label: "Git for Windows",
        winget: "Git.Git",
        source: Source::GitForWindows,
        signer: "Johannes Schindelin",
        args: &["/VERYSILENT", "/NORESTART", "/SP-"],
    },
    Prereq {
        id: "node-lts",
        label: "Node.js LTS",
        winget: "OpenJS.NodeJS.LTS",
        source: Source::NodeLts,
        signer: "OpenJS Foundation",
        args: &["/qn", "/norestart"],
    },
];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrereqInfo {
    pub id: String,
    pub label: String,
}

fn find(id: &str) -> Option<&'static Prereq> {
    TABLE.iter().find(|p| p.id.eq_ignore_ascii_case(id))
}

fn program_files() -> Vec<PathBuf> {
    ["ProgramW6432", "ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA"]
        .iter()
        .filter_map(|k| std::env::var_os(k).map(PathBuf::from))
        .collect()
}

fn any_file(rel: &[&str]) -> bool {
    program_files()
        .iter()
        .any(|root| rel.iter().any(|r| root.join(r).is_file()))
}

fn on_path(exe: &str) -> bool {
    std::env::var_os("PATH").is_some_and(|p| std::env::split_paths(&p).any(|d| d.join(exe).is_file()))
}

fn dotnet_desktop(major: &str) -> bool {
    program_files().iter().any(|root| {
        std::fs::read_dir(root.join("dotnet/shared/Microsoft.WindowsDesktop.App"))
            .map(|rd| rd.flatten().any(|e| e.file_name().to_string_lossy().starts_with(major)))
            .unwrap_or(false)
    })
}

fn detect(p: &Prereq) -> bool {
    match p.id {
        "webview2" => {
            const K: &str = r"Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
            [
                reg::string(reg::HKLM, &format!(r"SOFTWARE\WOW6432Node\{K}"), "pv"),
                reg::string(reg::HKLM, &format!(r"SOFTWARE\{K}"), "pv"),
                reg::string(reg::HKCU, &format!(r"Software\{K}"), "pv"),
            ]
            .into_iter()
            .flatten()
            .any(|v| !v.is_empty() && v != "0.0.0.0")
        }
        "dotnet-desktop-8" => dotnet_desktop("8."),
        "vcredist-x64" => [
            r"SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64",
            r"SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64",
        ]
        .iter()
        .any(|k| reg::dword(reg::HKLM, k, "Installed") == Some(1)),
        "git" => on_path("git.exe") || any_file(&["Git/cmd/git.exe", "Programs/Git/cmd/git.exe"]),
        "node-lts" => on_path("node.exe") || any_file(&["nodejs/node.exe"]),
        _ => true,
    }
}

pub fn missing(ids: &[String]) -> Vec<PrereqInfo> {
    let mut out: Vec<PrereqInfo> = Vec::new();
    for id in ids {
        if let Some(p) = find(id) {
            if !out.iter().any(|o| o.id == p.id) && !detect(p) {
                out.push(PrereqInfo { id: p.id.to_string(), label: p.label.to_string() });
            }
        }
    }
    out
}

pub fn refresh_path() {
    let machine = reg::string(reg::HKLM, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment", "Path");
    let user = reg::string(reg::HKCU, "Environment", "Path");
    let joined: Vec<String> = [machine, user].into_iter().flatten().filter(|s| !s.is_empty()).collect();
    if joined.is_empty() {
        return;
    }
    let expanded = joined.join(";").split(';').map(expand).collect::<Vec<_>>().join(";");
    std::env::set_var("PATH", expanded);
}

fn expand(part: &str) -> String {
    let mut out = String::new();
    let mut rest = part;
    while let Some(i) = rest.find('%') {
        out.push_str(&rest[..i]);
        let tail = &rest[i + 1..];
        match tail.find('%') {
            Some(j) => {
                let name = &tail[..j];
                out.push_str(&std::env::var(name).unwrap_or_else(|_| format!("%{name}%")));
                rest = &tail[j + 1..];
            }
            None => {
                out.push('%');
                rest = tail;
            }
        }
    }
    out.push_str(rest);
    out
}

fn winget_available() -> bool {
    let mut cmd = Command::new("winget");
    cmd.arg("--version").stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());
    installer::no_window(&mut cmd);
    cmd.status().map(|s| s.success()).unwrap_or(false)
}

fn winget_install(task: &Task, p: &Prereq, pct: u8) -> bool {
    task.log(TaskStep::Install, pct, &format!("winget ile kuruluyor: {}", p.label));
    let mut cmd = Command::new("winget");
    cmd.args([
        "install",
        "--id",
        p.winget,
        "--exact",
        "--silent",
        "--source",
        "winget",
        "--accept-package-agreements",
        "--accept-source-agreements",
        "--disable-interactivity",
    ])
    .stdin(Stdio::null())
    .stdout(Stdio::null())
    .stderr(Stdio::null());
    installer::no_window(&mut cmd);
    let ok = cmd.status().map(|s| s.success()).unwrap_or(false);
    refresh_path();
    ok && detect(p)
}

async fn resolve_url(env: &Env, p: &Prereq) -> AppResult<(String, String)> {
    match p.source {
        Source::Url(u) => Ok((u.to_string(), format!("{}.exe", p.id))),
        Source::GitForWindows => {
            let rel = env
                .gh
                .latest_release("git-for-windows", "git")
                .await?
                .ok_or_else(|| AppError::new(ErrorCode::NotFound, "Git for Windows sürümü bulunamadı."))?;
            let a = rel
                .assets
                .iter()
                .find(|a| a.name.starts_with("Git-") && a.name.ends_with("-64-bit.exe"))
                .ok_or_else(|| AppError::new(ErrorCode::NoAsset, "Git for Windows kurucusu bulunamadı."))?;
            Ok((a.browser_download_url.clone(), "git-setup.exe".to_string()))
        }
        Source::NodeLts => {
            let body = env
                .http
                .get("https://nodejs.org/dist/index.json")
                .header(reqwest::header::USER_AGENT, crate::github::UA)
                .send()
                .await?
                .text()
                .await?;
            let list: Vec<serde_json::Value> = serde_json::from_str(&body)?;
            let v = list
                .iter()
                .find(|r| r.get("lts").is_some_and(|l| l.is_string()))
                .and_then(|r| r.get("version")?.as_str())
                .ok_or_else(|| AppError::new(ErrorCode::NotFound, "Node.js LTS sürümü bulunamadı."))?;
            Ok((format!("https://nodejs.org/dist/{v}/node-{v}-x64.msi"), "node-lts.msi".to_string()))
        }
    }
}

async fn official_install(env: &Env, task: &Task, p: &Prereq, dir: &Path, pct: u8) -> AppResult<()> {
    let (url, file_name) = resolve_url(env, p).await?;
    let file = dir.join(&file_name);
    let asset = GhAsset { id: 0, name: file_name.clone(), size: 0, browser_download_url: url, url: String::new(), download_count: 0 };
    task.log(TaskStep::Download, pct, &format!("Resmî kurucu indiriliyor: {}", p.label));
    installer::download(env, task, &asset, &file, pct, pct).await?;
    let signer = trust::signer(&file).ok_or_else(|| {
        AppError::new(ErrorCode::Checksum, format!("{} kurucusunun imzası doğrulanamadı.", p.label))
    })?;
    if !signer.eq_ignore_ascii_case(p.signer) {
        return Err(AppError::new(
            ErrorCode::Checksum,
            format!("{} kurucusu beklenmeyen yayıncıyla imzalı: {signer}", p.label),
        ));
    }
    task.log(TaskStep::Verify, pct, &format!("İmza doğrulandı: {signer}"));
    task.log(TaskStep::Install, pct, &format!("Kuruluyor: {} (yönetici onayı istenebilir)", p.label));
    let code = if file_name.ends_with(".msi") {
        let mut args = vec!["/i".to_string(), file.to_string_lossy().into_owned()];
        args.extend(p.args.iter().map(|s| s.to_string()));
        elevate::run(Path::new("msiexec.exe"), &args)?
    } else {
        elevate::run(&file, &p.args.iter().map(|s| s.to_string()).collect::<Vec<_>>())?
    };
    refresh_path();
    if !matches!(code, 0 | 1641 | 3010) || !detect(p) {
        return Err(AppError::unknown(format!("{} kurulamadı (çıkış kodu {code}).", p.label)));
    }
    Ok(())
}

pub async fn install_missing(env: &Env, task: &Task, ids: &[String], scratch: &Path) -> AppResult<()> {
    let list = missing(ids);
    if list.is_empty() {
        return Ok(());
    }
    let winget = tauri::async_runtime::spawn_blocking(winget_available).await.unwrap_or(false);
    for (i, info) in list.iter().enumerate() {
        task.check()?;
        let p = find(&info.id).expect("prereq");
        let pct = (1 + i * 3).min(20) as u8;
        let done = winget && {
            let t = task.clone();
            tauri::async_runtime::spawn_blocking(move || winget_install(&t, p, pct)).await.unwrap_or(false)
        };
        if !done {
            std::fs::create_dir_all(scratch)?;
            official_install(env, task, p, scratch, pct).await?;
        }
        task.log(TaskStep::Install, pct, &format!("Hazır: {}", p.label));
    }
    Ok(())
}

#[cfg(windows)]
mod reg {
    use windows_sys::Win32::System::Registry::{
        RegGetValueW, HKEY, HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, RRF_RT_REG_DWORD, RRF_RT_REG_EXPAND_SZ,
        RRF_RT_REG_SZ, RRF_NOEXPAND, RRF_SUBKEY_WOW6464KEY,
    };

    pub const HKLM: HKEY = HKEY_LOCAL_MACHINE;
    pub const HKCU: HKEY = HKEY_CURRENT_USER;

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(Some(0)).collect()
    }

    pub fn string(root: HKEY, key: &str, name: &str) -> Option<String> {
        let (k, n) = (wide(key), wide(name));
        let flags = RRF_RT_REG_SZ | RRF_RT_REG_EXPAND_SZ | RRF_NOEXPAND | RRF_SUBKEY_WOW6464KEY;
        let mut size: u32 = 0;
        let rc = unsafe { RegGetValueW(root, k.as_ptr(), n.as_ptr(), flags, std::ptr::null_mut(), std::ptr::null_mut(), &mut size) };
        if rc != 0 || size == 0 {
            return None;
        }
        let mut buf = vec![0u16; (size as usize).div_ceil(2)];
        let rc = unsafe { RegGetValueW(root, k.as_ptr(), n.as_ptr(), flags, std::ptr::null_mut(), buf.as_mut_ptr().cast(), &mut size) };
        if rc != 0 {
            return None;
        }
        let end = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
        Some(String::from_utf16_lossy(&buf[..end]))
    }

    pub fn dword(root: HKEY, key: &str, name: &str) -> Option<u32> {
        let (k, n) = (wide(key), wide(name));
        let mut v: u32 = 0;
        let mut size: u32 = 4;
        let rc = unsafe {
            RegGetValueW(root, k.as_ptr(), n.as_ptr(), RRF_RT_REG_DWORD | RRF_SUBKEY_WOW6464KEY, std::ptr::null_mut(), (&mut v as *mut u32).cast(), &mut size)
        };
        (rc == 0).then_some(v)
    }
}

#[cfg(not(windows))]
mod reg {
    pub type HKEY = usize;
    pub const HKLM: HKEY = 0;
    pub const HKCU: HKEY = 1;
    pub fn string(_: HKEY, _: &str, _: &str) -> Option<String> {
        None
    }
    pub fn dword(_: HKEY, _: &str, _: &str) -> Option<u32> {
        None
    }
}

#[cfg(windows)]
mod elevate {
    use std::path::Path;

    use windows_sys::Win32::Foundation::{CloseHandle, WAIT_OBJECT_0};
    use windows_sys::Win32::System::Threading::{GetExitCodeProcess, WaitForSingleObject, INFINITE};
    use windows_sys::Win32::UI::Shell::{ShellExecuteExW, SEE_MASK_NOCLOSEPROCESS, SHELLEXECUTEINFOW};
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    use crate::error::{AppError, AppResult};

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(Some(0)).collect()
    }

    fn quote(a: &str) -> String {
        if a.is_empty() || a.contains([' ', '\t', '"']) {
            format!("\"{}\"", a.replace('"', "\\\""))
        } else {
            a.to_string()
        }
    }

    pub fn run(program: &Path, args: &[String]) -> AppResult<u32> {
        let verb = wide("runas");
        let file = wide(&program.to_string_lossy());
        let params = wide(&args.iter().map(|a| quote(a)).collect::<Vec<_>>().join(" "));
        let mut info: SHELLEXECUTEINFOW = unsafe { std::mem::zeroed() };
        info.cbSize = std::mem::size_of::<SHELLEXECUTEINFOW>() as u32;
        info.fMask = SEE_MASK_NOCLOSEPROCESS;
        info.lpVerb = verb.as_ptr();
        info.lpFile = file.as_ptr();
        info.lpParameters = params.as_ptr();
        info.nShow = SW_SHOWNORMAL;
        if unsafe { ShellExecuteExW(&mut info) } == 0 || info.hProcess.is_null() {
            return Err(AppError::unknown("Kurucu başlatılamadı ya da yönetici onayı verilmedi."));
        }
        let mut code: u32 = 1;
        unsafe {
            if WaitForSingleObject(info.hProcess, INFINITE) == WAIT_OBJECT_0 {
                GetExitCodeProcess(info.hProcess, &mut code);
            }
            CloseHandle(info.hProcess);
        }
        Ok(code)
    }
}

#[cfg(not(windows))]
mod elevate {
    use std::path::Path;

    use crate::error::{AppError, AppResult};

    pub fn run(_: &Path, _: &[String]) -> AppResult<u32> {
        Err(AppError::unknown("Yalnız Windows."))
    }
}

#[cfg(windows)]
mod trust {
    use std::path::Path;

    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::Security::Cryptography::{CertGetNameStringW, CERT_NAME_SIMPLE_DISPLAY_TYPE};
    use windows_sys::Win32::Security::WinTrust::{
        WTHelperGetProvCertFromChain, WTHelperGetProvSignerFromChain, WTHelperProvDataFromStateData, WinVerifyTrust,
        WINTRUST_ACTION_GENERIC_VERIFY_V2, WINTRUST_DATA, WINTRUST_DATA_0, WINTRUST_FILE_INFO, WTD_CHOICE_FILE,
        WTD_REVOKE_WHOLECHAIN, WTD_STATEACTION_CLOSE, WTD_STATEACTION_VERIFY, WTD_UI_NONE,
    };

    pub fn signer(path: &Path) -> Option<String> {
        let wide: Vec<u16> = path.as_os_str().to_string_lossy().encode_utf16().chain(Some(0)).collect();
        let mut file: WINTRUST_FILE_INFO = unsafe { std::mem::zeroed() };
        file.cbStruct = std::mem::size_of::<WINTRUST_FILE_INFO>() as u32;
        file.pcwszFilePath = wide.as_ptr();
        let mut data: WINTRUST_DATA = unsafe { std::mem::zeroed() };
        data.cbStruct = std::mem::size_of::<WINTRUST_DATA>() as u32;
        data.dwUIChoice = WTD_UI_NONE;
        data.fdwRevocationChecks = WTD_REVOKE_WHOLECHAIN;
        data.dwUnionChoice = WTD_CHOICE_FILE;
        data.Anonymous = WINTRUST_DATA_0 { pFile: &mut file };
        data.dwStateAction = WTD_STATEACTION_VERIFY;
        let mut action = WINTRUST_ACTION_GENERIC_VERIFY_V2;
        let hwnd: HWND = std::ptr::null_mut();
        let rc = unsafe { WinVerifyTrust(hwnd, &mut action, (&mut data as *mut WINTRUST_DATA).cast()) };
        let mut name = None;
        if rc == 0 {
            unsafe {
                let prov = WTHelperProvDataFromStateData(data.hWVTStateData);
                let sgnr = if prov.is_null() { std::ptr::null_mut() } else { WTHelperGetProvSignerFromChain(prov, 0, 0, 0) };
                let cert = if sgnr.is_null() { std::ptr::null_mut() } else { WTHelperGetProvCertFromChain(sgnr, 0) };
                if !cert.is_null() && !(*cert).pCert.is_null() {
                    let mut buf = [0u16; 256];
                    let n = CertGetNameStringW((*cert).pCert, CERT_NAME_SIMPLE_DISPLAY_TYPE, 0, std::ptr::null(), buf.as_mut_ptr(), buf.len() as u32);
                    if n > 1 {
                        name = Some(String::from_utf16_lossy(&buf[..n as usize - 1]));
                    }
                }
            }
        }
        data.dwStateAction = WTD_STATEACTION_CLOSE;
        unsafe { WinVerifyTrust(hwnd, &mut action, (&mut data as *mut WINTRUST_DATA).cast()) };
        name
    }
}

#[cfg(not(windows))]
mod trust {
    pub fn signer(_: &std::path::Path) -> Option<String> {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unknown_ids_are_ignored_and_duplicates_collapse() {
        let ids = vec!["nope".to_string(), "git".to_string(), "GIT".to_string()];
        let m = missing(&ids);
        assert!(m.len() <= 1);
        assert!(m.iter().all(|p| p.id == "git"));
    }

    #[test]
    fn expand_keeps_unknown_vars() {
        assert_eq!(expand("%NO_SUCH_VAR_X%\\bin"), "%NO_SUCH_VAR_X%\\bin");
    }

    #[test]
    #[ignore]
    fn probe_this_machine() {
        let ids: Vec<String> = TABLE.iter().map(|p| p.id.to_string()).collect();
        println!("eksik: {:?}", missing(&ids).iter().map(|p| &p.id).collect::<Vec<_>>());
        if let Ok(f) = std::env::var("TK_SIGNED") {
            println!("imza: {:?}", trust::signer(std::path::Path::new(&f)));
        }
    }
}
