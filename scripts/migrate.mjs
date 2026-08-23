#!/usr/bin/env node
/**
 * Applies db/schema.sql to the database in DATABASE_URL (MySQL 8).
 * The schema is idempotent, so this doubles as "create" and "sync".
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import mysql from "mysql2/promise";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFiles(root);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local first.");
  process.exit(1);
}

const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  multipleStatements: false,
  ssl: process.env.DB_SSL === "require" ? { rejectUnauthorized: false } : undefined,
});

try {
  const sql = fs.readFileSync(path.join(root, "db", "schema.sql"), "utf8");
  for (const statement of splitStatements(sql)) {
    await connection.query(statement);
  }
  const [rows] = await connection.query("SHOW TABLES");
  const tables = rows.map((row) => Object.values(row)[0]).join(", ");
  console.log(`Schema applied. Tables: ${tables}`);
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}

/** Strips comments and splits on `;` — enough for this hand-written DDL file. */
export function splitStatements(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

/** Minimal .env reader so this script needs no extra dependency. */
function loadEnvFiles(dir) {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(dir, file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split("\n")) {
      if (line.trimStart().startsWith("#")) continue;
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}
