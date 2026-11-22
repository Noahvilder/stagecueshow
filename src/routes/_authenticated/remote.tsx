import { createFileRoute } from "@tanstack/react-router";
import { RemoteControl } from "@/components/show/RemoteControl";

export const Route = createFileRoute("/_authenticated/remote")({
  validateSearch: (s: Record<string, unknown>): { code?: string } => (s["code"] != null && s["code"] !== "" ? { code: String(s["code"]) } : {}),
  head: () => ({
    meta: [
      { title: "StageCue Fjernbetjening" },
      { name: "description", content: "Styr StageCue-showet fra din telefon i salen: GO, panic og test af enkelte cues." },
      { property: "og:title", content: "StageCue Fjernbetjening" },
      { property: "og:description", content: "Telefon-fjernbetjening til StageCue Control." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RemotePage,
});

function RemotePage() {
  const { code } = Route.useSearch();
  return (
    <>
      <h1 className="sr-only">StageCue fjernbetjening</h1>
      <RemoteControl initialCode={code} />
    </>
  );
}
