import { isDuplicateKeyError, prisma } from "@/lib/db";
import { conflict } from "@/lib/api/errors";
import { formatCertificateSerial, generateReferenceNumber, newId } from "@/lib/reference";
import { attachDocumentToApplication } from "./documents";
import type { SubmitApplicationInput } from "@/lib/validation/application";
import type { Application, ApplicationStatus } from "@prisma/client";

export type { ApplicationStatus };

export type ApplicationRow = Omit<Application, "date_of_birth"> & { date_of_birth: string };
export type ApplicationListRow = ApplicationRow & { document_count: number };

function mapApp(app: Application): ApplicationRow {
  return {
    ...app,
    date_of_birth: app.date_of_birth.toISOString().split("T")[0]
  };
}

function mapAppList(app: Application & { _count?: { documents: number } }): ApplicationListRow {
  return {
    ...mapApp(app),
    document_count: app._count?.documents ?? 0
  };
}

export async function createApplication(input: {
  userId: string;
  data: SubmitApplicationInput;
}): Promise<ApplicationRow> {
  const { userId, data } = input;

  const id = await prisma.$transaction(async (tx) => {
    const applicationId = newId();
    const referenceNumber = generateReferenceNumber();

    try {
      await tx.application.create({
        data: {
          id: applicationId,
          user_id: userId,
          reference_number: referenceNumber,
          status: "SUBMITTED",
          full_name: data.fullName,
          date_of_birth: new Date(data.dateOfBirth),
          gender: data.gender || null,
          registration_number: data.registrationNumber,
          course_name: data.courseName,
          institution_name: data.institutionName,
          year_of_passing: data.yearOfPassing,
          email: data.email,
          phone: data.phone,
          address_line1: data.addressLine1,
          address_line2: data.addressLine2?.trim() ? data.addressLine2.trim() : null,
          city: data.city,
          state: data.state,
          postal_code: data.postalCode,
        }
      });
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
      const attached = await attachDocumentToApplication(tx, {
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

export async function issueCertificate(input: {
  applicationId: string;
  userId: string;
}): Promise<ApplicationRow> {
  const existing = await findApplicationForUser(input);
  if (!existing) throw new Error("Application not found while issuing a certificate.");
  if (existing.certificate_serial && existing.status === "COMPLETED") return existing;

  const serial = await prisma.$transaction(async (tx) => {
    const serialRow = await tx.certificateSerial.create({ data: {} });
    const nextSerial = Number(serialRow.serial);

    await tx.application.update({
      where: {
        id: input.applicationId,
        user_id: input.userId
      },
      data: {
        status: "COMPLETED",
        certificate_serial: formatCertificateSerial(nextSerial),
        certificate_issued_at: new Date()
      }
    });

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
  const app = await prisma.application.findFirst({
    where: {
      id: input.applicationId,
      user_id: input.userId
    }
  });
  return app ? mapApp(app) : null;
}

export async function listApplicationsForUser(userId: string): Promise<ApplicationListRow[]> {
  const apps = await prisma.application.findMany({
    where: { user_id: userId },
    include: {
      _count: {
        select: { documents: true }
      }
    },
    orderBy: { created_at: "desc" }
  });
  return apps.map(mapAppList);
}

export async function countApplicationsForUser(userId: string): Promise<{
  total: number;
  completed: number;
}> {
  const total = await prisma.application.count({
    where: { user_id: userId }
  });
  const completed = await prisma.application.count({
    where: { user_id: userId, status: "COMPLETED" }
  });
  return { total, completed };
}

export async function deleteApplicationForUser(input: {
  applicationId: string;
  userId: string;
}): Promise<number> {
  const result = await prisma.application.deleteMany({
    where: {
      id: input.applicationId,
      user_id: input.userId
    }
  });
  return result.count;
}
