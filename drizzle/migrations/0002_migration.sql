CREATE TABLE public.pult_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  device_id text NOT NULL,
  device_name text NOT NULL DEFAULT 'Enhed',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);
GRANT SELECT, UPDATE, DELETE ON public.pult_devices TO authenticated;
GRANT ALL ON public.pult_devices TO service_role;
ALTER TABLE public.pult_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.pult_devices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own update" ON public.pult_devices FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.pult_devices FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.licenses (
  user_id uuid PRIMARY KEY,
  plan text NOT NULL DEFAULT 'none',
  status text NOT NULL DEFAULT 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.licenses TO authenticated;
GRANT ALL ON public.licenses TO service_role;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.licenses FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.claim_pult_device(_device_id text, _device_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); n int;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'auth'); END IF;
  IF EXISTS (SELECT 1 FROM pult_devices WHERE user_id = uid AND device_id = _device_id) THEN
    UPDATE pult_devices SET last_seen_at = now() WHERE user_id = uid AND device_id = _device_id;
    RETURN jsonb_build_object('ok', true);
  END IF;
  SELECT count(*) INTO n FROM pult_devices WHERE user_id = uid;
  IF n >= 3 THEN RETURN jsonb_build_object('ok', false, 'reason', 'limit'); END IF;
  INSERT INTO pult_devices(user_id, device_id, device_name) VALUES (uid, left(_device_id,64), left(coalesce(_device_name,'Enhed'),60));
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.claim_pult_device(text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_pult_device(text,text) TO authenticated;