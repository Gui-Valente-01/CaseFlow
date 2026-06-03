"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/Logo";

const NAV = [
  { label: "VisÃ£o geral", href: "/dashboard", icon: "VG" },
  { label: "Clientes", href: "/dashboard/clientes", icon: "CL" },
  { label: "Processos", href: "/dashboard/processos", icon: "PR" },
  { label: "Agenda", href: "/dashboard/agenda", icon: "AG" },
  { label: "NotificaÃ§Ãµes", href: "/dashboard/notificacoes", icon: "NT" },
  { label: "Cerebro", href: "/dashboard/cerebro", icon: "CB" },
  { label: "Minha conta", href: "/dashboard/conta", icon: "MC" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="no-print border-b border-slate-200 bg-slate-950 text-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r lg:border-slate-800">
      <div className="px-5 py-5 lg:px-6">
        <Link href="/" className="block">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">
            SaaS jurÃ­dico
          </p>
          <div className="mt-2 flex items-center gap-2">
            <LogoMark size={28} variant="bare" />
            <h2 className="text-xl font-semibold">CaseFlow</h2>
          </div>
        </Link>
      </div>

      <nav className="flex gap-2 overflow-x-auto px-5 pb-5 lg:flex-col lg:px-4">
        {NAV.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex min-w-fit items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-white text-slate-950"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-md text-[11px] font-bold ${
                  isActive ? "bg-teal-50 text-teal-700" : "bg-white/10 text-teal-200"
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

