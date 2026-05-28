"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isClient } from "@/lib/permissions";
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from "@/lib/supabase-server";

function field(formData: FormData, name: string): string {
  return ((formData.get(name) as string | null) ?? "").trim();
}

async function canClientAccessCase(caseId: string, profileId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cases")
    .select("id, clients!inner(profile_id)")
    .eq("id", caseId)
    .eq("clients.profile_id", profileId)
    .maybeSingle();

  return Boolean(data);
}

/**
 * Confirma upload de um documento pendente:
 *   - atualiza o registro em `documents` com o storage_path real
 *   - troca status pra 'received'
 *
 * O upload em si já aconteceu no browser via supabase.storage.upload.
 */
export async function recordClientUploadAction(
  formData: FormData
): Promise<{ error?: string } | void> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessão expirada." };
  if (!isClient(profile)) {
    return { error: "Apenas clientes podem enviar arquivos por aqui." };
  }

  const documentId = field(formData, "document_id");
  const caseId = field(formData, "case_id");
  const storagePath = field(formData, "storage_path");

  if (!documentId || !caseId || !storagePath) {
    return { error: "Dados incompletos do upload." };
  }
  if (!(await canClientAccessCase(caseId, profile.id))) {
    return { error: "Você não tem acesso a este processo." };
  }
  if (!storagePath.startsWith(`${profile.organization_id}/${caseId}/`)) {
    return { error: "Arquivo enviado fora do escopo permitido." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("documents")
    .update({
      status: "received",
      storage_path: storagePath,
      uploaded_by: profile.id,
      rejection_reason: null,
    })
    .eq("id", documentId)
    .eq("case_id", caseId);

  if (error) return { error: error.message };

  revalidatePath("/cliente");
}

export async function createClientMessageAction(
  formData: FormData
): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isClient(profile)) redirect("/dashboard");

  const caseId = field(formData, "case_id");
  const body = field(formData, "body");

  if (!caseId || !body) return;
  if (body.length > 1200) return;
  if (!(await canClientAccessCase(caseId, profile.id))) return;

  const supabase = await createSupabaseServerClient();
  await supabase.from("messages").insert({
    case_id: caseId,
    sender_id: profile.id,
    body,
  });

  revalidatePath("/cliente");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/processos/${caseId}`);
}
