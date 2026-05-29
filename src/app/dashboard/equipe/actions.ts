"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/audit";
import { emailInvitation, sendEmail } from "@/lib/email";
import { isLegalStaff } from "@/lib/permissions";
import {
  createSupabaseServerClient,
  getCurrentProfile,
  untyped,
} from "@/lib/supabase-server";

export interface InviteFormState {
  error?: string;
  success?: boolean;
}

function field(formData: FormData, name: string): string {
  return ((formData.get(name) as string | null) ?? "").trim();
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

const ALLOWED_ROLES = new Set(["owner", "lawyer"]);

/** Só o owner pode convidar / remover membros. */
function isOwner(profile: { role: string } | null): boolean {
  return profile?.role === "owner";
}

/**
 * Cria um convite na tabela `invitations` e envia o e-mail (se Resend
 * estiver configurado). Não duplica convite ativo pro mesmo e-mail.
 */
export async function inviteLawyerAction(
  _prev: InviteFormState,
  formData: FormData
): Promise<InviteFormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessão expirada." };
  if (!isLegalStaff(profile)) {
    return { error: "Acesso restrito ao escritório." };
  }
  if (!isOwner(profile)) {
    return { error: "Apenas o dono do escritório pode convidar membros." };
  }

  const email = field(formData, "email").toLowerCase();
  const role = field(formData, "role") || "lawyer";

  if (!email || !email.includes("@")) {
    return { error: "Informe um e-mail válido." };
  }
  if (!ALLOWED_ROLES.has(role)) {
    return { error: "Papel inválido." };
  }

  // Não convidar quem já é membro
  const supabase = await createSupabaseServerClient();
  const { data: existingMember } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("email", email)
    .maybeSingle();
  if (existingMember) {
    return { error: "Esta pessoa já é membro do escritório." };
  }

  const { data: invitation, error } = await untyped(supabase)
    .from("invitations")
    .insert({
      organization_id: profile.organization_id,
      email,
      role,
      invited_by: profile.id,
    })
    .select("id, token")
    .single();

  if (error) {
    // Provável: índice único de convite ativo já existe
    if (error.message.includes("invitations_org_email_active_uniq")) {
      return {
        error: "Já existe um convite ativo para este e-mail.",
      };
    }
    return { error: error.message };
  }

  await recordAudit({
    organizationId: profile.organization_id,
    actorId: profile.id,
    actorName: profile.full_name,
    action: "invitation.sent",
    entityType: "invitation",
    entityId: invitation.id,
    entityLabel: email,
    metadata: { role },
  });

  // Busca nome da org pro template
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", profile.organization_id)
    .maybeSingle();

  const acceptUrl = `${siteUrl()}/aceitar-convite/${invitation.token}`;
  const { subject, html, text } = emailInvitation({
    inviterName: profile.full_name,
    organizationName: org?.name ?? "Escritório",
    acceptUrl,
  });
  void sendEmail({ to: email, subject, html, text });

  revalidatePath("/dashboard/equipe");
  return { success: true };
}

/** Revoga um convite ainda não aceito. */
export async function revokeInvitationAction(formData: FormData): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");
  if (!isOwner(profile)) return;

  const id = field(formData, "id");
  if (!id) return;

  const supabase = await createSupabaseServerClient();
  const { data: invitation } = await untyped(supabase)
    .from("invitations")
    .select("email")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .is("accepted_at", null)
    .maybeSingle();

  await untyped(supabase)
    .from("invitations")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .is("accepted_at", null);

  await recordAudit({
    organizationId: profile.organization_id,
    actorId: profile.id,
    actorName: profile.full_name,
    action: "invitation.revoked",
    entityType: "invitation",
    entityId: id,
    entityLabel: invitation?.email ?? null,
  });

  revalidatePath("/dashboard/equipe");
}

/** Remove um membro da equipe (não apaga a conta no Auth, só desvincula). */
export async function removeMemberAction(formData: FormData): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");
  if (!isOwner(profile)) return;

  const memberId = field(formData, "id");
  if (!memberId) return;
  if (memberId === profile.id) return; // Não dá pra remover a si mesmo

  const supabase = await createSupabaseServerClient();
  const { data: member } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", memberId)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();
  if (!member || member.role === "owner") return;

  // Move o profile pra uma org temporária? Simples: marca role como
  // 'client' e remove a organization_id... mas isso quebra integridade.
  // Solução enxuta: marca role como 'client' (deixa de aparecer na
  // listagem de staff e perde acesso ao dashboard).
  await supabase
    .from("profiles")
    .update({ role: "client" })
    .eq("id", memberId)
    .eq("organization_id", profile.organization_id);

  await recordAudit({
    organizationId: profile.organization_id,
    actorId: profile.id,
    actorName: profile.full_name,
    action: "member.removed",
    entityType: "profile",
    entityId: memberId,
    entityLabel: member.full_name ?? null,
  });

  revalidatePath("/dashboard/equipe");
}
