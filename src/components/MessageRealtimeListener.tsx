"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Props {
  caseId: string;
}

/**
 * Assina o canal Realtime da tabela `messages` filtrando por `case_id`.
 * Quando uma mensagem nova é inserida (do outro lado da conversa), chama
 * `router.refresh()` — isso reexecuta o Server Component pai e a lista
 * de mensagens atualiza sem F5.
 *
 * O componente não renderiza nada visível; é só o "ouvido".
 *
 * Requer:
 *   - Tabela `messages` adicionada à publicação `supabase_realtime`
 *     (ver docs/migration-v7-realtime-messages.sql).
 */
export function MessageRealtimeListener({ caseId }: Props) {
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel(`messages:case=${caseId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `case_id=eq.${caseId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [caseId, router]);

  return null;
}
