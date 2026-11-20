import { supabase } from "@/integrations/supabase/client";

/** Anonymous feature counter: only the feature name and day are stored — never who used it. */
const seen = new Set<string>();
export function trackFeature(feature: string, oncePerSession = false) {
  if (typeof window === "undefined") return;
  if (oncePerSession) { if (seen.has(feature)) return; seen.add(feature); }
  void supabase.rpc("track_feature", { _feature: feature }).then(() => undefined, () => undefined);
}
