/**
 * Parser de CSV mínimo, sem dependências externas. Suporta:
 *   - separador automático (vírgula ou ponto-e-vírgula)
 *   - aspas duplas com escape ("" → ")
 *   - quebras de linha dentro de campos com aspas
 *   - BOM no início do arquivo
 *
 * Não é o parser do mundo, mas atende planilhas exportadas do
 * Google Sheets / Excel / Numbers — que é o caso de uso aqui.
 */

export interface CsvParseResult {
  headers: string[];
  rows: string[][];
}

export function parseCsv(input: string): CsvParseResult {
  // Remove BOM
  if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);

  // Detecta separador olhando a primeira linha não-quoted
  const firstLine = input.split(/\r?\n/)[0] ?? "";
  const sep =
    (firstLine.match(/;/g)?.length ?? 0) >
    (firstLine.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          value += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      value += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === sep) {
      row.push(value);
      value = "";
      i++;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      // Pula \r\n como um único separador de linha
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(value);
      value = "";
      // Ignora linhas vazias
      if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
        rows.push(row);
      }
      row = [];
      i++;
      continue;
    }
    value += ch;
    i++;
  }
  // Última linha
  if (value !== "" || row.length > 0) {
    row.push(value);
    if (row.length > 1 || (row.length === 1 && row[0] !== "")) rows.push(row);
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map((h) => h.trim());
  return { headers, rows: rows.slice(1) };
}

/**
 * Resolve o índice de cada campo conhecido a partir dos headers do CSV.
 * Aceita variações comuns (case-insensitive, acentos removidos).
 */
export interface ClientCsvFieldMap {
  full_name: number;
  email: number;
  phone: number;
  document: number;
  notes: number;
  internal_notes: number;
}

const FIELD_ALIASES: Record<keyof ClientCsvFieldMap, string[]> = {
  full_name: ["nome", "nome completo", "full name", "name", "razao social"],
  email: ["e-mail", "email"],
  phone: ["telefone", "celular", "phone", "tel"],
  document: ["cpf", "cnpj", "cpf/cnpj", "documento", "document"],
  notes: ["observacoes", "observacao", "notas", "notes", "obs"],
  internal_notes: [
    "anotacoes internas",
    "notas internas",
    "internal notes",
    "interno",
  ],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function mapClientCsvFields(headers: string[]): ClientCsvFieldMap {
  const normalized = headers.map(normalize);
  const result: ClientCsvFieldMap = {
    full_name: -1,
    email: -1,
    phone: -1,
    document: -1,
    notes: -1,
    internal_notes: -1,
  };
  for (const key of Object.keys(FIELD_ALIASES) as (keyof ClientCsvFieldMap)[]) {
    const aliases = FIELD_ALIASES[key];
    for (let i = 0; i < normalized.length; i++) {
      if (aliases.includes(normalized[i])) {
        result[key] = i;
        break;
      }
    }
  }
  return result;
}
