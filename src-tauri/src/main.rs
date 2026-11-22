#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Sends one OSC packet over UDP (e.g. to QLC+/Resolume on 127.0.0.1).
#[tauri::command]
fn send_osc(host: String, port: u16, data: Vec<u8>) -> Result<(), String> {
    let sock = std::net::UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    sock.send_to(&data, (host.as_str(), port)).map_err(|e| e.to_string())?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![send_osc])
        .run(tauri::generate_context!())
        .expect("error while running StageCue");
}
