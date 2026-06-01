import { NextResponse, type NextRequest } from "next/server";
import { recordAudit, recordPrivacyAudit } from "@/lib/audit";
import { isLegalStaff } from "@/lib/permissions";
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from "@/lib/supabase-server";

type QueryResult = {
  data?: unknown;
  error: { message: string } | null;
};

type ExportPayload = {
  exported_at: string;
  product: "CaseFlow";
  scope: {
    type: "personal" | "organization";
    organization_id: string;
    actor_id: string;
  };
  [key: string]: unknown;
};

type ExportResult =
  | { ok: true; payload: ExportPayload; metadata: Record<string, unknown> }
  | { ok: false; error: string };

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return redirectTo(request, "/login");
  if (!isLegalStaff(profile)) return redirectTo(request, "/cliente");

  const supabase = await createSupabaseServerClient();
  const organizationId = profile.organization_id;

  const organizationResult = await supabase
    .from("organizations")
    .select("id, name, kind, email, phone, city, state, created_at, updated_at")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationResult.error) {
    return errorResponse(organizationResult.error.message);
  }

  const result =
    profile.role === "owner"
      ? await buildOrganizationExport(profile.id, organizationId)
      : await buildPersonalExport(profile.id, organizationId);

  if (!result.ok) return errorResponse(result.error);

  const payload = result.payload;
  const metadata = result.metadata;

  await recordAudit({
    organizationId,
    actorId: profile.id,
    actorName: profile.full_name,
    action: "data.exported",
    entityType: "organization",
    entityId: organizationId,
    metadata,
  });

  await recordPrivacyAudit({
    organizationId,
    organizationName: organizationResult.data?.name ?? null,
    actorId: profile.id,
    actorEmail: profile.email,
    actorName: profile.full_name,
    action: "data.exported",
    scope: payload.scope.type,
    metadata,
  });

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${filename(
        payload.scope.type
      )}"`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

async function buildOrganizationExport(
  actorId: string,
  organizationId: string
): Promise<ExportResult> {
  const supabase = await createSupabaseServerClient();
  const [
    organizationResult,
    currentProfileResult,
    profilesResult,
    clientsResult,
    casesResult,
    tasksResult,
  ] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", organizationId).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", actorId).maybeSingle(),
    supabase
      .from("profiles")
      .select(
        "id, organization_id, full_name, email, role, phone, cpf, oab_number, oab_state, created_at, updated_at"
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("clients")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("cases")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("case_tasks")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
  ]);

  const caseIds = (casesResult.data ?? []).map((item) => item.id);
  const [updatesResult, documentsResult, messagesResult] =
    caseIds.length > 0
      ? await Promise.all([
          supabase
            .from("case_updates")
            .select("*")
            .in("case_id", caseIds)
            .order("created_at", { ascending: true }),
          supabase
            .from("documents")
            .select(
              "id, case_id, uploaded_by, name, storage_path, mime_type, size_bytes, rejection_reason, status, created_at, updated_at"
            )
            .in("case_id", caseIds)
            .order("created_at", { ascending: true }),
          supabase
            .from("messages")
            .select("*")
            .in("case_id", caseIds)
            .order("created_at", { ascending: true }),
        ])
      : emptyTriple();

  const error = firstError(
    organizationResult,
    currentProfileResult,
    profilesResult,
    clientsResult,
    casesResult,
    tasksResult,
    updatesResult,
    documentsResult,
    messagesResult
  );

  if (error) return { ok: false, error };

  const payload: ExportPayload = {
    exported_at: new Date().toISOString(),
    product: "CaseFlow",
    scope: {
      type: "organization",
      organization_id: organizationId,
      actor_id: actorId,
    },
    organization: organizationResult.data,
    profile: currentProfileResult.data,
    profiles: profilesResult.data ?? [],
    clients: clientsResult.data ?? [],
    cases: casesResult.data ?? [],
    case_updates: updatesResult.data ?? [],
    documents: documentsResult.data ?? [],
    messages: messagesResult.data ?? [],
    tasks: tasksResult.data ?? [],
  };

  return {
    ok: true,
    payload,
    metadata: {
      scope: "organization",
      profiles: countRows(profilesResult.data),
      clients: countRows(clientsResult.data),
      cases: countRows(casesResult.data),
      documents: countRows(documentsResult.data),
      messages: countRows(messagesResult.data),
      tasks: countRows(tasksResult.data),
    },
  };
}

async function buildPersonalExport(
  actorId: string,
  organizationId: string
): Promise<ExportResult> {
  const supabase = await createSupabaseServerClient();
  const [
    profileResult,
    messagesResult,
    documentsResult,
    updatesResult,
    tasksResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", actorId).maybeSingle(),
    supabase
      .from("messages")
      .select(
        "id, case_id, sender_id, created_at, read_at, attachment_name, attachment_mime, attachment_size"
      )
      .eq("sender_id", actorId)
      .order("created_at", { ascending: true }),
    supabase
      .from("documents")
      .select(
        "id, case_id, uploaded_by, name, mime_type, size_bytes, status, created_at, updated_at"
      )
      .eq("uploaded_by", actorId)
      .order("created_at", { ascending: true }),
    supabase
      .from("case_updates")
      .select("id, case_id, author_id, title, created_at")
      .eq("author_id", actorId)
      .order("created_at", { ascending: true }),
    supabase
      .from("case_tasks")
      .select(
        "id, case_id, assigned_to, created_by, title, type, status, priority, due_at, completed_at, created_at, updated_at"
      )
      .eq("organization_id", organizationId)
      .or(`assigned_to.eq.${actorId},created_by.eq.${actorId}`)
      .order("created_at", { ascending: true }),
  ]);

  const error = firstError(
    profileResult,
    messagesResult,
    documentsResult,
    updatesResult,
    tasksResult
  );

  if (error) return { ok: false, error };

  const payload: ExportPayload = {
    exported_at: new Date().toISOString(),
    product: "CaseFlow",
    scope: {
      type: "personal",
      organization_id: organizationId,
      actor_id: actorId,
    },
    profile: profileResult.data,
    personal_activity: {
      messages_sent: messagesResult.data ?? [],
      documents_uploaded: documentsResult.data ?? [],
      case_updates_authored: updatesResult.data ?? [],
      tasks_assigned_or_created: tasksResult.data ?? [],
    },
  };

  return {
    ok: true,
    payload,
    metadata: {
      scope: "personal",
      messages: countRows(messagesResult.data),
      documents: countRows(documentsResult.data),
      case_updates: countRows(updatesResult.data),
      tasks: countRows(tasksResult.data),
    },
  };
}

function redirectTo(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

function firstError(...results: QueryResult[]) {
  return results.find((result) => result.error)?.error?.message ?? null;
}

function emptyTriple(): [QueryResult, QueryResult, QueryResult] {
  return [
    { data: [], error: null },
    { data: [], error: null },
    { data: [], error: null },
  ];
}

function errorResponse(details: string) {
  return NextResponse.json(
    { error: "Falha ao exportar dados.", details },
    { status: 500 }
  );
}

function countRows(data: unknown) {
  return Array.isArray(data) ? data.length : 0;
}

function filename(scope: "personal" | "organization") {
  const date = new Date().toISOString().slice(0, 10);
  const label = scope === "organization" ? "escritorio" : "meus-dados";
  return `caseflow-${label}-${date}.json`;
}
