import type { ApplicationListRow, ApplicationRow } from "@/lib/repositories/applications";
import type { DocumentRow } from "@/lib/repositories/documents";
import type { DocumentType } from "@/lib/validation/application";

/**
 * Row → API shape. Keeping this in one place means snake_case column names
 * never leak into the client, and adding a column does not silently expose it.
 */

export type ApplicationDto = {
  id: string;
  referenceNumber: string;
  status: "SUBMITTED" | "COMPLETED";
  fullName: string;
  dateOfBirth: string;
  gender: string | null;
  registrationNumber: string;
  courseName: string;
  institutionName: string;
  yearOfPassing: number;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  certificateSerial: string | null;
  certificateIssuedAt: string | null;
  submittedAt: string;
  documentCount?: number;
};

export type DocumentDto = {
  id: string;
  docType: DocumentType;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  uploadedAt: string;
};

export function toApplicationDto(row: ApplicationRow | ApplicationListRow): ApplicationDto {
  return {
    id: row.id,
    referenceNumber: row.reference_number,
    status: row.status,
    fullName: row.full_name,
    dateOfBirth: typeof row.date_of_birth === "string"
      ? row.date_of_birth
      : new Date(row.date_of_birth).toISOString().slice(0, 10),
    gender: row.gender,
    registrationNumber: row.registration_number,
    courseName: row.course_name,
    institutionName: row.institution_name,
    yearOfPassing: Number(row.year_of_passing),
    email: row.email,
    phone: row.phone,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    certificateSerial: row.certificate_serial,
    certificateIssuedAt: row.certificate_issued_at
      ? new Date(row.certificate_issued_at).toISOString()
      : null,
    submittedAt: new Date(row.submitted_at).toISOString(),
    ...("document_count" in row ? { documentCount: Number(row.document_count) } : {}),
  };
}

export function toDocumentDto(row: DocumentRow): DocumentDto {
  return {
    id: row.id,
    docType: row.doc_type,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    checksumSha256: row.checksum_sha256,
    uploadedAt: new Date(row.created_at).toISOString(),
  };
}
