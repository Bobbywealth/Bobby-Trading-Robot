import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, PoolConfig } from "pg";
import * as schema from "@shared/schema";

const missingDatabaseUrl = !process.env.DATABASE_URL;

if (missingDatabaseUrl) {
  // Provide a clearer startup hint without crashing Vite SSR or tests
  console.error(
    "[db] Missing DATABASE_URL. Set it in .env (see env.example) before starting the server.",
  );
  throw new Error("DATABASE_URL is not set");
}

const sslEnabled =
  process.env.DATABASE_SSL === "true" ||
  process.env.DATABASE_SSL === "1" ||
  (process.env.DATABASE_URL ?? "").includes("sslmode=require");

function parseDatabaseUrl(raw: string): PoolConfig {
  const normalized = raw.trim();
  const match = normalized.match(
    /^postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/i,
  );

  if (!match) {
    console.error("[db] Invalid DATABASE_URL format. Expected postgres://user:pass@host:port/db?sslmode=require");
    throw new Error("Invalid DATABASE_URL format");
  }

  const [, user, password, host, port, database] = match;

  return {
    host,
    port: port ? Number(port) : 5432,
    user: decodeURIComponent(user),
    password: decodeURIComponent(password),
    database,
    ssl: sslEnabled
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
  };
}

const pool = new Pool(parseDatabaseUrl(process.env.DATABASE_URL!));

export const db = drizzle(pool, { schema });
