CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  description text NOT NULL DEFAULT '',
  plan text,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DKK',
  status text NOT NULL DEFAULT 'paid',
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX payments_user_idx ON public.payments(user_id, created_at DESC);