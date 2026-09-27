use std::path::PathBuf;
use std::process::Command;

fn main() {
    let windows = tauri_build::WindowsAttributes::new_without_app_manifest();
    tauri_build::try_build(tauri_build::Attributes::new().windows_attributes(windows))
        .expect("tauri build");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        embed_manifest();
    }
}

fn embed_manifest() {
    let manifest = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap())
        .join("windows-app-manifest.xml");
    println!("cargo:rerun-if-changed={}", manifest.display());
    if std::env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("msvc") {
        println!("cargo:rustc-link-arg=/MANIFEST:EMBED");
        println!("cargo:rustc-link-arg=/MANIFESTINPUT:{}", manifest.display());
        return;
    }
    let out = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    let rc = out.join("manifest.rc");
    let obj = out.join("manifest.o");
    let escaped = manifest.display().to_string().replace('\\', "/");
    std::fs::write(&rc, format!("1 24 \"{escaped}\"\n")).expect("manifest.rc");
    let windres = std::env::var("WINDRES").unwrap_or_else(|_| "windres".into());
    let status = Command::new(windres)
        .arg(&rc)
        .arg("-O")
        .arg("coff")
        .arg("-o")
        .arg(&obj)
        .status()
        .expect("windres");
    assert!(status.success(), "windres failed");
    println!("cargo:rustc-link-arg={}", obj.display());
}
