"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isLegalStaff } from "@/lib/permissions";
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from "@/lib/supabase-server";

export interface CaseFormState {
  error?: string;
}

function field(formData: FormData, name: string): string {
  return ((formData.get(name) as string | null) ?? "").trim();
}

const ALLOWED_STATUS = new Set(["active", "on_hold", "closed", "archived"]);

async function clientBelongsToOrganization(
  clientId: string,
  organizationId: string
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  return Boolean(data);
}

export async function createCaseAction(
  _prev: CaseFormState,
  formData: FormData
): Promise<CaseFormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessão expirada." };
  if (!isLegalStaff(profile)) return { error: "Acesso restrito ao escritório." };

  const title = field(formData, "title");
  const client_id = field(formData, "client_id");
  const status = field(formData, "status") || "active";

  if (!title) return { error: "Informe o título do processo." };
  if (!client_id) return { error: "Selecione o cliente." };
  if (!ALLOWED_STATUS.has(status)) return { error: "Status inválido." };
  if (!(await clientBelongsToOrganization(client_id, profile.organization_id))) {
    return { error: "Cliente não pertence a este escritório." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cases")
    .insert({
      organization_id: profile.organization_id,
      client_id,
      lawyer_id: profile.id,
      title,
      case_number: field(formData, "case_number") || null,
      type: field(formData, "type") || null,
      status,
      next_step: field(formData, "next_step") || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/processos");
  revalidatePath("/dashboard/clientes");
  redirect(`/dashboard/processos/${data.id}?flash=case_created`);
}

export async function updateCaseAction(
  _prev: CaseFormState,
  formData: FormData
): Promise<CaseFormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessão expirada." };
  if (!isLegalStaff(profile)) return { error: "Acesso restrito ao escritório." };

  const id = field(formData, "id");
  const title = field(formData, "title");
  const client_id = field(formData, "client_id");
  const status = field(formData, "status") || "active";

  if (!id) return { error: "Processo não identificado." };
  if (!title) return { error: "Informe o título." };
  if (!client_id) return { error: "Selecione o cliente." };
  if (!ALLOWED_STATUS.has(status)) return { error: "Status inválido." };
  if (!(await clientBelongsToOrganization(client_id, profile.organization_id))) {
    return { error: "Cliente não pertence a este escritório." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("cases")
    .update({
      client_id,
      title,
      case_number: field(formData, "case_number") || null,
      type: field(formData, "type") || null,
      status,
      next_step: field(formData, "next_step") || null,
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/processos");
  revalidatePath(`/dashboard/processos/${id}`);
  redirect(`/dashboard/processos/${id}?flash=case_updated`);
}

export async function deleteCaseAction(formData: FormData): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");

  const id = field(formData, "id");
  if (!id) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("cases")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/processos");
  redirect("/dashboard/processos?flash=case_deleted");
}

async function canAccessCase(caseId: string, organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  return Boolean(data);
}

export async function createCaseUpdateAction(formData: FormData): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");

  const caseId = field(formData, "case_id");
  const title = field(formData, "title");
  const description = field(formData, "description");

  if (!caseId || !title) return;
  if (!(await canAccessCase(caseId, profile.organization_id))) return;

  const supabase = await createSupabaseServerClient();
  await supabase.from("case_updates").insert({
    case_id: caseId,
    author_id: profile.id,
    title,
    description: description || null,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/processos/${caseId}`);
}

export async function createDocumentRequestAction(
  formData: FormData
): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");

  const caseId = field(formData, "case_id");
  const name = field(formData, "name");

  if (!caseId || !name) return;
  if (!(await canAccessCase(caseId, profile.organization_id))) return;

  const supabase = await createSupabaseServerClient();
  await supabase.from("documents").insert({
    case_id: caseId,
    uploaded_by: profile.id,
    name,
    storage_path: `pending/${caseId}/${crypto.randomUUID()}`,
    status: "pending",
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/processos/${caseId}`);
}

async function setDocumentStatus(
  formData: FormData,
  next: "approved" | "rejected" | "pending"
): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");

  const caseId = field(formData, "case_id");
  const documentId = field(formData, "document_id");
  const rejectionReason = field(formData, "rejection_reason");
  if (!caseId || !documentId) return;
  if (next === "rejected" && !rejectionReason) return;
  if (!(await canAccessCase(caseId, profile.organization_id))) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("documents")
    .update({
      status: next,
      rejection_reason: next === "rejected" ? rejectionReason : null,
    })
    .eq("id", documentId)
    .eq("case_id", caseId);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/processos/${caseId}`);
  revalidatePath("/cliente");
}

export async function approveDocumentAction(formData: FormData): Promise<void> {
  await setDocumentStatus(formData, "approved");
}

export async function rejectDocumentAction(formData: FormData): Promise<void> {
  await setDocumentStatus(formData, "rejected");
}

export async function reopenDocumentAction(formData: FormData): Promise<void> {
  await setDocumentStatus(formData, "pending");
}

/**
 * Cria um documento "recebido" enviado pelo próprio advogado
 * (peça processual, decisão, contrato, etc.). O upload em si já
 * aconteceu no browser via `supabase.storage.upload`.
 */
export async function createLawyerDocumentAction(
  formData: FormData
): Promise<{ error?: string } | void> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessão expirada." };
  if (!isLegalStaff(profile)) return { error: "Acesso restrito ao escritório." };

  const caseId = field(formData, "case_id");
  const name = field(formData, "name");
  const storagePath = field(formData, "storage_path");
  if (!caseId || !name || !storagePath) {
    return { error: "Dados incompletos do upload." };
  }
  if (!(await canAccessCase(caseId, profile.organization_id))) {
    return { error: "Sem acesso a este processo." };
  }
  if (!storagePath.startsWith(`${profile.organization_id}/${caseId}/`)) {
    return { error: "Arquivo enviado fora do escopo permitido." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("documents").insert({
    case_id: caseId,
    uploaded_by: profile.id,
    name,
    storage_path: storagePath,
    status: "received",
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/processos/${caseId}`);
  revalidatePath("/cliente");
}

/** Atualiza apenas o campo `private_notes` do processo. */
export async function updateCasePrivateNotesAction(
  formData: FormData
): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");

  const caseId = field(formData, "case_id");
  if (!caseId) return;
  if (!(await canAccessCase(caseId, profile.organization_id))) return;

  const notes = field(formData, "private_notes");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("cases")
    .update({ private_notes: notes || null })
    .eq("id", caseId)
    .eq("organization_id", profile.organization_id);

  revalidatePath(`/dashboard/processos/${caseId}`);
}

export async function createCaseMessageAction(formData: FormData): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");

  const caseId = field(formData, "case_id");
  const body = field(formData, "body");

  if (!caseId || !body) return;
  if (body.length > 1200) return;
  if (!(await canAccessCase(caseId, profile.organization_id))) return;

  const supabase = await createSupabaseServerClient();
  await supabase.from("messages").insert({
    case_id: caseId,
    sender_id: profile.id,
    body,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/processos/${caseId}`);
  revalidatePath("/cliente");
}
