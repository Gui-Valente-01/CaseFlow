import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function file(path) {
  return readFile(new URL(path, root), "utf8");
}

test("cadastro exige aceite de termos e privacidade", async () => {
  const source = await file("src/app/cadastro/page.tsx");

  assert.match(source, /acceptedLegal/);
  assert.match(source, /Termos de Uso/);
  assert.match(source, /Política de Privacidade/);
  assert.match(source, /Para criar sua conta, aceite/);
});

test("rotas legais publicas existem com conteudo essencial", async () => {
  const terms = await file("src/app/termos-de-uso/page.tsx");
  const privacy = await file("src/app/politica-de-privacidade/page.tsx");

  assert.match(terms, /Termos de Uso/);
  assert.match(terms, /O que é o CaseFlow/);
  assert.match(privacy, /Política de Privacidade/);
  assert.match(privacy, /Direitos dos titulares/);
});

test("migrations comerciais e de RLS estao documentadas", async () => {
  const readme = await file("README.md");
  const deploy = await file("docs/DEPLOY.md");

  assert.match(readme, /migration-v12-rls-rpc-helpers/);
  assert.match(readme, /migration-v14-organization-billing/);
  assert.match(readme, /migration-v15-privacy-audit-log/);
  assert.match(deploy, /migration-v14-organization-billing/);
  assert.match(deploy, /migration-v15-privacy-audit-log/);
});

test("billing usa tabela separada e nao organizations", async () => {
  const billing = await file("src/lib/billing.ts");
  const migration = await file("docs/migration-v14-organization-billing.sql");

  assert.match(billing, /organization_billing/);
  assert.doesNotMatch(billing, /\.from\("organizations"\)/);
  assert.match(migration, /Sem INSERT\/UPDATE\/DELETE para authenticated/);
  assert.match(migration, /handle_new_organization_billing/);
});

test("LGPD separa exportacao por papel e preserva auditoria", async () => {
  const route = await file("src/app/dashboard/conta/exportar-dados/route.ts");
  const actions = await file("src/app/dashboard/conta/actions.ts");
  const audit = await file("src/lib/audit.ts");
  const migration = await file("docs/migration-v15-privacy-audit-log.sql");

  assert.match(route, /profile\.role === "owner"/);
  assert.match(route, /buildOrganizationExport/);
  assert.match(route, /buildPersonalExport/);
  assert.match(route, /scope: "personal"/);
  assert.match(actions, /recordPrivacyAudit/);
  assert.match(audit, /privacy_audit_log/);
  assert.match(migration, /NAO tem foreign key/);
  assert.match(migration, /enable row level security/);
});

test("Stripe checkout e webhook ficam preparados sem obrigar env local", async () => {
  const packageJson = await file("package.json");
  const stripeLib = await file("src/lib/stripe.ts");
  const checkoutAction = await file("src/app/dashboard/assinatura/actions.ts");
  const webhook = await file("src/app/api/stripe/webhook/route.ts");
  const envExample = await file(".env.local.example");
  const readme = await file("README.md");

  assert.match(packageJson, /"stripe"/);
  assert.match(stripeLib, /getStripeMode/);
  assert.match(stripeLib, /Stripe\.API_VERSION/);
  assert.match(stripeLib, /rk_test_/);
  assert.match(stripeLib, /isStripeCheckoutConfigured/);
  assert.match(checkoutAction, /checkout\.sessions\.create/);
  assert.match(checkoutAction, /mode: "subscription"/);
  assert.match(webhook, /webhooks\.constructEvent/);
  assert.match(webhook, /checkout\.session\.completed/);
  assert.match(webhook, /customer\.subscription\.updated/);
  assert.match(envExample, /STRIPE_SECRET_KEY=/);
  assert.match(envExample, /STRIPE_PRICE_ID_ESSENTIAL=/);
  assert.match(readme, /STRIPE_WEBHOOK_SECRET/);
});

test("integracao DataJud: client puro, parser CNJ e mapa de tribunais", async () => {
  const datajud = await file("src/lib/datajud.ts");
  const envExample = await file(".env.local.example");

  // Autenticacao e endpoint corretos da API publica do CNJ.
  assert.match(datajud, /api-publica\.datajud\.cnj\.jus\.br/);
  assert.match(datajud, /APIKey \$\{apiKey\}/);
  assert.match(datajud, /numeroProcesso/);

  // Parser do numero unico CNJ (20 digitos) e mapeamento por segmento.
  assert.match(datajud, /digits\.length !== 20/);
  assert.match(datajud, /resolveDatajudEndpoint/);
  assert.match(datajud, /tjsp/);
  assert.match(datajud, /trf\$\{Number\(court\)\}/);
  assert.match(datajud, /trt\$\{Number\(court\)\}/);

  // Falha de forma honesta quando nao configurado / nao suportado.
  assert.match(datajud, /"not_configured"/);
  assert.match(datajud, /"unsupported_court"/);
  assert.match(datajud, /"not_found"/);

  // Hash de deduplicacao deterministico.
  assert.match(datajud, /export function movementHash/);

  // Variavel de ambiente documentada.
  assert.match(envExample, /DATAJUD_API_KEY=/);
});

test("integracao DataJud: sync grava deduplicado e nao acessa banco no client", async () => {
  const datajud = await file("src/lib/datajud.ts");
  const sync = await file("src/lib/court-sync.ts");
  const migration = await file("docs/migration-v20-court-movements.sql");

  // O client puro NAO deve tocar no banco (separacao de responsabilidades).
  assert.doesNotMatch(datajud, /supabase/i);

  // A orquestracao usa admin e faz upsert ignorando duplicatas.
  assert.match(sync, /getSupabaseAdmin/);
  assert.match(sync, /case_movements/);
  assert.match(sync, /onConflict: "case_id,external_hash"/);
  assert.match(sync, /ignoreDuplicates: true/);
  assert.match(sync, /last_synced_at/);
  assert.match(sync, /last_sync_error/);

  // Migration cria a tabela com unique de dedup e colunas de controle.
  assert.match(migration, /create table if not exists public\.case_movements/);
  assert.match(migration, /unique \(case_id, external_hash\)/);
  assert.match(migration, /court_sync_enabled/);
});

test("integracao DataJud: UI do processo mostra andamentos e botao", async () => {
  const page = await file("src/app/dashboard/processos/[id]/page.tsx");
  const panel = await file(
    "src/app/dashboard/processos/[id]/_components/CourtSyncPanel.tsx"
  );
  const actions = await file("src/app/dashboard/processos/actions.ts");
  const queries = await file("src/lib/queries/case-content.ts");

  // A pagina busca os movimentos e renderiza o painel.
  assert.match(page, /getCaseMovements/);
  assert.match(page, /<CourtSyncPanel/);

  // Painel: botao de atualizar via useActionState e lista de andamentos.
  assert.match(panel, /Atualizar andamentos/);
  assert.match(panel, /useActionState/);
  assert.match(panel, /syncCaseMovementsAction/);

  // Action protege por papel e revalida a pagina do processo.
  assert.match(actions, /export async function syncCaseMovementsAction/);
  assert.match(actions, /isLegalStaff\(profile\)/);
  assert.match(actions, /canAccessCase/);
  assert.match(actions, /revalidatePath\(`\/dashboard\/processos\/\$\{caseId\}`\)/);

  // Query nova de movimentos existe e ordena por data desc.
  assert.match(queries, /export async function getCaseMovements/);
  assert.match(queries, /from\("case_movements"\)/);
});

test("integracao DataJud: cron protegido por secret e em lote", async () => {
  const route = await file("src/app/api/cron/sync-cases/route.ts");
  const sync = await file("src/lib/court-sync.ts");
  const envExample = await file(".env.local.example");

  // Rota exige Bearer CRON_SECRET e fica desligada (501) sem o secret.
  assert.match(route, /CRON_SECRET/);
  assert.match(route, /Bearer \$\{secret\}/);
  assert.match(route, /status: 501/);
  assert.match(route, /status: 401/);
  assert.match(route, /syncPendingCases/);

  // Lote prioriza os mais antigos e respeita um limite por execucao.
  assert.match(sync, /export async function syncPendingCases/);
  assert.match(sync, /court_sync_enabled/);
  assert.match(sync, /ascending: true, nullsFirst: true/);

  // Variavel documentada.
  assert.match(envExample, /CRON_SECRET=/);
});

test("integracao DataJud: vercel.json agenda o cron de andamentos", async () => {
  const vercel = JSON.parse(await file("vercel.json"));
  const deploy = await file("docs/DEPLOY.md");

  assert.ok(Array.isArray(vercel.crons), "vercel.json deve ter crons[]");
  const cron = vercel.crons.find((c) => c.path === "/api/cron/sync-cases");
  assert.ok(cron, "deve agendar /api/cron/sync-cases");
  assert.match(cron.schedule, /^[\d*/, -]+$/, "schedule deve ser cron valido");

  // Deploy documenta a migration v20 e a variavel do cron.
  assert.match(deploy, /migration-v20-court-movements/);
  assert.match(deploy, /CRON_SECRET/);
  assert.match(deploy, /DATAJUD_API_KEY/);
});
