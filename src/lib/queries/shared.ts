// =====================================================================
// Helpers compartilhados entre os módulos de queries
// =====================================================================

const CASE_STATUS_LABEL: Record<string, string> = {
  active: "Em andamento",
  on_hold: "Aguardando",
  closed: "Encerrado",
  archived: "Arquivado",
};

export function translateCaseStatus(raw: string | null | undefined): string {
  if (!raw) return "—";
  return CASE_STATUS_LABEL[raw] ?? raw;
}

/**
 * Relações do PostgREST chegam como objeto OU array de um item, dependendo
 * da cardinalidade inferida. Estes extratores normalizam os dois formatos.
 */
export function extractClientName(field: unknown): string {
  if (!field) return "—";
  if (Array.isArray(field))
    return (field[0] as { full_name?: string })?.full_name ?? "—";
  return (field as { full_name?: string }).full_name ?? "—";
}

export function extractClientHasAccess(field: unknown): boolean {
  if (!field) return false;
  if (Array.isArray(field)) {
    return Boolean((field[0] as { profile_id?: string | null } | undefined)?.profile_id);
  }
  return Boolean((field as { profile_id?: string | null }).profile_id);
}

export function extractProfileName(field: unknown): string {
  return extractProfile(field).full_name;
}

export function extractProfile(field: unknown): { full_name: string; role: string } {
  if (!field) return { full_name: "Sistema", role: "system" };
  if (Array.isArray(field)) {
    const first = field[0] as { full_name?: string; role?: string } | undefined;
    return {
      full_name: first?.full_name ?? "Sistema",
      role: first?.role ?? "system",
    };
  }
  const profile = field as { full_name?: string; role?: string };
  return {
    full_name: profile.full_name ?? "Sistema",
    role: profile.role ?? "system",
  };
}
