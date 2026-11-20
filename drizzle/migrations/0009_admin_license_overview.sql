CREATE OR REPLACE FUNCTION public.admin_license_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'by_plan', COALESCE((SELECT jsonb_agg(jsonb_build_object('plan', plan, 'count', c) ORDER BY c DESC) FROM (
      SELECT plan, count(*) c FROM public.licenses
      WHERE status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end > now())
      GROUP BY plan) p), '[]'::jsonb),
    'trials', COALESCE((SELECT jsonb_agg(jsonb_build_object('days_left', d, 'count', c) ORDER BY d) FROM (
      SELECT ceil(7 - extract(epoch FROM now() - u.created_at)/86400)::int d, count(*) c
      FROM auth.users u
      WHERE u.created_at > now() - interval '7 days'
        AND NOT EXISTS (SELECT 1 FROM public.licenses l WHERE l.user_id = u.id AND l.status IN ('active','trialing')
          AND (l.current_period_end IS NULL OR l.current_period_end > now()))
      GROUP BY 1) t), '[]'::jsonb),
    'keys', COALESCE((SELECT jsonb_agg(jsonb_build_object('code', code, 'plan', plan, 'note', note,
      'used', activations_count, 'max', max_activations, 'expires_at', expires_at, 'duration_days', duration_days) ORDER BY created_at DESC)
      FROM public.license_keys), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.admin_license_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_license_overview() TO authenticated;