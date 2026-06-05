"use server";

import { onlyDigits } from "@/lib/document";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export interface ResolveEmailResult {
  ok: boolean;
  error?: string;
  email?: string;
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

  // Mesma trava de enumeração do login do cliente.
  const allowed = await checkRateLimit({
    action: "cliente-reset",
    max: 10,
    windowSeconds: 900,
  });
  if (!allowed) {
    return {
      ok: false,
      error: "Muitas tentativas seguidas. Aguarde alguns minutos.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: email, error } = await supabase.rpc("find_reset_email", {
    p_document_digits: digits,
  });

  if (error) {
    return { ok: false, error: "Não foi possível consultar o cadastro." };
  }

  if (!email) {
    return {
      ok: false,
      error:
        "Não encontrei um cadastro com este CPF/CNPJ. Procure o escritório.",
    };
  }

  return { ok: true, email: email.trim().toLowerCase() };
}
