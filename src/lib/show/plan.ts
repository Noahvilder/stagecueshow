export type Tier = "pro" | "trial" | "free";
export const TRIAL_DAYS = 7;
export const FREE_MAX_CHANNEL = 2;
export type ProFeature = "pfl" | "channels" | "group" | "monitors";
export const PRO_LABEL: Record<ProFeature, string> = {
  pfl: "Forlyt (PFL)",
  channels: "Individuel kanal-routing (op til 32 kanaler)",
  group: "Gruppe-cues",
  monitors: "Flere end 2 scenemonitor-profiler",
};

/** Resolve tier from license row + account creation time. */
export function resolveTier(lic: { status: string; current_period_end: string | null } | null, createdAt: string | null, now = Date.now()): { tier: Tier; trialDaysLeft: number } {
  if (lic?.status === "active" && (!lic.current_period_end || Date.parse(lic.current_period_end) > now)) return { tier: "pro", trialDaysLeft: 0 };
  if (createdAt) {
    const left = TRIAL_DAYS - (now - Date.parse(createdAt)) / 86400000;
    if (left > 0) return { tier: "trial", trialDaysLeft: Math.ceil(left) };
  }
  return { tier: "free", trialDaysLeft: 0 };
}
export const hasPro = (t: Tier) => t !== "free";
