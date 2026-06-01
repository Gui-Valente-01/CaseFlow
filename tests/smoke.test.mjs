import assert from "node:assert/strict";
import test from "node:test";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

async function get(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    redirect: "manual",
  });
  const text = await response.text().catch(() => "");
  return { response, text };
}

test("public landing exposes legal links", async () => {
  const { response, text } = await get("/");

  assert.equal(response.status, 200);
  assert.match(text, /Termos/);
  assert.match(text, /Privacidade/);
});

test("signup page requires legal acceptance in the UI", async () => {
  const { response, text } = await get("/cadastro");

  assert.equal(response.status, 200);
  assert.match(text, /Termos de Uso/);
  assert.match(text, /Política de Privacidade/);
});

test("legal pages are publicly reachable", async () => {
  const terms = await get("/termos-de-uso");
  const privacy = await get("/politica-de-privacidade");

  assert.equal(terms.response.status, 200);
  assert.match(terms.text, /Termos de Uso/);
  assert.equal(privacy.response.status, 200);
  assert.match(privacy.text, /Política de Privacidade/);
});

test("protected dashboard redirects anonymous users", async () => {
  const { response } = await get("/dashboard");

  assert.equal(response.status, 307);
  assert.match(response.headers.get("location") ?? "", /\/login/);
});
