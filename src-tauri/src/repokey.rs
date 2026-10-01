use std::collections::HashMap;
use std::process::Command;
use std::sync::{Mutex, OnceLock};

use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult, ErrorCode};
use crate::github::UA;

#[cfg(feature = "pro")]
const SERVICE: &str = "teknesyum-base-pro";
const GIT_USER: &str = "x-access-token";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum KeyState {
    Missing,
    Ok,
    Invalid,
    NoAccess,
    Unknown,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyStatus {
    pub full_name: String,
    pub state: KeyState,
}

fn embedded_map() -> HashMap<String, String> {
    parse(option_env!("TEKNESYUM_REPO_KEYS"))
}

fn parse(json: Option<&str>) -> HashMap<String, String> {
    json.and_then(|j| serde_json::from_str::<HashMap<String, String>>(j).ok())
        .unwrap_or_default()
        .into_iter()
        .map(|(k, v)| (k.trim().to_ascii_lowercase(), v.trim().to_string()))
        .filter(|(_, v)| !v.is_empty())
        .collect()
}

fn lookup(map: &HashMap<String, String>, full_name: &str) -> Option<String> {
    map.get(&full_name.to_ascii_lowercase()).cloned()
}

pub fn get(full_name: &str) -> Option<String> {
    lookup(&embedded_map(), full_name).or_else(|| user_map().lock().ok().and_then(|m| lookup(&m, full_name)))
}

const USER_SERVICE: &str = if cfg!(feature = "pro") { "Teknesyum Base Pro" } else { "Teknesyum Base" };
const USER_ENTRY: &str = "repo-keys";

fn user_map() -> &'static Mutex<HashMap<String, String>> {
    static MAP: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();
    MAP.get_or_init(|| {
        let stored = keyring::Entry::new(USER_SERVICE, USER_ENTRY).ok().and_then(|e| e.get_password().ok());
        Mutex::new(parse(stored.as_deref()))
    })
}

fn save_user(map: &HashMap<String, String>) -> AppResult<()> {
    let entry = keyring::Entry::new(USER_SERVICE, USER_ENTRY)?;
    if map.is_empty() {
        return match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e.into()),
        };
    }
    entry.set_password(&serde_json::to_string(map)?)?;
    Ok(())
}

pub const HIDDEN_REPOS: [&str; 2] = ["Teknesyum-Base", "Teknesyum-Private"];

pub fn hidden(full_name: &str) -> bool {
    let name = full_name.rsplit('/').next().unwrap_or(full_name);
    HIDDEN_REPOS.iter().any(|h| h.eq_ignore_ascii_case(name))
}

pub fn user_repos() -> Vec<String> {
    let mut v: Vec<String> = user_map().lock().map(|m| m.keys().filter(|k| !hidden(k)).cloned().collect()).unwrap_or_default();
    v.sort();
    v
}

#[derive(Deserialize)]
struct KeyRepo {
    full_name: String,
    private: bool,
}

pub async fn add(http: &reqwest::Client, key: &str) -> AppResult<Vec<String>> {
    let key = key.trim();
    if key.is_empty() || key.chars().any(char::is_whitespace) {
        return Err(AppError::new(ErrorCode::Auth, "Anahtar geçersiz görünüyor."));
    }
    let resp = http
        .get("https://api.github.com/user/repos?per_page=100")
        .header(reqwest::header::USER_AGENT, UA)
        .header(reqwest::header::ACCEPT, "application/vnd.github+json")
        .bearer_auth(key)
        .send()
        .await?;
    match resp.status().as_u16() {
        200 => {}
        401 => return Err(AppError::new(ErrorCode::Auth, "GitHub bu anahtarı tanımadı.")),
        s => return Err(AppError::new(ErrorCode::Network, format!("Anahtar denetlenemedi: HTTP {s}"))),
    }
    let repos: Vec<KeyRepo> = serde_json::from_str(&resp.text().await?)?;
    let found: Vec<String> = repos.into_iter().filter(|r| r.private && !hidden(&r.full_name)).map(|r| r.full_name).collect();
    if found.is_empty() {
        return Ok(found);
    }
    let mut map = user_map().lock().map_err(|_| AppError::unknown("anahtar kilidi"))?;
    for f in &found {
        map.insert(f.to_ascii_lowercase(), key.to_string());
    }
    save_user(&map)?;
    Ok(found)
}

pub fn remove(full_name: &str) -> AppResult<()> {
    let mut map = user_map().lock().map_err(|_| AppError::unknown("anahtar kilidi"))?;
    map.remove(&full_name.to_ascii_lowercase());
    save_user(&map)
}

pub fn header_env(cmd: &mut Command, url_prefix: &str, token: &str) {
    use base64::Engine;
    let basic = base64::engine::general_purpose::STANDARD.encode(format!("{GIT_USER}:{token}"));
    cmd.env("GIT_CONFIG_COUNT", "1")
        .env("GIT_CONFIG_KEY_0", format!("http.{url_prefix}.extraheader"))
        .env("GIT_CONFIG_VALUE_0", format!("Authorization: Basic {basic}"));
}

pub fn lend(cmd: &mut Command, full_name: &str) {
    let Some(owner) = full_name.split('/').next().filter(|o| !o.is_empty()) else {
        return;
    };
    if let Some(token) = get(full_name) {
        header_env(cmd, &format!("https://github.com/{owner}/"), &token);
    }
}

#[cfg(feature = "pro")]
pub fn purge_stored() {
    for full_name in embedded_map().keys() {
        if let Ok(e) = keyring::Entry::new(SERVICE, &format!("repo/{full_name}")) {
            let _ = e.delete_credential();
        }
        if let Ok(e) = keyring::Entry::new_with_target(&format!("git:https://github.com/{full_name}.git"), "", GIT_USER) {
            let _ = e.delete_credential();
        }
    }
}

pub async fn check(http: &reqwest::Client, full_name: &str) -> KeyState {
    let Some(token) = get(full_name) else {
        return KeyState::Missing;
    };
    let r = http
        .get(format!("https://api.github.com/repos/{full_name}"))
        .header(reqwest::header::USER_AGENT, UA)
        .header(reqwest::header::ACCEPT, "application/vnd.github+json")
        .bearer_auth(token)
        .send()
        .await;
    match r.map(|r| r.status().as_u16()) {
        Ok(200) => KeyState::Ok,
        Ok(401) => KeyState::Invalid,
        Ok(403 | 404) => KeyState::NoAccess,
        _ => KeyState::Unknown,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_keys_match_case_insensitively() {
        let map = parse(Some(r#"{"Teknesyum/Asistan":" k1 ","teknesyum/bos":""}"#));
        assert_eq!(lookup(&map, "Teknesyum/Asistan").as_deref(), Some("k1"));
        assert_eq!(lookup(&map, "Teknesyum/VideoEdit"), None);
        assert_eq!(lookup(&map, "Teknesyum/Bos"), None);
        assert!(parse(None).is_empty());
        assert!(parse(Some("bozuk")).is_empty());
    }

    #[test]
    fn own_repos_stay_hidden() {
        assert!(hidden("Teknesyum/Teknesyum-Private"));
        assert!(hidden("teknesyum/teknesyum-base"));
        assert!(!hidden("Teknesyum/Asistan"));
        assert!(!hidden("Teknesyum/Teknesyum-Base-Legacy"));
    }
}
