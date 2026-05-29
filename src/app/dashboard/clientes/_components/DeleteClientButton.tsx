"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteClientAction } from "../actions";

interface Props {
  id: string;
  name: string;
}

export function DeleteClientButton({ id, name }: Props) {
  async function handleConfirm() {
    const formData = new FormData();
    formData.set("id", id);
    await deleteClientAction(formData);
  }

  return (
    <ConfirmDialog
      triggerLabel="Excluir cliente"
      triggerTone="danger"
      title={`Excluir "${name}"?`}
      description="Todos os processos vinculados a este cliente serão removidos em cascata — atualizações, documentos, mensagens e tarefas. Esta ação não pode ser desfeita."
      confirmLabel="Excluir definitivamente"
      cancelLabel="Cancelar"
      confirmWord="EXCLUIR"
      onConfirm={handleConfirm}
    />
  );
}
