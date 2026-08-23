import { z } from "zod";

/**
 * A single source of truth for application validation, imported by both the
 * client wizard and the API route. The browser gets instant feedback; the
 * server re-validates the exact same rules because client checks are only UX.
 */

const CURRENT_YEAR = new Date().getFullYear();

const trimmed = (min: number, max: number, label: string) =>
  z.string().trim().min(min, `${label} is required.`).max(max, `${label} is too long.`);

export const DOCUMENT_TYPES = ["ID_PROOF", "DEGREE_CERTIFICATE"] as const;
export const documentTypeSchema = z.enum(DOCUMENT_TYPES);
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  ID_PROOF: "ID Proof",
  DEGREE_CERTIFICATE: "Degree Certificate",
};

/** Step 1 — personal & registration details. */
export const personalDetailsSchema = z.object({
  fullName: trimmed(2, 160, "Full name").regex(
    /^[\p{L}\s.'-]+$/u,
    "Name may only contain letters, spaces and . ' -"
  ),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker to choose a date.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date.")
    .refine((value) => new Date(value) < new Date(), "Date of birth must be in the past.")
    .refine((value) => {
      const dob = new Date(value);
      const age = (Date.now() - dob.getTime()) / (365.2425 * 24 * 60 * 60 * 1000);
      return age >= 15 && age <= 100;
    }, "Applicant must be between 15 and 100 years old."),
  // The select renders "" for "not chosen", and a restored draft can carry that
  // empty string back in, so it is accepted and normalised to undefined rather
  // than failing validation on an optional field.
  // The select renders "" for "not chosen", and a restored draft can carry that
  // empty string back in, so "" is accepted here and normalised to NULL in the
  // repository rather than failing validation on an optional field.
  gender: z
    .enum(["Male", "Female", "Other", "Prefer not to say"])
    .or(z.literal(""))
    .optional(),
  registrationNumber: trimmed(4, 64, "Registration number").regex(
    /^[A-Za-z0-9/-]+$/,
    "Registration number may only contain letters, numbers, / and -"
  ),
  courseName: trimmed(2, 160, "Course / programme"),
  institutionName: trimmed(2, 200, "Institution"),
  // z.coerce turns an empty input into 0, so the lower-bound message is worded
  // to read correctly for both "left blank" and "typed 1890".
  yearOfPassing: z.coerce
    .number({ invalid_type_error: "Enter a valid year." })
    .int("Enter a valid year.")
    .min(1950, `Enter the year you passed (1950\u2013${CURRENT_YEAR}).`)
    .max(CURRENT_YEAR, `Year of passing cannot be after ${CURRENT_YEAR}.`),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .max(254, "Email is too long.")
    .email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{8,24}$/, "Enter a valid phone number (8–24 digits)."),
  addressLine1: trimmed(4, 200, "Address line 1"),
  addressLine2: z.string().trim().max(200, "Address line 2 is too long.").optional().or(z.literal("")),
  city: trimmed(2, 100, "City"),
  state: trimmed(2, 100, "State"),
  postalCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9\s-]{4,16}$/, "Enter a valid postal code."),
});

/** Step 2 — the two required uploads, referenced by the ids returned by /api/uploads. */
export const documentSelectionSchema = z.object({
  idProofDocumentId: z.string().uuid("Upload your ID proof."),
  degreeCertificateDocumentId: z.string().uuid("Upload your degree certificate."),
});

/** Step 3 — review & submit. */
export const submitApplicationSchema = personalDetailsSchema
  .merge(documentSelectionSchema)
  .extend({
    declarationAccepted: z.literal(true, {
      errorMap: () => ({ message: "You must confirm the declaration before submitting." }),
    }),
  });

export type PersonalDetailsInput = z.infer<typeof personalDetailsSchema>;
export type DocumentSelectionInput = z.infer<typeof documentSelectionSchema>;
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;

export const uploadMetadataSchema = z.object({
  docType: documentTypeSchema,
});
