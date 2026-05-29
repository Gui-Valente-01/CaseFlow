"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteCaseAction } from "../actions";

interface Props {
  id: string;
  title: string;
}

export function DeleteCaseButton({ id, title }: Props) {
  async function handleConfirm() {
    const formData = new FormData();
    formData.set("id", id);
    await deleteCaseAction(formData);
  }

  return (
    <ConfirmDialog
      triggerLabel="Excluir processo"
      triggerTone="danger"
      title={`Excluir "${title}"?`}
      description="Todas as atualizações, documentos, mensagens e tarefas vinculados a este processo serão removidos. Esta ação não pode ser desfeita."
      confirmLabel="Excluir definitivamente"
      cancelLabel="Cancelar"
      confirmWord="EXCLUIR"
      onConfirm={handleConfirm}
    />
  );
}
