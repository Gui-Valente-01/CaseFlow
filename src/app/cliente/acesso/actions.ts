"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export interface ClientLookupResult {
  ok: boolean;
  error?: string;
  email?: string;
  profileId?: string;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Recebe o CPF/CNPJ digitado pelo cliente e devolve o e-mail vinculado
 * para o browser fazer signInWithPassword. Não devolve senha nem aceita
 * senha aqui — autenticação é sempre pelo SDK no browser.
 */
export async function resolveClientLoginAction(
  formData: FormData
): Promise<ClientLookupResult> {
  const documentDigits = onlyDigits(
    ((formData.get("document") as string | null) ?? "").trim()
  );

  if (documentDigits.length < 11) {
    return { ok: false, error: "Informe um CPF ou CNPJ válido." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from("clients")
    .select("id, email, document, profile_id")
    .not("document", "is", null);

  if (error) {
    return {
      ok: false,
      error: "Não foi possível consultar o cadastro. Tente novamente.",
    };
  }

  const client = (rows ?? []).find(
    (item) => onlyDigits(item.document ?? "") === documentDigits
  );

  if (!client) {
    return {
      ok: false,
      error:
        "Não encontrei um cliente com este CPF/CNPJ. Confira o número ou peça ao escritório para revisar seu cadastro.",
    };
  }

  const email = client.email?.trim().toLowerCase();
  if (!email || !client.profile_id) {
    return {
      ok: false,
      error:
        "Seu acesso ainda não foi liberado. Peça ao escritório para definir sua senha de acesso.",
    };
  }

  return { ok: true, email, profileId: client.profile_id };
}
