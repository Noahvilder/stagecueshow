import { createFileRoute } from "@tanstack/react-router";
import { StageViewer } from "@/components/show/StageViewer";

export const Route = createFileRoute("/_authenticated/view")({
  validateSearch: (s: Record<string, unknown>): { code?: string; monitor?: string } => ({ ...(s["code"] != null && s["code"] !== "" ? { code: String(s["code"]) } : {}), ...(typeof s["monitor"] === "string" ? { monitor: s["monitor"] } : {}) }),
  head: () => ({
    meta: [
      { title: "StageCue Scenemonitor" },
      { name: "description", content: "Passiv fuldskærmsvisning af lyrics, akkorder og næste cue til musikere på scenen." },
      { property: "og:title", content: "StageCue Scenemonitor" },
      { property: "og:description", content: "Lyrics og akkorder i fuld skærm, synkroniseret med pulten." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ViewPage,
});

function ViewPage() {
  const { code, monitor } = Route.useSearch();
  return <StageViewer initialCode={code} initialMonitor={monitor ?? ""} />;
}
