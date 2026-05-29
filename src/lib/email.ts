/**
 * Helper de envio de e-mail via Resend.
 *
 * Configure `RESEND_API_KEY` no .env.local pra ativar. Sem a chave,
 * todas as chamadas viram no-op silencioso — o app continua funcionando
 * normalmente, só não notifica por e-mail.
 *
 * Domínio de envio (`EMAIL_FROM`) é opcional. Default: o endereço de
 * teste da Resend ("onboarding@resend.dev"), que só envia pra e-mail
 * dono da conta — útil só pra teste. Em produção, configure seu domínio
 * verificado em https://resend.com/domains e ajuste EMAIL_FROM.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface SendEmailInput {
  to: string;
  subject: string;
  /** HTML do corpo. Texto plano cai no fallback. */
  html: string;
  /** Texto plano opcional pra clients que não renderizam HTML. */
  text?: string;
  /** Endereço Reply-To opcional. */
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Envia o e-mail. Não lança em caso de falha — devolve `{ok:false}`
 * pra o caller decidir se quer fazer log ou ignorar.
 *
 * Não bloqueia o fluxo principal: chame com `void sendEmail(...)` se
 * não precisa esperar.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Sem chave: silencioso. App continua funcionando.
    return { ok: false, skipped: true };
  }

  const from =
    process.env.EMAIL_FROM ?? "CaseFlow <onboarding@resend.dev>";

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: detail || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao enviar e-mail.",
    };
  }
}

// =====================================================================
// Templates
// =====================================================================

/**
 * Template base HTML. Recebe título e corpo e devolve um e-mail
 * formatado com a identidade visual leve do CaseFlow.
 */
function baseTemplate(opts: {
  preheader?: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<p style="margin:24px 0 8px 0;">
           <a href="${opts.ctaUrl}"
              style="background:#020617;color:#ffffff;text-decoration:none;
                     padding:12px 20px;border-radius:8px;
                     font-weight:600;font-size:14px;display:inline-block;">
             ${escapeHtml(opts.ctaLabel)}
           </a>
         </p>`
      : "";

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(opts.title)}</title>
  </head>
  <body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
    ${opts.preheader ? `<span style="display:none;color:transparent;">${escapeHtml(opts.preheader)}</span>` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0"
                 style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;
                        padding:32px;font-size:14px;color:#0f172a;line-height:1.6;">
            <tr>
              <td>
                <p style="margin:0 0 6px 0;color:#0d9488;font-size:11px;
                          font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">
                  CaseFlow
                </p>
                <h1 style="margin:0 0 16px 0;font-size:20px;color:#020617;">
                  ${escapeHtml(opts.title)}
                </h1>
                <div style="color:#334155;">${opts.body}</div>
                ${cta}
              </td>
            </tr>
            <tr>
              <td style="padding-top:24px;border-top:1px solid #e2e8f0;color:#94a3b8;
                         font-size:11px;line-height:1.5;">
                Você recebeu este e-mail porque é cliente ou usuário do CaseFlow.
                Se não reconhece, pode ignorar.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// =====================================================================
// Templates específicos
// =====================================================================

export function emailInvitation(opts: {
  inviterName: string;
  organizationName: string;
  acceptUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Convite para ${opts.organizationName} no CaseFlow`;
  const html = baseTemplate({
    title: `Você foi convidado para ${escapeHtml(opts.organizationName)}`,
    preheader: `${opts.inviterName} convidou você para entrar no CaseFlow.`,
    body: `
      <p>${escapeHtml(opts.inviterName)} convidou você para entrar como
      advogado no escritório <strong>${escapeHtml(opts.organizationName)}</strong>.</p>
      <p>Clique no botão abaixo pra criar sua senha e começar a usar o
      CaseFlow. O convite expira em 7 dias.</p>
    `,
    ctaLabel: "Aceitar convite",
    ctaUrl: opts.acceptUrl,
  });
  const text =
    `${opts.inviterName} convidou você para o escritório ${opts.organizationName} no CaseFlow.\n\n` +
    `Aceite o convite em: ${opts.acceptUrl}\n\n` +
    `O convite expira em 7 dias.`;
  return { subject, html, text };
}

export function emailNewDocument(opts: {
  clientName: string;
  documentName: string;
  caseTitle: string;
  caseUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Novo documento: ${opts.documentName} — ${opts.caseTitle}`;
  const html = baseTemplate({
    title: `${escapeHtml(opts.clientName)} enviou um documento`,
    preheader: `Documento "${opts.documentName}" pronto pra revisão.`,
    body: `
      <p>O cliente <strong>${escapeHtml(opts.clientName)}</strong>
      enviou um novo documento no processo:</p>
      <p style="background:#f1f5f9;padding:10px 14px;border-radius:8px;">
        <strong>${escapeHtml(opts.documentName)}</strong><br />
        <span style="color:#475569;font-size:12px;">${escapeHtml(opts.caseTitle)}</span>
      </p>
    `,
    ctaLabel: "Abrir processo",
    ctaUrl: opts.caseUrl,
  });
  const text =
    `${opts.clientName} enviou "${opts.documentName}" no processo ${opts.caseTitle}.\n` +
    `Veja em: ${opts.caseUrl}`;
  return { subject, html, text };
}

export function emailDocumentReviewed(opts: {
  clientFirstName: string;
  documentName: string;
  approved: boolean;
  reason?: string;
  portalUrl: string;
}): { subject: string; html: string; text: string } {
  const verb = opts.approved ? "aprovado" : "rejeitado";
  const subject = `Documento ${verb}: ${opts.documentName}`;
  const html = baseTemplate({
    title: `Seu documento foi ${verb}`,
    body: `
      <p>Olá, ${escapeHtml(opts.clientFirstName)}.</p>
      <p>O documento <strong>${escapeHtml(opts.documentName)}</strong>
      foi <strong>${verb}</strong> pelo escritório.</p>
      ${
        !opts.approved && opts.reason
          ? `<p style="background:#fee2e2;padding:10px 14px;border-radius:8px;
                       border-left:3px solid #dc2626;">
               <strong>Motivo:</strong> ${escapeHtml(opts.reason)}
             </p>`
          : ""
      }
    `,
    ctaLabel: "Abrir portal",
    ctaUrl: opts.portalUrl,
  });
  const text =
    `Seu documento "${opts.documentName}" foi ${verb}.` +
    (opts.reason ? `\nMotivo: ${opts.reason}` : "") +
    `\nVeja em: ${opts.portalUrl}`;
  return { subject, html, text };
}

export function emailCaseUpdate(opts: {
  clientFirstName: string;
  updateTitle: string;
  updateBody?: string;
  caseTitle: string;
  portalUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Atualização do processo: ${opts.caseTitle}`;
  const html = baseTemplate({
    title: "Atualização no seu processo",
    body: `
      <p>Olá, ${escapeHtml(opts.clientFirstName)}.</p>
      <p>O escritório registrou uma nova atualização no processo
      <strong>${escapeHtml(opts.caseTitle)}</strong>:</p>
      <p style="background:#f0fdfa;padding:10px 14px;border-radius:8px;
                border-left:3px solid #14b8a6;">
        <strong>${escapeHtml(opts.updateTitle)}</strong>
        ${opts.updateBody ? `<br /><span style="color:#475569;">${escapeHtml(opts.updateBody)}</span>` : ""}
      </p>
    `,
    ctaLabel: "Abrir portal",
    ctaUrl: opts.portalUrl,
  });
  const text =
    `Atualização no processo "${opts.caseTitle}": ${opts.updateTitle}\n` +
    (opts.updateBody ? `${opts.updateBody}\n` : "") +
    `Veja em: ${opts.portalUrl}`;
  return { subject, html, text };
}
