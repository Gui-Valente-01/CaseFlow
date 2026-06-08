/**
 * Cliente da API publica do DataJud (CNJ).
 *
 * O DataJud e a base nacional oficial de dados processuais do Conselho
 * Nacional de Justica. A API publica permite consultar metadados e os
 * movimentos (andamentos) de um processo pelo numero unico CNJ.
 *
 * Docs / como obter a chave publica:
 *   https://datajud-wiki.cnj.jus.br/api-publica/acesso
 *
 * Config no `.env.local`:
 *   DATAJUD_API_KEY=...   (chave publica fornecida pelo CNJ)
 *
 * Sem a chave, as consultas viram erro "nao configurado" — o resto do
 * app continua funcionando normalmente. Este modulo NAO acessa o banco;
 * e so o cliente HTTP + parser. A orquestracao (gravar no banco) fica
 * em `court-sync.ts`.
 *
 * Numero unico CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO (20 digitos)
 *   J  = segmento do Poder Judiciario
 *   TR = tribunal dentro do segmento
 * A partir de (J, TR) descobrimos qual indice do DataJud consultar.
 */

const DATAJUD_BASE = "https://api-publica.datajud.cnj.jus.br";

// ---------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------

export interface ParsedCnj {
  /** Numero so com digitos (20). */
  digits: string;
  /** Numero formatado NNNNNNN-DD.AAAA.J.TR.OOOO. */
  formatted: string;
  sequential: string;
  checkDigits: string;
  year: string;
  /** Segmento do Judiciario (1 digito). */
  segment: string;
  /** Codigo do tribunal dentro do segmento (2 digitos). */
  court: string;
  origin: string;
}

export interface CourtMovement {
  /** Codigo CNJ do movimento (pode faltar). */
  code: number | null;
  name: string;
  /** ISO string da data/hora do movimento, ou null. */
  occurredAt: string | null;
  /** Payload bruto do movimento (pra auditoria). */
  raw: unknown;
}

export interface DatajudCaseResult {
  found: boolean;
  /** Alias/indice consultado (ex.: "api_publica_tjsp"). */
  endpoint: string;
  classe?: string;
  orgaoJulgador?: string;
  tribunal?: string;
  movements: CourtMovement[];
}

export type DatajudErrorCode =
  | "not_configured"
  | "invalid_number"
  | "unsupported_court"
  | "not_found"
  | "http_error"
  | "network_error";

export class DatajudError extends Error {
  code: DatajudErrorCode;
  constructor(code: DatajudErrorCode, message: string) {
    super(message);
    this.name = "DatajudError";
    this.code = code;
  }
}

// ---------------------------------------------------------------------
// Parser do numero CNJ
// ---------------------------------------------------------------------

/**
 * Valida e quebra o numero unico CNJ. Aceita com ou sem mascara.
 * Lanca DatajudError("invalid_number") se nao tiver 20 digitos.
 */
export function parseCnjNumber(raw: string): ParsedCnj {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length !== 20) {
    throw new DatajudError(
      "invalid_number",
      "Numero de processo invalido. Use o numero unico CNJ (20 digitos)."
    );
  }
  const sequential = digits.slice(0, 7);
  const checkDigits = digits.slice(7, 9);
  const year = digits.slice(9, 13);
  const segment = digits.slice(13, 14);
  const court = digits.slice(14, 16);
  const origin = digits.slice(16, 20);
  const formatted = `${sequential}-${checkDigits}.${year}.${segment}.${court}.${origin}`;
  return {
    digits,
    formatted,
    sequential,
    checkDigits,
    year,
    segment,
    court,
    origin,
  };
}

// ---------------------------------------------------------------------
// Mapa (segmento, tribunal) -> alias do indice DataJud
// ---------------------------------------------------------------------

// Justica Estadual (segmento 8): TR = codigo do tribunal estadual.
const ESTADUAL: Record<string, string> = {
  "01": "tjac", "02": "tjal", "03": "tjap", "04": "tjam", "05": "tjba",
  "06": "tjce", "07": "tjdft", "08": "tjes", "09": "tjgo", "10": "tjma",
  "11": "tjmt", "12": "tjms", "13": "tjmg", "14": "tjpa", "15": "tjpb",
  "16": "tjpr", "17": "tjpe", "18": "tjpi", "19": "tjrj", "20": "tjrn",
  "21": "tjrs", "22": "tjro", "23": "tjrr", "24": "tjsc", "25": "tjse",
  "26": "tjsp", "27": "tjto",
};

/**
 * Resolve o alias do indice DataJud a partir do numero parseado.
 * Retorna null se o segmento/tribunal nao for suportado (ex.: eleitoral,
 * militar, STF — que nao estao na API publica ou exigem outro tratamento).
 */
export function resolveDatajudEndpoint(parsed: ParsedCnj): string | null {
  const { segment, court } = parsed;
  let sigla: string | null = null;

  switch (segment) {
    case "8": // Justica Estadual
      sigla = ESTADUAL[court] ?? null;
      break;
    case "4": // Justica Federal (TRFs)
      // TR 01..06 -> trf1..trf6
      if (/^0[1-6]$/.test(court)) sigla = `trf${Number(court)}`;
      break;
    case "5": // Justica do Trabalho
      // TR 00 -> TST; 01..24 -> TRT da regiao
      if (court === "00") sigla = "tst";
      else if (/^(0[1-9]|1[0-9]|2[0-4])$/.test(court)) sigla = `trt${Number(court)}`;
      break;
    case "3": // STJ
      sigla = "stj";
      break;
    case "7": // Justica Militar da Uniao (STM)
      sigla = "stm";
      break;
    default:
      sigla = null;
  }

  return sigla ? `api_publica_${sigla}` : null;
}

// ---------------------------------------------------------------------
// Cliente HTTP
// ---------------------------------------------------------------------

export function isDatajudConfigured(): boolean {
  return Boolean(process.env.DATAJUD_API_KEY);
}

function normalizeMovements(source: Record<string, unknown>): CourtMovement[] {
  const movimentos = source?.["movimentos"];
  if (!Array.isArray(movimentos)) return [];
  return movimentos.map((m): CourtMovement => {
    const mov = (m ?? {}) as Record<string, unknown>;
    const codeRaw = mov["codigo"];
    const code =
      typeof codeRaw === "number"
        ? codeRaw
        : typeof codeRaw === "string" && codeRaw.trim() !== ""
          ? Number(codeRaw)
          : null;
    const nome = typeof mov["nome"] === "string" ? (mov["nome"] as string) : "";
    const dataHora =
      typeof mov["dataHora"] === "string" ? (mov["dataHora"] as string) : null;
    let occurredAt: string | null = null;
    if (dataHora) {
      const d = new Date(dataHora);
      occurredAt = Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    return {
      code: code !== null && !Number.isNaN(code) ? code : null,
      name: nome || "Movimento",
      occurredAt,
      raw: mov,
    };
  });
}

/**
 * Consulta um processo no DataJud pelo numero unico CNJ.
 *
 * Lanca DatajudError em qualquer falha (nao configurado, numero invalido,
 * tribunal nao suportado, processo nao encontrado, erro HTTP/rede).
 */
export async function fetchCaseFromDatajud(
  rawNumber: string
): Promise<DatajudCaseResult> {
  const apiKey = process.env.DATAJUD_API_KEY;
  if (!apiKey) {
    throw new DatajudError(
      "not_configured",
      "Integracao com o DataJud nao configurada (falta DATAJUD_API_KEY)."
    );
  }

  const parsed = parseCnjNumber(rawNumber);
  const endpoint = resolveDatajudEndpoint(parsed);
  if (!endpoint) {
    throw new DatajudError(
      "unsupported_court",
      "Tribunal deste processo ainda nao suportado pela consulta automatica."
    );
  }

  const url = `${DATAJUD_BASE}/${endpoint}/_search`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `APIKey ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: { match: { numeroProcesso: parsed.digits } },
        size: 1,
      }),
      // Sem cache: queremos o estado atual do processo.
      cache: "no-store",
    });
  } catch (err) {
    throw new DatajudError(
      "network_error",
      err instanceof Error ? err.message : "Falha de rede ao consultar o DataJud."
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new DatajudError(
      "http_error",
      `DataJud respondeu ${res.status}. ${detail.slice(0, 200)}`.trim()
    );
  }

  const json = (await res.json().catch(() => null)) as {
    hits?: { hits?: Array<{ _source?: Record<string, unknown> }> };
  } | null;

  const hit = json?.hits?.hits?.[0]?._source;
  if (!hit) {
    throw new DatajudError(
      "not_found",
      "Nenhum processo encontrado com esse numero no tribunal."
    );
  }

  const orgao = hit["orgaoJulgador"] as Record<string, unknown> | undefined;
  const classe = hit["classe"] as Record<string, unknown> | undefined;

  return {
    found: true,
    endpoint,
    classe: typeof classe?.["nome"] === "string" ? (classe["nome"] as string) : undefined,
    orgaoJulgador:
      typeof orgao?.["nome"] === "string" ? (orgao["nome"] as string) : undefined,
    tribunal: typeof hit["tribunal"] === "string" ? (hit["tribunal"] as string) : undefined,
    movements: normalizeMovements(hit),
  };
}

// ---------------------------------------------------------------------
// Hash de deduplicacao
// ---------------------------------------------------------------------

/**
 * Gera um hash estavel pra um movimento, usado pra deduplicar no banco
 * (unique case_id + external_hash). Mesmo movimento re-consultado gera o
 * mesmo hash, entao o upsert ignora duplicatas.
 */
export function movementHash(m: CourtMovement): string {
  const key = `${m.code ?? ""}|${m.occurredAt ?? ""}|${m.name}`;
  // Hash simples e deterministico (FNV-1a 32 bits) — suficiente pra dedup.
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Para hex sem sinal.
  return (h >>> 0).toString(16).padStart(8, "0");
}
