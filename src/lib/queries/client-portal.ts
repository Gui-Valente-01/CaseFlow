import { createSupabaseServerClient } from "../supabase-server";
import { getCaseById, getCasesByClientId, type CaseDetail } from "./cases";
import {
  getCaseDocuments,
  getCaseMessages,
  getCaseUpdates,
  markCaseMessagesAsRead,
  type CaseDocumentItem,
  type CaseMessageItem,
  type CaseUpdateItem,
} from "./case-content";

// =====================================================================
// Portal do cliente
// =====================================================================

export interface ClientPortalData {
  clientName: string;
  /** Quantos escritórios diferentes têm este cliente. */
  officeCount: number;
  cases: Array<
    CaseDetail & {
      officeName: string;
      updates: CaseUpdateItem[];
      documents: CaseDocumentItem[];
      messages: CaseMessageItem[];
    }
  >;
}

export async function getClientPortalData(
  profileId: string
): Promise<ClientPortalData | null> {
  const supabase = await createSupabaseServerClient();
  // Um mesmo cliente (login) pode estar vinculado a vários escritórios.
  // Buscamos TODOS os cadastros com esse profile_id e agregamos os
  // processos de todos, identificando o escritório de cada um.
  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, full_name, organization_id, organizations(name)")
    .eq("profile_id", profileId);

  if (!clientRows || clientRows.length === 0) return null;

  const clientName = clientRows[0].full_name;
  const offices = new Set<string>();

  // Para cada cadastro (escritório) do cliente, lista os processos e busca
  // detalhe + timeline + documentos + mensagens de todos EM PARALELO. Antes
  // isso era um laço sequencial (N+1), que deixava o portal lento pra quem
  // tinha vários processos.
  const perClient = await Promise.all(
    clientRows.map(async (client) => {
      offices.add(client.organization_id);
      const orgField = (Array.isArray(client.organizations)
        ? client.organizations[0]
        : client.organizations) as { name?: string } | null;
      const officeName = orgField?.name ?? "Escritório";

      const cases = await getCasesByClientId(client.organization_id, client.id);
      return Promise.all(
        cases.map(async (item) => {
          const [detail, updates, documents, messages] = await Promise.all([
            getCaseById(client.organization_id, item.id),
            getCaseUpdates(item.id),
            getCaseDocuments(item.id),
            getCaseMessages(item.id),
          ]);
          if (!detail) return null;
          return { ...detail, officeName, updates, documents, messages };
        })
      );
    })
  );

  const aggregated = perClient
    .flat()
    .filter((c): c is NonNullable<typeof c> => c !== null);

  // O cliente vê todas as mensagens ao abrir o portal, então marcamos as do
  // escritório como lidas — num único lote paralelo, separado da leitura.
  await Promise.all(
    aggregated.map((c) => markCaseMessagesAsRead(c.id, profileId))
  );

  return {
    clientName,
    officeCount: offices.size,
    cases: aggregated,
  };
}
