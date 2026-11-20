CREATE TABLE public.license_keys (
  code text PRIMARY KEY,
  plan text NOT NULL DEFAULT 'lifetime',
  duration_days integer,
  max_activations integer NOT NULL DEFAULT 1,
  activations_count integer NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.license_keys TO service_role;
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.license_key_redemptions (
  code text NOT NULL REFERENCES public.license_keys(code) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (code, user_id)
);
GRANT SELECT ON public.license_key_redemptions TO authenticated;
GRANT ALL ON public.license_key_redemptions TO service_role;
ALTER TABLE public.license_key_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.license_key_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.redeem_license_key(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  k public.license_keys%ROWTYPE;
  uid uuid := auth.uid();
  c text := upper(trim(_code));
  cur public.licenses%ROWTYPE;
  period_end timestamptz;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Du skal være logget ind.'); END IF;
  SELECT * INTO k FROM public.license_keys WHERE code = c FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Koden findes ikke.'); END IF;
  IF k.expires_at IS NOT NULL AND k.expires_at < now() THEN RETURN jsonb_build_object('ok', false, 'error', 'Koden er udløbet.'); END IF;
  IF EXISTS (SELECT 1 FROM public.license_key_redemptions WHERE code = c AND user_id = uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Du har allerede indløst denne kode.'); END IF;
  IF k.activations_count >= k.max_activations THEN RETURN jsonb_build_object('ok', false, 'error', 'Koden er brugt op.'); END IF;

  SELECT * INTO cur FROM public.licenses WHERE user_id = uid;
  IF FOUND AND cur.plan = 'lifetime' AND cur.status = 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Du har allerede Pro Lifetime.'); END IF;

  period_end := CASE WHEN k.duration_days IS NULL THEN NULL ELSE now() + make_interval(days => k.duration_days) END;
  INSERT INTO public.licenses (user_id, plan, status, current_period_end, environment, updated_at)
  VALUES (uid, k.plan, 'active', period_end, 'live', now())
  ON CONFLICT (user_id) DO UPDATE SET plan = EXCLUDED.plan, status = 'active',
    current_period_end = EXCLUDED.current_period_end, environment = 'live', cancel_at_period_end = false, updated_at = now();
  INSERT INTO public.license_key_redemptions (code, user_id) VALUES (c, uid);
  UPDATE public.license_keys SET activations_count = activations_count + 1 WHERE code = c;
  RETURN jsonb_build_object('ok', true, 'plan', k.plan, 'current_period_end', period_end);
END $$;
REVOKE ALL ON FUNCTION public.redeem_license_key(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.redeem_license_key(text) TO authenticated;