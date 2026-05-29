import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

type AdminClient = SupabaseClient<Database>;

/**
 * Cliente Supabase com SERVICE ROLE. SÓ pode ser importado em código
 * que roda no servidor (Server Actions, Route Handlers, RSC).
 *
 * Permite operações administrativas como criar usuários no Auth direto,
 * alterar senha de outro usuário, etc. Em hipótese alguma essa chave deve
 * vazar para o browser.
 *
 * Configure no `.env.local`:
 *   SUPABASE_SERVICE_ROLE_KEY=...
 */
let cached: AdminClient | null = null;

export function getSupabaseAdmin(): AdminClient | null {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;

  cached = createClient<Database>(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
