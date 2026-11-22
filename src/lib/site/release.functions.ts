import { createServerFn } from "@tanstack/react-start";

export type LatestRelease = { version: string; name: string; url: string } | null;

let cache: { at: number; value: LatestRelease } | null = null;

export const getLatestRelease = createServerFn({ method: "GET" }).handler(async (): Promise<LatestRelease> => {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.value;
  try {
    const res = await fetch("https://api.github.com/repos/Noahvilder/stagecueshow/releases/latest", {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "stagecue-site" },
    });
    if (!res.ok) { console.error("GitHub release lookup failed", res.status); return cache?.value ?? null; }
    const j = (await res.json()) as { tag_name?: string; assets?: { name: string; browser_download_url: string }[] };
    const a = j.assets?.find((x) => x.name.endsWith("-setup.exe"));
    const value: LatestRelease = a && j.tag_name ? { version: j.tag_name.replace(/^v/, ""), name: a.name, url: a.browser_download_url } : null;
    cache = { at: Date.now(), value };
    return value;
  } catch (e) {
    console.error("GitHub release lookup error", e);
    return cache?.value ?? null;
  }
});
