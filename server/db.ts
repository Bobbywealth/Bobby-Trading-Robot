import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

const missingDatabaseUrl = !process.env.DATABASE_URL;

if (missingDatabaseUrl) {
  // Provide a clearer startup hint without crashing Vite SSR or tests
  console.error(
    "[db] Missing DATABASE_URL. Set it in .env (see env.example) before starting the server.",
  );
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
