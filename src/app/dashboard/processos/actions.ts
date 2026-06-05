"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/audit";
import { getTemplateById } from "@/lib/case-templates";
import {
  emailCaseUpdate,
  emailDocumentReviewed,
  sendEmail,
} from "@/lib/email";
import { isLegalStaff } from "@/lib/permissions";
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from "@/lib/supabase-server";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

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

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  // Se veio de um template, cria documentos pendentes + tarefas sugeridas.
  const templateId = field(formData, "template_id");
  if (templateId) {
    const tpl = getTemplateById(templateId);
    if (tpl) {
      // Documentos: cada um vira solicitação pendente.
      if (tpl.suggestedDocuments.length > 0) {
        await supabase.from("documents").insert(
          tpl.suggestedDocuments.map((name) => ({
            case_id: data.id,
            uploaded_by: profile.id,
            name,
            storage_path: `pending/${data.id}/${crypto.randomUUID()}`,
            status: "pending",
          }))
        );
      }

      // Tarefas: due_at relativo a hoje
      if (tpl.suggestedTasks.length > 0) {
        const now = Date.now();
        const tasksToInsert = tpl.suggestedTasks.map((t) => ({
          organization_id: profile.organization_id,
          case_id: data.id,
          created_by: profile.id,
          title: t.title,
          status: "pending" as const,
          priority: "medium",
          due_at: new Date(now + t.dueInDays * 86_400_000).toISOString(),
        }));
        await supabase.from("case_tasks").insert(tasksToInsert);
      }
    }
  }

  await recordAudit({
    organizationId: profile.organization_id,
    actorId: profile.id,
    actorName: profile.full_name,
    action: "case.created",
    entityType: "case",
    entityId: data.id,
    entityLabel: title,
    metadata: { status, client_id, template: templateId || null },
  });

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

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  await recordAudit({
    organizationId: profile.organization_id,
    actorId: profile.id,
    actorName: profile.full_name,
    action: "case.updated",
    entityType: "case",
    entityId: id,
    entityLabel: title,
    metadata: { status },
  });

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
  const { data: existing } = await supabase
    .from("cases")
    .select("title")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();

  await supabase
    .from("cases")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  await recordAudit({
    organizationId: profile.organization_id,
    actorId: profile.id,
    actorName: profile.full_name,
    action: "case.deleted",
    entityType: "case",
    entityId: id,
    entityLabel: existing?.title ?? null,
  });

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

  await recordAudit({
    organizationId: profile.organization_id,
    actorId: profile.id,
    actorName: profile.full_name,
    action: "case_update.created",
    entityType: "case",
    entityId: caseId,
    entityLabel: title,
  });

  // Notifica cliente por e-mail (silencioso se Resend não configurado)
  void notifyClientOfCaseUpdate(caseId, title, description, profile.organization_id);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/processos/${caseId}`);
}

async function notifyClientOfCaseUpdate(
  caseId: string,
  updateTitle: string,
  updateBody: string,
  organizationId: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: caseRow } = await supabase
    .from("cases")
    .select("title, clients(full_name, email, profile_id)")
    .eq("id", caseId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!caseRow) return;
  const client = (Array.isArray(caseRow.clients) ? caseRow.clients[0] : caseRow.clients) as
    | { full_name?: string; email?: string; profile_id?: string | null }
    | undefined;
  if (!client?.email || !client.profile_id) return;

  const { subject, html, text } = emailCaseUpdate({
    clientFirstName: (client.full_name ?? "").split(/\s+/)[0] ?? "cliente",
    updateTitle,
    updateBody: updateBody || undefined,
    caseTitle: caseRow.title,
    portalUrl: `${siteUrl()}/cliente`,
  });
  void sendEmail({ to: client.email, subject, html, text });
}

export async function createDocumentRequestAction(
  formData: FormData
): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");

  const caseId = field(formData, "case_id");
  const name = field(formData, "name");
  const instructions = field(formData, "instructions");

  if (!caseId || !name) return;
  if (!(await canAccessCase(caseId, profile.organization_id))) return;

  const supabase = await createSupabaseServerClient();
  await supabase.from("documents").insert({
    case_id: caseId,
    uploaded_by: profile.id,
    name,
    instructions: instructions || null,
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

  // Snapshot pra usar no audit + e-mail (precisa do nome do documento e
  // do cliente antes do update).
  const { data: snap } = await supabase
    .from("documents")
    .select("name, cases(title, clients(full_name, email, profile_id))")
    .eq("id", documentId)
    .maybeSingle();
  await supabase
    .from("documents")
    .update({
      status: next,
      rejection_reason: next === "rejected" ? rejectionReason : null,
    })
    .eq("id", documentId)
    .eq("case_id", caseId);

  const actionKey =
    next === "approved"
      ? "document.approved"
      : next === "rejected"
        ? "document.rejected"
        : "document.reopened";

  await recordAudit({
    organizationId: profile.organization_id,
    actorId: profile.id,
    actorName: profile.full_name,
    action: actionKey,
    entityType: "document",
    entityId: documentId,
    entityLabel: snap?.name ?? null,
    metadata: next === "rejected" ? { reason: rejectionReason } : null,
  });

  // Notifica cliente (silencioso se Resend não configurado ou cliente sem e-mail)
  if (next === "approved" || next === "rejected") {
    const caseData = (Array.isArray(snap?.cases) ? snap?.cases[0] : snap?.cases) as
      | {
          title?: string;
          clients?:
            | { full_name?: string; email?: string; profile_id?: string | null }
            | { full_name?: string; email?: string; profile_id?: string | null }[];
        }
      | undefined;
    const client = (Array.isArray(caseData?.clients) ? caseData?.clients[0] : caseData?.clients) as
      | { full_name?: string; email?: string; profile_id?: string | null }
      | undefined;
    if (client?.email && client.profile_id && snap?.name) {
      const { subject, html, text } = emailDocumentReviewed({
        clientFirstName: (client.full_name ?? "").split(/\s+/)[0] ?? "cliente",
        documentName: snap.name,
        approved: next === "approved",
        reason: next === "rejected" ? rejectionReason : undefined,
        portalUrl: `${siteUrl()}/cliente`,
      });
      void sendEmail({ to: client.email, subject, html, text });
    }
  }

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

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

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
  const attachmentPath = field(formData, "attachment_path");
  const attachmentName = field(formData, "attachment_name");
  const attachmentMime = field(formData, "attachment_mime");
  const attachmentSizeRaw = field(formData, "attachment_size");
  const attachmentSize = attachmentSizeRaw ? Number(attachmentSizeRaw) : null;

  // Mensagem precisa ter texto OU anexo — não rejeita mensagem só com anexo.
  if (!caseId || (!body && !attachmentPath)) return;
  if (body.length > 1200) return;
  if (!(await canAccessCase(caseId, profile.organization_id))) return;
  if (
    attachmentPath &&
    !attachmentPath.startsWith(`${profile.organization_id}/${caseId}/messages/`)
  ) {
    // Defensivo: rejeita path montado fora do escopo permitido.
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase.from("messages").insert({
    case_id: caseId,
    sender_id: profile.id,
    body: body || "",
    attachment_path: attachmentPath || null,
    attachment_name: attachmentName || null,
    attachment_mime: attachmentMime || null,
    attachment_size: attachmentSize,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/processos/${caseId}`);
  revalidatePath("/cliente");
}
