// =============================================================
// CaseFlow — Logo component (drop-in for the Next.js project)
// Copie este arquivo para: src/components/Logo.tsx
// =============================================================
//
// Uso:
//   import { Logo, LogoMark } from "@/components/Logo";
//
//   <Logo />                      // marca + wordmark "CaseFlow"
//   <Logo size={28} />            // controla o tamanho da marca
//   <LogoMark size={32} />        // só a marca (sem texto)
//   <LogoMark variant="bare" />   // marca sem o quadrado (p/ fundo escuro)
//   <LogoMark variant="teal" />   // quadrado teal (p/ fundo escuro/destaque)
//
// Tailwind cuida do espaçamento; as cores da marca são fixas
// (slate-950 + teal-400/300) pra manter a identidade consistente.

interface MarkProps {
  size?: number;
  variant?: "box" | "bare" | "teal";
  className?: string;
}

export function LogoMark({ size = 32, variant = "box", className }: MarkProps) {
  const box = variant === "box" || variant === "teal";
  const boxFill = variant === "teal" ? "#0d9488" : "#020617";
  const stroke = variant === "teal" ? "#ffffff" : "#2dd4bf";
  const node = variant === "teal" ? "#ccfbf1" : "#5eead4";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="CaseFlow"
      className={className}
    >
      {box ? <rect width="40" height="40" rx="11" fill={boxFill} /> : null}
      <path
        d="M11 27.5 L20 20.5 L29 12.5"
        fill="none"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="27.5" r="2.6" fill={node} />
      <circle cx="20" cy="20.5" r="2.6" fill={node} />
      <circle cx="29" cy="12.5" r="4" fill="#ffffff" />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  variant?: "box" | "bare" | "teal";
  /** Cor do texto. Em fundo claro use "text-slate-950" (padrão); em escuro, "text-white". */
  wordmarkClassName?: string;
  className?: string;
}

export function Logo({
  size = 32,
  variant = "box",
  wordmarkClassName = "text-slate-950",
  className,
}: LogoProps) {
  return (
    <span className={"inline-flex items-center gap-2 " + (className ?? "")}>
      <LogoMark size={size} variant={variant} />
      <span className={"text-lg font-semibold tracking-tight " + wordmarkClassName}>
        CaseFlow
      </span>
    </span>
  );
}
