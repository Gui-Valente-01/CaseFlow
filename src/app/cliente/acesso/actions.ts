"use server";

import { onlyDigits } from "@/lib/document";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export interface ClientLookupResult {
  ok: boolean;
  error?: string;
  email?: string;
  profileId?: string;
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

  // Trava enumeração de CPF/CNPJ: máx. 10 consultas a cada 15 min por IP.
  const allowed = await checkRateLimit({
    action: "cliente-login",
    max: 10,
    windowSeconds: 900,
  });
  if (!allowed) {
    return {
      ok: false,
      error:
        "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: matches, error } = await supabase.rpc("find_client_login", {
    p_document_digits: documentDigits,
  });

  if (error) {
    return {
      ok: false,
      error: "Não foi possível consultar o cadastro. Tente novamente.",
    };
  }

  const client = matches?.[0];

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
