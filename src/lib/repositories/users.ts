import { prisma } from "@/lib/db";
import { newId } from "@/lib/reference";
import type { User } from "@prisma/client";

export type UserRow = User;

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return prisma.user.findUnique({
    where: { email }
  });
}

export async function findUserById(id: string): Promise<UserRow | null> {
  return prisma.user.findUnique({
    where: { id }
  });
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  fullName: string;
}): Promise<{ id: string; email: string; fullName: string }> {
  const user = await prisma.user.create({
    data: {
      id: newId(),
      email: input.email,
      password_hash: input.passwordHash,
      full_name: input.fullName,
    },
  });
  return { id: user.id, email: user.email, fullName: user.full_name };
}
