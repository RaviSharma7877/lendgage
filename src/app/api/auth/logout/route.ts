import { ok, withRoute } from "@/lib/api/handler";
import { destroySession } from "@/lib/auth/session";

export const runtime = "nodejs";

/** POST /api/auth/logout — clears the session cookie. */
export const POST = withRoute(async () => {
  await destroySession();
  return ok({ signedOut: true });
});
