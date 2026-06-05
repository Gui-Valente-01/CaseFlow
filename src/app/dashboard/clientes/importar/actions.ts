"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { isLegalStaff } from "@/lib/permissions";
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from "@/lib/supabase-server";

export interface ImportPayload {
  rows: Array<{
    full_name: string;
    email?: string | null;
    phone?: string | null;
    document?: string | null;
    notes?: string | null;
    internal_notes?: string | null;
  }>;
}

export interface ImportResult {
  ok: boolean;
  error?: string;
  inserted?: number;
}

const MAX_BATCH = 500;

/**
 * Insere os clientes em lote. Apenas dados básicos — provisionamento de
 * senha não é feito por importação (cada um precisa de validação manual).
 */
export async function bulkImportClientsAction(
  payload: ImportPayload
): Promise<ImportResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sessão expirada." };
  if (!isLegalStaff(profile)) {
    return { ok: false, error: "Acesso restrito ao escritório." };
  }
  if (!Array.isArray(payload?.rows) || payload.rows.length === 0) {
    return { ok: false, error: "Nenhum cliente para importar." };
  }
  if (payload.rows.length > MAX_BATCH) {
    return {
      ok: false,
      error: `Limite de ${MAX_BATCH} linhas por importação. Quebre o arquivo em partes.`,
    };
  }

  const supabase = await createSupabaseServerClient();
  const toInsert = payload.rows
    .map((r) => ({
      organization_id: profile.organization_id,
      lawyer_id: profile.id,
      full_name: r.full_name?.trim() || "",
      email: r.email?.trim() || null,
      phone: r.phone?.trim() || null,
      document: r.document?.trim() || null,
      notes: r.notes?.trim() || null,
      internal_notes: r.internal_notes?.trim() || null,
    }))
    .filter((r) => r.full_name);

  if (toInsert.length === 0) {
    return { ok: false, error: "Todas as linhas estavam sem nome." };
  }

  const { error } = await supabase.from("clients").insert(toInsert);
  if (error) {
    return { ok: false, error: "Não foi possível importar os clientes. Tente novamente." };
  }

  await recordAudit({
    organizationId: profile.organization_id,
    actorId: profile.id,
    actorName: profile.full_name,
    action: "client.created",
    entityType: "client",
    entityLabel: `${toInsert.length} clientes via CSV`,
    metadata: { source: "csv_import", count: toInsert.length },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clientes");
  return { ok: true, inserted: toInsert.length };
}
