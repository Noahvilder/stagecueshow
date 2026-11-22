/** True inside the StageCue Windows app (Tauri webview). */
export const isDesktop = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Sales/marketing pages that must never appear inside the desktop app. */
const SALES = ["/", "/download", "/support"];

/** Make the desktop window behave like software: no browser back, no sales pages, no new tabs. */
export function installDesktopGuards(navigate: (to: string) => void): () => void {
  if (!isDesktop()) return () => {};
  const guard = () => { if (SALES.includes(location.pathname)) navigate("/hub"); };
  guard();
  const key = (e: KeyboardEvent) => { if ((e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) || e.key === "BrowserBack" || e.key === "BrowserForward") e.preventDefault(); };
  const mouse = (e: MouseEvent) => { if (e.button === 3 || e.button === 4) e.preventDefault(); };
  const click = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a");
    if (!a?.href) return;
    const u = new URL(a.href, location.href);
    if (u.origin === location.origin) {
      if (SALES.includes(u.pathname)) { e.preventDefault(); navigate("/hub"); }
      else if (a.target === "_blank") { e.preventDefault(); navigate(u.pathname + u.search); }
    }
  };
  const pop = () => guard();
  window.addEventListener("keydown", key, true);
  window.addEventListener("mouseup", mouse, true);
  window.addEventListener("mousedown", mouse, true);
  document.addEventListener("click", click, true);
  window.addEventListener("popstate", pop);
  return () => { window.removeEventListener("keydown", key, true); window.removeEventListener("mouseup", mouse, true); window.removeEventListener("mousedown", mouse, true); document.removeEventListener("click", click, true); window.removeEventListener("popstate", pop); };
}

/** True when running from the bundled offline files inside the Windows app (shows stored locally, always Pro). */
export const isDesktopBundle = () => isDesktop() && (location.protocol === "tauri:" || location.hostname === "tauri.localhost");

const FORCE = "stagecue.forceOffline";
/** User chose "Fortsæt offline" on the login screen (lasts until the app is closed). */
export const setForceOffline = (on: boolean) => { if (on) sessionStorage.setItem(FORCE, "1"); else sessionStorage.removeItem(FORCE); };

/** Windows app without internet (no Wi-Fi) or user chose to continue offline. Online = full account + admin in-app. */
export const isOffline = () => isDesktopBundle() && (!navigator.onLine || sessionStorage.getItem(FORCE) === "1");
