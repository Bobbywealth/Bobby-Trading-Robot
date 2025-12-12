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
  // Try WHATWG URL first; if not supported by scheme, fall back to manual parse.
  try {
    const url = new URL(raw);
    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 5432,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      ssl: sslEnabled
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
    };
  } catch {
    // Manual fallback: postgres://user:pass@host:port/db?...
    const match = raw.match(
      /^postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/i,
    );
    if (!match) {
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
}

const pool = new Pool(parseDatabaseUrl(process.env.DATABASE_URL!));

export const db = drizzle(pool, { schema });
