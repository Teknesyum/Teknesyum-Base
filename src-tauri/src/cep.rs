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

/// Eski sürümlerin Windows Kimlik Bilgisi Yöneticisine yazmış olabileceği girdileri
/// her açılışta cep dosyasına birleştirir, sonra o girdileri siler. Cep zaten varsa
/// keyring'de kalan değerler cep'in üzerine eklenir (son yazılan geçerli sayılır).
#[cfg(not(feature = "pro"))]
fn merge_into(cep: &mut Cep, token: Option<String>, repos: HashMap<String, String>) {
    if let Some(t) = token {
        let t = t.trim().to_string();
        if !t.is_empty() {
            cep.token = Some(t);
        }
    }
    for (k, v) in repos {
        cep.repos.insert(k, v);
    }
}

#[cfg(not(feature = "pro"))]
pub fn migrate_from_keyring() {
    const SERVICE: &str = "Teknesyum Base";
    let mut cep = lock();
    let token = keyring::Entry::new(SERVICE, "github-token").ok().and_then(|e| {
        let v = e.get_password().ok();
        let _ = e.delete_credential();
        v
    });
    let repos = keyring::Entry::new(SERVICE, "repo-keys")
        .ok()
        .and_then(|e| {
            let v = e.get_password().ok();
            let _ = e.delete_credential();
            v
        })
        .and_then(|j| serde_json::from_str::<HashMap<String, String>>(&j).ok())
        .unwrap_or_default();
    merge_into(&mut cep, token, repos);
    let _ = write_file(&cep);
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

    #[test]
    fn merge_keeps_existing_and_overwrites_duplicates() {
        let mut cep = Cep {
            token: Some("eski".into()),
            repos: HashMap::from([
                ("teknesyum/a".into(), "ka".into()),
                ("teknesyum/b".into(), "kb-eski".into()),
            ]),
        };
        let incoming = HashMap::from([
            ("teknesyum/b".into(), "kb-yeni".into()),
            ("teknesyum/c".into(), "kc".into()),
        ]);
        merge_into(&mut cep, Some(" yeni ".into()), incoming);
        assert_eq!(cep.token.as_deref(), Some("yeni"));
        assert_eq!(cep.repos.get("teknesyum/a").map(String::as_str), Some("ka"));
        assert_eq!(cep.repos.get("teknesyum/b").map(String::as_str), Some("kb-yeni"));
        assert_eq!(cep.repos.get("teknesyum/c").map(String::as_str), Some("kc"));

        merge_into(&mut cep, None, HashMap::new());
        assert_eq!(cep.token.as_deref(), Some("yeni"));
        assert_eq!(cep.repos.len(), 3);
    }

    #[test]
    #[ignore]
    #[cfg(not(feature = "pro"))]
    fn live_keyring_merge() {
        let dir = std::env::temp_dir().join(format!("tk-cep-merge-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        std::env::set_var(PATH_ENV, dir.join("m.cep"));

        let entry = keyring::Entry::new("Teknesyum Base", "repo-keys").unwrap();
        entry.set_password(r#"{"teknesyum/merge-dummy":"x"}"#).unwrap();

        migrate_from_keyring();

        let gone = keyring::Entry::new("Teknesyum Base", "repo-keys")
            .unwrap()
            .get_password()
            .is_err();
        println!("keyring silindi = {gone}");
        println!("cep'e geldi = {:?}", repos().get("teknesyum/merge-dummy"));
        assert!(gone, "keyring girdisi silinmedi");
        assert_eq!(repos().get("teknesyum/merge-dummy").map(String::as_str), Some("x"));

        std::env::remove_var(PATH_ENV);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
