use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

use crate::logic::{self, InstallerKind};
use crate::model::{InstallMethod, Installed};
use crate::store::InstalledRecord;

pub const OWN_OWNER: &str = "Teknesyum";
pub const OWN_REPO: &str = if cfg!(feature = "pro") { "Teknesyum-Private" } else { "Teknesyum-Base" };

#[derive(Debug, Clone)]
pub struct Target {
    pub owner: String,
    pub name: String,
    pub manifest_name: Option<String>,
}

#[derive(Debug, Clone)]
pub struct Found {
    pub dir: PathBuf,
    pub exe: PathBuf,
    pub version: Option<String>,
}

pub fn collect_runnables(root: &Path, dir: &Path, depth: u8, out: &mut Vec<(String, u64)>) {
    let Ok(rd) = fs::read_dir(dir) else {
        return;
    };
    for e in rd.filter_map(Result::ok) {
        let p = e.path();
        if p.is_dir() {
            if depth > 0 {
                collect_runnables(root, &p, depth - 1, out);
            }
        } else if p.extension().is_some_and(|x| {
            x.eq_ignore_ascii_case("exe") || x.eq_ignore_ascii_case("bat") || x.eq_ignore_ascii_case("cmd")
        }) {
            let rel = p.strip_prefix(root).unwrap_or(&p).to_string_lossy().into_owned();
            let size = e.metadata().map(|m| m.len()).unwrap_or(0);
            out.push((rel, size));
        }
    }
}

fn same_path(a: &Path, b: &Path) -> bool {
    let norm = |p: &Path| {
        p.to_string_lossy()
            .trim_end_matches(['\\', '/'])
            .replace('/', "\\")
            .to_lowercase()
    };
    norm(a) == norm(b)
}

pub fn find_in_roots(roots: &[PathBuf], skip: &[PathBuf], name: &str, manifest_name: Option<&str>) -> Option<Found> {
    let variants = logic::name_variants(name, manifest_name);
    for root in roots {
        for v in &variants {
            let dir = root.join(v);
            if !dir.is_dir() || skip.iter().any(|s| same_path(s, &dir)) {
                continue;
            }
            let mut list = Vec::new();
            collect_runnables(&dir, &dir, 1, &mut list);
            let Some(rel) = logic::pick_main_exe(v, &list) else {
                continue;
            };
            if logic::is_helper_exe(&rel) || !variants.iter().any(|n| logic::exe_matches_name(&rel, n)) {
                continue;
            }
            let exe = dir.join(&rel);
            let version = exe_version(&exe);
            return Some(Found { dir, exe, version });
        }
    }
    None
}

fn modified_iso(path: &Path) -> String {
    fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .map(|t| {
            chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
        })
        .unwrap_or_default()
}

fn external_record(owner: &str, name: &str, found: Found) -> InstalledRecord {
    InstalledRecord {
        info: Installed {
            full_name: format!("{owner}/{name}"),
            tag: found.version.unwrap_or_default(),
            method: InstallMethod::External,
            path: found.dir.to_string_lossy().into_owned(),
            installed_at: modified_iso(&found.exe),
            desktop_shortcut: false,
            exe: Some(found.exe.to_string_lossy().into_owned()),
        },
        shortcut: None,
        package: None,
    }
}

pub fn detect_external(roots: &[PathBuf], skip: &[PathBuf], targets: &[Target]) -> Vec<InstalledRecord> {
    targets
        .iter()
        .filter_map(|t| {
            find_in_roots(roots, skip, &t.name, t.manifest_name.as_deref())
                .map(|f| external_record(&t.owner, &t.name, f))
        })
        .collect()
}

pub fn own_record() -> Option<InstalledRecord> {
    let exe = std::env::current_exe().ok()?;
    let dir = exe.parent()?.to_path_buf();
    Some(external_record(
        OWN_OWNER,
        OWN_REPO,
        Found {
            dir,
            exe,
            version: Some(env!("CARGO_PKG_VERSION").to_string()),
        },
    ))
}

fn canonical(p: &Path) -> Option<PathBuf> {
    let c = fs::canonicalize(p).ok()?;
    let s = c.to_string_lossy();
    Some(PathBuf::from(s.strip_prefix(r"\\?\").unwrap_or(&s).to_string()))
}

pub fn is_running_from(dir: &Path) -> bool {
    let (Some(exe), Some(dir)) = (std::env::current_exe().ok().and_then(|e| canonical(&e)), canonical(dir)) else {
        return false;
    };
    exe.starts_with(&dir)
}

pub fn installer_kind_of(path: &Path) -> InstallerKind {
    let mut buf = Vec::new();
    match fs::File::open(path) {
        Ok(f) => {
            let _ = f.take(16 * 1024 * 1024).read_to_end(&mut buf);
            logic::detect_installer(&buf)
        }
        Err(_) => InstallerKind::Unknown,
    }
}

pub fn find_uninstaller(dir: &Path) -> Option<PathBuf> {
    let mut list: Vec<PathBuf> = fs::read_dir(dir)
        .ok()?
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| p.is_file() && logic::is_uninstaller_name(&p.to_string_lossy()))
        .collect();
    list.sort();
    list.into_iter().next()
}

#[cfg(windows)]
pub fn exe_version(path: &Path) -> Option<String> {
    use std::ffi::c_void;
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        GetFileVersionInfoSizeW, GetFileVersionInfoW, VerQueryValueW, VS_FIXEDFILEINFO,
    };

    if !path.extension().is_some_and(|e| e.eq_ignore_ascii_case("exe")) {
        return None;
    }
    let wide = |s: &str| -> Vec<u16> { s.encode_utf16().chain(Some(0)).collect() };
    let file: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    unsafe {
        let mut handle = 0u32;
        let size = GetFileVersionInfoSizeW(file.as_ptr(), &mut handle);
        if size == 0 {
            return None;
        }
        let mut buf = vec![0u32; (size as usize).div_ceil(4)];
        let block = buf.as_mut_ptr() as *mut c_void;
        if GetFileVersionInfoW(file.as_ptr(), 0, size, block) == 0 {
            return None;
        }
        let query = |sub: &str| -> Option<(*const c_void, u32)> {
            let mut ptr: *mut c_void = std::ptr::null_mut();
            let mut len = 0u32;
            let key = wide(sub);
            (VerQueryValueW(block, key.as_ptr(), &mut ptr, &mut len) != 0 && !ptr.is_null() && len > 0)
                .then_some((ptr as *const c_void, len))
        };
        let mut langs: Vec<(u16, u16)> = Vec::new();
        if let Some((ptr, len)) = query("\\VarFileInfo\\Translation") {
            let p = ptr as *const u16;
            for i in 0..(len as usize / 4) {
                langs.push((p.add(i * 2).read_unaligned(), p.add(i * 2 + 1).read_unaligned()));
            }
        }
        langs.extend([(0x0409, 0x04B0), (0x0409, 0x04E4), (0x0000, 0x04B0)]);
        for key in ["ProductVersion", "FileVersion"] {
            for (lang, cp) in &langs {
                if let Some((ptr, len)) = query(&format!("\\StringFileInfo\\{lang:04x}{cp:04x}\\{key}")) {
                    let chars = std::slice::from_raw_parts(ptr as *const u16, len as usize);
                    if let Some(v) = logic::clean_exe_version(&String::from_utf16_lossy(chars)) {
                        return Some(v);
                    }
                }
            }
        }
        if let Some((ptr, len)) = query("\\") {
            if len as usize >= std::mem::size_of::<VS_FIXEDFILEINFO>() {
                let f = (ptr as *const VS_FIXEDFILEINFO).read_unaligned();
                if f.dwSignature == 0xFEEF_04BD {
                    let v = format!(
                        "{}.{}.{}.{}",
                        f.dwProductVersionMS >> 16,
                        f.dwProductVersionMS & 0xFFFF,
                        f.dwProductVersionLS >> 16,
                        f.dwProductVersionLS & 0xFFFF
                    );
                    return logic::clean_exe_version(&v).filter(|v| v != "0.0.0");
                }
            }
        }
    }
    None
}

#[cfg(not(windows))]
pub fn exe_version(_path: &Path) -> Option<String> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp_dir(tag: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("tkb-detect-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    fn touch(p: &Path, size: usize) {
        fs::create_dir_all(p.parent().unwrap()).unwrap();
        fs::write(p, vec![0u8; size]).unwrap();
    }

    fn target(name: &str) -> Target {
        Target {
            owner: "Teknesyum".into(),
            name: name.into(),
            manifest_name: None,
        }
    }

    #[test]
    fn detects_programs_folders_with_name_variants() {
        let root = tmp_dir("scan");
        let programs = root.join("Programs");
        let local = root.join("Local");
        touch(&programs.join("Ghostlist").join("Ghostlist.exe"), 10);
        touch(&programs.join("Ghostlist").join("cli").join("ghostlist.exe"), 99);
        touch(&programs.join("Teknesyum Base Pro").join("Teknesyum Base Pro.exe"), 10);
        touch(&programs.join("Teknesyum Base Pro").join("Uninstall Teknesyum Base Pro.exe"), 50);
        touch(&programs.join("Head Tray").join("HeadTray.exe"), 10);
        touch(&local.join("AmeliyatListesi").join("uygulama").join("ameliyat-listesi.exe"), 10);
        touch(&local.join("Teknesyum").join("apps").join("Teknesyum").join("Teknesyum.exe"), 10);
        touch(&local.join("DataOnly").join("settings.json"), 10);
        touch(&local.join("Squirrel").join("Update.exe"), 10);
        let roots = vec![programs.clone(), local.clone()];
        let skip = vec![local.join("Teknesyum")];
        let targets: Vec<Target> = ["Ghostlist", "Teknesyum-Private", "Head_Tray", "AmeliyatListesi", "Teknesyum", "DataOnly", "Squirrel", "Missing"]
            .iter()
            .map(|n| target(n))
            .collect();
        let found = detect_external(&roots, &skip, &targets);
        let names: Vec<&str> = found.iter().map(|r| r.info.full_name.as_str()).collect();
        assert_eq!(
            names,
            vec!["Teknesyum/Ghostlist", "Teknesyum/Teknesyum-Private", "Teknesyum/Head_Tray", "Teknesyum/AmeliyatListesi"]
        );
        assert!(found.iter().all(|r| r.info.method == InstallMethod::External && r.info.tag.is_empty()));
        assert!(found[0].info.exe.as_deref().unwrap().ends_with("Ghostlist\\Ghostlist.exe"));
        assert!(found[1].info.exe.as_deref().unwrap().ends_with("Teknesyum Base Pro.exe"));
        assert!(!found[1].info.exe.as_deref().unwrap().contains("Uninstall"));
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn own_record_uses_running_exe() {
        let rec = own_record().unwrap();
        assert_eq!(rec.info.full_name, format!("Teknesyum/{OWN_REPO}"));
        assert_eq!(rec.info.tag, env!("CARGO_PKG_VERSION"));
        assert_eq!(rec.info.method, InstallMethod::External);
        let exe = std::env::current_exe().unwrap();
        assert!(is_running_from(exe.parent().unwrap()));
        assert!(!is_running_from(&std::env::temp_dir().join("tkb-yok")));
    }

    #[test]
    fn finds_uninstaller_and_installer_kind() {
        let dir = tmp_dir("unins");
        touch(&dir.join("App.exe"), 4);
        assert!(find_uninstaller(&dir).is_none());
        fs::write(dir.join("Uninstall App.exe"), b"MZ....Nullsoft Install System").unwrap();
        let u = find_uninstaller(&dir).unwrap();
        assert_eq!(u.file_name().unwrap(), "Uninstall App.exe");
        assert_eq!(installer_kind_of(&u), InstallerKind::Nsis);
        assert_eq!(installer_kind_of(&dir.join("yok.exe")), InstallerKind::Unknown);
        let _ = fs::remove_dir_all(&dir);
    }

    #[cfg(windows)]
    #[test]
    fn reads_system_exe_version() {
        let windir = std::env::var_os("WINDIR").map(PathBuf::from).unwrap();
        let v = exe_version(&windir.join("System32").join("notepad.exe"));
        assert!(v.is_some_and(|v| v.starts_with("10.")));
        assert!(exe_version(&windir.join("win.ini")).is_none());
    }

    #[test]
    #[ignore]
    fn scan_this_machine() {
        let paths = crate::paths::Paths::detect();
        let names = [
            "VidShrink", "Ghostlist", "ProcWitness", "AbxPilot", "Teknesyum-Base", "Teknesyum-Private",
            "Quizloop", "Runly", "DustyBytes", "AmeliyatListesi", "Usb-Guard", "CodeXRay", "HeadsetBatteryTray",
            "Teknesyum", "Teknesyum-UI", "Teknesyum-Core",
        ];
        let targets: Vec<Target> = names.iter().map(|n| target(n)).collect();
        let skip = vec![paths.shared.clone(), paths.default_install.clone()];
        println!("roots: {:?}", paths.scan_roots);
        for r in detect_external(&paths.scan_roots, &skip, &targets) {
            println!(
                "{} | tag={} | method={:?} | path={} | exe={}",
                r.info.full_name,
                if r.info.tag.is_empty() { "-" } else { &r.info.tag },
                r.info.method,
                r.info.path,
                r.info.exe.unwrap_or_default()
            );
        }
        let own = own_record().unwrap();
        println!("own: {} | tag={} | exe={}", own.info.full_name, own.info.tag, own.info.exe.unwrap_or_default());
    }
}
