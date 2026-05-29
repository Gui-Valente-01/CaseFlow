/**
 * Modelos de processo. Cada modelo preenche título-base, tipo,
 * próximo passo padrão e uma lista sugerida de documentos a solicitar
 * + tarefas iniciais. O advogado pode editar tudo antes de salvar.
 */

export interface CaseTemplate {
  id: string;
  label: string;
  description: string;
  titlePlaceholder: string;
  type: string;
  nextStep: string;
  /** Documentos sugeridos pra solicitar logo após criar o processo. */
  suggestedDocuments: string[];
  /** Tarefas/prazos pra criar com data relativa em dias a partir de hoje. */
  suggestedTasks: { title: string; dueInDays: number }[];
}

export const CASE_TEMPLATES: CaseTemplate[] = [
  {
    id: "trabalhista",
    label: "Trabalhista",
    description:
      "Reclamação trabalhista padrão. Documentação de vínculo, jornada e remuneração.",
    titlePlaceholder: "Reclamação trabalhista - {cliente}",
    type: "Trabalhista",
    nextStep: "Reunir documentos do cliente e protocolar petição inicial.",
    suggestedDocuments: [
      "Carteira de trabalho (CTPS)",
      "Contracheques dos últimos 6 meses",
      "Termo de rescisão (TRCT)",
      "Comprovante de saldo do FGTS",
      "RG e CPF",
    ],
    suggestedTasks: [
      { title: "Análise inicial dos documentos", dueInDays: 3 },
      { title: "Protocolar petição inicial", dueInDays: 14 },
    ],
  },
  {
    id: "consumidor",
    label: "Consumidor",
    description:
      "Defesa do consumidor — cobrança indevida, dano material, vício de produto.",
    titlePlaceholder: "Ação consumerista - {cliente}",
    type: "Consumidor",
    nextStep: "Levantar provas da relação de consumo e tentar acordo extrajudicial.",
    suggestedDocuments: [
      "Notas fiscais / comprovantes de compra",
      "Conversas com o fornecedor (prints)",
      "Protocolos de reclamação (Procon, SAC)",
      "Laudos técnicos do produto",
      "RG e CPF",
    ],
    suggestedTasks: [
      { title: "Enviar notificação extrajudicial", dueInDays: 7 },
      { title: "Avaliar resposta da empresa", dueInDays: 21 },
    ],
  },
  {
    id: "familia-divorcio",
    label: "Família — Divórcio",
    description:
      "Divórcio consensual ou litigioso, com ou sem partilha de bens.",
    titlePlaceholder: "Divórcio - {cliente}",
    type: "Família",
    nextStep:
      "Coletar documentos pessoais e listar bens e dívidas a partilhar.",
    suggestedDocuments: [
      "Certidão de casamento atualizada",
      "RG e CPF dos cônjuges",
      "Certidão de nascimento dos filhos",
      "Comprovante de residência",
      "Relação de bens e dívidas",
    ],
    suggestedTasks: [
      { title: "Audiência de tentativa de acordo", dueInDays: 30 },
      { title: "Distribuir ação", dueInDays: 45 },
    ],
  },
  {
    id: "civel-cobranca",
    label: "Cível — Cobrança",
    description: "Cobrança de dívida documentada, com ou sem título executivo.",
    titlePlaceholder: "Cobrança - {cliente}",
    type: "Cível",
    nextStep: "Notificar extrajudicialmente o devedor antes da ação.",
    suggestedDocuments: [
      "Contrato ou título de crédito",
      "Comprovantes da dívida",
      "Notificações anteriores",
      "RG e CPF",
    ],
    suggestedTasks: [
      { title: "Enviar notificação extrajudicial", dueInDays: 5 },
      { title: "Aguardar resposta (15 dias úteis)", dueInDays: 20 },
    ],
  },
  {
    id: "previdenciario",
    label: "Previdenciário",
    description:
      "Benefício do INSS — aposentadoria, auxílio-doença, BPC, revisão.",
    titlePlaceholder: "Benefício previdenciário - {cliente}",
    type: "Previdenciário",
    nextStep:
      "Levantar CNIS e laudos médicos. Tentar pelo administrativo primeiro.",
    suggestedDocuments: [
      "Extrato CNIS atualizado",
      "Laudos médicos e exames",
      "Carteiras de trabalho antigas",
      "Comprovantes de contribuição como autônomo",
      "RG e CPF",
    ],
    suggestedTasks: [
      { title: "Protocolar pedido administrativo INSS", dueInDays: 5 },
      { title: "Aguardar resposta administrativa", dueInDays: 45 },
    ],
  },
  {
    id: "tributario",
    label: "Tributário",
    description:
      "Defesa em execução fiscal, repetição de indébito, parcelamento.",
    titlePlaceholder: "Defesa tributária - {cliente}",
    type: "Tributário",
    nextStep: "Analisar CDA e verificar prazos de defesa.",
    suggestedDocuments: [
      "Certidão de Dívida Ativa (CDA)",
      "Comprovantes de pagamento",
      "Declarações fiscais (DCTF, DEFIS, etc.)",
      "Procuração com poderes específicos",
    ],
    suggestedTasks: [
      { title: "Apresentar embargos / impugnação", dueInDays: 30 },
    ],
  },
  {
    id: "criminal",
    label: "Criminal",
    description: "Defesa em ação penal, queixa-crime ou investigação policial.",
    titlePlaceholder: "Defesa criminal - {cliente}",
    type: "Criminal",
    nextStep: "Acompanhar inquérito e preparar defesa preliminar.",
    suggestedDocuments: [
      "Boletim de ocorrência (se houver)",
      "Cópia da denúncia",
      "Documentos pessoais",
      "Comprovante de residência fixa",
      "Antecedentes criminais",
    ],
    suggestedTasks: [
      { title: "Resposta à acusação", dueInDays: 10 },
    ],
  },
  {
    id: "empresarial",
    label: "Empresarial",
    description:
      "Constituição de sociedade, alteração contratual, dissolução.",
    titlePlaceholder: "Assessoria empresarial - {cliente}",
    type: "Empresarial",
    nextStep: "Confirmar dados dos sócios e elaborar contrato social.",
    suggestedDocuments: [
      "RG e CPF dos sócios",
      "Comprovante de endereço da empresa",
      "Cartão CNPJ (se já existir)",
      "Contrato social atual (se for alteração)",
    ],
    suggestedTasks: [
      { title: "Enviar minuta para revisão dos sócios", dueInDays: 7 },
      { title: "Protocolar na Junta Comercial", dueInDays: 15 },
    ],
  },
];

export function getTemplateById(id: string): CaseTemplate | undefined {
  return CASE_TEMPLATES.find((t) => t.id === id);
}
