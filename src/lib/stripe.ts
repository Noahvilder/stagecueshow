import { loadStripe, type Stripe } from "@stripe/stripe-js";

type StripeEnv = "sandbox" | "live";
const clientToken = import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN'] as string | undefined;

function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error("Betaling er ikke sat op endnu (go-live mangler).");
}

let stripePromise: Promise<Stripe | null> | null = null;
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) { paymentsEnvironment(); stripePromise = loadStripe(clientToken as string); }
  return stripePromise;
}
export function getStripeEnvironment(): StripeEnv { return paymentsEnvironment(); }
/** Safe variant for reads: null when payments aren't configured. */
export function tryStripeEnvironment(): StripeEnv | null { try { return paymentsEnvironment(); } catch { return null; } }
