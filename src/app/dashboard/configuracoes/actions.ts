"use server";

import { revalidatePath } from "next/cache";
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from "@/lib/supabase-server";

export interface OrgSettingsState {
  error?: string;
  success?: boolean;
}

function field(formData: FormData, name: string): string {
  return ((formData.get(name) as string | null) ?? "").trim();
}

export async function updateOrganizationAction(
  _prev: OrgSettingsState,
  formData: FormData
): Promise<OrgSettingsState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessão expirada." };
  if (profile.role !== "owner" && profile.role !== "lawyer") {
    return { error: "Apenas o escritório pode editar essas configurações." };
  }

  const name = field(formData, "name");
  if (!name) return { error: "Informe o nome do escritório." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      cnpj: field(formData, "cnpj") || null,
      email: field(formData, "email") || null,
      phone: field(formData, "phone") || null,
      address: field(formData, "address") || null,
      city: field(formData, "city") || null,
      state: field(formData, "state") || null,
      practice_area: field(formData, "practice_area") || null,
    })
    .eq("id", profile.organization_id);

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/configuracoes");
  return { success: true };
}
