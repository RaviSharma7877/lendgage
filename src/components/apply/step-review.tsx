"use client";

import type { UseFormReturn } from "react-hook-form";
import { FileText, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DOCUMENT_LABELS } from "@/lib/validation/application";
import { formatBytes, formatDate } from "@/lib/utils";
import type { UploadedDocument } from "@/components/apply/upload-field";
import type { FormValues } from "@/components/apply/apply-wizard";

export function ReviewStep({
  form,
  documents,
  onEditStep,
}: {
  form: UseFormReturn<FormValues>;
  documents: Partial<Record<"ID_PROOF" | "DEGREE_CERTIFICATE", UploadedDocument>>;
  onEditStep: (step: number) => void;
}) {
  const values = form.watch();
  const accepted = form.watch("declarationAccepted");
  const error = form.formState.errors.declarationAccepted?.message;

  const rows: [string, string][] = [
    ["Full name", values.fullName || "—"],
    ["Date of birth", values.dateOfBirth ? formatDate(values.dateOfBirth) : "—"],
    ["Gender", values.gender || "Not specified"],
    ["Registration number", values.registrationNumber || "—"],
    ["Course / programme", values.courseName || "—"],
    ["Institution", values.institutionName || "—"],
    ["Year of passing", values.yearOfPassing ? String(values.yearOfPassing) : "—"],
    ["Email", values.email || "—"],
    ["Phone", values.phone || "—"],
    [
      "Address",
      [values.addressLine1, values.addressLine2, values.city, values.state, values.postalCode]
        .filter(Boolean)
        .join(", ") || "—",
    ],
  ];

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Personal & registration details
          </h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => onEditStep(1)}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
        </div>

        <dl className="mt-3 overflow-hidden rounded-lg border">
          {rows.map(([label, value], index) => (
            <div
              key={label}
              className={`grid gap-1 px-4 py-3 sm:grid-cols-[220px_1fr] sm:gap-4 ${
                index % 2 === 0 ? "bg-secondary/40" : ""
              }`}
            >
              <dt className="text-muted-foreground text-xs sm:text-sm">{label}</dt>
              <dd className="text-sm font-medium break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Documents
          </h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => onEditStep(2)}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
        </div>

        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {(["ID_PROOF", "DEGREE_CERTIFICATE"] as const).map((docType) => {
            const document = documents[docType];
            return (
              <li key={docType} className="flex items-start gap-3 rounded-lg border p-4">
                <FileText className="text-primary mt-0.5 size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide uppercase">
                    {DOCUMENT_LABELS[docType]}
                  </p>
                  <p className="mt-1 truncate text-sm">{document?.originalName ?? "Not uploaded"}</p>
                  {document && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatBytes(document.sizeBytes)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="bg-secondary/40 rounded-lg border p-4">
        <label className="flex items-start gap-3">
          <Checkbox
            checked={accepted === true}
            aria-invalid={!!error}
            onCheckedChange={(checked) =>
              form.setValue("declarationAccepted", (checked === true) as true, {
                shouldValidate: true,
              })
            }
            className="mt-0.5"
          />
          <span className="text-sm leading-relaxed">
            I declare that the information above is true and that the uploaded documents are
            genuine. I understand that this acknowledgement confirms receipt of my application
            and is not itself a Provisional Certificate.
          </span>
        </label>
        {error && (
          <p className="text-destructive mt-2 pl-7 text-xs" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
