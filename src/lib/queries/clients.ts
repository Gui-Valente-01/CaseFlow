import { createSupabaseServerClient } from "../supabase-server";

// =====================================================================
// Clientes
// =====================================================================

export interface ClientRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  status: string;
  caseCount: number;
  hasAccess: boolean;
  hasDocument: boolean;
  hasEmail: boolean;
}

/**
 * Lista clientes da organização. Se `search` for informado, filtra por
 * nome, e-mail ou documento (CPF/CNPJ), com `ilike` case-insensitive.
 */
export async function getClients(
  organizationId: string,
  search?: string
): Promise<ClientRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("clients")
    .select("id, full_name, email, phone, document, profile_id, cases(count)")
    .eq("organization_id", organizationId);

  const term = search?.trim();
  if (term) {
    // Escapa vírgulas pra não quebrar o filtro composto do PostgREST
    const safe = term.replace(/[,()]/g, " ");
    const pattern = `%${safe}%`;
    query = query.or(
      `full_name.ilike.${pattern},email.ilike.${pattern},document.ilike.${pattern}`
    );
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error || !data) return [];

  return data.map((row) => {
    const casesField = row.cases as unknown as { count: number }[] | null;
    const caseCount = Array.isArray(casesField) ? casesField[0]?.count ?? 0 : 0;
    return {
      id: row.id,
      name: row.full_name,
      email: row.email ?? "—",
      phone: row.phone ?? "—",
      document: row.document ?? "—",
      status: caseCount > 0 ? "Ativo" : "Sem processos",
      caseCount,
      hasAccess: Boolean(row.profile_id),
      hasDocument: Boolean(row.document),
      hasEmail: Boolean(row.email),
    };
  });
}

export interface ClientDetail {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  notes: string | null;
  internal_notes: string | null;
  invite_token: string | null;
  profile_id: string | null;
  created_at: string | null;
}

export async function getClientById(
  organizationId: string,
  id: string
): Promise<ClientDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clients")
    .select(
      "id, full_name, email, phone, document, notes, internal_notes, invite_token, profile_id, created_at"
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data;
}

export interface ClientOption {
  id: string;
  name: string;
}

export async function getClientsForSelect(
  organizationId: string
): Promise<ClientOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("organization_id", organizationId)
    .order("full_name", { ascending: true });
  return (data ?? []).map((c) => ({ id: c.id, name: c.full_name }));
}
