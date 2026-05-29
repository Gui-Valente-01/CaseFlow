"use server";

import { recordAudit } from "@/lib/audit";
import {
  getSupabaseAdmin,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { createSupabaseServerClient, untyped } from "@/lib/supabase-server";

export interface AcceptResult {
  ok: boolean;
  error?: string;
  email?: string;
}

const MIN_PASSWORD = 8;

function field(formData: FormData, name: string): string {
  return ((formData.get(name) as string | null) ?? "").trim();
}

/**
 * Aceita um convite criando o usuário no Auth + ajustando o profile
 * pra apontar pra organização do convite. Roda como Server Action sem
 * cookie (anônimo) — usa SERVICE ROLE pra criar conta e atualizar profile.
 */
export async function acceptInvitationAction(
  _prev: AcceptResult,
  formData: FormData
): Promise<AcceptResult> {
  const token = field(formData, "token");
  const fullName = field(formData, "full_name");
  const password = field(formData, "password");

  if (!token) return { ok: false, error: "Convite inválido." };
  if (!fullName) return { ok: false, error: "Informe seu nome completo." };
  if (password.length < MIN_PASSWORD) {
    return {
      ok: false,
      error: `A senha precisa ter no mínimo ${MIN_PASSWORD} caracteres.`,
    };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      error:
        "Acesso administrativo do Supabase não configurado. Avise o suporte.",
    };
  }

  const supabase = await createSupabaseServerClient();

  // Busca o convite — token é único, então maybeSingle.
  const { data: invitation } = await untyped(supabase)
    .from("invitations")
    .select("id, organization_id, email, role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (!invitation) {
    return { ok: false, error: "Convite não encontrado ou já usado." };
  }
  if (invitation.accepted_at) {
    return { ok: false, error: "Este convite já foi aceito." };
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return { ok: false, error: "Este convite expirou." };
  }

  const admin = getSupabaseAdmin()!;
  const created = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: invitation.role,
      organization_name: `Temp ${fullName}`,
      org_kind: "solo",
    },
  });

  if (created.error || !created.data.user) {
    const msg = created.error?.message.toLowerCase() ?? "";
    if (msg.includes("registered") || msg.includes("exists")) {
      return {
        ok: false,
        error:
          "Já existe uma conta com este e-mail. Faça login normalmente — depois entre no painel do escritório.",
      };
    }
    return {
      ok: false,
      error: created.error?.message ?? "Falha ao criar a conta.",
    };
  }

  const userId = created.data.user.id;

  // Move o profile pra organização do convite + role do convite.
  const { data: ghost } = await supabase
    .from("profiles")
    .select("id, organization_id")
    .eq("id", userId)
    .maybeSingle();

  if (ghost) {
    await supabase
      .from("profiles")
      .update({
        organization_id: invitation.organization_id,
        role: invitation.role,
        full_name: fullName,
        email: invitation.email,
      })
      .eq("id", userId);

    if (
      ghost.organization_id &&
      ghost.organization_id !== invitation.organization_id
    ) {
      await supabase.from("organizations").delete().eq("id", ghost.organization_id);
    }
  } else {
    await supabase.from("profiles").insert({
      id: userId,
      organization_id: invitation.organization_id,
      role: invitation.role,
      full_name: fullName,
      email: invitation.email,
    });
  }

  // Marca convite como aceito
  await untyped(supabase)
    .from("invitations")
    .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
    .eq("id", invitation.id);

  await recordAudit({
    organizationId: invitation.organization_id,
    actorId: userId,
    actorName: fullName,
    action: "invitation.accepted",
    entityType: "invitation",
    entityId: invitation.id,
    entityLabel: invitation.email,
    metadata: { role: invitation.role },
  });

  return { ok: true, email: invitation.email };
}
