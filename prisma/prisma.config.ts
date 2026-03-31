import "dotenv/config";
import { defineConfig } from "prisma/config";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL または DIRECT_URL が設定されていません");
}

export default defineConfig({
  schema: "schema.prisma",
  datasource: {
    url,
  },
});
