/**
 * Helper de auditoria. Server-side only.
 *
 * O log é melhor esforço — falhas em escrever no audit_log nunca
 * derrubam a Server Action que disparou (try/catch silencioso).
 */

import { getSupabaseAdmin } from "./supabase-admin";
import { createSupabaseServerClient, untyped } from "./supabase-server";

export interface AuditInput {
  organizationId: string;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  entityLabel?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface PrivacyAuditInput {
  organizationId: string;
  organizationName?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  action: "data.exported" | "account.deleted";
  scope: "personal" | "organization";
  metadata?: Record<string, unknown> | null;
}

/**
 * Registra uma ação no audit_log. Não lança em caso de erro.
 *
 * Convenção para `action`:
 *   client.created  client.updated  client.deleted
 *   case.created    case.updated    case.deleted
 *   document.requested  document.uploaded  document.approved  document.rejected
 *   case_update.created
 *   invitation.sent  invitation.accepted  invitation.revoked
 *   org.updated     account.updated      mfa.enrolled  mfa.disabled
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const supabase = getSupabaseAdmin() ?? (await createSupabaseServerClient());
    // audit_log entra nos tipos após v9 + gen:types.
    await untyped(supabase).from("audit_log").insert({
      organization_id: input.organizationId,
      actor_id: input.actorId ?? null,
      actor_name: input.actorName ?? null,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      entity_label: input.entityLabel ?? null,
      metadata: input.metadata ?? null,
    });
  } catch {
    // Best-effort: nunca falha o fluxo principal.
  }
}

/**
 * Registra eventos LGPD em uma tabela sem FK/cascade para a organizacao.
 * Assim o rastro de exportacao/exclusao sobrevive mesmo apos apagar a org.
 */
export async function recordPrivacyAudit(
  input: PrivacyAuditInput
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    await untyped(supabase).from("privacy_audit_log").insert({
      organization_id: input.organizationId,
      organization_name: input.organizationName ?? null,
      actor_id: input.actorId ?? null,
      actor_email: input.actorEmail ?? null,
      actor_name: input.actorName ?? null,
      action: input.action,
      scope: input.scope,
      metadata: input.metadata ?? null,
    });
  } catch {
    // Best-effort: nao bloqueia exportacao/exclusao por falha no log.
  }
}

// =====================================================================
// Tradução do `action` pra texto humano (usado na página de auditoria)
// =====================================================================

const ACTION_LABEL: Record<string, string> = {
  "client.created": "Cliente cadastrado",
  "client.updated": "Cliente atualizado",
  "client.deleted": "Cliente removido",
  "case.created": "Processo cadastrado",
  "case.updated": "Processo atualizado",
  "case.deleted": "Processo removido",
  "case_update.created": "Atualização registrada na linha do tempo",
  "document.requested": "Documento solicitado ao cliente",
  "document.uploaded": "Documento anexado pelo advogado",
  "document.approved": "Documento aprovado",
  "document.rejected": "Documento rejeitado",
  "document.reopened": "Documento reaberto para novo envio",
  "invitation.sent": "Convite enviado",
  "invitation.accepted": "Convite aceito",
  "invitation.revoked": "Convite revogado",
  "org.updated": "Dados do escritório atualizados",
  "account.updated": "Dados pessoais atualizados",
  "account.deleted": "Conta e escritório excluídos",
  "data.exported": "Dados exportados",
  "mfa.enrolled": "2FA ativado",
  "mfa.disabled": "2FA desativado",
  "private_notes.updated": "Anotações internas atualizadas",
  "billing.manual_payment": "Pagamento manual registrado",
  "billing.checkout_started": "Checkout Stripe iniciado",
  "billing.trial_extended": "Teste grátis configurado",
  "billing.past_due": "Plano marcado como pendente",
  "billing.access_blocked": "Acesso bloqueado por assinatura",
};

export function translateAuditAction(action: string): string {
  return ACTION_LABEL[action] ?? action;
}
