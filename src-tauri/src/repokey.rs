use std::collections::HashMap;
use std::process::Command;

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
    Ssh,
    Both,
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
    lookup(&embedded_map(), full_name).or_else(|| lookup(&crate::cep::repos(), full_name))
}

pub const HIDDEN_REPOS: [&str; 2] = ["Teknesyum-Base", "Teknesyum-Private"];

pub fn hidden(full_name: &str) -> bool {
    let name = full_name.rsplit('/').next().unwrap_or(full_name);
    HIDDEN_REPOS.iter().any(|h| h.eq_ignore_ascii_case(name))
}

pub fn user_repos() -> Vec<String> {
    let mut v: Vec<String> = crate::cep::repos().into_keys().chain(crate::sshkey::stored()).filter(|k| !hidden(k)).collect();
    v.sort();
    v.dedup();
    v
}

#[derive(Deserialize)]
struct KeyRepo {
    full_name: String,
    private: bool,
}

const TOKEN_PREFIXES: [&str; 5] = ["github_pat_", "ghp_", "gho_", "ghu_", "ghs_"];

/// Splits one pasted text into the SSH private keys and the GitHub tokens it carries.
pub fn parts(raw: &str) -> Vec<String> {
    let mut rest = raw.replace("\\r", "").replace("\\n", "\n");
    let mut out = Vec::new();
    while let Some(start) = rest.find("-----BEGIN ") {
        let Some(end_at) = rest[start..].find("-----END ") else { break };
        let tail = start + end_at + "-----END ".len();
        let Some(close) = rest[tail..].find("-----") else { break };
        let end = tail + close + "-----".len();
        out.push(rest[start..end].to_string());
        rest.replace_range(start..end, " ");
    }
    for word in rest.split(|c: char| !(c.is_ascii_alphanumeric() || c == '_')) {
        if TOKEN_PREFIXES.iter().any(|p| word.starts_with(p) && word.len() > p.len() + 10) && !out.iter().any(|o| o == word) {
            out.push(word.to_string());
        }
    }
    out
}

pub async fn add(http: &reqwest::Client, key: &str) -> AppResult<Vec<String>> {
    let pieces = parts(key);
    if pieces.len() < 2 {
        return add_one(http, key).await;
    }
    let mut found: Vec<String> = Vec::new();
    for piece in &pieces {
        for full in add_one(http, piece).await? {
            if !found.iter().any(|f| f.eq_ignore_ascii_case(&full)) {
                found.push(full);
            }
        }
    }
    Ok(found)
}

async fn add_one(http: &reqwest::Client, key: &str) -> AppResult<Vec<String>> {
    if let Some(ssh) = crate::sshkey::normalize(key) {
        let probe = ssh.clone();
        let full = tauri::async_runtime::spawn_blocking(move || crate::sshkey::identify(&probe))
            .await
            .map_err(|e| AppError::unknown(e.to_string()))??;
        if hidden(&full) {
            return Err(AppError::new(ErrorCode::Auth, format!("Bu SSH anahtarı {full} deposuna ait; Base onu kullanmaz.")));
        }
        crate::sshkey::save(&full, &ssh)?;
        return Ok(vec![full]);
    }
    let key = key.trim();
    if crate::sshkey::is_public_part(key) {
        return Err(AppError::new(
            ErrorCode::Auth,
            "Bu, anahtarın açık yarısı ya da parmak izi. Base'e özel yarısı gerekir: \"-----BEGIN OPENSSH PRIVATE KEY-----\" ile başlayan dosyanın tamamı.",
        ));
    }
    if key.contains("PRIVATE KEY") {
        return Err(AppError::new(
            ErrorCode::Auth,
            "SSH anahtarı eksik ya da bozuk kopyalanmış. \"-----BEGIN\" satırından \"-----END\" satırına kadar tamamını kopyala.",
        ));
    }
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
    let mut map = crate::cep::repos();
    for f in &found {
        map.insert(f.to_ascii_lowercase(), key.to_string());
    }
    crate::cep::set_repos(map)?;
    Ok(found)
}

pub fn remove(full_name: &str) -> AppResult<()> {
    crate::sshkey::remove(full_name)?;
    let mut map = crate::cep::repos();
    if map.remove(&full_name.to_ascii_lowercase()).is_none() {
        return Ok(());
    }
    crate::cep::set_repos(map)
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
        return if crate::sshkey::get(full_name).is_some() { KeyState::Ssh } else { KeyState::Missing };
    };
    let r = http
        .get(format!("https://api.github.com/repos/{full_name}"))
        .header(reqwest::header::USER_AGENT, UA)
        .header(reqwest::header::ACCEPT, "application/vnd.github+json")
        .bearer_auth(token)
        .send()
        .await;
    match r.map(|r| r.status().as_u16()) {
        Ok(200) if crate::sshkey::get(full_name).is_some() => KeyState::Both,
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
    fn parts_pull_the_token_and_the_ssh_key_out_of_one_paste() {
        let key = "-----BEGIN OPENSSH PRIVATE KEY----- b3BlbnNzaC1rZXk AAAAB3NzaC1 -----END OPENSSH PRIVATE KEY-----";
        let token = "github_pat_11ABCDEFG0abcdefghij_KLMNOP";
        let got = parts(&format!("{token} {key}"));
        assert_eq!(got, vec![key.to_string(), token.to_string()]);
        let json = format!("{{\"repos\":{{\"a/b\":\"{token}\"}},\"ssh\":{{\"a/b\":\"{}\"}}}}", key.replace("----- ", "-----\\n").replace(" -----", "\\n-----"));
        let got = parts(&json);
        assert_eq!(got.len(), 2);
        assert!(got[0].starts_with("-----BEGIN") && got[0].ends_with("-----"));
        assert_eq!(got[1], token);
        assert_eq!(parts(token), vec![token.to_string()]);
        assert_eq!(parts(&format!("{token} {token}")).len(), 1);
        assert!(parts("ssh-ed25519 AAAA ad").is_empty());
    }

    #[test]
    #[ignore]
    fn live_single_key_splits_into_the_stored_token_and_ssh_key() {
        let file = std::env::var("TEKNESYUM_TEST_KEYS_FILE").expect("TEKNESYUM_TEST_KEYS_FILE");
        let json: serde_json::Value = serde_json::from_str(std::fs::read_to_string(file).unwrap().trim_start_matches('\u{feff}')).unwrap();
        let single = json["tek"]["Teknesyum/Asistan"].as_str().unwrap();
        let got = parts(single);
        let token_ok = got.get(1).map(String::as_str) == json["repos"]["Teknesyum/Asistan"].as_str().map(str::trim);
        let ssh_ok = got.first().and_then(|k| crate::sshkey::normalize(k)) == crate::sshkey::normalize(json["ssh"]["teknesyum/asistan"].as_str().unwrap());
        println!("pieces = {}, token matches = {token_ok}, ssh matches = {ssh_ok}", got.len());
        assert!(got.len() == 2 && token_ok && ssh_ok);
    }

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
