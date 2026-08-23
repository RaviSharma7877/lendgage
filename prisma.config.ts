import fs from "fs";
import { config } from "dotenv";
if (fs.existsSync(".env.local")) {
  config({ path: ".env.local" });
} else {
  config();
}
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
