#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod local;

/// Sends one OSC packet over UDP (e.g. to QLC+/Resolume on 127.0.0.1).
#[tauri::command]
fn send_osc(host: String, port: u16, data: Vec<u8>) -> Result<(), String> {
    let sock = std::net::UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    sock.send_to(&data, (host.as_str(), port)).map_err(|e| e.to_string())?;
    Ok(())
}

/// Pult pushes its latest monitor state; returns how many local phones are connected.
#[tauri::command]
fn local_state(json: String, st: tauri::State<local::State>) -> usize {
    let mut g = st.lock().unwrap();
    if g.state != json { g.state = json; g.version += 1; }
    g.viewers
}

/// Local address phones on the same Wi-Fi open (e.g. http://192.168.1.45:4850).
#[tauri::command]
fn local_info() -> serde_json::Value {
    serde_json::json!({ "ip": local::ip(), "port": local::PORT })
}

fn main() {
    let shared: local::State = Default::default();
    local::start(shared.clone());
    tauri::Builder::default()
        .manage(shared)
        .invoke_handler(tauri::generate_handler![send_osc, local_state, local_info])
        .run(tauri::generate_context!())
        .expect("error while running StageCue");
}
