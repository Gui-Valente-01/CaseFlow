// Roda a Supabase CLI e escreve src/lib/database.types.ts em UTF-8.
//
// Funciona em PowerShell, cmd, bash e CI — não depende do operador `>`
// do shell, que no PowerShell sai em UTF-16 e quebra o TypeScript.
//
// Requer:
//   - SUPABASE_ACCESS_TOKEN no env (gere em
//     https://supabase.com/dashboard/account/tokens).
//   - Project ID em SUPABASE_PROJECT_ID, ou usa o default abaixo.

import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const DEFAULT_PROJECT_ID = "hhvcscdvefeuiprimikw";
const projectId = process.env.SUPABASE_PROJECT_ID ?? DEFAULT_PROJECT_ID;
const outFile = "src/lib/database.types.ts";

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error(
    "Erro: defina SUPABASE_ACCESS_TOKEN antes de rodar.\n" +
      "Gere em https://supabase.com/dashboard/account/tokens"
  );
  process.exit(1);
}

const isWin = process.platform === "win32";
const args = [
  "supabase",
  "gen",
  "types",
  "typescript",
  "--project-id",
  projectId,
  "--schema",
  "public",
];

// No Windows usamos cmd.exe /c <npx.cmd ...> em vez de shell:true pra
// evitar o warning de deprecação DEP0190 sem perder compat.
const cli = isWin
  ? spawn("cmd.exe", ["/c", "npx.cmd", ...args], { env: process.env })
  : spawn("npx", args, { env: process.env });

let stdout = "";
let stderr = "";

cli.stdout.on("data", (chunk) => {
  stdout += chunk.toString("utf8");
});
cli.stderr.on("data", (chunk) => {
  stderr += chunk.toString("utf8");
});

cli.on("close", (code) => {
  if (code !== 0) {
    console.error(stderr || "Falha ao gerar tipos.");
    process.exit(code ?? 1);
  }

  // Strip BOM se a CLI emitir UTF-8 com BOM (alguns terminais Windows).
  const content = stdout.charCodeAt(0) === 0xfeff ? stdout.slice(1) : stdout;

  writeFileSync(outFile, content, "utf8");
  console.log(`OK -> ${outFile} (${content.split("\n").length} linhas)`);
});
