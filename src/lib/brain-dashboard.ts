import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

export interface BrainDashboardData {
  brainPath: string;
  sitePath: string;
  lastUpdated: string;
  siteCommit: string;
  siteBranch: string;
  siteGitStatus: string;
  brainGitStatus: string;
  noteCount: number;
  pageCount: number;
  apiCount: number;
  componentCount: number;
  migrationCount: number;
  testCount: number;
  done: string[];
  improvements: string[];
  nextSteps: string[];
  errors: string[];
  warnings: string[];
  available: boolean;
}

const fallbackData: BrainDashboardData = {
  brainPath: "",
  sitePath: "",
  lastUpdated: "Indisponivel",
  siteCommit: "Indisponivel",
  siteBranch: "Indisponivel",
  siteGitStatus: "Indisponivel",
  brainGitStatus: "Indisponivel",
  noteCount: 0,
  pageCount: 0,
  apiCount: 0,
  componentCount: 0,
  migrationCount: 0,
  testCount: 0,
  done: [],
  improvements: [],
  nextSteps: [],
  errors: [],
  warnings: ["Cerebro local nao encontrado neste ambiente."],
  available: false,
};

export function getBrainDashboardData(): BrainDashboardData {
  const sitePath = process.cwd();
  const brainPath = path.resolve(sitePath, "..", "caseflow-brain");
  const snapshotPath = path.join(
    brainPath,
    "11-autoaprendizado",
    "snapshot-automatico-site.md"
  );
  const dashboardPath = path.join(
    brainPath,
    "11-autoaprendizado",
    "dashboard-cerebro.md"
  );

  if (!fs.existsSync(brainPath) || !fs.existsSync(snapshotPath)) {
    return { ...fallbackData, brainPath, sitePath };
  }

  const snapshot = readFile(snapshotPath);
  const dashboard = readFile(dashboardPath);
  const warnings: string[] = [];
  const siteGitStatus = git("git status --short", sitePath) || "Limpo";
  const brainGitStatus = git("git status --short", brainPath) || "Limpo";

  if (siteGitStatus !== "Limpo") warnings.push("O site esta com alteracoes pendentes.");
  if (brainGitStatus !== "Limpo") warnings.push("O cerebro esta com alteracoes pendentes.");

  const errors = sectionItems(dashboard, "Erros e riscos registrados", 6);
  if (errors.some((item) => item.toLowerCase().includes("rls"))) {
    warnings.push("RLS ja quebrou producao. Reativar apenas em staging.");
  }

  return {
    brainPath,
    sitePath,
    lastUpdated: match(snapshot, /Última atualização automática:\s+\*\*(.*?)\*\*/),
    siteCommit: match(snapshot, /- HEAD:\s+`([^`]+)`/),
    siteBranch: match(snapshot, /- Branch:\s+`([^`]+)`/),
    siteGitStatus,
    brainGitStatus,
    noteCount: numberFromDashboard(dashboard, "Notas Markdown no cérebro"),
    pageCount: numberFromSnapshot(snapshot, "Páginas"),
    apiCount: numberFromSnapshot(snapshot, "Route handlers/API"),
    componentCount: numberFromSnapshot(snapshot, "Componentes"),
    migrationCount: numberFromSnapshot(snapshot, "Migrations"),
    testCount: numberFromSnapshot(snapshot, "Testes"),
    done: sectionItems(dashboard, "O que já foi feito", 10),
    improvements: sectionItems(dashboard, "O que precisa melhorar", 10),
    nextSteps: sectionItems(dashboard, "Próximos passos recomendados", 10),
    errors,
    warnings,
    available: true,
  };
}

function readFile(file: string) {
  return fs.readFileSync(file, "utf8");
}

function git(command: string, cwd: string) {
  try {
    return execSync(command, { cwd, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function match(text: string, regex: RegExp) {
  return regex.exec(text)?.[1]?.trim() ?? "Indisponivel";
}

function numberFromSnapshot(text: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const found = new RegExp(`- ${escaped}:\\s+(\\d+)`).exec(text)?.[1];
  return found ? Number(found) : 0;
}

function numberFromDashboard(text: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const found = new RegExp(`\\| ${escaped} \\|\\s+(\\d+) \\|`).exec(text)?.[1];
  return found ? Number(found) : 0;
}

function sectionItems(markdown: string, sectionTitle: string, limit: number) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${sectionTitle}`);
  if (start < 0) return [];
  const items: string[] = [];

  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break;
    const trimmed = line.trim();
    if (/^[-*]\s+/.test(trimmed)) items.push(trimmed.replace(/^[-*]\s+/, ""));
    if (items.length >= limit) break;
  }

  return items;
}

