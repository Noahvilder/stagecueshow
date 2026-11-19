CREATE TABLE public.show_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (show_id, email)
);
GRANT SELECT, INSERT, DELETE ON public.show_invites TO authenticated;
GRANT ALL ON public.show_invites TO service_role;
ALTER TABLE public.show_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner select" ON public.show_invites FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "owner insert" ON public.show_invites FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id AND EXISTS (SELECT 1 FROM public.shows s WHERE s.id = show_id AND s.user_id = auth.uid()));
CREATE POLICY "owner delete" ON public.show_invites FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.normalize_invite_email() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.email := lower(trim(NEW.email)); RETURN NEW; END $$;
CREATE TRIGGER show_invites_email BEFORE INSERT ON public.show_invites FOR EACH ROW EXECUTE FUNCTION public.normalize_invite_email();

CREATE OR REPLACE FUNCTION public.shared_shows()
RETURNS TABLE (id uuid, name text, remote_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.name, s.remote_code FROM public.show_invites i JOIN public.shows s ON s.id = i.show_id
  WHERE i.email = lower(coalesce(auth.jwt()->>'email', '')) AND coalesce((auth.jwt()->>'email_verified')::boolean, true)
$$;
REVOKE ALL ON FUNCTION public.shared_shows() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.shared_shows() TO authenticated;