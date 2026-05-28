"use server";

import { revalidatePath } from "next/cache";
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from "@/lib/supabase-server";

export interface AccountState {
  error?: string;
  success?: boolean;
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
