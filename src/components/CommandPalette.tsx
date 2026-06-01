"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Result {
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

interface SearchResponse {
  clients: Result[];
  cases: Result[];
  error?: string;
}

type Item = Result & { kind: "client" | "case" };

const SHORTCUTS: Array<{ label: string; href: string }> = [
  { label: "Novo cliente", href: "/dashboard/clientes/novo" },
  { label: "Novo processo", href: "/dashboard/processos/novo" },
  { label: "Configurações do escritório", href: "/dashboard/conta?tab=escritorio" },
  { label: "Plano e cobrança", href: "/dashboard/conta?tab=plano" },
  { label: "Minha conta", href: "/dashboard/conta" },
];

/**
 * Command palette ativada por Ctrl/Cmd + K. Busca clientes e processos
 * via `/api/search` e oferece atalhos rápidos quando o input está vazio.
 *
 * Navegação por teclado:
 *   - Esc / clique no backdrop fecham
 *   - Setas ↑↓ movem a seleção
 *   - Enter abre o item selecionado
 */
export function CommandPalette() {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<Result[]>([]);
  const [cases, setCases] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const items: Item[] = (() => {
    if (query.trim().length < 2) {
      return SHORTCUTS.map((s, i) => ({
        id: `shortcut-${i}`,
        kind: "case",
        label: s.label,
        sublabel: "Atalho",
        href: s.href,
      }));
    }
    return [
      ...clients.map<Item>((c) => ({ ...c, kind: "client" })),
      ...cases.map<Item>((c) => ({ ...c, kind: "case" })),
    ];
  })();

  const close = useCallback(() => {
    dialogRef.current?.close();
    setOpen(false);
    setQuery("");
    setClients([]);
    setCases([]);
    setActiveIndex(0);
  }, []);

  const openPalette = useCallback(() => {
    setOpen(true);
    dialogRef.current?.showModal();
    // foco no input só depois do dialog abrir
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Atalho global
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        if (open) close();
        else openPalette();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, openPalette]);

  // Busca debounced
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      // Sem busca: cancela qualquer fetch e não toca em estado aqui (os
      // valores padrão garantem "vazio" no UI). O reset acontece quando
      // o usuário apaga o campo, via callback do onChange — não daqui.
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setClients([]);
          setCases([]);
          return;
        }
        const data: SearchResponse = await res.json();
        setClients(data.clients ?? []);
        setCases(data.cases ?? []);
        setActiveIndex(0);
      } catch {
        // abortado ou erro de rede — silencioso
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  function navigate(item: Item) {
    close();
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = items[activeIndex];
      if (sel) navigate(sel);
    }
  }

  return (
    <>
      {/* Botão visível no canto inferior — opcional, dá descoberta */}
      <button
        type="button"
        onClick={openPalette}
        className="no-print fixed bottom-4 right-4 z-40 inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-lg transition hover:bg-slate-100"
      >
        <span aria-hidden>⌕</span>
        <span className="hidden sm:inline">Buscar</span>
        <kbd className="hidden rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono sm:inline">
          Ctrl K
        </kbd>
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => {
          setOpen(false);
          setQuery("");
        }}
        className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm"
      >
        <div
          className="flex flex-col"
          onKeyDown={onKeyDown}
          role="combobox"
          aria-controls="command-results"
          aria-expanded={open}
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <span aria-hidden className="text-slate-400">
              ⌕
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                const v = e.currentTarget.value;
                setQuery(v);
                if (v.trim().length < 2) {
                  // Apagou o input — limpa os resultados antigos.
                  setClients([]);
                  setCases([]);
                  setActiveIndex(0);
                }
              }}
              placeholder="Buscar clientes, processos..."
              className="h-9 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
              aria-autocomplete="list"
            />
            <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 sm:inline">
              Esc
            </kbd>
          </div>

          <div
            id="command-results"
            className="max-h-80 overflow-y-auto py-2"
          >
            {loading ? (
              <p className="px-4 py-6 text-center text-xs text-slate-500">
                Buscando...
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-500">
                {query.length >= 2
                  ? "Nada encontrado."
                  : "Digite ao menos 2 letras para buscar."}
              </p>
            ) : (
              <ResultsList
                query={query}
                clients={clients}
                cases={cases}
                items={items}
                activeIndex={activeIndex}
                onPick={navigate}
                setActiveIndex={setActiveIndex}
              />
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-2 text-[10px] text-slate-500">
            <span>
              <kbd className="rounded border border-slate-300 bg-white px-1 font-mono">
                ↑↓
              </kbd>{" "}
              navegar{" "}
              <kbd className="rounded border border-slate-300 bg-white px-1 font-mono">
                ↵
              </kbd>{" "}
              abrir
            </span>
            <span>
              <kbd className="rounded border border-slate-300 bg-white px-1 font-mono">
                Ctrl K
              </kbd>{" "}
              alternar
            </span>
          </div>
        </div>
      </dialog>
    </>
  );
}

function ResultsList({
  query,
  clients,
  cases,
  items,
  activeIndex,
  onPick,
  setActiveIndex,
}: {
  query: string;
  clients: Result[];
  cases: Result[];
  items: Item[];
  activeIndex: number;
  onPick: (item: Item) => void;
  setActiveIndex: (i: number) => void;
}) {
  // Lookup do índice de cada item para alinhar com o array `items`
  function indexOf(id: string): number {
    return items.findIndex((it) => it.id === id);
  }

  if (query.trim().length < 2) {
    return (
      <Group title="Atalhos">
        {items.map((it) => (
          <Row
            key={it.id}
            item={it}
            active={indexOf(it.id) === activeIndex}
            onHover={() => setActiveIndex(indexOf(it.id))}
            onClick={() => onPick(it)}
          />
        ))}
      </Group>
    );
  }

  return (
    <>
      {clients.length > 0 ? (
        <Group title={`Clientes (${clients.length})`}>
          {clients.map((c) => {
            const item = items.find((it) => it.id === c.id && it.kind === "client")!;
            return (
              <Row
                key={`c-${c.id}`}
                item={item}
                active={indexOf(c.id) === activeIndex}
                onHover={() => setActiveIndex(indexOf(c.id))}
                onClick={() => onPick(item)}
              />
            );
          })}
        </Group>
      ) : null}
      {cases.length > 0 ? (
        <Group title={`Processos (${cases.length})`}>
          {cases.map((p) => {
            const item = items.find((it) => it.id === p.id && it.kind === "case")!;
            return (
              <Row
                key={`p-${p.id}`}
                item={item}
                active={indexOf(p.id) === activeIndex}
                onHover={() => setActiveIndex(indexOf(p.id))}
                onClick={() => onPick(item)}
              />
            );
          })}
        </Group>
      ) : null}
    </>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-2 pb-2">
      <p className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <ul className="mt-1">{children}</ul>
    </div>
  );
}

function Row({
  item,
  active,
  onHover,
  onClick,
}: {
  item: Item;
  active: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onMouseMove={onHover}
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
          active ? "bg-teal-50 text-teal-900" : "hover:bg-slate-50 text-slate-800"
        }`}
      >
        <span
          aria-hidden
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
            item.kind === "client"
              ? "bg-teal-100 text-teal-700"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {item.kind === "client" ? "CL" : "PR"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {item.label}
          </span>
          <span className="block truncate text-[11px] text-slate-500">
            {item.sublabel}
          </span>
        </span>
        <span
          aria-hidden
          className={`text-xs ${active ? "text-teal-700" : "text-slate-300"}`}
        >
          ↵
        </span>
      </button>
    </li>
  );
}
