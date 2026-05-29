import { NextResponse } from "next/server";
import { isLegalStaff } from "@/lib/permissions";
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from "@/lib/supabase-server";

/**
 * Busca global usada pelo Ctrl+K. Retorna clientes e processos da
 * organização do usuário logado. Filtragem por substring é feita no
 * servidor pra não trafegar a base inteira.
 *
 * Resposta:
 *   { clients: [{ id, label, sublabel, href }], cases: [...] }
 *
 * Limite curto (10 de cada) — Ctrl+K é navegação, não relatório.
 */
export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!isLegalStaff(profile)) {
    return NextResponse.json(
      { error: "Acesso restrito ao escritório." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ clients: [], cases: [] });
  }

  const safe = q.replace(/[,()%]/g, " ");
  const pattern = `%${safe}%`;

  const supabase = await createSupabaseServerClient();

  const [clientsRes, casesRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, full_name, email, document")
      .eq("organization_id", profile.organization_id)
      .or(
        `full_name.ilike.${pattern},email.ilike.${pattern},document.ilike.${pattern}`
      )
      .order("full_name", { ascending: true })
      .limit(10),
    supabase
      .from("cases")
      .select("id, title, case_number, type, status, clients(full_name)")
      .eq("organization_id", profile.organization_id)
      .or(`title.ilike.${pattern},case_number.ilike.${pattern},type.ilike.${pattern}`)
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  const clients = (clientsRes.data ?? []).map((c) => ({
    id: c.id,
    label: c.full_name,
    sublabel:
      [c.email, c.document].filter(Boolean).join(" · ") || "Sem contato",
    href: `/dashboard/clientes/${c.id}`,
  }));

  const cases = (casesRes.data ?? []).map((c) => {
    const clientField = c.clients as
      | { full_name?: string }
      | { full_name?: string }[]
      | null;
    const clientName = Array.isArray(clientField)
      ? clientField[0]?.full_name
      : clientField?.full_name;
    return {
      id: c.id,
      label: c.title,
      sublabel: `${clientName ?? "—"} · ${c.case_number ?? "sem número"}`,
      href: `/dashboard/processos/${c.id}`,
    };
  });

  return NextResponse.json({ clients, cases });
}
