import fs from "node:fs";
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined
});

export async function initDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const sql = fs.readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
  await pool.query(sql);
  await pool.query("DELETE FROM oauth_states WHERE expires_at < NOW(); DELETE FROM import_tokens WHERE expires_at < NOW(); DELETE FROM admin_sessions WHERE expires_at < NOW(); DELETE FROM report_shares WHERE expires_at < NOW();");
}

export const q = (text, params = []) => pool.query(text, params);
