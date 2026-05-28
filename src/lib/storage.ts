/**
 * Helpers de Storage de documentos.
 *
 * Convenção de path: <organization_id>/<case_id>/<timestamp>-<filename>
 *
 * Uso típico (browser):
 *   - cliente seleciona um arquivo no portal
 *   - chamamos uploadDocument(...) que joga direto no bucket "documents"
 *   - chamamos a Server Action correspondente passando o storage_path
 *
 * Para download usamos signed URL (bucket privado) com expiração curta.
 */

import { supabase } from "./supabase";

const BUCKET = "documents";
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export interface UploadResult {
  ok: boolean;
  error?: string;
  storagePath?: string;
}

function sanitize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9.\-_ ]/g, "_")
    .replace(/\s+/g, "_");
}

export async function uploadDocument(params: {
  file: File;
  organizationId: string;
  caseId: string;
}): Promise<UploadResult> {
  const { file, organizationId, caseId } = params;

  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: "Arquivo grande demais (máx. 25 MB)." };
  }

  const path = `${organizationId}/${caseId}/${Date.now()}-${sanitize(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, storagePath: path };
}
