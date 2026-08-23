import type { RowDataPacket } from "mysql2/promise";

import { execute, queryOne } from "@/lib/db";
import { newId } from "@/lib/reference";

export type UserRow = RowDataPacket & {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  created_at: Date;
};

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return queryOne<UserRow>(
    `SELECT id, email, password_hash, full_name, created_at
       FROM users
      WHERE email = ?
      LIMIT 1`,
    [email]
  );
}

export async function findUserById(id: string): Promise<UserRow | null> {
  return queryOne<UserRow>(
    `SELECT id, email, password_hash, full_name, created_at
       FROM users
      WHERE id = ?
      LIMIT 1`,
    [id]
  );
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  fullName: string;
}): Promise<{ id: string; email: string; fullName: string }> {
  const id = newId();
  await execute(
    `INSERT INTO users (id, email, password_hash, full_name)
     VALUES (?, ?, ?, ?)`,
    [id, input.email, input.passwordHash, input.fullName]
  );
  return { id, email: input.email, fullName: input.fullName };
}
