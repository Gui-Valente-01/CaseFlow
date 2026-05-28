"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isLegalStaff } from "@/lib/permissions";
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from "@/lib/supabase-server";

function field(formData: FormData, name: string): string {
  return ((formData.get(name) as string | null) ?? "").trim();
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

const TYPES = new Set(["task", "deadline", "hearing", "meeting"]);
const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);

export async function createCaseTaskAction(formData: FormData): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");

  const caseId = field(formData, "case_id");
  const title = field(formData, "title");
  const description = field(formData, "description");
  const dueAt = field(formData, "due_at");
  const type = TYPES.has(field(formData, "type")) ? field(formData, "type") : "task";
  const priority = PRIORITIES.has(field(formData, "priority"))
    ? field(formData, "priority")
    : "normal";

  if (!caseId || !title || !dueAt) return;
  if (!(await canAccessCase(caseId, profile.organization_id))) return;

  const supabase = await createSupabaseServerClient();
  await supabase.from("case_tasks").insert({
    organization_id: profile.organization_id,
    case_id: caseId,
    assigned_to: profile.id,
    created_by: profile.id,
    title,
    description: description || null,
    due_at: new Date(dueAt).toISOString(),
    type,
    priority,
    status: "open",
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/notificacoes");
  revalidatePath(`/dashboard/processos/${caseId}`);
}

export async function completeCaseTaskAction(formData: FormData): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");

  const taskId = field(formData, "task_id");
  const caseId = field(formData, "case_id");
  if (!taskId || !caseId) return;
  if (!(await canAccessCase(caseId, profile.organization_id))) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("case_tasks")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("case_id", caseId)
    .eq("organization_id", profile.organization_id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/notificacoes");
  revalidatePath(`/dashboard/processos/${caseId}`);
}

export async function deleteCaseTaskAction(formData: FormData): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");

  const taskId = field(formData, "task_id");
  const caseId = field(formData, "case_id");
  if (!taskId || !caseId) return;
  if (!(await canAccessCase(caseId, profile.organization_id))) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("case_tasks")
    .delete()
    .eq("id", taskId)
    .eq("case_id", caseId)
    .eq("organization_id", profile.organization_id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/notificacoes");
  revalidatePath(`/dashboard/processos/${caseId}`);
}
