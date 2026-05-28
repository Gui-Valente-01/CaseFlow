# Portal Juridico - Visao de Produto

## Posicionamento

Portal Juridico e um SaaS para escritorios de advocacia que querem reduzir desorganizacao operacional e melhorar a comunicacao com clientes.

O produto nao deve ser apenas um cadastro de processos. Ele deve funcionar como um portal de relacionamento entre escritorio e cliente, reunindo acompanhamento processual, documentos, mensagens, prazos e historico de atendimento.

## Publico-alvo

- Advogados autonomos que precisam parecer mais profissionais para o cliente.
- Pequenos e medios escritorios que ainda dependem de WhatsApp, planilhas e pastas soltas.
- Clientes que querem acompanhar o proprio caso sem precisar cobrar atualizacao toda hora.

## Promessa principal

Dar ao advogado uma central de controle do escritorio e dar ao cliente um portal simples para entender o andamento do processo, enviar documentos e conversar com o advogado.

## Fluxo principal do produto

1. Advogado cria conta.
2. Advogado acessa o dashboard.
3. Advogado cadastra clientes.
4. Advogado cria processos para esses clientes.
5. Advogado solicita documentos e registra atualizacoes.
6. Cliente recebe convite para acessar o portal.
7. Cliente acompanha status, envia documentos e troca mensagens.
8. Advogado gerencia tudo pelo painel.

Esse fluxo deve ser tratado como o coracao do sistema. Toda feature nova precisa fortalecer esse caminho.

## Modulos do MVP

### Autenticacao e acesso

- Cadastro de advogado administrador.
- Login de advogado.
- Login de cliente por convite.
- Perfis com papeis: `owner`, `lawyer`, `client`.
- Redirecionamento por papel: advogado para `/dashboard`, cliente para `/cliente`.

### Dashboard do advogado

- Visao geral do escritorio.
- Cards de metricas: clientes, processos ativos, documentos pendentes e mensagens nao lidas.
- Atalhos para criar cliente e processo.
- Lista de processos recentes.
- Area futura para prazos e tarefas.

### Clientes

- Cadastro e edicao de cliente.
- Dados principais: nome, email, telefone, documento e observacoes.
- Vinculo com processos.
- Convite para acesso ao portal do cliente.

### Processos

- Cadastro e edicao de processo.
- Campos principais: cliente, numero, titulo, tipo, status e proximo passo.
- Linha do tempo de atualizacoes.
- Documentos vinculados.
- Mensagens vinculadas ao processo.

### Documentos

- Solicitar documento ao cliente.
- Marcar status: pendente, recebido, aprovado ou rejeitado.
- Futuramente: upload real via Supabase Storage.

### Mensagens

- Conversa vinculada ao processo.
- Historico preservado.
- Indicador de mensagens nao lidas.
- Diferenciar remetente advogado/cliente.

### Portal do cliente

- Mostrar somente dados do cliente logado.
- Status dos processos.
- Linha do tempo.
- Documentos pendentes.
- Mensagens com o escritorio.

### Configuracoes do escritorio

- Dados da organizacao.
- Dados do advogado.
- Area de atuacao.
- Futuramente: equipe, permissoes, plano e cobranca.

## Regras de produto

- O cliente nunca deve ver dados de outros clientes.
- O advogado deve ver apenas dados da propria organizacao.
- Toda informacao relevante de um processo deve ficar vinculada ao processo.
- Mensagens e documentos devem ser rastreaveis.
- O sistema deve evitar estados silenciosos: se algo falhar, mostrar mensagem clara.
- O fluxo de login/cadastro deve ser simples antes de ser sofisticado.

## Tom e experiencia

- Profissional, sobrio e confiavel.
- Interface clara, sem exagero visual.
- Texto direto e humano.
- Evitar linguagem tecnica para o cliente.
- Evitar cara de landing page dentro do app.
- O dashboard deve parecer uma ferramenta de trabalho real.

## Roadmap sugerido

### Fase 1 - Base confiavel

- Corrigir login/cadastro definitivamente.
- Garantir criacao automatica de `profiles` e `organizations`.
- Melhorar mensagens de erro.
- Revisar redirecionamento por papel.
- Documentar configuracao do Supabase.

### Fase 2 - Produto utilizavel

- Melhorar dashboard.
- Criar pagina detalhada de cliente mais completa.
- Melhorar pagina detalhada de processo.
- Finalizar linha do tempo, documentos e mensagens.
- Criar fluxo de convite do cliente.

### Fase 3 - Portal do cliente forte

- Separar visao por cliente autenticado.
- Criar tela de documentos pendentes.
- Criar mensagens por processo.
- Melhorar status visual do processo.

### Fase 4 - Operacao de escritorio

- Prazos e tarefas.
- Busca global.
- Filtros por status.
- Notificacoes internas.
- Equipe e permissoes.

### Fase 5 - SaaS comercial

- Planos.
- Limites por plano.
- Assinatura via Stripe.
- Painel de cobranca.
- Onboarding guiado.
