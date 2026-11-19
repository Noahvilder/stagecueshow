CREATE SEQUENCE IF NOT EXISTS public.support_ticket_no START 1001;
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no bigint NOT NULL DEFAULT nextval('public.support_ticket_no') UNIQUE,
  user_id uuid,
  kind text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  email text,
  system_info text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.submit_ticket(_kind text, _subject text, _body text, _email text, _system_info text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n bigint;
BEGIN
  IF _kind NOT IN ('bug','feature','support') THEN RAISE EXCEPTION 'invalid kind'; END IF;
  IF length(trim(_subject)) = 0 OR length(_subject) > 120 OR length(trim(_body)) = 0 OR length(_body) > 4000
     OR length(coalesce(_email,'')) > 255 OR length(coalesce(_system_info,'')) > 1000 THEN
    RAISE EXCEPTION 'invalid input';
  END IF;
  INSERT INTO support_tickets(user_id, kind, subject, body, email, system_info)
  VALUES (auth.uid(), _kind, trim(_subject), trim(_body), nullif(trim(_email),''), _system_info)
  RETURNING ticket_no INTO n;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.submit_ticket(text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_ticket(text,text,text,text,text) TO anon, authenticated;