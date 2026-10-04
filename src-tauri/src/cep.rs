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

#[derive(Default, Serialize, Deserialize)]
struct Cep {
    #[serde(default)]
    token: Option<String>,
    #[serde(default)]
    repos: HashMap<String, String>,
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

fn read_file() -> Cep {
    let Ok(mut bytes) = std::fs::read(file_path()) else {
        return Cep::default();
    };
    mask(&mut bytes);
    serde_json::from_slice(&bytes).unwrap_or_default()
}

fn write_file(cep: &Cep) -> AppResult<()> {
    let path = file_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut bytes = serde_json::to_vec(cep)?;
    mask(&mut bytes);
    let tmp = path.with_extension("cep.tmp");
    std::fs::write(&tmp, &bytes)?;
    std::fs::rename(&tmp, &path)?;
    Ok(())
}

fn state() -> &'static Mutex<Cep> {
    static STATE: OnceLock<Mutex<Cep>> = OnceLock::new();
    STATE.get_or_init(|| Mutex::new(read_file()))
}

fn lock() -> std::sync::MutexGuard<'static, Cep> {
    state().lock().unwrap_or_else(|e| e.into_inner())
}

#[cfg_attr(feature = "pro", allow(dead_code))]
pub fn exists() -> bool {
    file_path().is_file()
}

pub fn token() -> Option<String> {
    let t = lock().token.clone()?;
    let t = t.trim().to_string();
    (!t.is_empty()).then_some(t)
}

pub fn set_token(token: &str) -> AppResult<()> {
    let mut cep = lock();
    cep.token = Some(token.trim().to_string());
    write_file(&cep)
}

pub fn clear_token() -> AppResult<()> {
    let mut cep = lock();
    cep.token = None;
    write_file(&cep)
}

pub fn repos() -> HashMap<String, String> {
    lock().repos.clone()
}

pub fn set_repos(repos: HashMap<String, String>) -> AppResult<()> {
    let mut cep = lock();
    cep.repos = repos;
    write_file(&cep)
}

/// Eski Windows Kimlik Bilgisi Yöneticisi girdilerini bir kez cep dosyasına taşır,
/// sonra keyring girdilerini siler. Cep zaten varsa dokunmaz.
#[cfg(not(feature = "pro"))]
pub fn migrate_from_keyring() {
    const SERVICE: &str = "Teknesyum Base";
    if exists() {
        return;
    }
    let mut cep = Cep::default();
    let mut moved = false;
    if let Ok(e) = keyring::Entry::new(SERVICE, "github-token") {
        if let Ok(t) = e.get_password() {
            let t = t.trim().to_string();
            if !t.is_empty() {
                cep.token = Some(t);
                moved = true;
            }
        }
    }
    if let Ok(e) = keyring::Entry::new(SERVICE, "repo-keys") {
        if let Ok(j) = e.get_password() {
            if let Ok(map) = serde_json::from_str::<HashMap<String, String>>(&j) {
                if !map.is_empty() {
                    cep.repos = map;
                    moved = true;
                }
            }
        }
    }
    if !moved || write_file(&cep).is_err() {
        return;
    }
    *lock() = cep;
    for user in ["github-token", "repo-keys"] {
        if let Ok(e) = keyring::Entry::new(SERVICE, user) {
            let _ = e.delete_credential();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_and_mask() {
        let dir = std::env::temp_dir().join(format!("teknesyum-cep-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("t.cep");
        std::env::set_var(PATH_ENV, &path);

        let mut repos = HashMap::new();
        repos.insert("teknesyum/ornek".to_string(), "k-123".to_string());
        write_file(&Cep { token: Some("tok".into()), repos }).unwrap();

        let raw = std::fs::read(&path).unwrap();
        assert!(!raw.windows(5).any(|w| w == b"k-123"), "anahtar düz metin görünmemeli");

        let back = read_file();
        assert_eq!(back.token.as_deref(), Some("tok"));
        assert_eq!(back.repos.get("teknesyum/ornek").map(String::as_str), Some("k-123"));

        std::env::remove_var(PATH_ENV);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
