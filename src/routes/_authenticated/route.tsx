import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isOffline, isDesktopBundle } from "@/lib/desktop";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (isOffline()) return { user: { id: "offline", email: "", created_at: "2000-01-01T00:00:00Z" } as never };
    const { data, error } = await supabase.auth.getUser();
    if (!data.user && isDesktopBundle() && error && /fetch|network/i.test(error.message)) return { user: { id: "offline", email: "", created_at: "2000-01-01T00:00:00Z" } as never };
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
