use std::path::{Path, PathBuf};

use serde::{de::DeserializeOwned, Serialize};

use crate::error::AppResult;

pub const APP_DIR: &str = if cfg!(feature = "pro") { "Base Pro" } else { "Base" };
pub const TEST_ROOT_ENV: &str = "TEKNESYUM_BASE_ROOT";

#[derive(Debug, Clone)]
pub struct Paths {
    pub data: PathBuf,
    pub cache: PathBuf,
    pub default_install: PathBuf,
    pub default_clone: PathBuf,
    pub shortcuts: PathBuf,
    pub dry_run: bool,
}

impl Paths {
    pub fn detect() -> Self {
        match std::env::var_os(TEST_ROOT_ENV).filter(|v| !v.is_empty()) {
            Some(root) => Self::under_root(PathBuf::from(root)),
            None => Self::system(),
        }
    }

    pub fn under_root(root: PathBuf) -> Self {
        let data = root.join(APP_DIR);
        Self {
            cache: data.join("cache"),
            data,
            default_install: root.join("apps"),
            default_clone: root.join("clones"),
            shortcuts: root.join("shortcuts"),
            dry_run: true,
        }
    }

    fn system() -> Self {
        let local = dirs::data_local_dir().unwrap_or_else(std::env::temp_dir);
        let roaming = dirs::data_dir().unwrap_or_else(|| local.clone());
        let home = dirs::home_dir().unwrap_or_else(|| local.clone());
        let teknesyum = local.join("Teknesyum");
        let data = teknesyum.join(APP_DIR);
        Self {
            cache: data.join("cache"),
            data,
            default_install: teknesyum.join("apps"),
            default_clone: home.join("Teknesyum"),
            shortcuts: roaming
                .join("Microsoft")
                .join("Windows")
                .join("Start Menu")
                .join("Programs")
                .join("Teknesyum"),
            dry_run: false,
        }
    }

    pub fn settings_file(&self) -> PathBuf {
        self.data.join("settings.json")
    }

    pub fn installed_file(&self) -> PathBuf {
        self.data.join("installed.json")
    }

    pub fn tags_file(&self) -> PathBuf {
        self.data.join("tags.json")
    }
}

pub fn read_json<T: DeserializeOwned>(path: &Path) -> Option<T> {
    let text = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(text.trim_start_matches('\u{feff}')).ok()
}

pub fn write_json<T: Serialize>(path: &Path, value: &T) -> AppResult<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, serde_json::to_vec_pretty(value)?)?;
    std::fs::rename(&tmp, path)?;
    Ok(())
}

pub fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}
