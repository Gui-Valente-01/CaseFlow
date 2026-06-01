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
