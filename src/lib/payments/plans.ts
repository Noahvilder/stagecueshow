export type PriceId = "pro_monthly" | "pro_yearly" | "pro_lifetime";
export const PRICE_TO_PLAN: Record<string, "monthly" | "yearly" | "lifetime"> = {
  pro_monthly: "monthly", pro_yearly: "yearly", pro_lifetime: "lifetime",
};
/** Stripe subscription status → license status. past_due/canceled keep access until period end. */
export function licenseStatus(subStatus: string): "active" | "inactive" {
  return ["active", "trialing", "past_due", "canceled"].includes(subStatus) ? "active" : "inactive";
}
