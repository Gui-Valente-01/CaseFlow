import type { CaseMessageItem } from "@/lib/queries";
import { MessageAttachmentDownload } from "@/components/MessageAttachmentDownload";
import { MessageComposer } from "@/components/MessageComposer";
import { MessageRealtimeListener } from "@/components/MessageRealtimeListener";

type MessageAction = (formData: FormData) => void | Promise<void>;

interface MessageThreadProps {
  caseId: string;
  organizationId: string;
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
  organizationId,
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
            <span className="block pt-0.5">
              Última: {formatDateTime(lastMessage.createdAt)}
            </span>
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

      <MessageComposer
        caseId={caseId}
        organizationId={organizationId}
        placeholder={placeholder}
        action={action}
        compact={compact}
      />
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
  const hasAttachment = Boolean(message.attachmentPath);
  const hasBody = Boolean(message.body && message.body.trim());

  return (
    <div className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[88%] items-end gap-2 ${fromMe ? "flex-row-reverse" : ""}`}
      >
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
            <span className="text-slate-400">
              {formatDateTime(message.createdAt)}
            </span>
            {!fromMe && !message.readAt ? (
              <span className="rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] text-teal-700">
                Nova
              </span>
            ) : null}
          </div>

          {hasBody ? (
            <p className="mt-1 whitespace-pre-wrap break-words">
              {message.body}
            </p>
          ) : null}

          {hasAttachment ? (
            <AttachmentChip
              messageId={message.id}
              name={message.attachmentName ?? "Anexo"}
              size={message.attachmentSize ?? null}
              fromMe={fromMe}
            />
          ) : null}

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

function AttachmentChip({
  messageId,
  name,
  size,
  fromMe,
}: {
  messageId: string;
  name: string;
  size: number | null;
  fromMe: boolean;
}) {
  return (
    <div
      className={`mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 ${
        fromMe
          ? "border-slate-700 bg-slate-900"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <span aria-hidden className="text-base">
        📎
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-xs font-semibold ${
            fromMe ? "text-white" : "text-slate-900"
          }`}
          title={name}
        >
          {name}
        </p>
        {size != null ? (
          <p
            className={`text-[10px] ${
              fromMe ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {humanSize(size)}
          </p>
        ) : null}
      </div>
      <MessageAttachmentDownload
        messageId={messageId}
        tone={fromMe ? "dark" : "light"}
      />
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

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
