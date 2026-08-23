import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Download, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getSessionUser } from "@/lib/auth/session";
import { findApplicationForUser } from "@/lib/repositories/applications";
import { listDocumentsForApplication } from "@/lib/repositories/documents";
import { toApplicationDto, toDocumentDto } from "@/lib/dto";
import { DOCUMENT_LABELS } from "@/lib/validation/application";
import { formatBytes, formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Application" };
export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const row = await findApplicationForUser({ applicationId: id, userId: user.id });
  if (!row) notFound();

  const application = toApplicationDto(row);
  const documents = (
    await listDocumentsForApplication({ applicationId: row.id, userId: user.id })
  ).map(toDocumentDto);

  const details: [string, string][] = [
    ["Applicant name", application.fullName],
    ["Date of birth", formatDate(application.dateOfBirth)],
    ["Gender", application.gender ?? "Not specified"],
    ["Registration number", application.registrationNumber],
    ["Course / programme", application.courseName],
    ["Institution", application.institutionName],
    ["Year of passing", String(application.yearOfPassing)],
    ["Email", application.email],
    ["Phone", application.phone],
    [
      "Correspondence address",
      [
        application.addressLine1,
        application.addressLine2,
        application.city,
        application.state,
        application.postalCode,
      ]
        .filter(Boolean)
        .join(", "),
    ],
  ];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/dashboard">
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-xl font-semibold tracking-tight">
              {application.referenceNumber}
            </h1>
            <StatusBadge status={application.status} />
          </div>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Submitted {formatDateTime(application.submittedAt)}
            {application.certificateSerial ? ` · Serial ${application.certificateSerial}` : ""}
          </p>
        </div>

        <Button asChild>
          <a href={`/api/applications/${application.id}/certificate`}>
            <Download className="size-4" />
            Download acknowledgement
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submitted details</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-2">
          <dl className="divide-y">
            {details.map(([label, value]) => (
              <div key={label} className="grid gap-1 py-3 sm:grid-cols-[240px_1fr] sm:gap-4">
                <dt className="text-muted-foreground text-xs sm:text-sm">{label}</dt>
                <dd className="text-sm font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-2">
          <ul className="grid gap-3 sm:grid-cols-2">
            {documents.map((document) => (
              <li key={document.id} className="flex items-start gap-3 rounded-lg border p-4">
                <FileText className="text-primary mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold tracking-wide uppercase">
                    {DOCUMENT_LABELS[document.docType]}
                  </p>
                  <p className="mt-1 truncate text-sm">{document.originalName}</p>
                  <p className="text-muted-foreground mt-0.5 font-mono text-[11px]">
                    {formatBytes(document.sizeBytes)} · sha256 {document.checksumSha256.slice(0, 12)}…
                  </p>
                  <a
                    href={`/api/files/${document.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary mt-2 inline-block text-xs font-medium hover:underline"
                  >
                    Open PDF
                  </a>
                </div>
              </li>
            ))}
            {documents.length === 0 && (
              <li className="text-muted-foreground text-sm">No documents on record.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
