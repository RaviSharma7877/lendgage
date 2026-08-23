import type { RowDataPacket } from "mysql2/promise";

import { execute, isDuplicateKeyError, query, queryOne, transaction } from "@/lib/db";
import { conflict } from "@/lib/api/errors";
import { formatCertificateSerial, generateReferenceNumber, newId } from "@/lib/reference";
import { attachDocumentToApplication } from "./documents";
import type { SubmitApplicationInput } from "@/lib/validation/application";

export type ApplicationStatus = "SUBMITTED" | "COMPLETED";

export type ApplicationRow = RowDataPacket & {
  id: string;
  user_id: string;
  reference_number: string;
  status: ApplicationStatus;
  full_name: string;
  date_of_birth: string;
  gender: string | null;
  registration_number: string;
  course_name: string;
  institution_name: string;
  year_of_passing: number;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  certificate_serial: string | null;
  certificate_issued_at: Date | null;
  submitted_at: Date;
  created_at: Date;
};

export type ApplicationListRow = ApplicationRow & { document_count: number };

/**
 * Creates the application and attaches both staged documents atomically.
 * If either document is missing, already attached, or owned by someone else,
 * the whole transaction rolls back — no half-built application is ever stored.
 */
export async function createApplication(input: {
  userId: string;
  data: SubmitApplicationInput;
}): Promise<ApplicationRow> {
  const { userId, data } = input;

  const id = await transaction(async (connection) => {
    const applicationId = newId();
    const referenceNumber = generateReferenceNumber();

    try {
      await connection.execute(
        `INSERT INTO applications
           (id, user_id, reference_number, status, full_name, date_of_birth, gender,
            registration_number, course_name, institution_name, year_of_passing,
            email, phone, address_line1, address_line2, city, state, postal_code)
         VALUES (?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          applicationId,
          userId,
          referenceNumber,
          data.fullName,
          data.dateOfBirth,
          data.gender || null,
          data.registrationNumber,
          data.courseName,
          data.institutionName,
          data.yearOfPassing,
          data.email,
          data.phone,
          data.addressLine1,
          data.addressLine2?.trim() ? data.addressLine2.trim() : null,
          data.city,
          data.state,
          data.postalCode,
        ]
      );
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw conflict(
          "An application already exists for this registration number.",
          { registrationNumber: "You have already applied with this registration number." }
        );
      }
      throw error;
    }

    const attachments = [
      { documentId: data.idProofDocumentId, docType: "ID_PROOF" as const },
      { documentId: data.degreeCertificateDocumentId, docType: "DEGREE_CERTIFICATE" as const },
    ];

    for (const attachment of attachments) {
      const attached = await attachDocumentToApplication(connection, {
        ...attachment,
        userId,
        applicationId,
      });
      if (!attached) {
        throw conflict(
          "One of the uploaded documents is no longer available. Please re-upload and try again.",
          { docType: attachment.docType }
        );
      }
    }

    return applicationId;
  });

  const application = await findApplicationForUser({ applicationId: id, userId });
  if (!application) throw new Error("Application vanished immediately after creation.");
  return application;
}

/**
 * Marks the application COMPLETED and stamps it with a gap-free serial handed
 * out by the database. Idempotent: calling it twice keeps the first serial.
 */
export async function issueCertificate(input: {
  applicationId: string;
  userId: string;
}): Promise<ApplicationRow> {
  const existing = await findApplicationForUser(input);
  if (!existing) throw new Error("Application not found while issuing a certificate.");
  if (existing.certificate_serial && existing.status === "COMPLETED") return existing;

  const serial = await transaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO certificate_serials () VALUES ()`
    );
    const nextSerial = Number((result as { insertId?: number }).insertId ?? 0);

    await connection.execute(
      `UPDATE applications
          SET status = 'COMPLETED',
              certificate_serial = ?,
              certificate_issued_at = CURRENT_TIMESTAMP(3)
        WHERE id = ? AND user_id = ?`,
      [formatCertificateSerial(nextSerial), input.applicationId, input.userId]
    );

    return nextSerial;
  });

  const updated = await findApplicationForUser(input);
  if (!updated) throw new Error(`Application disappeared while issuing serial ${serial}.`);
  return updated;
}

export async function findApplicationForUser(input: {
  applicationId: string;
  userId: string;
}): Promise<ApplicationRow | null> {
  return queryOne<ApplicationRow>(
    `SELECT * FROM applications WHERE id = ? AND user_id = ? LIMIT 1`,
    [input.applicationId, input.userId]
  );
}

export async function listApplicationsForUser(userId: string): Promise<ApplicationListRow[]> {
  return query<ApplicationListRow>(
    `SELECT a.*, COUNT(d.id) AS document_count
       FROM applications a
       LEFT JOIN documents d ON d.application_id = a.id
      WHERE a.user_id = ?
      GROUP BY a.id
      ORDER BY a.created_at DESC`,
    [userId]
  );
}

export async function countApplicationsForUser(userId: string): Promise<{
  total: number;
  completed: number;
}> {
  const row = await queryOne<RowDataPacket & { total: number; completed: number }>(
    `SELECT COUNT(*) AS total,
            SUM(status = 'COMPLETED') AS completed
       FROM applications
      WHERE user_id = ?`,
    [userId]
  );
  return { total: Number(row?.total ?? 0), completed: Number(row?.completed ?? 0) };
}

/** Used by the "delete draft uploads" housekeeping route. */
export async function deleteApplicationForUser(input: {
  applicationId: string;
  userId: string;
}): Promise<number> {
  return execute(`DELETE FROM applications WHERE id = ? AND user_id = ?`, [
    input.applicationId,
    input.userId,
  ]);
}
