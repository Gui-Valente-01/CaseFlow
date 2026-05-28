"use client";

import { deleteCaseAction } from "../actions";

interface Props {
  id: string;
  title: string;
}

export function DeleteCaseButton({ id, title }: Props) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const ok = window.confirm(
      `Excluir o processo "${title}" Todas as atualizações, documentos e mensagens vinculados serão removidos. Esta ação não pode ser desfeita.`
    );
    if (!ok) e.preventDefault();
  }

  return (
    <form action={deleteCaseAction} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={id} />
      <button 
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50"
      >
        Excluir processo
      </button>
    </form>
  );
}
