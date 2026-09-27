use std::cmp::Ordering;

use crate::model::{InstallMethod, InstallState, Manifest};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AssetRef {
    pub name: String,
    pub size: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum AssetKind {
    Zip,
    Portable,
    Msi,
    Setup,
}

impl AssetKind {
    pub fn method(self) -> InstallMethod {
        match self {
            AssetKind::Zip => InstallMethod::Zip,
            AssetKind::Portable => InstallMethod::Portable,
            AssetKind::Msi => InstallMethod::Msi,
            AssetKind::Setup => InstallMethod::Exe,
        }
    }
}

const FOREIGN_MARKERS: [&str; 9] = [
    "linux", "macos", "darwin", "osx", "-mac", "_mac", ".dmg", "appimage", "android",
];
const WINDOWS_MARKERS: [&str; 5] = ["windows", "win64", "win", "x64", "amd64"];
const SETUP_MARKERS: [&str; 3] = ["setup", "install", "kurulum"];

pub fn is_checksum_name(name: &str) -> bool {
    let n = name.to_ascii_lowercase();
    n.ends_with(".sha256")
        || n.ends_with(".sha256sum")
        || n.starts_with("sha256sums")
        || n == "checksums.txt"
        || n.ends_with(".sig")
        || n.ends_with(".asc")
}

pub fn classify(name: &str) -> Option<AssetKind> {
    let n = name.to_ascii_lowercase();
    if is_checksum_name(&n) || FOREIGN_MARKERS.iter().any(|m| n.contains(m)) {
        return None;
    }
    if n.ends_with(".zip") {
        Some(AssetKind::Zip)
    } else if n.ends_with(".msi") {
        Some(AssetKind::Msi)
    } else if n.ends_with(".exe") {
        if SETUP_MARKERS.iter().any(|m| n.contains(m)) {
            Some(AssetKind::Setup)
        } else {
            Some(AssetKind::Portable)
        }
    } else {
        None
    }
}

fn windows_score(name: &str) -> i32 {
    let n = name.to_ascii_lowercase();
    let mut score = 0;
    if WINDOWS_MARKERS.iter().any(|m| n.contains(m)) {
        score += 2;
    }
    if n.contains("arm64") || n.contains("aarch64") {
        score -= 3;
    }
    if n.contains("x86") && !n.contains("x86_64") && !n.contains("x86-64") {
        score -= 1;
    }
    score
}

fn matches_pattern(pattern: &str, name: &str) -> bool {
    if pattern.eq_ignore_ascii_case(name) {
        return true;
    }
    let opts = glob::MatchOptions {
        case_sensitive: false,
        require_literal_separator: false,
        require_literal_leading_dot: false,
    };
    glob::Pattern::new(pattern)
        .map(|p| p.matches_with(name, opts))
        .unwrap_or(false)
}

fn kind_for_method(method: InstallMethod) -> Option<&'static [AssetKind]> {
    match method {
        InstallMethod::Zip => Some(&[AssetKind::Zip]),
        InstallMethod::Msi => Some(&[AssetKind::Msi]),
        InstallMethod::Portable => Some(&[AssetKind::Portable]),
        InstallMethod::Exe => Some(&[AssetKind::Setup, AssetKind::Portable]),
        InstallMethod::Clone => None,
    }
}

pub fn select_asset<'a>(
    assets: &'a [AssetRef],
    manifest: Option<&Manifest>,
) -> Option<(&'a AssetRef, AssetKind)> {
    if let Some(pattern) = manifest.and_then(|m| m.asset.as_deref()).filter(|p| !p.is_empty()) {
        if let Some(found) = assets.iter().find(|a| matches_pattern(pattern, &a.name)) {
            let kind = manifest
                .and_then(|m| m.method)
                .and_then(|m| match m {
                    InstallMethod::Zip => Some(AssetKind::Zip),
                    InstallMethod::Msi => Some(AssetKind::Msi),
                    InstallMethod::Portable => Some(AssetKind::Portable),
                    InstallMethod::Exe => Some(AssetKind::Setup),
                    InstallMethod::Clone => None,
                })
                .or_else(|| classify(&found.name))?;
            return Some((found, kind));
        }
    }
    let allowed: &[AssetKind] = match manifest.and_then(|m| m.method) {
        Some(InstallMethod::Clone) => return None,
        Some(m) => kind_for_method(m).unwrap_or(&[]),
        None => &[
            AssetKind::Zip,
            AssetKind::Portable,
            AssetKind::Msi,
            AssetKind::Setup,
        ],
    };
    let forced_method = manifest.and_then(|m| m.method);
    assets
        .iter()
        .filter_map(|a| {
            let mut kind = classify(&a.name)?;
            if forced_method == Some(InstallMethod::Exe) && kind == AssetKind::Portable {
                kind = AssetKind::Setup;
            }
            let rank = allowed.iter().position(|k| *k == kind)?;
            Some((a, kind, rank))
        })
        .min_by(|x, y| {
            x.2.cmp(&y.2)
                .then_with(|| windows_score(&y.0.name).cmp(&windows_score(&x.0.name)))
                .then_with(|| x.0.name.len().cmp(&y.0.name.len()))
        })
        .map(|(a, k, _)| (a, k))
}

pub fn has_windows_asset(assets: &[AssetRef], manifest: Option<&Manifest>) -> bool {
    select_asset(assets, manifest).is_some()
}

pub fn checksum_candidates<'a>(assets: &'a [AssetRef], target: &str) -> Vec<&'a AssetRef> {
    let t = target.to_ascii_lowercase();
    let mut list: Vec<(&AssetRef, u8)> = assets
        .iter()
        .filter_map(|a| {
            let n = a.name.to_ascii_lowercase();
            if n == format!("{t}.sha256") || n == format!("{t}.sha256sum") {
                Some((a, 0))
            } else if n.starts_with("sha256sums") || n == "checksums.txt" {
                Some((a, 1))
            } else if n.ends_with(".sha256") || n.ends_with(".sha256sum") {
                Some((a, 2))
            } else {
                None
            }
        })
        .collect();
    list.sort_by_key(|(_, p)| *p);
    list.into_iter().map(|(a, _)| a).collect()
}

fn is_hex64(s: &str) -> bool {
    s.len() == 64 && s.bytes().all(|b| b.is_ascii_hexdigit())
}

fn base_name(s: &str) -> &str {
    let s = s.trim_start_matches('*').trim_matches('"');
    s.rsplit(['/', '\\']).next().unwrap_or(s)
}

pub fn parse_checksum(text: &str, target: &str, single_file: bool) -> Option<String> {
    let mut lone: Option<String> = None;
    let mut lines = 0usize;
    for line in text.lines() {
        let line = line.trim().trim_start_matches('\u{feff}');
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        lines += 1;
        if let Some(rest) = line.strip_prefix("SHA256 (") {
            if let Some((name, hash)) = rest.split_once(") = ") {
                if base_name(name).eq_ignore_ascii_case(target) && is_hex64(hash.trim()) {
                    return Some(hash.trim().to_ascii_lowercase());
                }
            }
            continue;
        }
        let tokens: Vec<&str> = line.split_whitespace().collect();
        let Some(hash_pos) = tokens.iter().position(|t| is_hex64(t)) else {
            continue;
        };
        let hash = tokens[hash_pos].to_ascii_lowercase();
        let names: Vec<&str> = tokens
            .iter()
            .enumerate()
            .filter(|(i, t)| *i != hash_pos && !t.eq_ignore_ascii_case("sha256"))
            .map(|(_, t)| *t)
            .collect();
        if names.is_empty() {
            lone = Some(hash);
            continue;
        }
        let joined = names.join(" ");
        if base_name(&joined).eq_ignore_ascii_case(target)
            || names.iter().any(|n| base_name(n).eq_ignore_ascii_case(target))
        {
            return Some(hash);
        }
    }
    if single_file && lines == 1 {
        lone
    } else {
        None
    }
}

fn version_parts(v: &str) -> (Vec<u64>, String) {
    let v = v.trim();
    let v = v
        .strip_prefix('v')
        .or_else(|| v.strip_prefix('V'))
        .unwrap_or(v);
    let (core, pre) = match v.find(['-', '+']) {
        Some(i) => (&v[..i], v[i + 1..].to_string()),
        None => (v, String::new()),
    };
    let nums = core
        .split(|c: char| !c.is_ascii_digit())
        .filter(|s| !s.is_empty())
        .filter_map(|s| s.parse::<u64>().ok())
        .collect();
    (nums, pre)
}

pub fn compare_versions(a: &str, b: &str) -> Ordering {
    let (na, pa) = version_parts(a);
    let (nb, pb) = version_parts(b);
    if na.is_empty() || nb.is_empty() {
        return if a.trim() == b.trim() {
            Ordering::Equal
        } else {
            a.trim().cmp(b.trim())
        };
    }
    let len = na.len().max(nb.len());
    for i in 0..len {
        let x = na.get(i).copied().unwrap_or(0);
        let y = nb.get(i).copied().unwrap_or(0);
        match x.cmp(&y) {
            Ordering::Equal => {}
            o => return o,
        }
    }
    match (pa.is_empty(), pb.is_empty()) {
        (true, true) => Ordering::Equal,
        (true, false) => Ordering::Greater,
        (false, true) => Ordering::Less,
        (false, false) => pa.cmp(&pb),
    }
}

pub fn install_state(
    installed: Option<(InstallMethod, &str)>,
    latest_tag: Option<&str>,
) -> InstallState {
    match installed {
        None => InstallState::NotInstalled,
        Some((InstallMethod::Clone, _)) => InstallState::Cloned,
        Some((_, tag)) => match latest_tag {
            Some(latest) if compare_versions(latest, tag) == Ordering::Greater => {
                InstallState::UpdateAvailable
            }
            _ => InstallState::Installed,
        },
    }
}

pub fn category(manifest: Option<&Manifest>, topics: &[String], language: Option<&str>) -> String {
    if let Some(c) = manifest
        .and_then(|m| m.category.as_deref())
        .map(str::trim)
        .filter(|c| !c.is_empty())
    {
        return c.to_string();
    }
    if let Some(t) = topics.iter().map(|t| t.trim()).find(|t| !t.is_empty()) {
        return t.to_string();
    }
    if let Some(l) = language.map(str::trim).filter(|l| !l.is_empty()) {
        return l.to_string();
    }
    "Diğer".to_string()
}

pub fn safe_dir_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect();
    let trimmed = cleaned.trim().trim_end_matches('.').to_string();
    if trimmed.is_empty() {
        "program".into()
    } else {
        trimmed
    }
}

fn normalize_name(s: &str) -> String {
    s.chars()
        .filter(|c| c.is_alphanumeric())
        .flat_map(|c| c.to_lowercase())
        .collect()
}

pub fn pick_main_exe(repo: &str, candidates: &[(String, u64)]) -> Option<String> {
    let bad = ["unins", "uninstall", "updater", "update", "crash", "helper", "setup"];
    let want = normalize_name(repo);
    let usable: Vec<&(String, u64)> = candidates
        .iter()
        .filter(|(p, _)| {
            let file = normalize_name(base_name(p));
            !bad.iter().any(|b| file.contains(b))
        })
        .collect();
    let pool = if usable.is_empty() {
        candidates.iter().collect()
    } else {
        usable
    };
    if let Some(hit) = pool.iter().find(|(p, _)| {
        let stem = base_name(p);
        let stem = stem.rsplit_once('.').map(|(s, _)| s).unwrap_or(stem);
        normalize_name(stem) == want
    }) {
        return Some(hit.0.clone());
    }
    if let Some(hit) = pool
        .iter()
        .find(|(p, _)| normalize_name(base_name(p)).contains(&want))
    {
        return Some(hit.0.clone());
    }
    pool.iter().max_by_key(|(_, s)| *s).map(|(p, _)| p.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn a(names: &[&str]) -> Vec<AssetRef> {
        names
            .iter()
            .map(|n| AssetRef {
                name: n.to_string(),
                size: 1,
            })
            .collect()
    }

    #[test]
    fn prefers_zip_then_portable_then_msi_then_setup() {
        let list = a(&["App-Setup.exe", "App.msi", "App.exe", "App-win-x64.zip"]);
        assert_eq!(select_asset(&list, None).unwrap().0.name, "App-win-x64.zip");
        let list = a(&["App-Setup.exe", "App.msi", "App.exe"]);
        let (asset, kind) = select_asset(&list, None).unwrap();
        assert_eq!((asset.name.as_str(), kind), ("App.exe", AssetKind::Portable));
        let list = a(&["App-Setup.exe", "App.msi"]);
        assert_eq!(select_asset(&list, None).unwrap().1, AssetKind::Msi);
        let list = a(&["App-Setup.exe", "SHA256SUMS"]);
        assert_eq!(select_asset(&list, None).unwrap().1, AssetKind::Setup);
    }

    #[test]
    fn prefers_windows_zip_and_skips_foreign() {
        let list = a(&["app-linux.zip", "app-macos.zip", "app-arm64.zip", "app-windows-x64.zip"]);
        assert_eq!(select_asset(&list, None).unwrap().0.name, "app-windows-x64.zip");
        let list = a(&["app-linux.tar.gz", "app.AppImage", "app-macos.zip"]);
        assert!(select_asset(&list, None).is_none());
        assert!(!has_windows_asset(&list, None));
    }

    #[test]
    fn manifest_asset_and_method_win() {
        let list = a(&["tool.zip", "tool-installer.exe", "tool.msi"]);
        let m = Manifest {
            asset: Some("*.msi".into()),
            ..Default::default()
        };
        assert_eq!(select_asset(&list, Some(&m)).unwrap().0.name, "tool.msi");
        let m = Manifest {
            method: Some(InstallMethod::Exe),
            ..Default::default()
        };
        let (asset, kind) = select_asset(&list, Some(&m)).unwrap();
        assert_eq!((asset.name.as_str(), kind), ("tool-installer.exe", AssetKind::Setup));
        let m = Manifest {
            method: Some(InstallMethod::Clone),
            ..Default::default()
        };
        assert!(select_asset(&list, Some(&m)).is_none());
    }

    #[test]
    fn parses_checksum_formats() {
        let h = "a".repeat(64);
        let g = "B".repeat(64);
        let sums = format!("{h}  other.zip\n{g} *dist/App.zip\n");
        assert_eq!(parse_checksum(&sums, "App.zip", false), Some("b".repeat(64)));
        assert_eq!(parse_checksum(&sums, "missing.zip", false), None);
        assert_eq!(parse_checksum(&format!("{h}\n"), "App.zip", true), Some(h.clone()));
        assert_eq!(parse_checksum(&format!("{h}\n"), "App.zip", false), None);
        let bsd = format!("SHA256 (App.zip) = {h}\n");
        assert_eq!(parse_checksum(&bsd, "App.zip", false), Some(h.clone()));
        let ps = format!("SHA256 {} C:\\out\\App.zip\n", h.to_uppercase());
        assert_eq!(parse_checksum(&ps, "App.zip", false), Some(h));
    }

    #[test]
    fn checksum_candidates_order() {
        let list = a(&["App.zip", "SHA256SUMS", "App.zip.sha256", "Other.exe.sha256"]);
        let names: Vec<&str> = checksum_candidates(&list, "App.zip")
            .iter()
            .map(|a| a.name.as_str())
            .collect();
        assert_eq!(names, vec!["App.zip.sha256", "SHA256SUMS", "Other.exe.sha256"]);
    }

    #[test]
    fn compares_versions() {
        assert_eq!(compare_versions("v1.2.10", "v1.2.9"), Ordering::Greater);
        assert_eq!(compare_versions("1.2", "v1.2.0"), Ordering::Equal);
        assert_eq!(compare_versions("v2.0.0", "v2.0.0-beta.1"), Ordering::Greater);
        assert_eq!(compare_versions("v0.9", "v1.0"), Ordering::Less);
        assert_eq!(compare_versions("nightly", "nightly"), Ordering::Equal);
    }

    #[test]
    fn computes_install_state() {
        assert_eq!(install_state(None, Some("v1")), InstallState::NotInstalled);
        assert_eq!(
            install_state(Some((InstallMethod::Zip, "v1.0.0")), Some("v1.1.0")),
            InstallState::UpdateAvailable
        );
        assert_eq!(
            install_state(Some((InstallMethod::Zip, "v1.1.0")), Some("v1.1.0")),
            InstallState::Installed
        );
        assert_eq!(
            install_state(Some((InstallMethod::Msi, "v1.1.0")), None),
            InstallState::Installed
        );
        assert_eq!(
            install_state(Some((InstallMethod::Clone, "")), Some("v3")),
            InstallState::Cloned
        );
    }

    #[test]
    fn category_fallbacks() {
        let m = Manifest {
            category: Some("Araçlar".into()),
            ..Default::default()
        };
        let topics = vec!["video".to_string()];
        assert_eq!(category(Some(&m), &topics, Some("Rust")), "Araçlar");
        assert_eq!(category(None, &topics, Some("Rust")), "video");
        assert_eq!(category(None, &[], Some("Rust")), "Rust");
        assert_eq!(category(None, &[], None), "Diğer");
    }

    #[test]
    fn picks_main_exe() {
        let c = vec![
            ("bin\\unins000.exe".to_string(), 900),
            ("bin\\Vid-Shrink.exe".to_string(), 100),
            ("bin\\ffmpeg.exe".to_string(), 5000),
        ];
        assert_eq!(pick_main_exe("VidShrink", &c).unwrap(), "bin\\Vid-Shrink.exe");
        let c = vec![("a.exe".to_string(), 1), ("b.exe".to_string(), 9)];
        assert_eq!(pick_main_exe("Zed", &c).unwrap(), "b.exe");
    }
}
