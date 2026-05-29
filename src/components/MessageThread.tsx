import type { CaseMessageItem } from "@/lib/queries";
import { MessageRealtimeListener } from "@/components/MessageRealtimeListener";
import { SubmitButton } from "@/components/SubmitButton";

type MessageAction = (formData: FormData) => void | Promise<void>;

interface MessageThreadProps {
  caseId: string;
  messages: CaseMessageItem[];
  currentSide: "legal" | "client";
  title: string;
  subtitle: string;
  emptyText: string;
  placeholder: string;
  action: MessageAction;
  compact?: boolean;
}

export function MessageThread({
  caseId,
  messages,
  currentSide,
  title,
  subtitle,
  emptyText,
  placeholder,
  action,
  compact = false,
}: MessageThreadProps) {
  const unreadIncoming = messages.filter(
    (message) => !isFromCurrentSide(message, currentSide) && !message.readAt
  ).length;
  const lastMessage = messages.at(-1);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <MessageRealtimeListener caseId={caseId} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            {unreadIncoming > 0 ? (
              <span className="inline-flex h-6 items-center rounded-full bg-teal-50 px-2.5 text-[11px] font-semibold text-teal-800 ring-1 ring-teal-200">
                {unreadIncoming} nova{unreadIncoming > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{messages.length}</span>{" "}
          mensagem{messages.length === 1 ? "" : "s"}
          {lastMessage ? (
            <span className="block pt-0.5">Última: {formatDateTime(lastMessage.createdAt)}</span>
          ) : null}
        </div>
      </div>

      <div
        className={`mt-5 flex flex-col gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 ${
          compact ? "max-h-96" : "max-h-[30rem]"
        }`}
      >
        {messages.length === 0 ? (
          <p className="rounded-lg bg-white px-3 py-8 text-center text-sm text-slate-500">
            {emptyText}
          </p>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              fromMe={isFromCurrentSide(message, currentSide)}
            />
          ))
        )}
      </div>

      <form action={action} className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <input type="hidden" name="case_id" value={caseId} />
        <label className="sr-only" htmlFor={`message-${caseId}`}>
          Nova mensagem
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <textarea
            id={`message-${caseId}`}
            name="body"
            required
            rows={compact ? 2 : 3}
            maxLength={1200}
            placeholder={placeholder}
            className="min-h-11 flex-1 resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
          />
          <SubmitButton pendingLabel="Enviando..." className="h-11 px-5 shrink-0">
            Enviar
          </SubmitButton>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">
          Esta conversa fica registrada no histórico do processo.
        </p>
      </form>
    </article>
  );
}

function MessageBubble({
  message,
  fromMe,
}: {
  message: CaseMessageItem;
  fromMe: boolean;
}) {
  return (
    <div className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[88%] items-end gap-2 ${fromMe ? "flex-row-reverse" : ""}`}>
        <Avatar name={message.sender} tone={fromMe ? "slate" : "teal"} />
        <div
          className={`rounded-2xl px-4 py-2 text-sm leading-6 shadow-sm ${
            fromMe
              ? "rounded-br-sm bg-slate-950 text-white"
              : "rounded-bl-sm border border-slate-200 bg-white text-slate-900"
          }`}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-wide">
            <span className={fromMe ? "text-slate-300" : "text-slate-500"}>
              {fromMe ? "Você" : message.sender}
            </span>
            <span className={fromMe ? "text-slate-400" : "text-slate-400"}>
              {formatDateTime(message.createdAt)}
            </span>
            {!fromMe && !message.readAt ? (
              <span className="rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] text-teal-700">
                Nova
              </span>
            ) : null}
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words">{message.body}</p>
          {fromMe ? (
            <p className="mt-1 text-right text-[11px] text-slate-400">
              {message.readAt ? "Lida" : "Enviada"}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, tone }: { name: string; tone: "slate" | "teal" }) {
  const tones = {
    slate: "bg-slate-800 text-white",
    teal: "bg-teal-600 text-white",
  } as const;
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${tones[tone]}`}
    >
      {initials(name)}
    </span>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isFromCurrentSide(
  message: CaseMessageItem,
  currentSide: "legal" | "client"
): boolean {
  if (currentSide === "client") return message.senderRole === "client";
  return message.senderRole === "owner" || message.senderRole === "lawyer";
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
