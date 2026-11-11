import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RemoteControl } from "@/components/show/RemoteControl";

export const Route = createFileRoute("/_authenticated/mobile/$showId")({
  head: () => ({
    meta: [
      { title: "Mobil – StageCue" },
      { name: "description", content: "Mobil fjernbetjening: GO, panic og hurtig test af cues fra salen." },
      { property: "og:title", content: "Mobil – StageCue" },
      { property: "og:description", content: "Mobil fjernbetjening til StageCue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MobilePage,
});

function MobilePage() {
  const { showId } = Route.useParams();
  const [code, setCode] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const load = () => supabase.from("shows").select("remote_code").eq("id", showId).single().then(({ data }) => setCode(data?.remote_code ?? null));
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 5000);
    return () => clearInterval(t);
  }, [showId]);
  if (code === undefined) return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Henter show…</div>;
  return <RemoteControl key={code ?? "none"} initialCode={code ?? undefined} backToHub showId={showId} />;
}
