import { cookies } from "next/headers";

import { SESSION_COOKIE, env } from "@/lib/env";
import { unauthorized } from "@/lib/api/errors";
import { signSessionToken, verifySessionToken } from "./jwt";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
};

/** Writes the JWT into an httpOnly cookie — not reachable from JavaScript. */
export async function createSession(user: SessionUser): Promise<string> {
  const token = await signSessionToken({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: env.sessionTtlSeconds,
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/**
 * Resolves the caller from the session cookie, or from an
 * `Authorization: Bearer <jwt>` header so the API stays usable from any
 * non-browser client (curl, Postman, a native app).
 */
export async function getSessionUser(request?: Request): Promise<SessionUser | null> {
  let token: string | undefined;

  const header = request?.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    token = header.slice(7).trim();
  }

  if (!token) {
    const store = await cookies();
    token = store.get(SESSION_COOKIE)?.value;
  }

  if (!token) return null;

  const claims = await verifySessionToken(token);
  if (!claims) return null;

  return {
    id: claims.sub,
    email: String(claims.email ?? ""),
    fullName: String(claims.name ?? ""),
  };
}

/** Same as getSessionUser but throws a 401 — used by protected API routes. */
export async function requireUser(request?: Request): Promise<SessionUser> {
  const user = await getSessionUser(request);
  if (!user) throw unauthorized();
  return user;
}
