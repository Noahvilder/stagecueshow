const clientToken = import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN'] as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return <div className="w-full rounded-lg border border-destructive bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">Rigtig betaling er ikke åbnet endnu.</div>;
  }
  if (clientToken.startsWith("pk_test_")) {
    return <div className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-center text-sm">Testtilstand: brug kort 4242 4242 4242 4242 – der trækkes ingen rigtige penge.</div>;
  }
  return null;
}
