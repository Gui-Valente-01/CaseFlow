import { headers } from "next/headers";
import { createSupabaseServerClient, untyped } from "./supabase-server";

/**
 * IP de quem está chamando, lido dos headers da request. Na Vercel o
 * `x-forwarded-for` traz o IP real do cliente (primeiro da lista).
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Limite de tentativas por IP, via RPC `check_rate_limit` (SECURITY DEFINER).
 *
 * Retorna `true` se a ação está LIBERADA e `false` se deve ser BLOQUEADA.
 *
 * Fail-open: se a RPC não existir (migration v19 ainda não aplicada) ou der
 * qualquer erro, libera — pra nunca travar um cliente real por causa do
 * limitador. A proteção só age depois que a v19 estiver no banco.
 */
export async function checkRateLimit(params: {
  /** Nome da ação, vira prefixo do bucket. Ex.: "cliente-login". */
  action: string;
  /** Máximo de tentativas permitidas na janela. */
  max: number;
  /** Tamanho da janela em segundos. */
  windowSeconds: number;
}): Promise<boolean> {
  try {
    const ip = await getClientIp();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await untyped(supabase).rpc("check_rate_limit", {
      p_bucket: `${params.action}:${ip}`,
      p_max: params.max,
      p_window_seconds: params.windowSeconds,
    });
    if (error) return true; // fail-open
    return data !== false;
  } catch {
    return true; // fail-open
  }
}
