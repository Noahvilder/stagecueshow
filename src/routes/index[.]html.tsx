import { createFileRoute, redirect } from "@tanstack/react-router";

// Start file of the offline Windows app: go straight to the show list.
export const Route = createFileRoute("/index.html")({
  beforeLoad: () => { throw redirect({ to: "/hub", replace: true }); },
});
