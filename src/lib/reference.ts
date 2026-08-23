import { randomBytes, randomUUID } from "node:crypto";

/**
 * Public application reference numbers must be unique AND non-guessable —
 * knowing PC-2026-0001 must not let anyone derive PC-2026-0002.
 *
 * Format: PC-<year>-<10 chars from a Crockford-style alphabet>
 *   e.g. PC-2026-7QK4XM2B9F
 *
 * 10 chars from a 32-symbol alphabet ≈ 50 bits of entropy, so collisions are
 * negligible; the UNIQUE index on applications.reference_number is still the
 * final authority and the caller retries on the (astronomically rare) clash.
 * Ambiguous characters (I, L, O, U) are excluded so a printed reference can be
 * read back over the phone without confusion.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateReferenceNumber(now = new Date()): string {
  const bytes = randomBytes(10);
  let suffix = "";
  for (const byte of bytes) {
    suffix += ALPHABET[byte % ALPHABET.length];
  }
  return `PC-${now.getFullYear()}-${suffix}`;
}

/** Human-facing serial for the issued certificate, e.g. PC/CERT/2026/001042. */
export function formatCertificateSerial(serial: number, now = new Date()): string {
  return `PC/CERT/${now.getFullYear()}/${String(serial).padStart(6, "0")}`;
}

export function newId(): string {
  return randomUUID();
}
