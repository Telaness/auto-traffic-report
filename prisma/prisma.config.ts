import path from "path";
import "dotenv/config";
import { defineConfig } from "prisma/config";

const dbPath = path.resolve(__dirname, "..", "dev.db");

export default defineConfig({
  schema: "schema.prisma",
  datasource: {
    url: `file:${dbPath}`,
  },
});
