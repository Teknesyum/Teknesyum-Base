use std::collections::HashMap;
use std::process::Command;

use serde::Serialize;

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
    lookup(&embedded_map(), full_name)
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
}
