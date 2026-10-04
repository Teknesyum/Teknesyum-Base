use serde::{Deserialize, Serialize};

use crate::error::AppResult;
use crate::paths::{read_json, write_json, Paths};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Language {
    Tr,
    En,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub account: String,
    pub extra_accounts: Vec<String>,
    pub install_dir: String,
    pub clone_dir: String,
    pub language: Language,
    pub show_archived: bool,
    pub show_forks: bool,
    pub close_to_tray: bool,
    pub desktop_shortcut: bool,
    pub silent_update: bool,
    pub has_token: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            account: "Teknesyum".into(),
            extra_accounts: Vec::new(),
            install_dir: String::new(),
            clone_dir: String::new(),
            language: Language::Tr,
            show_archived: false,
            show_forks: false,
            close_to_tray: false,
            desktop_shortcut: false,
            silent_update: true,
            has_token: false,
        }
    }
}

impl Settings {
    pub fn normalize(mut self, paths: &Paths, has_token: bool) -> Self {
        self.account = self.account.trim().to_string();
        if self.account.is_empty() {
            self.account = "Teknesyum".into();
        }
        self.extra_accounts = self
            .extra_accounts
            .into_iter()
            .map(|a| a.trim().to_string())
            .filter(|a| !a.is_empty())
            .collect();
        if self.install_dir.trim().is_empty() {
            self.install_dir = paths.default_install.to_string_lossy().into_owned();
        }
        if self.clone_dir.trim().is_empty() {
            self.clone_dir = paths.default_clone.to_string_lossy().into_owned();
        }
        self.has_token = has_token;
        self
    }
}

pub fn load(paths: &Paths, has_token: bool) -> Settings {
    read_json::<Settings>(&paths.settings_file())
        .unwrap_or_default()
        .normalize(paths, has_token)
}

pub fn save(paths: &Paths, settings: &Settings) -> AppResult<()> {
    let mut stored = settings.clone();
    stored.has_token = false;
    write_json(&paths.settings_file(), &stored)
}

pub fn read_token() -> Option<String> {
    crate::cep::token()
}

pub fn write_token(token: &str) -> AppResult<()> {
    crate::cep::set_token(token)
}

pub fn delete_token() -> AppResult<()> {
    crate::cep::clear_token()
}

pub fn embedded_token() -> Option<String> {
    if !cfg!(feature = "pro") {
        return None;
    }
    option_env!("TEKNESYUM_PRO_TOKEN").map(|t| t.trim().to_string()).filter(|t| !t.is_empty())
}

pub fn token() -> Option<String> {
    if cfg!(feature = "pro") {
        embedded_token()
    } else {
        read_token()
    }
}

#[cfg(feature = "pro")]
pub fn purge_stored_keys() {
    if let Ok(e) = keyring::Entry::new("Teknesyum Base Pro", "github-token") {
        let _ = e.delete_credential();
    }
    crate::repokey::purge_stored();
}
