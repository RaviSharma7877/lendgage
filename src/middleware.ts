import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/env";
import { verifySessionToken } from "@/lib/auth/jwt";

/**
 * Route protection at the edge, before any page renders.
 *
 * The same jose verification used by the API runs here, so a tampered or
 * expired cookie can never reach a protected page — and a signed-in user is
 * bounced away from the auth screens instead of seeing a login form they no
 * longer need. API routes are excluded: they answer with 401 JSON, which is
 * more useful to a client than a redirect.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/apply", "/applications"];
const AUTH_ROUTES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    const response = NextResponse.redirect(login);
    if (token) response.cookies.delete(SESSION_COOKIE); // clear an expired cookie
    return response;
  }

  if (session && AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/apply/:path*", "/applications/:path*", "/login", "/signup"],
};
