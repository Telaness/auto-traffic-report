import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL or DIRECT_URL must be set in .env");
}

export default defineConfig({
  schema: "schema.prisma",
  datasource: { url },
});
