#!/usr/bin/env node
/** Drops every application table, then re-applies db/schema.sql. */
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import mysql from "mysql2/promise";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const file of [".env.local", ".env"]) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) continue;
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    if (line.trimStart().startsWith("#")) continue;
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL });
await connection.query("SET FOREIGN_KEY_CHECKS = 0");
for (const table of ["documents", "applications", "users", "certificate_serials"]) {
  await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
}
await connection.query("SET FOREIGN_KEY_CHECKS = 1");

const sql = fs.readFileSync(path.join(root, "db", "schema.sql"), "utf8");
for (const statement of sql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean)) {
  await connection.query(statement);
}
console.log("Database reset and schema re-applied.");
await connection.end();
