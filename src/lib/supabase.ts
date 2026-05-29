import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Cliente Supabase para uso em Client Components.
 * Armazena a sessão em cookies (via @supabase/ssr) pra que o middleware
 * e os Server Components possam ler.
 *
 * Tipado com `Database` gerado pela CLI: as tabelas, colunas e tipos
 * ficam disponíveis em autocomplete e o TypeScript reclama de query
 * que pede coluna que não existe.
 */
export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
