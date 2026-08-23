import bcrypt from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Constant-ish work factor even when the email does not exist, so an attacker
 * cannot tell "no such user" from "wrong password" by timing the response.
 */
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.QCF9CqCF1uqjbmXe6XSMEEAd8bF4uUS";

export function burnPasswordTime(plain: string): Promise<boolean> {
  return bcrypt.compare(plain, DUMMY_HASH);
}
