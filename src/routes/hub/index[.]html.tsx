import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hub/index.html")({
  beforeLoad: () => { throw redirect({ to: "/hub", replace: true }); },
});
