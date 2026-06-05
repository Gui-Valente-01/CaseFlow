"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import PasswordInput from "@/components/PasswordInput";
import { deleteAccountAndOrganizationAction } from "../actions";

interface Props {
  isOwner: boolean;
}

export function PrivacyDataPanel({ isOwner }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleDelete() {
    setError("");

    const formData = new FormData();
    formData.set("password", password);

    const result = await deleteAccountAndOrganizationAction(formData);
    if (result?.error) {
      setError(result.error);
      return false;
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-slate-600">
        A LGPD garante o direito de acessar dados pessoais e pedir a exclusao
        quando nao houver obrigacao legal de retencao. Donos exportam o pacote
        do escritorio; advogados da equipe exportam apenas seus proprios dados.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href="/dashboard/conta/exportar-dados"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          {isOwner
            ? "Exportar dados do escritório"
            : "Exportar meus dados"}
        </a>

        {isOwner ? (
          <ConfirmDialog
            triggerLabel="Excluir minha conta e escritório"
            triggerTone="danger"
            title="Excluir conta e escritório?"
            description="Todos os dados do escritório serão removidos em cascata: clientes, processos, documentos, mensagens e tarefas. Esta ação não pode ser desfeita."
            confirmLabel="Excluir definitivamente"
            cancelLabel="Cancelar"
            confirmWord="EXCLUIR"
            onConfirm={handleDelete}
          >
            <div className="mt-5">
              <PasswordInput
                label="Senha atual"
                name="password"
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  setError("");
                }}
                autoComplete="current-password"
                placeholder="Confirme com sua senha"
              />
            </div>

            {error ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </ConfirmDialog>
        ) : (
          <p className="text-sm text-slate-500">
            Apenas o dono do escritorio pode excluir a conta e os dados da
            organizacao.
          </p>
        )}
      </div>
    </div>
  );
}
