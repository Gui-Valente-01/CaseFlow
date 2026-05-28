import { supabase } from "./supabase";

export type SignupKind = "solo" | "firm";

export interface SignupInput {
  kind: SignupKind;
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
}

export interface SignupResult {
  ok: boolean;
  error?: string;
  hasSession?: boolean;
  needsEmailConfirmation?: boolean;
  userId?: string;
}

/**
 * Cria usuário no Supabase Auth. O trigger handle_new_user() cria
 * automaticamente a organization + profile a partir do metadata.
 */
export async function signUp(input: SignupInput): Promise<SignupResult> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const organizationName = input.organizationName.trim();

  if (!fullName) return { ok: false, error: "Informe seu nome completo." };
  if (!email) return { ok: false, error: "Informe seu e-mail." };
  if (input.password.length < 8) {
    return { ok: false, error: "A senha precisa ter no mínimo 8 caracteres." };
  }
  if (!organizationName) {
    return { ok: false, error: "Informe o nome do escritório." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        full_name: fullName,
        role: "owner",
        org_kind: input.kind,
        organization_name: organizationName,
      },
    },
  });

  if (error) {
    return { ok: false, error: friendlySignupError(error.message) };
  }
  if (!data.user) {
    return { ok: false, error: "Não foi possível criar o usuário." };
  }

  return {
    ok: true,
    hasSession: Boolean(data.session),
    needsEmailConfirmation: !data.session,
    userId: data.user.id,
  };
}

function friendlySignupError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este e-mail já está cadastrado. Tente entrar pelo login.";
  if (m.includes("invalid email")) return "Informe um e-mail válido.";
  if (m.includes("password")) return "A senha não foi aceita. Use uma mais forte.";
  if (m.includes("rate")) return "Muitas tentativas. Aguarde um minuto.";
  return message;
}

export function friendlyLoginError(message?: string): string {
  if (!message) return "Não foi possível entrar. Tente novamente.";
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("too many")) return "Muitas tentativas. Aguarde um minuto.";
  return message;
}
