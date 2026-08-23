"use client";

import Link from "next/link";
import { CheckCircle2, Download, LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/utils";
import type { ApplicationDto } from "@/lib/dto";

export function SubmittedPanel({ application }: { application: ApplicationDto }) {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="pt-2 text-center">
        <span className="bg-success/10 text-success mx-auto grid size-14 place-items-center rounded-full">
          <CheckCircle2 className="size-7" />
        </span>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Application submitted</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Keep your reference number safe — you will need it for any correspondence.
        </p>

        <div className="bg-secondary/50 mt-7 rounded-xl border border-dashed p-5">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
            Application reference number
          </p>
          <p className="text-primary mt-1.5 font-mono text-2xl font-semibold break-all">
            {application.referenceNumber}
          </p>
        </div>

        <dl className="mt-6 space-y-2.5 text-left text-sm">
          <Row label="Applicant" value={application.fullName} />
          <Row label="Registration number" value={application.registrationNumber} />
          <Row label="Submitted" value={formatDateTime(application.submittedAt)} />
          <Row
            label="Certificate serial"
            value={application.certificateSerial ?? "Pending"}
          />
        </dl>

        <Separator className="my-7" />

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <a href={`/api/applications/${application.id}/certificate`}>
              <Download className="size-4" />
              Download acknowledgement
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/dashboard">
              <LayoutDashboard className="size-4" />
              Go to dashboard
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b pb-2.5 last:border-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
