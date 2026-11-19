import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { tryStripeEnvironment } from "@/lib/stripe";
import { resolveTier, type Tier } from "./plan";

export function usePlan(): { tier: Tier; trialDaysLeft: number; loading: boolean } {
  const [s, setS] = useState<{ tier: Tier; trialDaysLeft: number; loading: boolean }>({ tier: "trial", trialDaysLeft: 7, loading: true });
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const env = tryStripeEnvironment();
      const { data: lic } = env ? await supabase.from("licenses").select("status,current_period_end").eq("environment", env).maybeSingle() : { data: null };
      setS({ ...resolveTier(lic ?? null, u.user?.created_at ?? null), loading: false });
    })();
  }, []);
  return s;
}
