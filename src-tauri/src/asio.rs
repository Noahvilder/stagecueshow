//! ASIO output: the webview renders all channels and streams interleaved f32 PCM here;
//! a cpal ASIO stream plays it on the interface, so every hardware channel is reachable.
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

#[derive(Default)]
pub struct Asio {
    pub buf: Arc<Mutex<VecDeque<f32>>>,
    pub open: Mutex<Option<(String, u16, u32, std::sync::mpsc::Sender<()>)>>,
}

#[derive(serde::Serialize)]
pub struct Info { pub channels: u16, pub rate: u32 }

#[cfg(windows)]
mod imp {
    use super::*;
    use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
    use cpal::{FromSample, Sample, SizedSample};

    fn host() -> Result<cpal::Host, String> { cpal::host_from_id(cpal::HostId::Asio).map_err(|e| e.to_string()) }

    pub fn list() -> Vec<String> {
        host().ok().and_then(|h| h.output_devices().ok()).map(|d| d.filter_map(|x| x.name().ok()).collect()).unwrap_or_default()
    }

    fn build<T: SizedSample + FromSample<f32>>(dev: &cpal::Device, cfg: &cpal::StreamConfig, buf: Arc<Mutex<VecDeque<f32>>>) -> Result<cpal::Stream, String> {
        dev.build_output_stream(cfg, move |out: &mut [T], _| {
            let mut b = buf.lock().unwrap();
            for s in out.iter_mut() { *s = T::from_sample(b.pop_front().unwrap_or(0.0)); }
        }, |e| eprintln!("asio: {e}"), None).map_err(|e| e.to_string())
    }

    pub fn open(a: &Asio, name: &str) -> Result<Info, String> {
        let mut g = a.open.lock().unwrap();
        if let Some((n, ch, rate, _)) = g.as_ref() { if n == name { return Ok(Info { channels: *ch, rate: *rate }); } }
        *g = None; // stops previous stream thread
        let (res_tx, res_rx) = std::sync::mpsc::channel::<Result<(u16, u32), String>>();
        let (stop_tx, stop_rx) = std::sync::mpsc::channel::<()>();
        let buf = a.buf.clone();
        let want = name.to_string();
        std::thread::spawn(move || {
            let run = || -> Result<(cpal::Stream, u16, u32), String> {
                let dev = host()?.output_devices().map_err(|e| e.to_string())?.find(|d| d.name().ok().as_deref() == Some(want.as_str())).ok_or("ASIO-driver ikke fundet")?;
                let sc = dev.default_output_config().map_err(|e| e.to_string())?;
                let cfg: cpal::StreamConfig = sc.config();
                let s = match sc.sample_format() {
                    cpal::SampleFormat::F32 => build::<f32>(&dev, &cfg, buf.clone())?,
                    cpal::SampleFormat::I32 => build::<i32>(&dev, &cfg, buf.clone())?,
                    cpal::SampleFormat::I16 => build::<i16>(&dev, &cfg, buf.clone())?,
                    f => return Err(format!("Ukendt sampleformat {f:?}")),
                };
                s.play().map_err(|e| e.to_string())?;
                Ok((s, cfg.channels, cfg.sample_rate.0))
            };
            match run() {
                Ok((s, ch, rate)) => { let _ = res_tx.send(Ok((ch, rate))); let _ = stop_rx.recv(); drop(s); }
                Err(e) => { let _ = res_tx.send(Err(e)); }
            }
        });
        let (ch, rate) = res_rx.recv().map_err(|e| e.to_string())??;
        a.buf.lock().unwrap().clear();
        *g = Some((name.to_string(), ch, rate, stop_tx));
        Ok(Info { channels: ch, rate })
    }
}

#[cfg(not(windows))]
mod imp {
    use super::*;
    pub fn list() -> Vec<String> { vec![] }
    pub fn open(_: &Asio, _: &str) -> Result<Info, String> { Err("ASIO findes kun på Windows".into()) }
}

#[tauri::command]
pub fn asio_list() -> Vec<String> { imp::list() }

#[tauri::command]
pub fn asio_open(name: String, st: tauri::State<'_, Asio>) -> Result<Info, String> { imp::open(&st, &name) }

/// Raw body = interleaved little-endian f32 frames for all device channels.
#[tauri::command]
pub fn asio_push(req: tauri::ipc::Request<'_>, st: tauri::State<'_, Asio>) -> Result<(), String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = req.body() else { return Err("forventede rå lyddata".into()) };
    let cap = st.open.lock().unwrap().as_ref().map(|(_, ch, rate, _)| *ch as usize * *rate as usize / 4).unwrap_or(0);
    let mut b = st.buf.lock().unwrap();
    b.extend(bytes.chunks_exact(4).map(|c| f32::from_le_bytes([c[0], c[1], c[2], c[3]])));
    // Keep latency bounded (~250 ms) if the webview clock runs faster than the interface.
    if b.len() > cap && cap > 0 { let extra = b.len() - cap; b.drain(..extra); }
    Ok(())
}
