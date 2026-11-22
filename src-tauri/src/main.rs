#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod local;
mod asio;

/// Sends one OSC packet over UDP (e.g. to QLC+/Resolume on 127.0.0.1).
#[tauri::command]
fn send_osc(host: String, port: u16, data: Vec<u8>) -> Result<(), String> {
    let sock = std::net::UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    sock.send_to(&data, (host.as_str(), port)).map_err(|e| e.to_string())?;
    Ok(())
}

/// Pult pushes its latest monitor state; returns how many local phones are connected.
#[tauri::command]
fn local_state(json: String, st: tauri::State<'_, local::State>) -> usize {
    let mut g = st.lock().unwrap();
    if g.state != json { g.state = json; g.version += 1; }
    g.viewers
}

/// Local address phones on the same Wi-Fi open (e.g. http://192.168.1.45:4850).
#[tauri::command]
fn local_info() -> serde_json::Value {
    serde_json::json!({ "ip": local::ip(), "port": local::PORT })
}

use tauri_plugin_updater::UpdaterExt;

/// Asks GitHub whether a newer signed StageCue release exists.
#[tauri::command]
async fn update_check(app: tauri::AppHandle) -> Result<Option<serde_json::Value>, String> {
    let u = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())?;
    Ok(u.map(|u| serde_json::json!({ "version": u.version, "current": u.current_version, "notes": u.body })))
}

/// Downloads, verifies and installs the update, then restarts the app.
#[tauri::command]
async fn update_install(app: tauri::AppHandle) -> Result<(), String> {
    let up = app.updater().map_err(|e| e.to_string())?;
    let Some(u) = up.check().await.map_err(|e| e.to_string())? else { return Ok(()) };
    u.download_and_install(|_, _| {}, || {}).await.map_err(|e| e.to_string())?;
    app.restart();
}

fn main() {
    let shared: local::State = Default::default();
    local::start(shared.clone());
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        // Desktop app: grant MIDI/audio permissions permanently, no prompt on every start.
        .on_permission_request(|_, _| tauri::webview::PermissionResponse::Allow)
        .manage(shared)
        .manage(asio::Asio::default())
        .invoke_handler(tauri::generate_handler![send_osc, local_state, local_info, asio::asio_list, asio::asio_open, asio::asio_push, update_check, update_install])
        .run(tauri::generate_context!())
        .expect("error while running StageCue");
}
