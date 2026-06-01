"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit, recordPrivacyAudit } from "@/lib/audit";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from "@/lib/supabase-server";

export interface AccountState {
  error?: string;
  success?: boolean;
}

export interface DeleteAccountState {
  error?: string;
}

function field(formData: FormData, name: string): string {
  return ((formData.get(name) as string | null) ?? "").trim();
}

export async function updateAccountAction(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessão expirada." };

  const full_name = field(formData, "full_name");
  if (!full_name) return { error: "Informe seu nome completo." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      phone: field(formData, "phone") || null,
      cpf: field(formData, "cpf") || null,
      oab_number: field(formData, "oab_number") || null,
      oab_state: field(formData, "oab_state") || null,
    })
    .eq("id", profile.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/conta");
  return { success: true };
}

export async function deleteAccountAndOrganizationAction(
  formData: FormData
): Promise<DeleteAccountState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessao expirada." };
  if (profile.role !== "owner") {
    return { error: "Apenas o dono do escritorio pode excluir a conta." };
  }

  const password = (formData.get("password") as string | null) ?? "";
  if (!password) return { error: "Informe sua senha para confirmar." };

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY nao esta configurada. Sem ela nao da para remover o usuario do Auth.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error: passwordError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (passwordError) return { error: "Senha incorreta." };

  const { data: organization } = await admin
    .from("organizations")
    .select("name")
    .eq("id", profile.organization_id)
    .maybeSingle();

  await recordAudit({
    organizationId: profile.organization_id,
    actorId: profile.id,
    actorName: profile.full_name,
    action: "account.deleted",
    entityType: "organization",
    entityId: profile.organization_id,
    metadata: {
      email: profile.email,
      role: profile.role,
    },
  });

  await recordPrivacyAudit({
    organizationId: profile.organization_id,
    organizationName: organization?.name ?? null,
    actorId: profile.id,
    actorEmail: profile.email,
    actorName: profile.full_name,
    action: "account.deleted",
    scope: "organization",
    metadata: {
      email: profile.email,
      role: profile.role,
    },
  });

  const { error: organizationError } = await admin
    .from("organizations")
    .delete()
    .eq("id", profile.organization_id);

  if (organizationError) {
    return { error: organizationError.message };
  }

  const { error: authError } = await admin.auth.admin.deleteUser(profile.id);
  if (authError) {
    return {
      error:
        "O escritorio foi removido, mas houve falha ao excluir o usuario do Auth. Remova manualmente no Supabase.",
    };
  }

  await supabase.auth.signOut();
  redirect("/");
}
