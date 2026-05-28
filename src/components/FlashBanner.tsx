/**
 * Banner de sucesso lido a partir de `?flash=...` no searchParams.
 *
 * Uso típico em uma página Server Component:
 *
 *   <FlashBanner flash={searchParams.flash} />
 *
 * Server Actions devolvem o usuário com `redirect("/foo?flash=created")`.
 * O banner aparece apenas no primeiro carregamento depois do redirect.
 */

const MESSAGES: Record<string, { title: string; tone?: "success" | "info" }> = {
  // Clientes
  client_created: { title: "Cliente cadastrado com sucesso." },
  client_updated: { title: "Dados do cliente atualizados." },
  client_deleted: { title: "Cliente removido." },
  // Processos
  case_created: { title: "Processo cadastrado." },
  case_updated: { title: "Processo atualizado." },
  case_deleted: { title: "Processo removido." },
  // Configurações
  org_updated: { title: "Configurações do escritório salvas." },
  account_updated: { title: "Dados da sua conta atualizados." },
  // Documentos
  doc_requested: { title: "Documento solicitado ao cliente." },
  doc_uploaded: { title: "Documento anexado ao processo." },
  doc_approved: { title: "Documento aprovado." },
  doc_rejected: { title: "Documento rejeitado." },
  doc_reopened: { title: "Documento reaberto. Cliente pode enviar de novo." },
  // Mensagens (geralmente só faz sentido inline, mas deixamos disponível)
  message_sent: { title: "Mensagem enviada." },
};

interface Props {
  flash?: string | string[];
}

export function FlashBanner({ flash }: Props) {
  const key = Array.isArray(flash) ? flash[0] : flash;
  if (!key) return null;
  const data = MESSAGES[key];
  if (!data) return null;

  return (
    <div className="mb-5 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm">
      <span
        aria-hidden
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white"
      >
        ✓
      </span>
      <p className="font-medium">{data.title}</p>
    </div>
  );
}
