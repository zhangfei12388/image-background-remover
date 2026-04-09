// Prisma configuration for Vercel Postgres
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrate: {
    async adapter() {
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const { Pool } = await import("pg");
      const connectionString = process.env.DATABASE_URL!;
      const pool = new Pool({ connectionString });
      return new PrismaPg(pool);
    },
  },
});
