import Link from "next/link";
import { Download, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatDateTime } from "@/lib/utils";
import type { ApplicationDto } from "@/lib/dto";

/**
 * A table on wide screens, stacked cards on phones — the same data, laid out
 * for the space available rather than horizontally scrolled.
 */
export function ApplicationsList({ applications }: { applications: ApplicationDto[] }) {
  return (
    <>
      <div className="bg-card hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Reference</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Registration</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Acknowledgement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((application) => (
              <TableRow key={application.id}>
                <TableCell className="font-mono text-xs font-medium">
                  <Link href={`/applications/${application.id}`} className="hover:underline">
                    {application.referenceNumber}
                  </Link>
                </TableCell>
                <TableCell>{application.fullName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {application.registrationNumber}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(application.submittedAt)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={application.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <a href={`/api/applications/${application.id}/certificate`}>
                      <Download className="size-3.5" />
                      PDF
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {applications.map((application) => (
          <li key={application.id} className="bg-card rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/applications/${application.id}`}
                className="font-mono text-sm font-medium hover:underline"
              >
                {application.referenceNumber}
              </Link>
              <StatusBadge status={application.status} />
            </div>
            <p className="mt-2 text-sm">{application.fullName}</p>
            <p className="text-muted-foreground text-xs">
              {application.registrationNumber} · {formatDateTime(application.submittedAt)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button asChild size="sm" variant="outline" className="flex-1">
                <a href={`/api/applications/${application.id}/certificate`}>
                  <Download className="size-3.5" />
                  PDF
                </a>
              </Button>
              <Button asChild size="sm" variant="ghost" className="flex-1">
                <Link href={`/applications/${application.id}`}>
                  <FileText className="size-3.5" />
                  Details
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
