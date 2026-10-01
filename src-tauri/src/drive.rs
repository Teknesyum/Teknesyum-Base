use std::collections::HashSet;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use reqwest::header::{CONTENT_DISPOSITION, CONTENT_LENGTH, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

use crate::error::{AppError, AppResult, ErrorCode};
use crate::github::UA;
use crate::paths::{now_iso, read_json, write_json, Paths};

pub const DRIVE_EVENT: &str = "drive://progress";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DriveItem {
    pub id: String,
    pub name: String,
    pub size: Option<u64>,
    pub added_at: String,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum DriveStatus {
    Running,
    Done,
    Error,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveProgress {
    pub id: String,
    pub received: u64,
    pub total: Option<u64>,
    pub status: DriveStatus,
    pub path: String,
    pub message: Option<String>,
}

fn file(paths: &Paths) -> PathBuf {
    paths.data.join("drive.json")
}

fn lock() -> &'static Mutex<()> {
    static L: OnceLock<Mutex<()>> = OnceLock::new();
    L.get_or_init(|| Mutex::new(()))
}

fn running() -> &'static Mutex<HashSet<String>> {
    static R: OnceLock<Mutex<HashSet<String>>> = OnceLock::new();
    R.get_or_init(|| Mutex::new(HashSet::new()))
}

pub fn list(paths: &Paths) -> Vec<DriveItem> {
    read_json(&file(paths)).unwrap_or_default()
}

fn save(paths: &Paths, items: &[DriveItem]) -> AppResult<()> {
    write_json(&file(paths), &items)
}

pub fn looks_like_drive(text: &str) -> bool {
    let t = text.trim().to_ascii_lowercase();
    t.contains("drive.google.com/") || t.contains("drive.usercontent.google.com/") || t.contains("docs.google.com/uc")
}

fn valid_id(id: &str) -> bool {
    id.len() >= 10 && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

pub fn parse_id(link: &str) -> Option<String> {
    let link = link.trim();
    if !looks_like_drive(link) || link.contains("/folders/") || link.contains("/drive/u/") {
        return None;
    }
    let take = |s: &str| -> String { s.chars().take_while(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_').collect() };
    if let Some(pos) = link.find("/d/") {
        let id = take(&link[pos + 3..]);
        if valid_id(&id) {
            return Some(id);
        }
    }
    let query = link.split_once('?').map(|(_, q)| q).unwrap_or("");
    for pair in query.split('&') {
        if let Some(v) = pair.strip_prefix("id=") {
            let id = take(v);
            if valid_id(&id) {
                return Some(id);
            }
        }
    }
    None
}

fn download_url(id: &str) -> String {
    format!("https://drive.usercontent.google.com/download?id={id}&export=download&confirm=t")
}

fn percent_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Some(v) = std::str::from_utf8(&b[i + 1..i + 3]).ok().and_then(|h| u8::from_str_radix(h, 16).ok()) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

pub fn filename_from(disposition: &str) -> Option<String> {
    let mut plain = None;
    for part in disposition.split(';').map(str::trim) {
        if let Some(v) = part.strip_prefix("filename*=") {
            let v = v.trim_matches('"');
            let v = v.split_once("''").map(|(_, x)| x).unwrap_or(v);
            let name = percent_decode(v);
            if !name.is_empty() {
                return Some(name);
            }
        } else if let Some(v) = part.strip_prefix("filename=") {
            plain = Some(v.trim_matches('"').to_string());
        }
    }
    plain.filter(|n| !n.is_empty())
}

pub fn safe_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| if c.is_control() || r#"<>:"/\|?*"#.contains(c) { '_' } else { c })
        .collect();
    let cleaned = cleaned.trim().trim_end_matches(['.', ' ']).to_string();
    if cleaned.is_empty() {
        "drive-dosyasi".into()
    } else {
        cleaned
    }
}

fn unique_target(dir: &Path, name: &str) -> PathBuf {
    let first = dir.join(name);
    if !first.exists() && !part_of(&first).exists() {
        return first;
    }
    let (stem, ext) = match name.rsplit_once('.') {
        Some((s, e)) if !s.is_empty() => (s.to_string(), format!(".{e}")),
        _ => (name.to_string(), String::new()),
    };
    for n in 1.. {
        let p = dir.join(format!("{stem} ({n}){ext}"));
        if !p.exists() && !part_of(&p).exists() {
            return p;
        }
    }
    first
}

fn part_of(p: &Path) -> PathBuf {
    let mut s = p.as_os_str().to_owned();
    s.push(".part");
    PathBuf::from(s)
}

pub fn downloads_dir() -> PathBuf {
    dirs::download_dir().unwrap_or_else(|| dirs::home_dir().unwrap_or_default().join("Downloads"))
}

async fn open(http: &reqwest::Client, id: &str) -> AppResult<reqwest::Response> {
    let resp = http.get(download_url(id)).header(reqwest::header::USER_AGENT, UA).send().await?;
    let status = resp.status().as_u16();
    let html = resp
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.starts_with("text/html"));
    match status {
        200 if !html => Ok(resp),
        200 | 401 | 403 => Err(AppError::new(ErrorCode::Auth, "Bu Drive dosyası herkese açık değil. Paylaşımı \"Bağlantıya sahip olan herkes\" yapın.")),
        404 => Err(AppError::new(ErrorCode::NotFound, "Drive dosyası bulunamadı.")),
        s => Err(AppError::new(ErrorCode::Network, format!("Drive yanıt vermedi: HTTP {s}"))),
    }
}

fn size_of(resp: &reqwest::Response) -> Option<u64> {
    resp.headers().get(CONTENT_LENGTH).and_then(|v| v.to_str().ok()).and_then(|v| v.parse().ok())
}

pub async fn add(http: &reqwest::Client, paths: &Paths, link: &str) -> AppResult<DriveItem> {
    let id = parse_id(link).ok_or_else(|| AppError::new(ErrorCode::NotFound, "Bu bir Drive dosya linki değil. Klasör linkleri desteklenmiyor."))?;
    let resp = open(http, &id).await?;
    let name = resp
        .headers()
        .get(CONTENT_DISPOSITION)
        .and_then(|v| v.to_str().ok())
        .and_then(filename_from)
        .map(|n| safe_name(&n))
        .unwrap_or_else(|| format!("drive-{id}"));
    let item = DriveItem { id: id.clone(), name, size: size_of(&resp), added_at: now_iso() };
    drop(resp);
    let _g = lock().lock().unwrap_or_else(|e| e.into_inner());
    let mut items = list(paths);
    items.retain(|x| x.id != id);
    items.insert(0, item.clone());
    save(paths, &items)?;
    Ok(item)
}

pub fn remove(paths: &Paths, id: &str) -> AppResult<()> {
    let _g = lock().lock().unwrap_or_else(|e| e.into_inner());
    let mut items = list(paths);
    items.retain(|x| x.id != id);
    save(paths, &items)
}

fn emit(app: &AppHandle, p: &DriveProgress) {
    let _ = app.emit(DRIVE_EVENT, p);
}

pub fn start(app: AppHandle, http: reqwest::Client, paths: &Paths, id: String) -> AppResult<String> {
    let item = list(paths)
        .into_iter()
        .find(|x| x.id == id)
        .ok_or_else(|| AppError::new(ErrorCode::NotFound, "Bu dosya listede yok."))?;
    {
        let mut r = running().lock().unwrap_or_else(|e| e.into_inner());
        if !r.insert(id.clone()) {
            return Err(AppError::new(ErrorCode::Unknown, "Bu dosya zaten iniyor."));
        }
    }
    let dir = downloads_dir();
    std::fs::create_dir_all(&dir)?;
    let target = unique_target(&dir, &item.name);
    let part = part_of(&target);
    let shown = target.to_string_lossy().into_owned();
    tauri::async_runtime::spawn(async move {
        let mut p = DriveProgress { id: id.clone(), received: 0, total: item.size, status: DriveStatus::Running, path: part.to_string_lossy().into_owned(), message: None };
        emit(&app, &p);
        let result = fetch(&app, &http, &id, &part, &mut p).await;
        match result.and_then(|_| std::fs::rename(&part, &target).map_err(AppError::from)) {
            Ok(()) => {
                p.status = DriveStatus::Done;
                p.path = target.to_string_lossy().into_owned();
                if p.total.is_none() {
                    p.total = Some(p.received);
                }
            }
            Err(e) => {
                let _ = std::fs::remove_file(&part);
                p.status = DriveStatus::Error;
                p.path = dir.to_string_lossy().into_owned();
                p.message = Some(e.message);
            }
        }
        emit(&app, &p);
        running().lock().unwrap_or_else(|e| e.into_inner()).remove(&id);
    });
    Ok(shown)
}

async fn fetch(app: &AppHandle, http: &reqwest::Client, id: &str, part: &Path, p: &mut DriveProgress) -> AppResult<()> {
    let resp = open(http, id).await?;
    if let Some(n) = size_of(&resp) {
        p.total = Some(n);
    }
    let mut out = std::io::BufWriter::new(std::fs::File::create(part)?);
    let mut stream = resp.bytes_stream();
    let mut last = Instant::now();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        out.write_all(&chunk)?;
        p.received += chunk.len() as u64;
        if last.elapsed() >= Duration::from_millis(100) {
            last = Instant::now();
            emit(app, p);
        }
    }
    out.flush()?;
    Ok(())
}

pub fn revealable(path: &Path) -> bool {
    let dir = downloads_dir();
    let Ok(dir) = dir.canonicalize() else {
        return false;
    };
    let probe = if path.exists() { path.to_path_buf() } else { path.parent().map(Path::to_path_buf).unwrap_or_default() };
    probe.canonicalize().is_ok_and(|p| p.starts_with(&dir))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_drive_file_links() {
        let id = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";
        assert_eq!(parse_id(&format!("https://drive.google.com/file/d/{id}/view?usp=sharing")).as_deref(), Some(id));
        assert_eq!(parse_id(&format!("https://drive.google.com/open?id={id}")).as_deref(), Some(id));
        assert_eq!(parse_id(&format!("https://drive.google.com/uc?export=download&id={id}")).as_deref(), Some(id));
        assert_eq!(parse_id(&format!("https://drive.usercontent.google.com/download?id={id}&export=download")).as_deref(), Some(id));
        assert_eq!(parse_id(&format!("https://drive.google.com/drive/folders/{id}")), None);
        assert_eq!(parse_id("github_pat_abc"), None);
        assert!(looks_like_drive(" https://drive.google.com/file/d/x "));
        assert!(!looks_like_drive("github_pat_abc"));
    }

    #[test]
    fn reads_and_cleans_filenames() {
        assert_eq!(filename_from(r#"attachment; filename="a.zip"; filename*=UTF-8''%C3%87al%C4%B1%C5%9Fma%20dosyas%C4%B1.zip"#).as_deref(), Some("Çalışma dosyası.zip"));
        assert_eq!(filename_from(r#"attachment; filename="kurulum.exe""#).as_deref(), Some("kurulum.exe"));
        assert_eq!(filename_from("inline"), None);
        assert_eq!(safe_name("..\\a/b:c?.zip. "), ".._a_b_c_.zip");
        assert_eq!(safe_name("  "), "drive-dosyasi");
    }

    #[test]
    fn picks_free_name() {
        let dir = std::env::temp_dir().join(format!("tk-drive-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("a.zip"), b"x").unwrap();
        std::fs::write(dir.join("a (1).zip.part"), b"x").unwrap();
        assert_eq!(unique_target(&dir, "a.zip"), dir.join("a (2).zip"));
        assert_eq!(unique_target(&dir, "b"), dir.join("b"));
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
