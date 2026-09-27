use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use serde_json::Value;

use crate::error::{AppError, AppResult, ErrorCode};
use crate::installer::Task;
use crate::model::TaskStep;

pub const MARKET: &str = "teknesyum";
pub const MARKET_SOURCE: &str = "Teknesyum/Teknesyum-Core";
pub const WINGET_ID: &str = "Anthropic.ClaudeCode";

pub fn plugin_of(repo_name: &str) -> Option<&'static str> {
    match repo_name.to_ascii_lowercase().as_str() {
        "teknesyum-core" => Some("teknesyum-core"),
        "teknesyum-ui" => Some("teknesyum-ui"),
        _ => None,
    }
}

fn env_dir(key: &str) -> Option<PathBuf> {
    std::env::var_os(key).filter(|v| !v.is_empty()).map(PathBuf::from)
}

fn config_dir() -> Option<PathBuf> {
    env_dir("CLAUDE_CONFIG_DIR").or_else(|| env_dir("USERPROFILE").map(|h| h.join(".claude")))
}

fn on_path(names: &[&str]) -> Option<PathBuf> {
    let path = std::env::var_os("PATH")?;
    std::env::split_paths(&path)
        .flat_map(|dir| names.iter().map(move |n| dir.join(n)))
        .find(|p| p.is_file())
}

pub fn claude_exe() -> Option<PathBuf> {
    let mut known = Vec::new();
    if let Some(h) = env_dir("USERPROFILE") {
        known.push(h.join(".local").join("bin").join("claude.exe"));
    }
    if let Some(l) = env_dir("LOCALAPPDATA") {
        known.push(l.join("Microsoft").join("WinGet").join("Links").join("claude.exe"));
        known.push(l.join("Programs").join("claude").join("claude.exe"));
    }
    if let Some(a) = env_dir("APPDATA") {
        known.push(a.join("npm").join("claude.cmd"));
    }
    known
        .into_iter()
        .find(|p| p.is_file())
        .or_else(|| on_path(&["claude.exe", "claude.cmd"]))
}

fn read_json(path: &Path) -> Option<Value> {
    let text = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(text.trim_start_matches('\u{feff}')).ok()
}

pub fn installed_version(plugin: &str) -> Option<String> {
    let file = config_dir()?.join("plugins").join("installed_plugins.json");
    let json = read_json(&file)?;
    let entries = json.get("plugins")?.get(format!("{plugin}@{MARKET}"))?.as_array()?;
    let live = |e: &&Value| {
        e.get("installPath")
            .and_then(Value::as_str)
            .is_none_or(|p| Path::new(p).is_dir())
    };
    let pick = entries
        .iter()
        .filter(live)
        .find(|e| e.get("scope").and_then(Value::as_str) == Some("user"))
        .or_else(|| entries.iter().find(live))?;
    let v = pick.get("version").and_then(Value::as_str)?.trim();
    Some(if v.is_empty() || v == "unknown" { "0".to_string() } else { v.to_string() })
}

fn market_known() -> bool {
    config_dir()
        .map(|d| d.join("plugins").join("known_marketplaces.json"))
        .and_then(|f| read_json(&f))
        .is_some_and(|j| j.get(MARKET).is_some())
}

fn no_window(cmd: &mut Command) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }
    #[cfg(not(windows))]
    let _ = cmd;
}

fn run(task: &Task, step: TaskStep, percent: u8, program: &Path, args: &[&str]) -> AppResult<()> {
    task.check()?;
    task.log(step, percent, &format!("> {} {}", program.file_name().unwrap_or_default().to_string_lossy(), args.join(" ")));
    let mut cmd = Command::new(program);
    cmd.args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    no_window(&mut cmd);
    let mut child = cmd
        .spawn()
        .map_err(|e| AppError::unknown(format!("{} başlatılamadı: {e}", program.display())))?;
    let err = child.stderr.take().map(|s| {
        std::thread::spawn(move || {
            BufReader::new(s)
                .lines()
                .map_while(Result::ok)
                .filter(|l| !l.trim().is_empty())
                .collect::<Vec<_>>()
        })
    });
    if let Some(out) = child.stdout.take() {
        for line in BufReader::new(out).lines().map_while(Result::ok) {
            let line = line.trim();
            if !line.is_empty() && line.chars().any(char::is_alphanumeric) {
                task.log(step, percent, line);
            }
        }
    }
    let status = child
        .wait()
        .map_err(|e| AppError::unknown(format!("Komut beklenemedi: {e}")))?;
    let err_lines = err.and_then(|h| h.join().ok()).unwrap_or_default();
    for l in &err_lines {
        task.log(step, percent, l);
    }
    if status.success() {
        Ok(())
    } else {
        let last = err_lines.last().cloned().unwrap_or_default();
        Err(AppError::unknown(format!(
            "Komut başarısız oldu (kod {}). {last}",
            status.code().unwrap_or(-1)
        )))
    }
}

fn winget() -> PathBuf {
    env_dir("LOCALAPPDATA")
        .map(|l| l.join("Microsoft").join("WindowsApps").join("winget.exe"))
        .filter(|p| p.is_file())
        .unwrap_or_else(|| PathBuf::from("winget"))
}

pub fn install_plugin(task: &Task, plugin: &str, with_claude: bool) -> AppResult<String> {
    let exe = match claude_exe() {
        Some(e) => e,
        None if with_claude => {
            run(
                task,
                TaskStep::Download,
                15,
                &winget(),
                &[
                    "install", "--id", WINGET_ID, "-e", "--silent", "--source", "winget",
                    "--accept-package-agreements", "--accept-source-agreements", "--disable-interactivity",
                ],
            )?;
            claude_exe().ok_or_else(|| {
                AppError::new(ErrorCode::NotFound, "Claude Code kuruldu ama claude.exe bulunamadı; Base'i yeniden açın.")
            })?
        }
        None => return Err(AppError::new(ErrorCode::NotFound, "Claude Code kurulu değil.")),
    };
    let id = format!("{plugin}@{MARKET}");
    if market_known() {
        run(task, TaskStep::Resolve, 40, &exe, &["plugin", "marketplace", "update", MARKET])?;
    } else {
        run(task, TaskStep::Resolve, 40, &exe, &["plugin", "marketplace", "add", MARKET_SOURCE])?;
    }
    let before = installed_version(plugin);
    if before.is_some() {
        run(task, TaskStep::Install, 70, &exe, &["plugin", "update", &id, "--scope", "user", "-y"])?;
    } else {
        run(task, TaskStep::Install, 70, &exe, &["plugin", "install", &id, "--scope", "user", "-y"])?;
    }
    let after = installed_version(plugin)
        .ok_or_else(|| AppError::unknown(format!("{plugin} kurulumu doğrulanamadı.")))?;
    Ok(format!("{plugin} {after} hazır. Claude Code'u yeniden başlatın."))
}

pub fn uninstall_plugin(task: &Task, plugin: &str) -> AppResult<String> {
    let exe = claude_exe().ok_or_else(|| AppError::new(ErrorCode::NotFound, "Claude Code bulunamadı."))?;
    let id = format!("{plugin}@{MARKET}");
    run(task, TaskStep::Install, 50, &exe, &["plugin", "uninstall", &id, "--scope", "user"])?;
    if installed_version(plugin).is_some() {
        return Err(AppError::unknown(format!("{plugin} hâlâ kurulu görünüyor.")));
    }
    Ok(format!("{plugin} kaldırıldı."))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_repo_names_to_plugins() {
        assert_eq!(plugin_of("Teknesyum-Core"), Some("teknesyum-core"));
        assert_eq!(plugin_of("teknesyum-ui"), Some("teknesyum-ui"));
        assert_eq!(plugin_of("Teknesyum-Base"), None);
    }

    #[test]
    #[ignore]
    fn detects_this_machine() {
        println!("claude={:?}", claude_exe());
        println!("core={:?} ui={:?} market={}", installed_version("teknesyum-core"), installed_version("teknesyum-ui"), market_known());
    }
}
