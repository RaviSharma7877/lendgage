import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, FileStack, FilePlus2, Files } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApplicationsList } from "@/components/dashboard/applications-list";
import { StatTile } from "@/components/dashboard/stat-tile";
import { getSessionUser } from "@/lib/auth/session";
import { toApplicationDto } from "@/lib/dto";
import { listApplicationsForUser } from "@/lib/repositories/applications";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/**
 * Rendered on the server straight from the repository layer.
 *
 * The REST API exists and is what the browser uses for mutations, but a server
 * component calling its own HTTP endpoint would just add a network hop and a
 * cookie round-trip for data it can read directly.
 */
export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  const rows = await listApplicationsForUser(user.id);
  const applications = rows.map(toApplicationDto);

  const completed = applications.filter((application) => application.status === "COMPLETED").length;
  const documents = applications.reduce(
    (total, application) => total + (application.documentCount ?? 0),
    0
  );

  const firstName = user.fullName.split(/\s+/)[0] || "there";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hello, {firstName}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track your Provisional Certificate applications and re-download your acknowledgements.
          </p>
        </div>
        <Button asChild>
          <Link href="/apply">
            <FilePlus2 className="size-4" />
            New application
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={FileStack} label="Applications" value={applications.length} />
        <StatTile
          icon={CheckCircle2}
          label="Completed"
          value={completed}
          hint="Acknowledgement issued"
        />
        <StatTile icon={Files} label="Documents on file" value={documents} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Your applications</h2>

        {applications.length === 0 ? (
          <div className="bg-card rounded-xl border border-dashed p-10 text-center">
            <span className="bg-secondary text-muted-foreground mx-auto grid size-12 place-items-center rounded-full">
              <FileStack className="size-5" />
            </span>
            <h3 className="mt-4 font-medium">No applications yet</h3>
            <p className="text-muted-foreground mx-auto mt-1.5 max-w-sm text-sm">
              Start an application, upload your ID proof and degree certificate, and your
              acknowledgement PDF will be ready to download straight away.
            </p>
            <Button asChild className="mt-5">
              <Link href="/apply">
                <FilePlus2 className="size-4" />
                Start an application
              </Link>
            </Button>
          </div>
        ) : (
          <ApplicationsList applications={applications} />
        )}
      </section>
    </div>
  );
}
