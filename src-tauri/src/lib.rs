mod cep;
mod claude;
mod commands;
mod detect;
mod drive;
mod error;
mod github;
mod installer;
mod logic;
mod model;
mod paths;
mod prereq;
mod repokey;
mod settings;
mod store;
mod updater;

use tauri::{AppHandle, Manager, WebviewWindow, WindowEvent};
use tauri_plugin_window_state::{StateFlags, WindowExt};

use commands::AppState;

const MAIN: &str = "main";
const MIN_SIZE: (f64, f64) = (720.0, 520.0);

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window(MAIN) {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

fn state_flags() -> StateFlags {
    StateFlags::all() & !StateFlags::VISIBLE & !StateFlags::MAXIMIZED
}

fn keep_on_screen(window: &WebviewWindow) {
    if window.is_maximized().unwrap_or(false) {
        return;
    }
    let (Ok(pos), Ok(size), Ok(monitors)) = (
        window.outer_position(),
        window.outer_size(),
        window.available_monitors(),
    ) else {
        return;
    };
    let (x0, y0) = (pos.x as i64, pos.y as i64);
    let (x1, y1) = (x0 + size.width as i64, y0 + size.height as i64);
    let visible = monitors.iter().any(|m| {
        let mp = m.position();
        let ms = m.size();
        let (mx0, my0) = (mp.x as i64, mp.y as i64);
        let (mx1, my1) = (mx0 + ms.width as i64, my0 + ms.height as i64);
        let w = x1.min(mx1) - x0.max(mx0);
        let h = y1.min(my1) - y0.max(my0);
        w >= 120 && h >= 40 && y0 >= my0 - 8 && y0 < my1 - 20
    });
    if !visible {
        let _ = window.center();
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
struct Rect {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

fn fit_to_work(work: Rect, win: Rect, min: (f64, f64)) -> Option<Rect> {
    let w = win.w.min(work.w).max(min.0);
    let h = win.h.min(work.h).max(min.1);
    let resized = w < win.w || h < win.h;
    let overlap_x = (win.x + win.w).min(work.x + work.w) - win.x.max(work.x);
    let offscreen = overlap_x < 120.0 || win.y < work.y || win.y > work.y + work.h - 40.0;
    if !resized && !offscreen {
        return None;
    }
    Some(Rect {
        x: work.x + ((work.w - w) / 2.0).max(0.0),
        y: work.y + ((work.h - h) / 2.0).max(0.0),
        w,
        h,
    })
}

fn fit_to_monitor(window: &WebviewWindow) {
    if window.is_maximized().unwrap_or(false) {
        return;
    }
    let (Ok(Some(monitor)), Ok(pos), Ok(outer), Ok(inner)) = (
        window.current_monitor(),
        window.outer_position(),
        window.outer_size(),
        window.inner_size(),
    ) else {
        return;
    };
    let scale = monitor.scale_factor();
    if scale <= 0.0 {
        return;
    }
    let area = monitor.work_area();
    let work = Rect {
        x: area.position.x as f64 / scale,
        y: area.position.y as f64 / scale,
        w: area.size.width as f64 / scale,
        h: area.size.height as f64 / scale,
    };
    let win = Rect {
        x: pos.x as f64 / scale,
        y: pos.y as f64 / scale,
        w: outer.width as f64 / scale,
        h: outer.height as f64 / scale,
    };
    let Some(fit) = fit_to_work(work, win, MIN_SIZE) else {
        return;
    };
    let dw = outer.width.saturating_sub(inner.width) as f64 / scale;
    let dh = outer.height.saturating_sub(inner.height) as f64 / scale;
    if fit.w < win.w || fit.h < win.h {
        let _ = window.set_size(tauri::LogicalSize::new(
            (fit.w - dw).max(MIN_SIZE.0),
            (fit.h - dh).max(MIN_SIZE.1),
        ));
    }
    let _ = window.set_position(tauri::LogicalPosition::new(fit.x, fit.y));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn katalog_main() {
    let mut args = std::env::args().skip(1);
    let account = args.next().unwrap_or_else(|| "Teknesyum".to_string());
    let out = std::path::PathBuf::from(args.next().unwrap_or_else(|| "index.json".to_string()));
    let token = std::env::var("GITHUB_TOKEN").ok().filter(|t| !t.is_empty());
    let cache = std::env::temp_dir().join("teknesyum-katalog");
    let gh = github::GitHub::new(github::build_http(), cache, token).without_index();
    let index = match tauri::async_runtime::block_on(gh.build_index(&account)) {
        Ok(i) => i,
        Err(e) => {
            eprintln!("katalog: {}", e.message);
            std::process::exit(1);
        }
    };
    let body = serde_json::to_string_pretty(&index).expect("katalog json");
    if let Err(e) = std::fs::write(&out, body) {
        eprintln!("katalog: {e}");
        std::process::exit(1);
    }
    println!("katalog: {} depo -> {}", index.repos.len(), out.display());
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_main(app);
        }))
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(state_flags())
                .skip_initial_state(MAIN)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(feature = "pro")]
            settings::purge_stored_keys();
            #[cfg(not(feature = "pro"))]
            cep::migrate_from_keyring();
            commands::warm_git();
            app.manage(AppState::new());
            app.manage(updater::Updater::new());
            updater::start(app.handle());
            if let Some(window) = app.get_webview_window(MAIN) {
                let _ = window.restore_state(state_flags());
                keep_on_screen(&window);
                fit_to_monitor(&window);
                let _ = window.maximize();
                if let Some(z) = std::env::var("TEKNESYUM_BASE_UI_SCALE").ok().and_then(|v| v.parse::<f64>().ok()) {
                    let _ = window.set_zoom(z);
                }
                window.show()?;
                let _ = window.set_focus();
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() != MAIN {
                    return;
                }
                let state = window.state::<AppState>();
                if state.running_tasks() > 0 {
                    api.prevent_close();
                    let _ = window.minimize();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_info,
            commands::list_repos,
            commands::repo_readme,
            commands::repo_releases,
            commands::repo_media,
            commands::desktop_shortcut,
            commands::get_settings,
            commands::save_settings,
            commands::set_token,
            commands::clear_token,
            commands::list_installed,
            commands::install_repo,
            commands::uninstall_repo,
            commands::clone_repo,
            commands::missing_prereqs,
            commands::repo_keys,
            commands::user_repo_keys,
            commands::add_repo_key,
            commands::remove_repo_key,
            commands::drive_list,
            commands::drive_add,
            commands::drive_remove,
            commands::drive_download,
            commands::drive_reveal,
            commands::cancel_task,
            commands::launch_installed,
            commands::set_local_tags,
            commands::open_path,
            updater::update_state,
            updater::update_check,
            updater::update_download,
            updater::update_cancel,
            updater::update_install,
        ])
        .run(tauri::generate_context!())
        .expect("Teknesyum Base başlatılamadı");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn r(x: f64, y: f64, w: f64, h: f64) -> Rect {
        Rect { x, y, w, h }
    }

    #[test]
    fn shrinks_and_centers_on_small_work_area() {
        let work = r(0.0, 0.0, 1280.0, 688.0);
        let fit = fit_to_work(work, r(50.0, 30.0, 1180.0, 760.0), MIN_SIZE).unwrap();
        assert_eq!(fit, r(50.0, 0.0, 1180.0, 688.0));
    }

    #[test]
    fn leaves_fitting_window_alone() {
        let work = r(0.0, 0.0, 1920.0, 1040.0);
        assert!(fit_to_work(work, r(370.0, 140.0, 1180.0, 760.0), MIN_SIZE).is_none());
    }

    #[test]
    fn never_below_min_size() {
        let work = r(0.0, 0.0, 640.0, 480.0);
        let fit = fit_to_work(work, r(0.0, 0.0, 1180.0, 760.0), MIN_SIZE).unwrap();
        assert_eq!((fit.w, fit.h), MIN_SIZE);
        assert_eq!((fit.x, fit.y), (0.0, 0.0));
    }

    #[test]
    fn centers_offscreen_window() {
        let work = r(0.0, 0.0, 1920.0, 1040.0);
        let fit = fit_to_work(work, r(2500.0, 100.0, 1180.0, 760.0), MIN_SIZE).unwrap();
        assert_eq!(fit, r(370.0, 140.0, 1180.0, 760.0));
        let fit = fit_to_work(work, r(100.0, -300.0, 1180.0, 760.0), MIN_SIZE).unwrap();
        assert_eq!(fit, r(370.0, 140.0, 1180.0, 760.0));
    }

    #[test]
    fn respects_work_area_offset() {
        let work = r(-1280.0, 40.0, 1280.0, 688.0);
        let fit = fit_to_work(work, r(-1200.0, 60.0, 1180.0, 760.0), MIN_SIZE).unwrap();
        assert_eq!(fit, r(-1230.0, 40.0, 1180.0, 688.0));
    }
}
