export const MAX_PULT_DEVICES = 3;
const KEY = "stagecue.deviceId";
export function getDeviceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    const b = crypto.getRandomValues(new Uint8Array(16));
    id = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(KEY, id);
  }
  return id;
}
export function guessDeviceName(ua = navigator.userAgent): string {
  const os = /Windows/.test(ua) ? "Windows" : /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : "Enhed";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${os} · ${br}`;
}
