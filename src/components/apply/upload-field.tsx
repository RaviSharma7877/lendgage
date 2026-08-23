"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { cn, formatBytes } from "@/lib/utils";
import { DOCUMENT_LABELS, type DocumentType } from "@/lib/validation/application";
import type { DocumentDto } from "@/lib/dto";

export type UploadedDocument = DocumentDto & { previewUrl: string };

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Drag-and-drop (or click) upload for a single required document.
 *
 * The same rules the API enforces are checked here first, so an oversized or
 * non-PDF file never leaves the browser — but the server remains the authority.
 */
export function UploadField({
  docType,
  hint,
  value,
  error,
  onChange,
}: {
  docType: DocumentType;
  hint: string;
  value?: UploadedDocument;
  error?: string;
  onChange: (document: UploadedDocument | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const message = localError ?? error;

  async function upload(file: File) {
    setLocalError(null);

    if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
      setLocalError("Only PDF files are accepted.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError(`That file is ${formatBytes(file.size)} — the limit is 5 MB.`);
      return;
    }

    const body = new FormData();
    body.append("file", file);
    body.append("docType", docType);

    setUploading(true);
    try {
      const result = await apiFetch<{ document: DocumentDto; previewUrl: string }>(
        "/api/uploads",
        { method: "POST", body }
      );
      onChange({ ...result.document, previewUrl: result.previewUrl });
    } catch (uploadError) {
      setLocalError(
        uploadError instanceof ApiClientError
          ? uploadError.failure.message
          : "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <label className="text-sm font-medium" htmlFor={`upload-${docType}`}>
          {DOCUMENT_LABELS[docType]}
          <span className="text-destructive"> *</span>
        </label>
        <span className="text-muted-foreground text-xs">PDF · max 5 MB</span>
      </div>

      {value ? (
        <div className="bg-card flex items-start gap-3 rounded-lg border p-4">
          <span className="bg-success/10 text-success grid size-10 shrink-0 place-items-center rounded-md">
            <FileText className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.originalName}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {formatBytes(value.sizeBytes)} · uploaded
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <a
                // The session cookie authorises this too, so the link keeps working
                // after the 5-minute signed token from the upload response expires.
                href={`/api/files/${value.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary text-xs font-medium hover:underline"
              >
                Preview
              </a>
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1 text-xs font-medium"
              >
                <Trash2 className="size-3" />
                Replace
              </button>
            </div>
          </div>
          <CheckCircle2 className="text-success size-4 shrink-0" />
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void upload(file);
          }}
          className={cn(
            "rounded-lg border border-dashed p-6 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "bg-secondary/40",
            message && "border-destructive/50"
          )}
        >
          <input
            ref={inputRef}
            id={`upload-${docType}`}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          {uploading ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 text-sm">
              <Loader2 className="size-5 animate-spin" />
              Uploading…
            </div>
          ) : (
            <>
              <UploadCloud className="text-muted-foreground mx-auto size-6" />
              <p className="mt-3 text-sm font-medium">Drag a PDF here</p>
              <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => inputRef.current?.click()}
              >
                Choose file
              </Button>
            </>
          )}
        </div>
      )}

      {message && (
        <p className="text-destructive mt-2 flex items-center gap-1.5 text-xs" role="alert">
          <AlertCircle className="size-3.5" />
          {message}
        </p>
      )}
    </div>
  );
}
