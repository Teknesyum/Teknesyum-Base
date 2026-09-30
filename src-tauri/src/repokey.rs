use std::path::Path;
use std::process::{Command, Stdio};

use serde::Serialize;

use crate::error::AppResult;
use crate::github::UA;

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

fn entry(full_name: &str) -> AppResult<keyring::Entry> {
    Ok(keyring::Entry::new(SERVICE, &format!("repo/{}", full_name.to_ascii_lowercase()))?)
}

pub fn get(full_name: &str) -> Option<String> {
    entry(full_name)
        .ok()
        .and_then(|e| e.get_password().ok())
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
        .or_else(|| embedded(option_env!("TEKNESYUM_REPO_KEYS"), full_name))
}

fn embedded(json: Option<&str>, full_name: &str) -> Option<String> {
    let map: std::collections::HashMap<String, String> = serde_json::from_str(json?).ok()?;
    map.get(&full_name.to_ascii_lowercase())
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
}

pub fn set(full_name: &str, token: &str) -> AppResult<()> {
    entry(full_name)?.set_password(token.trim())?;
    Ok(())
}

pub fn clear(full_name: &str) -> AppResult<()> {
    match entry(full_name)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.into()),
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

fn git_target(full_name: &str) -> String {
    format!("git:https://github.com/{full_name}.git")
}

pub fn grant_git(full_name: &str, token: &str, dest: &Path) -> AppResult<()> {
    keyring::Entry::new_with_target(&git_target(full_name), "", GIT_USER)?.set_password(token)?;
    let mut cmd = Command::new("git");
    cmd.arg("-C")
        .arg(dest)
        .args(["config", "credential.useHttpPath", "true"])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    crate::installer::no_window(&mut cmd);
    cmd.status()?;
    Ok(())
}

pub fn revoke_git(full_name: &str) {
    if let Ok(e) = keyring::Entry::new_with_target(&git_target(full_name), "", GIT_USER) {
        let _ = e.delete_credential();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn git_target_matches_credential_manager_http_path_form() {
        assert_eq!(git_target("Teknesyum/Asistan"), "git:https://github.com/Teknesyum/Asistan.git");
    }

    #[test]
    fn embedded_keys_match_case_insensitively() {
        let json = Some(r#"{"teknesyum/asistan":"k1"}"#);
        assert_eq!(embedded(json, "Teknesyum/Asistan").as_deref(), Some("k1"));
        assert_eq!(embedded(json, "Teknesyum/VideoEdit"), None);
        assert_eq!(embedded(None, "Teknesyum/Asistan"), None);
        assert_eq!(embedded(Some("{}"), "Teknesyum/Asistan"), None);
    }
}
