/**
 * Aplica um arquivo .sql (ou uma query passada inline) no projeto Supabase
 * via Management API. Uso:
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-sql.mjs docs/migration-vXX.sql
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-sql.mjs --query "select 1"
 *
 * O ref do projeto vem de NEXT_PUBLIC_SUPABASE_URL (.env.local) ou de
 * SUPABASE_PROJECT_REF.
 */
import { readFile } from "node:fs/promises";

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Defina SUPABASE_ACCESS_TOKEN.");
  process.exit(1);
}

let ref = process.env.SUPABASE_PROJECT_REF;
if (!ref) {
  try {
    const env = await readFile(new URL("../.env.local", import.meta.url), "utf8");
    const m = env.match(/NEXT_PUBLIC_SUPABASE_URL=https:\/\/([a-z0-9]+)\.supabase\.co/);
    if (m) ref = m[1];
  } catch {
    // sem .env.local — exige SUPABASE_PROJECT_REF
  }
}
if (!ref) {
  console.error("Defina SUPABASE_PROJECT_REF ou tenha NEXT_PUBLIC_SUPABASE_URL no .env.local.");
  process.exit(1);
}

const [arg, inline] = process.argv.slice(2);
const query = arg === "--query" ? inline : await readFile(arg, "utf8");

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${text}`);
  process.exit(1);
}
console.log(text);
