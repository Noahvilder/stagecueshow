//! Local Wi-Fi scene monitor: serves a small viewer page and pushes the pult state
//! to phones over WebSocket on the local network. No internet needed.
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::time::Duration;

pub const PORT: u16 = 4850;
const PAGE: &str = include_str!("viewer.html");

#[derive(Default)]
pub struct Shared { pub state: String, pub version: u64, pub viewers: usize }
pub type State = Arc<Mutex<Shared>>;

pub fn start(shared: State) {
    std::thread::spawn(move || {
        let Ok(listener) = TcpListener::bind(("0.0.0.0", PORT)) else { return };
        for stream in listener.incoming().flatten() {
            let s = shared.clone();
            std::thread::spawn(move || { let _ = handle(stream, s); });
        }
    });
}

fn handle(stream: TcpStream, shared: State) -> std::io::Result<()> {
    let mut buf = [0u8; 2048];
    let n = stream.peek(&mut buf)?;
    let head = String::from_utf8_lossy(&buf[..n]).to_ascii_lowercase();
    if head.contains("upgrade: websocket") { return viewer(stream, shared); }
    let mut stream = stream;
    let _ = stream.read(&mut buf);
    let body = PAGE.as_bytes();
    write!(stream, "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", body.len())?;
    stream.write_all(body)
}

fn viewer(stream: TcpStream, shared: State) -> std::io::Result<()> {
    let Ok(mut ws) = tungstenite::accept(stream) else { return Ok(()) };
    ws.get_ref().set_read_timeout(Some(Duration::from_millis(250)))?;
    shared.lock().unwrap().viewers += 1;
    let mut seen = u64::MAX;
    let mut tick = 0u32;
    loop {
        let (v, s) = { let g = shared.lock().unwrap(); (g.version, g.state.clone()) };
        tick += 1;
        if (v != seen || tick % 8 == 0) && !s.is_empty() {
            if ws.send(tungstenite::Message::text(s)).is_err() { break; }
            seen = v;
        }
        match ws.read() {
            Ok(tungstenite::Message::Close(_)) => break,
            Ok(_) => {}
            Err(tungstenite::Error::Io(e)) if matches!(e.kind(), std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut) => {}
            Err(_) => break,
        }
    }
    shared.lock().unwrap().viewers -= 1;
    Ok(())
}

pub fn ip() -> String {
    local_ip_address::local_ip().map(|i| i.to_string()).unwrap_or_default()
}
