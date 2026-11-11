import { createFileRoute } from "@tanstack/react-router";
import { RemoteControl } from "@/components/show/RemoteControl";

export const Route = createFileRoute("/remote")({
  validateSearch: (s: Record<string, unknown>): { code?: string } => ({ code: typeof s.code === "string" ? s.code : undefined }),
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
  return <RemoteControl initialCode={code} />;
}
