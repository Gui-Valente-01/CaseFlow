# Regras Para Agentes

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Portal Juridico

Este repositorio e o site oficial do CaseFlow.

Fonte oficial de contexto do produto:

- `C:\Users\Win 11\Desktop\Sistema de advogado\CaseFlow\caseflow-brain`

Antes de alterar codigo, consulte principalmente:

- `C:\Users\Win 11\Desktop\Sistema de advogado\CaseFlow\caseflow-brain\README.md`
- `C:\Users\Win 11\Desktop\Sistema de advogado\CaseFlow\caseflow-brain\00-central\painel-principal-caseflow.md`
- `C:\Users\Win 11\Desktop\Sistema de advogado\CaseFlow\caseflow-brain\07-prompts\prompt-mestre-caseflow.md`
- `C:\Users\Win 11\Desktop\Sistema de advogado\CaseFlow\caseflow-brain\01-visao-produto\roadmap.md`
- `C:\Users\Win 11\Desktop\Sistema de advogado\CaseFlow\caseflow-brain\04-banco-dados\modelo-inicial.md`
- `C:\Users\Win 11\Desktop\Sistema de advogado\CaseFlow\caseflow-brain\02-regras-negocio\permissoes.md`
- `C:\Users\Win 11\Desktop\Sistema de advogado\CaseFlow\caseflow-brain\05-desenvolvimento\stack.md`
- `C:\Users\Win 11\Desktop\Sistema de advogado\CaseFlow\caseflow-brain\05-desenvolvimento\arquitetura.md`

Se tomar uma decisao importante de produto, regra, banco ou arquitetura,
atualize tambem a nota correspondente no cerebro. Se encontrar e resolver um
erro relevante, registre em:

- `C:\Users\Win 11\Desktop\Sistema de advogado\CaseFlow\caseflow-brain\08-erros-solucoes\log-de-erros.md`

Antes de implementar qualquer funcionalidade, leia:

- `docs/SYSTEM_BASE.md`
- `docs/PRODUCT_VISION.md`
- `docs/schema.sql`

O produto e um SaaS juridico para advogados acompanharem clientes, processos, documentos e mensagens. O fluxo central e:

Advogado cria conta -> entra no dashboard -> cadastra cliente -> cria processo -> solicita documentos -> cliente acessa portal -> cliente envia documentos/mensagens -> advogado acompanha tudo.

## Regras importantes

- Nao adicionar bibliotecas externas sem motivo forte.
- Usar TypeScript, Tailwind CSS e App Router.
- Preservar dados por `organization_id`.
- Separar visao do advogado e visao do cliente.
- Login/cadastro precisam ser simples, previsiveis e sem falhas silenciosas.
- Toda tela profissional deve ter estados vazios e mensagens de erro claras.
- Nao reverter alteracoes de outro agente ou do usuario.
- Depois de mudancas de codigo, rodar `npm run lint`.
- Rodar `npm run build` quando a mudanca afetar rotas, dados ou componentes compartilhados.

## Prioridades atuais

1. Fechar login/cadastro e criacao automatica de perfil.
2. Corrigir textos quebrados por encoding.
3. Criar portal do cliente real em `/cliente`.
4. Completar detalhe de processo com timeline, documentos e mensagens.
5. Criar fluxo de convite do cliente.
6. Melhorar dashboard para pendencias acionaveis.
