"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { removeMemberAction, revokeInvitationAction } from "../actions";

export function RevokeButton({ id }: { id: string }) {
  async function handleConfirm() {
    const fd = new FormData();
    fd.set("id", id);
    await revokeInvitationAction(fd);
  }
  return (
    <ConfirmDialog
      triggerLabel="Revogar"
      triggerTone="neutral"
      title="Revogar convite?"
      description="O link enviado deixa de funcionar imediatamente. Você pode enviar um novo convite a qualquer momento."
      confirmLabel="Revogar"
      onConfirm={handleConfirm}
    />
  );
}

export function RemoveMemberButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  async function handleConfirm() {
    const fd = new FormData();
    fd.set("id", id);
    await removeMemberAction(fd);
  }
  return (
    <ConfirmDialog
      triggerLabel="Remover"
      triggerTone="danger"
      title={`Remover ${name} do escritório?`}
      description="A pessoa perde acesso ao painel imediatamente. A conta dela continua existindo, mas sem acesso aos seus dados. Você pode convidar de novo depois."
      confirmLabel="Remover"
      onConfirm={handleConfirm}
    />
  );
}
