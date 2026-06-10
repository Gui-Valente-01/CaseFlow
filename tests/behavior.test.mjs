/**
 * Testes de COMPORTAMENTO (diferente do unit.test.mjs, que confere a
 * presença de textos no fonte). Importam módulos TypeScript puros — sem
 * dependência de Next/Supabase — direto via type stripping do Node 24+.
 *
 * Se um teste daqui quebrar, é regressão de lógica de verdade.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  parseCnjNumber,
  resolveDatajudEndpoint,
  movementHash,
  DatajudError,
} from "../src/lib/datajud.ts";
import {
  translateCaseStatus,
  extractClientName,
  extractProfile,
} from "../src/lib/queries/shared.ts";

// ---------------------------------------------------------------------
// parseCnjNumber
// ---------------------------------------------------------------------

test("parseCnjNumber aceita número com máscara e quebra os campos", () => {
  const p = parseCnjNumber("0000001-23.2024.8.26.0100");
  assert.equal(p.digits, "00000012320248260100");
  assert.equal(p.formatted, "0000001-23.2024.8.26.0100");
  assert.equal(p.sequential, "0000001");
  assert.equal(p.checkDigits, "23");
  assert.equal(p.year, "2024");
  assert.equal(p.segment, "8");
  assert.equal(p.court, "26");
  assert.equal(p.origin, "0100");
});

test("parseCnjNumber aceita número sem máscara", () => {
  const p = parseCnjNumber("00000012320248260100");
  assert.equal(p.formatted, "0000001-23.2024.8.26.0100");
});

test("parseCnjNumber rejeita número com menos de 20 dígitos", () => {
  assert.throws(
    () => parseCnjNumber("12345"),
    (err) => err instanceof DatajudError && err.code === "invalid_number"
  );
});

test("parseCnjNumber rejeita vazio e null", () => {
  for (const raw of ["", null]) {
    assert.throws(
      () => parseCnjNumber(raw),
      (err) => err instanceof DatajudError && err.code === "invalid_number"
    );
  }
});

// ---------------------------------------------------------------------
// resolveDatajudEndpoint
// ---------------------------------------------------------------------

function endpointOf(cnj) {
  return resolveDatajudEndpoint(parseCnjNumber(cnj));
}

test("resolve tribunal estadual (TJSP)", () => {
  assert.equal(endpointOf("0000001-23.2024.8.26.0100"), "api_publica_tjsp");
});

test("resolve Justiça Federal (TRF3)", () => {
  assert.equal(endpointOf("0000001-23.2024.4.03.0100"), "api_publica_trf3");
});

test("resolve Justiça do Trabalho (TRT2 e TST)", () => {
  assert.equal(endpointOf("0000001-23.2024.5.02.0100"), "api_publica_trt2");
  assert.equal(endpointOf("0000001-23.2024.5.00.0100"), "api_publica_tst");
});

test("segmento não suportado retorna null (eleitoral)", () => {
  assert.equal(endpointOf("0000001-23.2024.6.26.0100"), null);
});

test("tribunal estadual inexistente retorna null", () => {
  assert.equal(endpointOf("0000001-23.2024.8.99.0100"), null);
});

// ---------------------------------------------------------------------
// movementHash (deduplicação dos andamentos)
// ---------------------------------------------------------------------

test("movementHash é determinístico pro mesmo movimento", () => {
  const m = { code: 123, name: "Conclusão", occurredAt: "2024-05-01T10:00:00Z", raw: {} };
  assert.equal(movementHash(m), movementHash({ ...m }));
});

test("movementHash muda quando o movimento muda", () => {
  const base = { code: 123, name: "Conclusão", occurredAt: "2024-05-01T10:00:00Z", raw: {} };
  const hashes = new Set([
    movementHash(base),
    movementHash({ ...base, code: 124 }),
    movementHash({ ...base, name: "Juntada" }),
    movementHash({ ...base, occurredAt: "2024-05-02T10:00:00Z" }),
  ]);
  assert.equal(hashes.size, 4, "movimentos diferentes devem ter hashes diferentes");
});

test("movementHash tolera code/occurredAt nulos e gera hex de 8 chars", () => {
  const h = movementHash({ code: null, name: "Despacho", occurredAt: null, raw: {} });
  assert.match(h, /^[0-9a-f]{8}$/);
});

// ---------------------------------------------------------------------
// Helpers de apresentação (queries/shared)
// ---------------------------------------------------------------------

test("translateCaseStatus traduz status conhecidos e preserva desconhecidos", () => {
  assert.equal(translateCaseStatus("active"), "Em andamento");
  assert.equal(translateCaseStatus("closed"), "Encerrado");
  assert.equal(translateCaseStatus(null), "—");
  assert.equal(translateCaseStatus(undefined), "—");
  assert.equal(translateCaseStatus("custom_status"), "custom_status");
});

test("extractClientName normaliza objeto, array e ausência", () => {
  assert.equal(extractClientName({ full_name: "Maria" }), "Maria");
  assert.equal(extractClientName([{ full_name: "João" }]), "João");
  assert.equal(extractClientName([]), "—");
  assert.equal(extractClientName(null), "—");
});

test("extractProfile cai pra 'Sistema' quando o perfil falta", () => {
  assert.deepEqual(extractProfile(null), { full_name: "Sistema", role: "system" });
  assert.deepEqual(extractProfile([{ full_name: "Ana", role: "lawyer" }]), {
    full_name: "Ana",
    role: "lawyer",
  });
});
