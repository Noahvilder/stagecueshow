ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox';
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS stripe_ref text;
CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_ref_idx ON public.payments(stripe_ref);