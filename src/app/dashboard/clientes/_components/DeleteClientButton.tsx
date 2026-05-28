"use client";

import { deleteClientAction } from "../actions";

interface Props {
  id: string;
  name: string;
}

export function DeleteClientButton({ id, name }: Props) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const ok = window.confirm(
      `Excluir o cliente "${name}" Todos os processos vinculados serão removidos também. Esta ação não pode ser desfeita.`
    );
    if (!ok) e.preventDefault();
  }

  return (
    <form action={deleteClientAction} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={id} />
      <button 
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50"
      >
        Excluir cliente
      </button>
    </form>
  );
}
