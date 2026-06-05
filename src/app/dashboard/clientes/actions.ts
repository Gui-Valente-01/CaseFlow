"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getSupabaseAdmin,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { isLegalStaff } from "@/lib/permissions";
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from "@/lib/supabase-server";
import { recordAudit } from "@/lib/audit";
import { isValidDocument, onlyDigits } from "@/lib/document";

export interface ClientFormState {
  error?: string;
}

const MIN_PASSWORD = 8;

function field(formData: FormData, name: string): string {
  return ((formData.get(name) as string | null) ?? "").trim();
}

export async function createClientAction(
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessão expirada." };
  if (!isLegalStaff(profile)) return { error: "Acesso restrito ao escritório." };

  const full_name = field(formData, "full_name");
  if (!full_name) return { error: "Informe o nome do cliente." };

  let email = field(formData, "email").toLowerCase();
  const documentRaw = field(formData, "document");
  const password = field(formData, "password");

  let profileId: string | null = null;
  let linkedExisting = false;

  // 1) Se o CPF/CNPJ já tem conta em OUTRO escritório, reaproveita ela.
  //    Assim a mesma pessoa pode ser cliente de vários advogados com um
  //    único login, e o e-mail não conflita.
  if (isValidDocument(documentRaw)) {
    const existing = await findExistingClientAccountByDocument(
      onlyDigits(documentRaw)
    );
    if (existing) {
      profileId = existing.profileId;
      linkedExisting = true;
      // Usa o e-mail da conta existente (login é compartilhado).
      if (existing.email) email = existing.email;
    }
  }

  // 2) Sem conta existente: se o advogado definiu senha, provisiona uma
  //    conta nova. (Se vinculou a existente, ignora a senha — a pessoa já
  //    tem a dela.)
  if (!linkedExisting && password) {
    if (password.length < MIN_PASSWORD) {
      return {
        error: `A senha precisa ter no mínimo ${MIN_PASSWORD} caracteres.`,
      };
    }
    if (!email) {
      return { error: "Para definir senha, informe o e-mail do cliente." };
    }
    if (!isValidDocument(documentRaw)) {
      return {
        error:
          "CPF/CNPJ inválido. Confira o número antes de definir a senha — é o login do cliente.",
      };
    }
    const provisioned = await provisionClientAuth({
      organizationId: profile.organization_id,
      fullName: full_name,
      email,
      password,
    });
    if (!provisioned.ok) return { error: provisioned.error };
    profileId = provisioned.userId;
  }

  const supabase = await createSupabaseServerClient();
  const { data: inserted, error } = await supabase
    .from("clients")
    .insert({
      organization_id: profile.organization_id,
      lawyer_id: profile.id,
      profile_id: profileId,
      full_name,
      email: email || null,
      phone: field(formData, "phone") || null,
      document: documentRaw || null,
      notes: field(formData, "notes") || null,
      internal_notes: field(formData, "internal_notes") || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await recordAudit({
    organizationId: profile.organization_id,
    actorId: profile.id,
    actorName: profile.full_name,
    action: "client.created",
    entityType: "client",
    entityId: inserted.id,
    entityLabel: full_name,
    metadata: { has_access: Boolean(profileId), linked_existing: linkedExisting },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clientes");
  redirect(
    `/dashboard/clientes?flash=${linkedExisting ? "client_linked" : "client_created"}`
  );
}

export async function updateClientAction(
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessão expirada." };
  if (!isLegalStaff(profile)) return { error: "Acesso restrito ao escritório." };

  const id = field(formData, "id");
  const full_name = field(formData, "full_name");
  if (!id) return { error: "Cliente não identificado." };
  if (!full_name) return { error: "Informe o nome do cliente." };

  const email = field(formData, "email").toLowerCase();
  const documentRaw = field(formData, "document");
  const password = field(formData, "password");

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("clients")
    .select("id, profile_id")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();

  if (!existing) {
    return { error: "Cliente não encontrado neste escritório." };
  }

  let profileId = existing.profile_id as string | null;

  if (password) {
    if (password.length < MIN_PASSWORD) {
      return {
        error: `A senha precisa ter no mínimo ${MIN_PASSWORD} caracteres.`,
      };
    }
    if (!email) {
      return { error: "Para definir senha, informe o e-mail do cliente." };
    }
    if (!isValidDocument(documentRaw)) {
      return {
        error:
          "CPF/CNPJ inválido. Confira o número antes de definir a senha — é o login do cliente.",
      };
    }

    if (profileId) {
      // Já tem conta — só troca a senha (e atualiza o e-mail se mudou).
      const reset = await resetClientPassword({
        userId: profileId,
        email,
        password,
      });
      if (!reset.ok) return { error: reset.error };
    } else {
      // Ainda não tem conta — provisiona agora.
      const provisioned = await provisionClientAuth({
        organizationId: profile.organization_id,
        fullName: full_name,
        email,
        password,
      });
      if (!provisioned.ok) return { error: provisioned.error };
      profileId = provisioned.userId;
    }
  }

  const { error } = await supabase
    .from("clients")
    .update({
      full_name,
      email: email || null,
      phone: field(formData, "phone") || null,
      document: documentRaw || null,
      notes: field(formData, "notes") || null,
      internal_notes: field(formData, "internal_notes") || null,
      profile_id: profileId,
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };

  await recordAudit({
    organizationId: profile.organization_id,
    actorId: profile.id,
    actorName: profile.full_name,
    action: "client.updated",
    entityType: "client",
    entityId: id,
    entityLabel: full_name,
    metadata: password ? { changed_password: true } : null,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clientes");
  revalidatePath(`/dashboard/clientes/${id}`);
  redirect(`/dashboard/clientes/${id}?flash=client_updated`);
}

export async function deleteClientAction(formData: FormData): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");

  const id = field(formData, "id");
  if (!id) return;

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("clients")
    .select("full_name")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();

  await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  await recordAudit({
    organizationId: profile.organization_id,
    actorId: profile.id,
    actorName: profile.full_name,
    action: "client.deleted",
    entityType: "client",
    entityId: id,
    entityLabel: existing?.full_name ?? null,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clientes");
  redirect("/dashboard/clientes?flash=client_deleted");
}

// =====================================================================
// Cliente compartilhado entre escritórios
// =====================================================================

/**
 * Procura, em QUALQUER escritório, uma conta de cliente já existente com
 * o mesmo CPF/CNPJ. Se achar, devolve o profile + e-mail dessa conta —
 * assim um segundo advogado vincula o MESMO cliente em vez de criar uma
 * conta duplicada (o que travaria pelo e-mail único do Auth).
 *
 * Usa service role pra enxergar além da própria organização.
 */
async function findExistingClientAccountByDocument(
  documentDigits: string
): Promise<{ profileId: string; email: string | null; fullName: string } | null> {
  if (documentDigits.length < 11) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: rows } = await admin
    .from("clients")
    .select("profile_id, email, full_name, document")
    .not("profile_id", "is", null)
    .not("document", "is", null);

  const match = (rows ?? []).find(
    (c) => onlyDigits((c.document as string | null) ?? "") === documentDigits
  );
  if (!match || !match.profile_id) return null;

  // Pega o e-mail real da conta (fonte da verdade no profile).
  const { data: prof } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", match.profile_id)
    .maybeSingle();

  return {
    profileId: match.profile_id as string,
    email:
      (prof?.email as string | null) ?? (match.email as string | null) ?? null,
    fullName:
      (prof?.full_name as string | null) ??
      (match.full_name as string | null) ??
      "",
  };
}

// =====================================================================
// Provisionamento de acesso do cliente via Supabase Auth admin
// =====================================================================

async function provisionClientAuth(input: {
  organizationId: string;
  fullName: string;
  email: string;
  password: string;
}): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      error:
        "Acesso administrativo do Supabase não configurado. Veja docs/SUPABASE_ADMIN_AUTH.md.",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      error: "Não foi possível liberar o acesso do cliente agora. Tente novamente.",
    };
  }

  // 1) Cria o usuário no Auth com e-mail já confirmado. O trigger
  //    handle_new_user vai criar uma organization + profile "fantasma".
  const created = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      role: "client",
      org_kind: "solo",
      organization_name: `Cliente ${input.fullName}`,
    },
  });

  if (created.error || !created.data.user) {
    const msg = created.error?.message.toLowerCase() ?? "";
    if (msg.includes("registered") || msg.includes("exists")) {
      return {
        ok: false,
        error:
          "Já existe uma conta com este e-mail. Use outro e-mail ou redefina a senha pelo painel.",
      };
    }
    if (msg.includes("password")) {
      return { ok: false, error: "Senha não aceita. Tente uma mais forte." };
    }
    return {
      ok: false,
      error: created.error?.message ?? "Falha ao criar a conta do cliente.",
    };
  }

  const userId = created.data.user.id;

  const supabase = await createSupabaseServerClient();

  // 2) Move o profile criado pelo trigger para a organização do escritório
  //    e força a role 'client'.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, organization_id")
    .eq("id", userId)
    .maybeSingle();

  const ghostOrgId = profile?.organization_id ?? null;

  if (profile) {
    const { error: pUpd } = await supabase
      .from("profiles")
      .update({
        organization_id: input.organizationId,
        role: "client",
        full_name: input.fullName,
        email: input.email,
      })
      .eq("id", userId);
    if (pUpd) return { ok: false, error: pUpd.message };

    // 3) Limpa a org fantasma criada pelo trigger.
    if (ghostOrgId && ghostOrgId !== input.organizationId) {
      await supabase.from("organizations").delete().eq("id", ghostOrgId);
    }
  } else {
    // O trigger pode estar desligado. Cria o profile na mão.
    const { error } = await supabase.from("profiles").insert({
      id: userId,
      organization_id: input.organizationId,
      role: "client",
      full_name: input.fullName,
      email: input.email,
    });
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true, userId };
}

async function resetClientPassword(input: {
  userId: string;
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      error:
        "Acesso administrativo do Supabase não configurado. Veja docs/SUPABASE_ADMIN_AUTH.md.",
    };
  }
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      error: "Não foi possível liberar o acesso do cliente agora. Tente novamente.",
    };
  }

  const { error } = await admin.auth.admin.updateUserById(input.userId, {
    password: input.password,
    email: input.email,
    email_confirm: true,
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("password"))
      return { ok: false, error: "Senha não aceita. Tente uma mais forte." };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
