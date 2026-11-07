// Applies migrations/*.sql in name order, each once, inside a transaction.
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createDb, type Db } from "./db.js";

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");

export async function migrate(db: Db, log: (m: string) => void = console.log) {
  await db.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const done = new Set((await db.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = await readFile(path.join(MIGRATIONS_DIR, f), "utf8");
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(name) VALUES ($1)", [f]);
      await client.query("COMMIT");
      log(`applied ${f}`);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const db = createDb();
  migrate(db).then(() => { console.log("migrations up to date"); return db.end(); })
    .catch((e) => { console.error(e); process.exit(1); });
}
