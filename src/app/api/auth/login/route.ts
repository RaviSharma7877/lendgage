import { unauthorized } from "@/lib/api/errors";
import { ok, withRoute } from "@/lib/api/handler";
import { burnPasswordTime, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/repositories/users";
import { loginSchema } from "@/lib/validation/auth";

export const runtime = "nodejs";

/** POST /api/auth/login — exchanges credentials for a session JWT. */
export const POST = withRoute(async (request: Request) => {
  const body = loginSchema.parse(await request.json());
  const user = await findUserByEmail(body.email);

  // Same failure message and comparable timing whether the email exists or not.
  if (!user) {
    await burnPasswordTime(body.password);
    throw unauthorized("Email or password is incorrect.");
  }

  if (!(await verifyPassword(body.password, user.password_hash))) {
    throw unauthorized("Email or password is incorrect.");
  }

  const session = { id: user.id, email: user.email, fullName: user.full_name };
  await createSession(session);
  return ok({ user: session });
});
