import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/utils/payments.functions";
import type { PriceId } from "@/lib/payments/plans";

export function CheckoutDialog({ priceId, onClose }: { priceId: PriceId; onClose: () => void }) {
  const fetchClientSecret = async () => {
    const r = await createCheckoutSession({ data: { priceId, environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/konto?checkout=done` } });
    if ("error" in r) throw new Error(r.error);
    return r.clientSecret;
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex justify-end"><button onClick={onClose} className="rounded bg-secondary px-3 py-1 text-sm font-semibold">Luk</button></div>
        <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}
