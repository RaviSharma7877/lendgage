"use client";

import type { UseFormReturn } from "react-hook-form";
import { Info } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadField, type UploadedDocument } from "@/components/apply/upload-field";
import type { FormValues } from "@/components/apply/apply-wizard";

export function DocumentsStep({
  form,
  documents,
  onChange,
}: {
  form: UseFormReturn<FormValues>;
  documents: Partial<Record<"ID_PROOF" | "DEGREE_CERTIFICATE", UploadedDocument>>;
  onChange: (
    docType: "ID_PROOF" | "DEGREE_CERTIFICATE",
    document: UploadedDocument | undefined
  ) => void;
}) {
  const errors = form.formState.errors;

  return (
    <div className="space-y-6">
      <Alert variant="info">
        <Info />
        <AlertDescription>
          Files are stored privately and are only reachable through a signed, expiring link —
          they are never served from a public folder.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <UploadField
          docType="ID_PROOF"
          hint="Aadhaar, passport or any government photo ID"
          value={documents.ID_PROOF}
          error={errors.idProofDocumentId?.message}
          onChange={(document) => onChange("ID_PROOF", document)}
        />
        <UploadField
          docType="DEGREE_CERTIFICATE"
          hint="Final degree certificate or consolidated marksheet"
          value={documents.DEGREE_CERTIFICATE}
          error={errors.degreeCertificateDocumentId?.message}
          onChange={(document) => onChange("DEGREE_CERTIFICATE", document)}
        />
      </div>
    </div>
  );
}
