import Link from "next/link";
import { LogoutButton } from "./LogoutButton";
import { getCurrentProfile } from "@/lib/supabase-server";

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
}

export async function Header({ title, subtitle, actionLabel, actionHref }: Props) {
  const profile = await getCurrentProfile();

  const orgName = profile
    ? Array.isArray(profile.organizations)
      ? profile.organizations[0]?.name
      : // @ts-expect-error supabase devolve dinâmico
        profile.organizations?.name
    : undefined;

  return (
    <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <div>
        <p className="text-sm font-medium text-teal-700">CaseFlow</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        {actionLabel && actionHref ? (
          <Link 
            href={actionHref}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            {actionLabel}
          </Link>
        ) : null}

        {profile ? (
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
              {initials(profile.full_name)}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold leading-tight text-slate-900">
                {profile.full_name}
              </p>
              {orgName ? (
                <p className="text-[11px] leading-tight text-slate-500">{orgName}</p>
              ) : null}
            </div>
            <LogoutButton />
          </div>
        ) : null}
      </div>
    </header>
  );
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
