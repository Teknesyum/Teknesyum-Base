use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

use obfstr::obfstr;
use serde::{Deserialize, Serialize};

use crate::error::AppResult;

const FILE: &str = if cfg!(feature = "pro") {
    "teknesyum-base-pro.cep"
} else {
    "teknesyum-base.cep"
};
pub const PATH_ENV: &str = "TEKNESYUM_CEP";
const SERVICE: &str = if cfg!(feature = "pro") { "Teknesyum Base Pro" } else { "Teknesyum Base" };
const TOKEN: &str = "github-token";
const REPOS: &str = "repo-keys";
const SSH: &str = "ssh-keys";

#[derive(Default, Serialize, Deserialize)]
struct Cep {
    #[serde(default)]
    token: Option<String>,
    #[serde(default)]
    repos: HashMap<String, String>,
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    ssh: HashMap<String, String>,
}

fn file_path() -> PathBuf {
    if let Some(p) = std::env::var_os(PATH_ENV).filter(|v| !v.is_empty()) {
        return PathBuf::from(p);
    }
    std::env::current_exe()
        .ok()
        .and_then(|e| e.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(std::env::temp_dir)
        .join(FILE)
}

fn mask(data: &mut [u8]) {
    let key = obfstr!("teknesyum-cep-mask-2026-7f3a9c1e-b24d-anahtar").to_owned();
    let key = key.as_bytes();
    for (i, b) in data.iter_mut().enumerate() {
        *b ^= key[i % key.len()];
    }
}

fn read_file() -> Option<Cep> {
    let mut bytes = std::fs::read(file_path()).ok()?;
    mask(&mut bytes);
    serde_json::from_slice(&bytes).ok()
}

const CHUNK: usize = 1000;

fn split(text: &str) -> Vec<String> {
    let chars: Vec<char> = text.chars().collect();
    chars.chunks(CHUNK).map(|c| c.iter().collect()).collect()
}

fn entry(name: &str, part: usize) -> Option<keyring::Entry> {
    let user = if part == 0 { name.to_string() } else { format!("{name}-{part}") };
    keyring::Entry::new(SERVICE, &user).ok()
}

fn get(name: &str) -> Option<String> {
    let mut out = String::new();
    for part in 0.. {
        match entry(name, part).and_then(|e| e.get_password().ok()) {
            Some(p) => out.push_str(&p),
            None => break,
        }
    }
    (!out.is_empty()).then_some(out)
}

fn put(name: &str, text: &str) -> AppResult<()> {
    let parts = split(text);
    for (i, part) in parts.iter().enumerate() {
        keyring::Entry::new(SERVICE, &if i == 0 { name.to_string() } else { format!("{name}-{i}") })?.set_password(part)?;
    }
    for part in parts.len().. {
        let Some(e) = entry(name, part) else { break };
        if e.delete_credential().is_err() {
            break;
        }
    }
    Ok(())
}

fn get_map(name: &str) -> HashMap<String, String> {
    get(name).and_then(|j| serde_json::from_str(&j).ok()).unwrap_or_default()
}

fn put_map(name: &str, map: &HashMap<String, String>) -> AppResult<()> {
    if map.is_empty() {
        return put(name, "");
    }
    put(name, &serde_json::to_string(map)?)
}

fn load() -> Cep {
    Cep { token: get(TOKEN), repos: get_map(REPOS), ssh: get_map(SSH) }
}

fn store(cep: &Cep) -> AppResult<()> {
    put(TOKEN, cep.token.as_deref().unwrap_or(""))?;
    put_map(REPOS, &cep.repos)?;
    put_map(SSH, &cep.ssh)
}

fn state() -> &'static Mutex<Cep> {
    static STATE: OnceLock<Mutex<Cep>> = OnceLock::new();
    STATE.get_or_init(|| Mutex::new(load()))
}

fn lock() -> std::sync::MutexGuard<'static, Cep> {
    state().lock().unwrap_or_else(|e| e.into_inner())
}

pub fn token() -> Option<String> {
    let t = lock().token.clone()?;
    let t = t.trim().to_string();
    (!t.is_empty()).then_some(t)
}

pub fn set_token(token: &str) -> AppResult<()> {
    let mut cep = lock();
    cep.token = Some(token.trim().to_string());
    store(&cep)
}

pub fn clear_token() -> AppResult<()> {
    let mut cep = lock();
    cep.token = None;
    store(&cep)
}

pub fn repos() -> HashMap<String, String> {
    lock().repos.clone()
}

pub fn set_repos(repos: HashMap<String, String>) -> AppResult<()> {
    let mut cep = lock();
    cep.repos = repos;
    store(&cep)
}

pub fn ssh_keys() -> HashMap<String, String> {
    lock().ssh.clone()
}

pub fn set_ssh_keys(keys: HashMap<String, String>) -> AppResult<()> {
    let mut cep = lock();
    cep.ssh = keys;
    store(&cep)
}

fn merge_into(cep: &mut Cep, from: Cep) {
    if let Some(t) = from.token.map(|t| t.trim().to_string()).filter(|t| !t.is_empty()) {
        cep.token = Some(t);
    }
    cep.repos.extend(from.repos);
    cep.ssh.extend(from.ssh);
}

/// Versions 3.12.6 to 3.12.10 kept the keys in a masked file beside the exe. Its content
/// moves into the Windows Credential Manager once; the file goes only after the move is read back.
pub fn migrate_from_file() {
    let Some(old) = read_file() else { return };
    let mut cep = lock();
    merge_into(&mut cep, old);
    if store(&cep).is_err() {
        return;
    }
    let back = load();
    if back.token == cep.token && back.repos == cep.repos && back.ssh == cep.ssh {
        let _ = std::fs::remove_file(file_path());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn long_values_split_into_parts_and_join_back() {
        let text: String = "anahtar-ş".repeat(400);
        let parts = split(&text);
        assert!(parts.len() > 1);
        assert!(parts.iter().all(|p| p.chars().count() <= CHUNK));
        assert_eq!(parts.concat(), text);
        assert!(split("").is_empty());
    }

    #[test]
    fn merge_keeps_existing_and_overwrites_duplicates() {
        let mut cep = Cep {
            token: Some("eski".into()),
            repos: HashMap::from([("teknesyum/a".into(), "ka".into()), ("teknesyum/b".into(), "kb-eski".into())]),
            ..Default::default()
        };
        let incoming = Cep {
            token: Some(" yeni ".into()),
            repos: HashMap::from([("teknesyum/b".into(), "kb-yeni".into()), ("teknesyum/c".into(), "kc".into())]),
            ssh: HashMap::from([("teknesyum/a".into(), "s".into())]),
        };
        merge_into(&mut cep, incoming);
        assert_eq!(cep.token.as_deref(), Some("yeni"));
        assert_eq!(cep.repos.get("teknesyum/a").map(String::as_str), Some("ka"));
        assert_eq!(cep.repos.get("teknesyum/b").map(String::as_str), Some("kb-yeni"));
        assert_eq!(cep.repos.len(), 3);
        assert_eq!(cep.ssh.len(), 1);
        merge_into(&mut cep, Cep::default());
        assert_eq!(cep.token.as_deref(), Some("yeni"));
    }

    #[test]
    #[ignore]
    fn live_file_moves_into_the_credential_manager() {
        let dir = std::env::temp_dir().join(format!("tk-cep-tasima-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("t.cep");
        std::env::set_var(PATH_ENV, &path);
        let name = "teknesyum/tasima-deneme";
        let long = "x".repeat(2600);
        let mut bytes = serde_json::to_vec(&Cep { ssh: HashMap::from([(name.to_string(), long.clone())]), ..Default::default() }).unwrap();
        mask(&mut bytes);
        std::fs::write(&path, bytes).unwrap();

        migrate_from_file();
        let moved = load().ssh.get(name).cloned();
        let file_gone = !path.exists();
        let mut keys = ssh_keys();
        keys.remove(name);
        set_ssh_keys(keys).unwrap();
        let cleaned = !load().ssh.contains_key(name);
        std::env::remove_var(PATH_ENV);
        let _ = std::fs::remove_dir_all(&dir);
        println!("moved = {}, file gone = {file_gone}, cleaned = {cleaned}", moved.is_some());
        assert_eq!(moved, Some(long));
        assert!(file_gone && cleaned);
    }
}
