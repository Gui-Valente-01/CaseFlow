"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export interface ResolveEmailResult {
  ok: boolean;
  error?: string;
  email?: string;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Recebe o que o usuário digitou (CPF/CNPJ ou e-mail) e devolve o e-mail
 * a ser usado pelo `supabase.auth.resetPasswordForEmail` no browser.
 *
 * - Se o input tiver `@`, devolve o próprio e-mail (normalizado).
 * - Caso contrário trata como CPF/CNPJ e busca em `clients.document`.
 */
export async function resolveResetEmailAction(
  formData: FormData
): Promise<ResolveEmailResult> {
  const raw = ((formData.get("identifier") as string | null) ?? "").trim();
  if (!raw) {
    return { ok: false, error: "Informe seu CPF/CNPJ ou e-mail." };
  }

  if (raw.includes("@")) {
    return { ok: true, email: raw.toLowerCase() };
  }

  const digits = onlyDigits(raw);
  if (digits.length < 11) {
    return { ok: false, error: "Informe um CPF ou CNPJ válido." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from("clients")
    .select("email, document")
    .not("document", "is", null);

  if (error) {
    return { ok: false, error: "Não foi possível consultar o cadastro." };
  }

  const match = (rows ?? []).find(
    (row) => onlyDigits(row.document ?? "") === digits
  );

  if (!match || !match.email) {
    return {
      ok: false,
      error:
        "Não encontrei um cadastro com este CPF/CNPJ. Procure o escritório.",
    };
  }

  return { ok: true, email: match.email.trim().toLowerCase() };
}
