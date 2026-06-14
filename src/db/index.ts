import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { mkdir } from "fs/promises";
import { dirname } from "path";

const dbPath = process.env.DATABASE_URL || "./data/eu-doc.db";

// Ensure data directory exists
const dir = dirname(dbPath);
try {
  await mkdir(dir, { recursive: true });
} catch (error) {
  // Directory might already exist
}

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
