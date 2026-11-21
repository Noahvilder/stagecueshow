import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { tryStripeEnvironment } from "@/lib/stripe";
import { isOffline } from "@/lib/desktop";
import { resolveTier, type Tier } from "./plan";

export function usePlan(): { tier: Tier; trialDaysLeft: number; loading: boolean } {
  const [s, setS] = useState<{ tier: Tier; trialDaysLeft: number; loading: boolean }>({ tier: "trial", trialDaysLeft: 7, loading: true });
  useEffect(() => {
    (async () => {
      if (isOffline()) { setS({ tier: "pro" as Tier, trialDaysLeft: 0, loading: false }); return; }
      const { data: u } = await supabase.auth.getUser();
      const env = tryStripeEnvironment();
      const q = supabase.from("licenses").select("status,current_period_end").eq("status", "active");
      const { data: rows } = await (env ? q.eq("environment", env) : q).limit(1);
      const lic = rows?.[0] ?? null;
      setS({ ...resolveTier(lic ?? null, u.user?.created_at ?? null), loading: false });
    })();
  }, []);
  return s;
}
