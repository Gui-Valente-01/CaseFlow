/**
 * Helpers de CPF/CNPJ.
 *
 * - Validação real com dígito verificador (não só comprimento).
 * - Máscara de entrada que reformata conforme o usuário digita.
 * - Detecção automática de CPF (11) ou CNPJ (14).
 *
 * As funções operam tanto sobre o valor mascarado quanto sobre dígitos puros —
 * a comparação canônica é sempre por dígitos.
 */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

// =====================================================================
// Validação
// =====================================================================

/** Valida o dígito verificador de um CPF. */
export function isValidCPF(input: string): boolean {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11) return false;
  // Rejeita sequências repetidas tipo "11111111111".
  if (/^(\d)\1+$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);

  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== digits[9]) return false;

  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== digits[10]) return false;

  return true;
}

/** Valida o dígito verificador de um CNPJ. */
export function isValidCNPJ(input: string): boolean {
  const cnpj = onlyDigits(input);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const digits = cnpj.split("").map(Number);

  // Pesos do primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += digits[i] * weights1[i];
  let check = sum % 11;
  check = check < 2 ? 0 : 11 - check;
  if (check !== digits[12]) return false;

  // Pesos do segundo dígito verificador
  const weights2 = [6, ...weights1];
  sum = 0;
  for (let i = 0; i < 13; i++) sum += digits[i] * weights2[i];
  check = sum % 11;
  check = check < 2 ? 0 : 11 - check;
  if (check !== digits[13]) return false;

  return true;
}

/** Aceita CPF (11 dígitos) ou CNPJ (14 dígitos) válido. */
export function isValidDocument(input: string): boolean {
  const d = onlyDigits(input);
  if (d.length === 11) return isValidCPF(d);
  if (d.length === 14) return isValidCNPJ(d);
  return false;
}

export type DocumentKind = "cpf" | "cnpj" | "invalid";

export function classifyDocument(input: string): DocumentKind {
  const d = onlyDigits(input);
  if (d.length === 11) return isValidCPF(d) ? "cpf" : "invalid";
  if (d.length === 14) return isValidCNPJ(d) ? "cnpj" : "invalid";
  return "invalid";
}

// =====================================================================
// Máscara
// =====================================================================

/**
 * Formata para apresentação:
 *   11 dígitos → 000.000.000-00 (CPF)
 *   14 dígitos → 00.000.000/0000-00 (CNPJ)
 *   menos que isso → progressivo, conforme o usuário digita.
 *
 * Acima de 14 dígitos, descarta o excesso.
 */
export function maskDocument(input: string): string {
  const d = onlyDigits(input).slice(0, 14);

  if (d.length <= 11) {
    // Trata como CPF em construção: 000.000.000-00
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  // 12+ dígitos: trata como CNPJ — 00.000.000/0000-00
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
