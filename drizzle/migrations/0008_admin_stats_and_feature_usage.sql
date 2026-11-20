CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.feature_usage (
  feature text NOT NULL,
  day date NOT NULL DEFAULT current_date,
  count bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (feature, day)
);
GRANT ALL ON public.feature_usage TO service_role;
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.track_feature(_feature text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _feature IS NULL OR _feature !~ '^[a-z0-9_.:-]{1,64}$' THEN RETURN; END IF;
  INSERT INTO public.feature_usage(feature, day, count) VALUES (_feature, current_date, 1)
  ON CONFLICT (feature, day) DO UPDATE SET count = public.feature_usage.count + 1;
END $$;
GRANT EXECUTE ON FUNCTION public.track_feature(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'users_total', (SELECT count(*) FROM auth.users),
    'users_new_7', (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'users_new_30', (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '30 days'),
    'users_active_7', (SELECT count(*) FROM auth.users WHERE last_sign_in_at > now() - interval '7 days'),
    'users_active_30', (SELECT count(*) FROM auth.users WHERE last_sign_in_at > now() - interval '30 days'),
    'pro_active', (SELECT count(*) FROM public.licenses WHERE status IN ('active','trialing')),
    'shows_total', (SELECT count(*) FROM public.shows),
    'devices_total', (SELECT count(*) FROM public.pult_devices),
    'tickets_open', (SELECT count(*) FROM public.support_tickets WHERE status = 'open'),
    'features_30', COALESCE((SELECT jsonb_agg(jsonb_build_object('feature', feature, 'count', c) ORDER BY c DESC)
       FROM (SELECT feature, sum(count) c FROM public.feature_usage WHERE day > current_date - 30 GROUP BY feature) f), '[]'::jsonb),
    'features_all', COALESCE((SELECT jsonb_agg(jsonb_build_object('feature', feature, 'count', c) ORDER BY c DESC)
       FROM (SELECT feature, sum(count) c FROM public.feature_usage GROUP BY feature) f), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_tickets()
RETURNS SETOF public.support_tickets LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.support_tickets ORDER BY created_at DESC LIMIT 200;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_tickets() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_ticket_status(_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _status NOT IN ('open','in_progress','closed') THEN RAISE EXCEPTION 'bad status'; END IF;
  UPDATE public.support_tickets SET status = _status WHERE id = _id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_set_ticket_status(uuid, text) TO authenticated;