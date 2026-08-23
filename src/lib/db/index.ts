import mysql, {
  type Pool,
  type PoolConnection,
  type RowDataPacket,
} from "mysql2/promise";

import { env } from "@/lib/env";

/** Values mysql2 accepts as prepared-statement parameters. */
export type SqlParam = string | number | boolean | Date | Buffer | null;

/**
 * A single connection pool is reused across hot reloads in development —
 * otherwise every recompile would leak a fresh pool of MySQL connections.
 */
const globalForDb = globalThis as unknown as { __pcpPool?: Pool };

export function getPool(): Pool {
  if (!globalForDb.__pcpPool) {
    globalForDb.__pcpPool = mysql.createPool({
      uri: env.databaseUrl,
      connectionLimit: Number(process.env.DB_POOL_MAX ?? 10),
      waitForConnections: true,
      enableKeepAlive: true,
      timezone: "Z",
      // DECIMAL/BIGINT come back as strings by default; we want real numbers
      // for size_bytes and year_of_passing.
      supportBigNumbers: true,
      decimalNumbers: true,
      dateStrings: ["DATE"],
      ssl: process.env.DB_SSL === "require" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return globalForDb.__pcpPool;
}

/** Parameterised query helper — the only way SQL is executed in this app. */
export async function query<T extends RowDataPacket = RowDataPacket>(
  sql: string,
  params: SqlParam[] = []
): Promise<T[]> {
  const [rows] = await getPool().execute<T[]>(sql, params);
  return rows;
}

export async function queryOne<T extends RowDataPacket = RowDataPacket>(
  sql: string,
  params: SqlParam[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Runs `sql` for its side effects (INSERT/UPDATE/DELETE). */
export async function execute(sql: string, params: SqlParam[] = []): Promise<number> {
  const [result] = await getPool().execute(sql, params);
  return (result as { affectedRows?: number }).affectedRows ?? 0;
}

/** Runs the callback inside a transaction, rolling back on any throw. */
export async function transaction<T>(
  fn: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/** MySQL duplicate-key detection, used to turn races into clean 409s. */
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
}
