/**
 * Backup do Storage do CaseFlow (bucket "documents").
 *
 * Baixa TODOS os arquivos do bucket pra uma pasta local com data/hora,
 * preservando a estrutura <organization_id>/<case_id>/... e gravando um
 * manifest.json com a lista, tamanhos e contagem.
 *
 * Por que existe: os arquivos do bucket são documentos jurídicos de
 * clientes. Se o projeto Supabase for perdido/corrompido, isto é a rede
 * de segurança — uma cópia off-Supabase, na máquina do escritório.
 *
 * Uso:
 *   npm run backup:storage
 *
 * Destino (configurável por env BACKUP_DIR):
 *   ../storage-backups/documents-YYYYMMDD-HHmmss/   (fora do app)
 *
 * Lê credenciais do .env.local (NEXT_PUBLIC_SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY). A service_role key ignora RLS e lê o bucket
 * inteiro — por isso este script só roda localmente, nunca no cliente.
 */

import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const BUCKET = "documents";

async function loadEnvLocal() {
  try {
    const txt = await readFile(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].trim();
      }
    }
  } catch {
    // sem .env.local: confia nas env vars já presentes
  }
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-` +
    `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

function humanBytes(n) {
  if (n == null) return "?";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${u[i]}`;
}

async function listAll(supabase, prefix = "") {
  const out = [];
  const limit = 100;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list("${prefix}"): ${error.message}`);
    if (!data || data.length === 0) break;
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      // Pastas vêm com id === null no Supabase Storage.
      if (item.id === null) {
        const nested = await listAll(supabase, full);
        out.push(...nested);
      } else {
        out.push({ path: full, size: item.metadata?.size ?? null });
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return out;
}

async function main() {
  await loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY (.env.local)."
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const baseDir =
    process.env.BACKUP_DIR || resolve(process.cwd(), "..", "storage-backups");
  const destDir = join(baseDir, `documents-${timestamp()}`);

  console.log(`Bucket:  ${BUCKET}`);
  console.log(`Destino: ${destDir}`);
  console.log("Listando arquivos...");

  const files = await listAll(supabase);
  console.log(`Encontrados ${files.length} arquivo(s). Baixando...`);

  let ok = 0;
  let fail = 0;
  let bytes = 0;
  const failures = [];

  for (const f of files) {
    const { data, error } = await supabase.storage.from(BUCKET).download(f.path);
    if (error || !data) {
      fail++;
      failures.push({ path: f.path, error: error?.message ?? "sem dados" });
      console.warn(`  ✗ ${f.path} — ${error?.message ?? "falhou"}`);
      continue;
    }
    const buf = Buffer.from(await data.arrayBuffer());
    const dest = join(destDir, f.path);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, buf);
    ok++;
    bytes += buf.length;
    if (ok % 25 === 0) console.log(`  ...${ok} baixados`);
  }

  const manifest = {
    bucket: BUCKET,
    createdAt: new Date().toISOString(),
    totalFiles: files.length,
    downloaded: ok,
    failed: fail,
    totalBytes: bytes,
    files,
    failures,
  };
  await mkdir(destDir, { recursive: true });
  await writeFile(
    join(destDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  console.log("");
  console.log("=== Backup concluído ===");
  console.log(`Baixados: ${ok}/${files.length}  (${humanBytes(bytes)})`);
  if (fail > 0) console.log(`Falhas:   ${fail} (ver manifest.json)`);
  console.log(`Pasta:    ${destDir}`);

  if (fail > 0) process.exit(2);
}

main().catch((err) => {
  console.error("Erro no backup:", err.message);
  process.exit(1);
});
