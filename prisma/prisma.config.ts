import "dotenv/config";
import { defineConfig } from "prisma/config";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "schema.prisma",
  ...(url ? { datasource: { url } } : {}),
});
