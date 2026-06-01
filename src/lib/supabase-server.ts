import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Lê (e quando possível escreve) cookies da request atual.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component puro não pode setar cookies — o middleware
            // garante o refresh em cada navegação.
          }
        },
      },
    }
  );
}

/**
 * Cast tático para tabelas que ainda NÃO estão em `database.types.ts`
 * (geralmente porque a migration que as cria está pendente de aplicar
 * no Supabase + `npm run gen:types`).
 *
 * Use com moderação. Quando a tabela aparecer nos tipos gerados, remova
 * a chamada e use `supabase.from(...)` direto.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function untyped(client: unknown): any {
  return client;
}

/**
 * Retorna o profile do usuário logado (com org e role) ou null.
 */
export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, organization_id, organizations(name, kind)"
    )
    .eq("id", user.id)
    .maybeSingle();

  return profile;
}
