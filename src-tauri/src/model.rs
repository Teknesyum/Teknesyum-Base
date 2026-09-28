use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Edition {
    Normal,
    Pro,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum InstallState {
    NotInstalled,
    Installed,
    UpdateAvailable,
    Cloned,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum InstallMethod {
    Zip,
    Msi,
    Exe,
    Portable,
    Clone,
    External,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub asset: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub method: Option<InstallMethod>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub run: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub silent_args: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub screenshot: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseAsset {
    pub name: String,
    pub size: u64,
    pub url: String,
    pub downloads: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Release {
    pub tag: String,
    pub name: String,
    pub published_at: String,
    pub notes_html: String,
    pub prerelease: bool,
    pub assets: Vec<ReleaseAsset>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Repo {
    pub owner: String,
    pub name: String,
    pub full_name: String,
    pub description: String,
    pub private: bool,
    pub archived: bool,
    pub fork: bool,
    pub stars: u64,
    pub forks: u64,
    pub open_issues: u64,
    pub language: Option<String>,
    pub topics: Vec<String>,
    pub license: Option<String>,
    pub homepage: Option<String>,
    pub html_url: String,
    pub pushed_at: String,
    pub updated_at: String,
    pub size_kb: u64,
    pub latest_tag: Option<String>,
    pub latest_published_at: Option<String>,
    pub has_windows_asset: bool,
    pub manifest: Option<Manifest>,
    pub category: String,
    pub install_state: InstallState,
    pub installed_tag: Option<String>,
    pub local_tags: Vec<String>,
    #[serde(default)]
    pub ui_version: Option<String>,
    #[serde(default)]
    pub plugin: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoList {
    pub account: String,
    pub fetched_at: String,
    pub from_cache: bool,
    pub rate_remaining: Option<u64>,
    pub rate_reset_at: Option<String>,
    #[serde(default)]
    pub budget_skipped: bool,
    #[serde(default)]
    pub ui_latest: Option<String>,
    #[serde(default)]
    pub core_latest: Option<String>,
    #[serde(default)]
    pub claude_code: bool,
    #[serde(default)]
    pub app_version: String,
    pub repos: Vec<Repo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Installed {
    pub full_name: String,
    pub tag: String,
    pub method: InstallMethod,
    pub path: String,
    pub exe: Option<String>,
    pub installed_at: String,
    #[serde(default)]
    pub desktop_shortcut: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub edition: Edition,
    pub version: String,
    pub git_available: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum TaskStep {
    Resolve,
    Download,
    Verify,
    Install,
    Shortcut,
    Done,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum TaskKind {
    Install,
    Update,
    Uninstall,
    Clone,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum TaskStatus {
    Running,
    Done,
    Error,
    Cancelled,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskEvent {
    pub task_id: String,
    pub full_name: String,
    pub kind: TaskKind,
    pub step: TaskStep,
    pub percent: u8,
    pub message: String,
    pub status: TaskStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub log_line: Option<String>,
}
