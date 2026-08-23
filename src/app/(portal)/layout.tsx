import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { getSessionUser } from "@/lib/auth/session";

/**
 * Server-side guard for every signed-in page. middleware.ts already redirects
 * unauthenticated visitors; this second check means a page can never render
 * without a real session even if the matcher is ever misconfigured.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh">
      <SiteHeader user={user} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">{children}</main>
      <footer className="text-muted-foreground mx-auto max-w-6xl px-5 pb-10 text-xs">
        Provisional Certificate Cell · Demonstration portal
      </footer>
    </div>
  );
}
