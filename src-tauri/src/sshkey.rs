use std::collections::HashMap;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::process::{Command, Stdio};

use base64::Engine;

use crate::error::{AppError, AppResult, ErrorCode};
use crate::installer::no_window;
use crate::model::Checkout;

const HOST: &str = "git@github.com";

/// Deploy keys (SSH private keys) per repository. Pro embeds them at build time,
/// both builds accept pasted ones into the .cep file.
fn embedded_map() -> HashMap<String, String> {
    option_env!("TEKNESYUM_SSH_KEYS")
        .and_then(|j| serde_json::from_str::<HashMap<String, String>>(j).ok())
        .unwrap_or_default()
        .into_iter()
        .filter_map(|(k, v)| Some((k.trim().to_ascii_lowercase(), normalize(&v)?)))
        .collect()
}

pub fn get(full_name: &str) -> Option<String> {
    let k = full_name.to_ascii_lowercase();
    embedded_map().remove(&k).or_else(|| crate::cep::ssh_keys().remove(&k))
}

pub fn stored() -> Vec<String> {
    crate::cep::ssh_keys().into_keys().collect()
}

pub fn save(full_name: &str, key: &str) -> AppResult<()> {
    let mut map = crate::cep::ssh_keys();
    map.insert(full_name.to_ascii_lowercase(), key.to_string());
    crate::cep::set_ssh_keys(map)
}

pub fn remove(full_name: &str) -> AppResult<()> {
    let mut map = crate::cep::ssh_keys();
    if map.remove(&full_name.to_ascii_lowercase()).is_none() {
        return Ok(());
    }
    crate::cep::set_ssh_keys(map)
}

/// Rebuilds a private key from what a password field leaves of it (line breaks gone,
/// CRLF, stray spaces) or from a base64 wrapped copy of the key file.
pub fn normalize(raw: &str) -> Option<String> {
    let raw = raw.trim().trim_start_matches('\u{feff}');
    if !raw.contains("-----BEGIN") {
        let compact: String = raw.chars().filter(|c| !c.is_whitespace()).collect();
        let bytes = base64::engine::general_purpose::STANDARD.decode(compact).ok()?;
        let text = String::from_utf8(bytes).ok()?;
        return if text.contains("-----BEGIN") { normalize(&text) } else { None };
    }
    let begin = raw.find("-----BEGIN ")? + "-----BEGIN ".len();
    let label_len = raw[begin..].find("-----")?;
    let label = raw[begin..begin + label_len].trim();
    if !label.ends_with("PRIVATE KEY") {
        return None;
    }
    let body_start = begin + label_len + "-----".len();
    let end = format!("-----END {label}-----");
    let body = &raw[body_start..body_start + raw[body_start..].find(&end)?];
    if body.contains(':') {
        return None;
    }
    let compact: String = body.chars().filter(|c| !c.is_whitespace()).collect();
    if compact.is_empty() || base64::engine::general_purpose::STANDARD.decode(&compact).is_err() {
        return None;
    }
    let width = if label == "OPENSSH PRIVATE KEY" { 70 } else { 64 };
    let mut out = format!("-----BEGIN {label}-----\n");
    for chunk in compact.as_bytes().chunks(width) {
        out.push_str(std::str::from_utf8(chunk).ok()?);
        out.push('\n');
    }
    out.push_str(&end);
    out.push('\n');
    Some(out)
}

fn parse_greeting(text: &str) -> Option<String> {
    let rest = &text[text.find("Hi ")? + 3..];
    let name = rest[..rest.find('!')?].trim();
    let (owner, repo) = name.split_once('/')?;
    (!owner.is_empty() && !repo.is_empty() && !name.contains(char::is_whitespace)).then(|| name.to_string())
}

fn fwd(p: &Path) -> String {
    p.to_string_lossy().replace('\\', "/")
}

#[cfg(windows)]
fn git_for_windows_ssh() -> Option<PathBuf> {
    let mut cands: Vec<PathBuf> = Vec::new();
    let mut cmd = Command::new("where.exe");
    cmd.arg("git").stdin(Stdio::null()).stderr(Stdio::null());
    no_window(&mut cmd);
    if let Ok(out) = cmd.output() {
        if let Some(git) = String::from_utf8_lossy(&out.stdout).lines().next().map(str::trim).filter(|l| !l.is_empty()) {
            if let Some(root) = Path::new(git).parent().and_then(Path::parent) {
                cands.push(root.join("usr").join("bin").join("ssh.exe"));
            }
        }
    }
    for var in ["ProgramFiles", "ProgramW6432"] {
        if let Some(p) = std::env::var_os(var) {
            cands.push(PathBuf::from(p).join("Git").join("usr").join("bin").join("ssh.exe"));
        }
    }
    if let Some(l) = dirs::data_local_dir() {
        cands.push(l.join("Programs").join("Git").join("usr").join("bin").join("ssh.exe"));
    }
    if let Some(r) = std::env::var_os("SystemRoot") {
        cands.push(PathBuf::from(r).join("System32").join("OpenSSH").join("ssh.exe"));
    }
    cands.into_iter().find(|p| p.is_file())
}

/// Git's own ssh first, as the programs that later pull and push with the key use it.
fn ssh_program() -> PathBuf {
    #[cfg(windows)]
    if let Some(p) = git_for_windows_ssh() {
        return p;
    }
    PathBuf::from("ssh")
}

/// OpenSSH refuses a key others can read: only the user (read) and SYSTEM keep access.
fn lock_down(path: &Path) {
    #[cfg(windows)]
    {
        let user = std::env::var("USERNAME").unwrap_or_default();
        if user.is_empty() {
            return;
        }
        let who = match std::env::var("USERDOMAIN") {
            Ok(d) if !d.is_empty() => format!("{d}\\{user}"),
            _ => user,
        };
        let mut cmd = Command::new("icacls.exe");
        cmd.arg(path)
            .args(["/inheritance:r", "/grant:r", &format!("{who}:(R)"), "*S-1-5-18:(F)"])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        no_window(&mut cmd);
        let _ = cmd.status();
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(path, fs::Permissions::from_mode(0o400));
    }
}

fn write_key(path: &Path, key: &str) -> AppResult<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    if path.exists() {
        if let Ok(meta) = fs::metadata(path) {
            let mut perm = meta.permissions();
            #[allow(clippy::permissions_set_readonly_false)]
            perm.set_readonly(false);
            let _ = fs::set_permissions(path, perm);
        }
        fs::remove_file(path)?;
    }
    fs::write(path, key)?;
    lock_down(path);
    Ok(())
}

fn ssh_command(ssh: &Path, key: &Path, known_hosts: &Path) -> String {
    format!(
        "\"{}\" -i \"{}\" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=\"{}\"",
        fwd(ssh),
        fwd(key),
        fwd(known_hosts)
    )
}

fn last_line(text: &str) -> String {
    text.lines().map(str::trim).rfind(|l| !l.is_empty()).unwrap_or_default().to_string()
}

/// Asks GitHub which repository a deploy key opens: `ssh -T` greets with "Hi owner/repo!".
pub fn identify(key: &str) -> AppResult<String> {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or_default();
    let dir = std::env::temp_dir().join(format!("teknesyum-ssh-{}-{nanos}", std::process::id()));
    fs::create_dir_all(&dir)?;
    let result = (|| {
        let file = dir.join("key");
        write_key(&file, key)?;
        let mut cmd = Command::new(ssh_program());
        cmd.arg("-T")
            .arg("-i")
            .arg(&file)
            .args(["-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=15"])
            .arg("-o")
            .arg(format!("UserKnownHostsFile=\"{}\"", fwd(&dir.join("known_hosts"))))
            .arg(HOST)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        no_window(&mut cmd);
        let out = cmd.output().map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                AppError::new(ErrorCode::GitMissing, "SSH anahtarı için ssh gerekir; Git for Windows kurun.")
            } else {
                AppError::unknown(format!("ssh başlatılamadı: {e}"))
            }
        })?;
        let text = format!("{}\n{}", String::from_utf8_lossy(&out.stderr), String::from_utf8_lossy(&out.stdout));
        if let Some(name) = parse_greeting(&text) {
            return Ok(name);
        }
        if text.contains("Hi ") && text.contains("successfully authenticated") {
            return Err(AppError::new(
                ErrorCode::Auth,
                "Bu SSH anahtarı bir hesaba bağlı, depoya değil. Deponun deploy key'ini yapıştırın.",
            ));
        }
        if text.contains("Permission denied") {
            return Err(AppError::new(ErrorCode::Auth, "GitHub bu SSH anahtarını tanımadı."));
        }
        Err(AppError::new(ErrorCode::Network, format!("SSH anahtarı denetlenemedi: {}", last_line(&text))))
    })();
    let _ = fs::remove_dir_all(&dir);
    result
}

pub struct Target {
    pub dir: PathBuf,
    pub key_file: PathBuf,
}

fn expand(raw: &str) -> Option<PathBuf> {
    let mut out = String::new();
    let mut rest = raw.trim();
    while let Some(i) = rest.find('%') {
        out.push_str(&rest[..i]);
        let after = &rest[i + 1..];
        let j = after.find('%')?;
        let value = std::env::var(&after[..j]).ok().filter(|v| !v.is_empty())?;
        out.push_str(&value);
        rest = &after[j + 1..];
    }
    out.push_str(rest);
    let p = PathBuf::from(out);
    let clean = p.is_absolute() && p.components().all(|c| !matches!(c, Component::ParentDir | Component::CurDir));
    clean.then_some(p)
}

/// Manifest paths are expanded (%LOCALAPPDATA%…) and must stay inside the user's profile.
pub fn target(c: &Checkout) -> Option<Target> {
    let home = dirs::home_dir()?;
    let inside = |p: &Path| p.starts_with(&home) && p != home;
    let dir = expand(&c.path).filter(|p| inside(p))?;
    let key_file = expand(&c.ssh_key).filter(|p| inside(p) && !p.starts_with(&dir))?;
    Some(Target { dir, key_file })
}

pub fn ready(t: &Target) -> bool {
    t.dir.join(".git").exists()
}

fn git(args: &[&str], dir: &Path) -> Option<String> {
    let mut cmd = Command::new("git");
    cmd.arg("-C").arg(dir).args(args).stdin(Stdio::null()).stderr(Stdio::null());
    no_window(&mut cmd);
    let out = cmd.output().ok()?;
    out.status.success().then(|| String::from_utf8_lossy(&out.stdout).trim().to_string())
}

/// Puts the deploy key where the program expects it and clones the repository with it,
/// so the program finds a ready, writable checkout instead of asking for the key.
/// Returns true when it cloned, false when the checkout was already there.
pub fn provision(full_name: &str, key: &str, t: &Target, log: &dyn Fn(&str)) -> AppResult<bool> {
    let ssh = ssh_program();
    let known_hosts = t.key_file.with_file_name("known_hosts");
    write_key(&t.key_file, key)?;
    log(&format!("SSH anahtarı yerleşti: {}", t.key_file.display()));
    let ssh_cmd = ssh_command(&ssh, &t.key_file, &known_hosts);
    if ready(t) {
        let _ = git(&["config", "core.sshCommand", &ssh_cmd], &t.dir);
        log(&format!("Depo zaten var: {}", t.dir.display()));
        return Ok(false);
    }
    if t.dir.exists() {
        if fs::read_dir(&t.dir).map(|mut d| d.next().is_some()).unwrap_or(true) {
            return Err(AppError::io(format!("Hedef klasör zaten dolu: {}", t.dir.display())));
        }
        fs::remove_dir(&t.dir)?;
    }
    if let Some(parent) = t.dir.parent() {
        fs::create_dir_all(parent)?;
    }
    log(&format!("{HOST}:{full_name}.git indiriliyor → {}", t.dir.display()));
    let mut cmd = Command::new("git");
    cmd.args(["-c", "safe.directory=*", "clone"])
        .arg(format!("{HOST}:{full_name}.git"))
        .arg(&t.dir)
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_SSH_COMMAND", &ssh_cmd)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped());
    no_window(&mut cmd);
    let out = cmd.output().map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            AppError::new(ErrorCode::GitMissing, "Git bulunamadı. Depoyu indirmek için Git for Windows kurun.")
        } else {
            AppError::unknown(format!("git başlatılamadı: {e}"))
        }
    })?;
    if !out.status.success() {
        let _ = fs::remove_dir_all(&t.dir);
        let detail = last_line(&String::from_utf8_lossy(&out.stderr));
        return Err(AppError::new(ErrorCode::Auth, format!("Depo SSH anahtarıyla indirilemedi: {detail}")));
    }
    let _ = git(&["config", "core.sshCommand", &ssh_cmd], &t.dir);
    let _ = git(&["config", "core.quotepath", "false"], &t.dir);
    if git(&["config", "user.name"], &t.dir).unwrap_or_default().is_empty() {
        let user = std::env::var("USERNAME").ok().filter(|u| !u.is_empty()).unwrap_or_else(|| "teknesyum".into());
        let host = std::env::var("COMPUTERNAME").ok().filter(|h| !h.is_empty()).unwrap_or_else(|| "pc".into());
        let _ = git(&["config", "user.name", &user], &t.dir);
        let _ = git(&["config", "user.email", &format!("{user}@{host}")], &t.dir);
    }
    log(&format!("Depo hazır: {}", t.dir.display()));
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn key() -> String {
        let body = base64::engine::general_purpose::STANDARD.encode((0..200u8).collect::<Vec<u8>>());
        let lines: Vec<&str> = body.as_bytes().chunks(70).map(|c| std::str::from_utf8(c).unwrap()).collect();
        format!("-----BEGIN OPENSSH PRIVATE KEY-----\n{}\n-----END OPENSSH PRIVATE KEY-----\n", lines.join("\n"))
    }

    #[test]
    fn normalize_restores_a_flattened_key() {
        let key = key();
        let flat = key.replace('\n', "");
        let back = normalize(&flat).unwrap();
        assert!(back.starts_with("-----BEGIN OPENSSH PRIVATE KEY-----\n"));
        assert!(back.ends_with("\n-----END OPENSSH PRIVATE KEY-----\n"));
        assert!(back.lines().all(|l| l.len() <= 70 || l.starts_with("-----")));
        assert_eq!(back, key);
        assert_eq!(normalize(&key.replace('\n', "\r\n")).as_deref(), Some(back.as_str()));
        assert_eq!(normalize(&key.replace('\n', " ")).as_deref(), Some(back.as_str()));
    }

    #[test]
    fn normalize_reads_a_base64_wrapped_key_file() {
        let wrapped = base64::engine::general_purpose::STANDARD.encode(key());
        assert_eq!(normalize(&wrapped), Some(key()));
    }

    #[test]
    fn normalize_rejects_tokens_and_public_keys() {
        assert!(normalize("github_pat_11ABCDEF0123456789").is_none());
        assert!(normalize("ghp_abcdefghijklmnopqrstuvwxyz0123456789").is_none());
        assert!(normalize("ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI user@pc").is_none());
        assert!(normalize("-----BEGIN PUBLIC KEY-----\nAAAA\n-----END PUBLIC KEY-----").is_none());
    }

    #[test]
    fn greeting_names_the_repository() {
        let text = "Hi Teknesyum/Asistan! You've successfully authenticated, but GitHub does not provide shell access.";
        assert_eq!(parse_greeting(text).as_deref(), Some("Teknesyum/Asistan"));
        assert_eq!(parse_greeting("Hi tcggmn! You've successfully authenticated"), None);
        assert_eq!(parse_greeting("git@github.com: Permission denied (publickey)."), None);
    }

    #[test]
    fn manifest_paths_expand_and_stay_in_the_profile() {
        let home = dirs::home_dir().unwrap();
        std::env::set_var("TK_SSH_TEST_DIR", home.join("Uygulama").to_string_lossy().to_string());
        let ok = target(&Checkout { path: "%TK_SSH_TEST_DIR%/depo".into(), ssh_key: "%TK_SSH_TEST_DIR%/anahtar".into() }).unwrap();
        assert_eq!(ok.dir, home.join("Uygulama").join("depo"));
        assert_eq!(ok.key_file, home.join("Uygulama").join("anahtar"));
        assert!(target(&Checkout { path: "%TK_SSH_TEST_DIR%/../../x".into(), ssh_key: "%TK_SSH_TEST_DIR%/k".into() }).is_none());
        assert!(target(&Checkout { path: "%TK_SSH_TEST_YOK%/depo".into(), ssh_key: "%TK_SSH_TEST_DIR%/k".into() }).is_none());
        assert!(target(&Checkout { path: "%TK_SSH_TEST_DIR%/depo".into(), ssh_key: "%TK_SSH_TEST_DIR%/depo/k".into() }).is_none());
        let outside = if cfg!(windows) { "C:\\Windows\\depo" } else { "/etc/depo" };
        assert!(target(&Checkout { path: outside.into(), ssh_key: "%TK_SSH_TEST_DIR%/k".into() }).is_none());
    }
}
