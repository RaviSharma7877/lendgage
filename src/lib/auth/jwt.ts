import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { env } from "@/lib/env";

/**
 * jose (not jsonwebtoken) because it runs on the Edge runtime — the same
 * verification code is reused inside middleware.ts to guard page routes.
 */
function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.jwtSecret);
}

const ISSUER = "provisional-certificate-portal";

export type SessionClaims = JWTPayload & {
  sub: string;
  email: string;
  name: string;
};

export async function signSessionToken(claims: {
  userId: string;
  email: string;
  fullName: string;
}): Promise<string> {
  return new SignJWT({ email: claims.email, name: claims.fullName })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience("session")
    .setIssuedAt()
    .setExpirationTime(`${env.sessionTtlSeconds}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: "session",
    });
    if (!payload.sub) return null;
    return payload as SessionClaims;
  } catch {
    return null;
  }
}

/**
 * Short-lived, single-purpose token that authorises one document download.
 * This is the local-disk equivalent of an S3 pre-signed URL: the link works
 * for five minutes, only for that document, and only for its owner.
 */
export async function signDownloadToken(input: {
  documentId: string;
  userId: string;
  ttlSeconds?: number;
}): Promise<string> {
  return new SignJWT({ uid: input.userId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(input.documentId)
    .setIssuer(ISSUER)
    .setAudience("download")
    .setIssuedAt()
    .setExpirationTime(`${input.ttlSeconds ?? 300}s`)
    .sign(secretKey());
}

export async function verifyDownloadToken(
  token: string
): Promise<{ documentId: string; userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: "download",
    });
    if (!payload.sub || typeof payload.uid !== "string") return null;
    return { documentId: payload.sub, userId: payload.uid };
  } catch {
    return null;
  }
}
