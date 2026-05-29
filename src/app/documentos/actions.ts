"use server";

import { isClient, isLegalStaff } from "@/lib/permissions";
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from "@/lib/supabase-server";

const BUCKET = "documents";

export async function createDocumentDownloadUrlAction(
  documentId: string
): Promise<{ url?: string; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessão expirada." };

  const supabase = await createSupabaseServerClient();
  const { data: document } = await supabase
    .from("documents")
    .select("id, case_id, storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (!document || !document.storage_path?.trim()) {
    return { error: "Documento não encontrado." };
  }

  if (document.storage_path.startsWith("pending/")) {
    return { error: "Este documento ainda não possui arquivo enviado." };
  }

  const canAccess = isLegalStaff(profile)
    ? await legalStaffCanAccessCase(document.case_id, profile.organization_id)
    : isClient(profile)
      ? await clientCanAccessCase(document.case_id, profile.id)
      : false;

  if (!canAccess) return { error: "Você não tem acesso a este documento." };

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(document.storage_path, 60);

  if (error || !data?.signedUrl) {
    return { error: "Não foi possível gerar o link." };
  }

  return { url: data.signedUrl };
}

/**
 * Versão da signed URL para anexos de mensagem do chat. O attachment não
 * vive em `documents` mas em `messages.attachment_path`. Validamos a
 * permissão usando o `case_id` da mensagem.
 */
export async function createMessageAttachmentUrlAction(
  messageId: string
): Promise<{ url?: string; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessão expirada." };

  const supabase = await createSupabaseServerClient();
  // Cast tático: `attachment_path` virá dos tipos após v8 + gen:types.
  const { data: rawMessage } = await supabase
    .from("messages")
    .select("id, case_id, attachment_path")
    .eq("id", messageId)
    .maybeSingle();
  const message = rawMessage as {
    id: string;
    case_id: string;
    attachment_path: string | null;
  } | null;

  if (!message || !message.attachment_path?.trim()) {
    return { error: "Anexo não encontrado." };
  }

  const canAccess = isLegalStaff(profile)
    ? await legalStaffCanAccessCase(message.case_id, profile.organization_id)
    : isClient(profile)
      ? await clientCanAccessCase(message.case_id, profile.id)
      : false;

  if (!canAccess) return { error: "Você não tem acesso a este anexo." };

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(message.attachment_path, 60);

  if (error || !data?.signedUrl) {
    return { error: "Não foi possível gerar o link." };
  }

  return { url: data.signedUrl };
}

async function legalStaffCanAccessCase(
  caseId: string,
  organizationId: string
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  return Boolean(data);
}

async function clientCanAccessCase(
  caseId: string,
  profileId: string
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cases")
    .select("id, clients!inner(profile_id)")
    .eq("id", caseId)
    .eq("clients.profile_id", profileId)
    .maybeSingle();

  return Boolean(data);
}
