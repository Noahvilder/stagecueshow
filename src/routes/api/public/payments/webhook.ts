import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { PRICE_TO_PLAN, licenseStatus } from "@/lib/payments/plans";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
const iso = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null);
const priceKey = (price: any) => price?.lookup_key || price?.metadata?.lovable_external_id || price?.id;

async function onSubscription(sub: any, env: StripeEnv) {
  const userId = sub.metadata?.userId;
  if (!userId) return console.error("No userId on subscription", sub.id);
  const item = sub.items?.data?.[0];
  const plan = PRICE_TO_PLAN[priceKey(item?.price)] ?? "monthly";
  const sb = await db();
  const { data: existing } = await sb.from("licenses").select("plan,status").eq("user_id", userId).maybeSingle();
  // Never downgrade an active lifetime license because of a subscription event.
  if (existing?.plan === "lifetime" && existing.status === "active") return;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  await sb.from("licenses").upsert({
    user_id: userId,
    plan,
    status: licenseStatus(sub.status),
    current_period_end: iso(periodEnd),
    cancel_at_period_end: !!sub.cancel_at_period_end,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    stripe_subscription_id: sub.id,
    environment: env,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

async function onLifetimePaid(session: any, env: StripeEnv) {
  const userId = session.metadata?.userId;
  if (!userId || session.mode !== "payment") return;
  const sb = await db();
  await sb.from("licenses").upsert({
    user_id: userId, plan: "lifetime", status: "active", current_period_end: null, cancel_at_period_end: false,
    stripe_customer_id: session.customer, environment: env, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  await sb.from("payments").upsert({
    user_id: userId, description: "StageCue Pro Lifetime", plan: "lifetime",
    amount_cents: session.amount_total ?? 0, currency: (session.currency ?? "dkk").toUpperCase(),
    status: "paid", environment: env, stripe_ref: session.id,
  }, { onConflict: "stripe_ref" });
}

async function onInvoice(inv: any, env: StripeEnv, status: "paid" | "failed") {
  const sb = await db();
  let userId: string | undefined = inv.parent?.subscription_details?.metadata?.userId ?? inv.subscription_details?.metadata?.userId;
  if (!userId && inv.customer) {
    const { data } = await sb.from("licenses").select("user_id").eq("stripe_customer_id", inv.customer).maybeSingle();
    userId = data?.user_id;
  }
  if (!userId) return console.error("Invoice without user", inv.id);
  const line = inv.lines?.data?.[0];
  const plan = PRICE_TO_PLAN[priceKey(line?.pricing?.price_details?.price ?? line?.price)] ?? null;
  await sb.from("payments").upsert({
    user_id: userId,
    description: plan === "yearly" ? "StageCue Pro – årlig" : "StageCue Pro – månedlig",
    plan, amount_cents: status === "paid" ? inv.amount_paid ?? 0 : inv.amount_due ?? 0,
    currency: (inv.currency ?? "dkk").toUpperCase(), status, environment: env,
    receipt_url: inv.hosted_invoice_url ?? null, stripe_ref: inv.id,
  }, { onConflict: "stripe_ref" });
}

async function handle(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  const o = event.data.object;
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return onSubscription(o, env);
    case "checkout.session.completed":
      if (o.payment_status !== "unpaid") return onLifetimePaid(o, env);
      return;
    case "checkout.session.async_payment_succeeded":
      return onLifetimePaid(o, env);
    case "invoice.paid":
      if ((o.amount_paid ?? 0) > 0) return onInvoice(o, env, "paid");
      return;
    case "invoice.payment_failed":
      return onInvoice(o, env, "failed");
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") return Response.json({ received: true, ignored: "invalid env" });
        try {
          await handle(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
