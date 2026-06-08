import { syncPendingCases } from "@/lib/court-sync";

export const runtime = "nodejs";
// Nunca cacheia: cada execução deve consultar o tribunal de novo.
export const dynamic = "force-dynamic";

/**
 * Job agendado: atualiza os andamentos dos processos com sync ligado.
 *
 * PROTEÇÃO: exige o header `Authorization: Bearer <CRON_SECRET>`. Sem o
 * secret configurado, a rota responde 501 (desligada) — assim ela fica
 * preparada mas inerte até você decidir ligar.
 *
 * Como ligar (Vercel):
 *   1. Defina CRON_SECRET nas env vars do projeto.
 *   2. Adicione em vercel.json:
 *        { "crons": [{ "path": "/api/cron/sync-cases", "schedule": "0 8 * * *" }] }
 *      (a Vercel envia o header Authorization com o CRON_SECRET sozinha.)
 *
 * Também dá pra chamar manualmente:
 *   curl -H "Authorization: Bearer SEU_SECRET" https://SEU_SITE/api/cron/sync-cases
 */
async function handle(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { error: "Cron não configurado (defina CRON_SECRET)." },
      { status: 501 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  // Permite ajustar o tamanho do lote por querystring (?limit=50).
  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit"));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 200
      ? Math.floor(limitParam)
      : undefined;

  const summary = await syncPendingCases({ limit });
  return Response.json({ ok: true, ...summary });
}

// Vercel Cron usa GET; deixamos POST disponível pra chamadas manuais.
export const GET = handle;
export const POST = handle;
