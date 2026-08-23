import { conflict } from "@/lib/api/errors";
import { ok, withRoute } from "@/lib/api/handler";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { createUser, findUserByEmail } from "@/lib/repositories/users";
import { signupSchema } from "@/lib/validation/auth";

export const runtime = "nodejs";

/** POST /api/auth/signup — creates an account and starts a session. */
export const POST = withRoute(async (request: Request) => {
  const body = signupSchema.parse(await request.json());

  if (await findUserByEmail(body.email)) {
    throw conflict("An account with this email already exists.", {
      email: "This email is already registered. Try signing in instead.",
    });
  }

  const user = await createUser({
    email: body.email,
    fullName: body.fullName,
    passwordHash: await hashPassword(body.password),
  });

  await createSession(user);
  return ok({ user: { id: user.id, email: user.email, fullName: user.fullName } }, 201);
});
