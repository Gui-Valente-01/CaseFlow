"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Props {
  caseId: string;
}

/**
 * Escuta mudanças em `documents`, `case_updates` e `case_tasks` para um
 * processo específico. Em qualquer evento (INSERT/UPDATE/DELETE), refaz
 * a Server Component pai via `router.refresh()`.
 *
 * Pra funcionar precisa das tabelas estarem na publicação supabase_realtime
 * (ver docs/migration-v11-realtime-more.sql).
 */
export function CaseRealtimeListener({ caseId }: Props) {
  const router = useRouter();

  useEffect(() => {
    const tables = ["documents", "case_updates", "case_tasks"] as const;

    const channel = supabase.channel(`case:${caseId}`);
    for (const table of tables) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `case_id=eq.${caseId}`,
        },
        () => router.refresh()
      );
    }
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [caseId, router]);

  return null;
}
