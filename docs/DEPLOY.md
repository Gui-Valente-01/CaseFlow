# Deploy do CaseFlow

Guia rápido para subir o projeto em produção. A stack default é
**Vercel + Supabase**, mas o Next padrão funciona em qualquer host
que aceite Node (Railway, Fly.io, AWS, etc.).

## 1. Preparar o Supabase de produção

> Recomendado: ter um projeto separado para **staging** antes de subir
> migrations no de produção.

1. Crie um projeto novo em [supabase.com](https://supabase.com).
2. Rode todas as migrations em ordem no SQL Editor:
   - `docs/schema.sql`
   - `docs/migration-v2-client-portal.sql`
   - `docs/migration-v3-storage.sql`
   - `docs/migration-v4-private-notes.sql`
   - `docs/migration-v5-document-rejection-reason.sql`
   - `docs/migration-v6-agenda-notifications.sql`
   - `docs/migration-v7-realtime-messages.sql`
   - `docs/migration-v8-message-attachments.sql`
   - `docs/migration-v9-audit-and-team.sql`
   - `docs/migration-v10-client-internal-notes.sql`
   - `docs/migration-v11-realtime-more.sql`
3. Anote os valores em **Project Settings → API**:
   - `URL`
   - `anon` key
   - `service_role` key (sensível — só no servidor)
4. Em **Storage**, confira que o bucket `documents` existe (criado pelo
   schema). Se não, crie manualmente como **privado**.

## 2. Deploy no Vercel

1. Faça login em [vercel.com](https://vercel.com) com o GitHub.
2. **Import Project** → escolha o repositório do CaseFlow.
3. Em **Environment Variables**, adicione:

   | Nome | Valor | Onde |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production + Preview |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Production + Preview |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | **Production só** (sensível) |
   | `NEXT_PUBLIC_SITE_URL` | `https://seudominio.com` | Production + Preview |
   | `RESEND_API_KEY` | `re_...` (opcional) | Production só |
   | `EMAIL_FROM` | `CaseFlow <noreply@seudominio.com>` (opcional) | Production só |

4. Deixe o **framework preset** como Next.js. Não mexa em build command
   nem output directory.
5. **Deploy**.

Após o primeiro deploy:
- Anote a URL de produção (`xxx.vercel.app` ou seu domínio).
- Atualize `NEXT_PUBLIC_SITE_URL` se mudou.
- No Supabase → **Authentication → URL Configuration**, adicione a URL
  em **Redirect URLs** para os links de recuperação de senha funcionarem.

## 3. Domínio próprio

1. Compre o domínio em qualquer registrar (Registro.br, Cloudflare, GoDaddy).
2. No Vercel → **Project → Settings → Domains**, adicione o domínio.
3. Configure os DNS conforme o Vercel pedir (geralmente um `CNAME`).
4. Atualize `NEXT_PUBLIC_SITE_URL` e `EMAIL_FROM` pra refletir.

## 4. E-mail transacional (Resend)

Sem isso, convites de equipe e notificações por e-mail não saem.

1. Crie conta em [resend.com](https://resend.com) — 3.000 e-mails/mês grátis.
2. Em **Domains**, adicione `seudominio.com` e configure os DNS exigidos
   (SPF, DKIM). Resend orienta na tela.
3. Aguarde verificação (15 min a algumas horas).
4. Crie uma **API key** e adicione como `RESEND_API_KEY` no Vercel.
5. Defina `EMAIL_FROM=CaseFlow <noreply@seudominio.com>`.

> Pra teste rápido sem domínio: usa `onboarding@resend.dev` como
> `EMAIL_FROM` — porém só envia pro e-mail dono da conta Resend.

## 5. Checklist pós-deploy

- [ ] Cadastro de novo advogado funciona.
- [ ] Login funciona.
- [ ] Criar cliente com senha inicial funciona (precisa `SUPABASE_SERVICE_ROLE_KEY`).
- [ ] Cliente loga em `/cliente/acesso` com CPF/CNPJ.
- [ ] Upload de documento funciona (precisa bucket `documents` existir).
- [ ] Realtime no chat funciona (precisa migrations v7 e v11).
- [ ] OG image aparece ao colar o link no WhatsApp.
- [ ] CI no GitHub roda verde.

## 6. Atualizando depois

1. `git push` para `main`.
2. Vercel detecta e faz deploy automaticamente.
3. Se mudou o schema, rode a nova migration no Supabase de produção e
   rode `npm run gen:types` localmente, commitando o resultado.

## 7. Backup

- **Banco**: Supabase faz backup diário automático no plano Pro. No plano
  free, exporte manualmente em **Settings → Database → Backups**.
- **Storage**: arquivos do bucket `documents` precisam de backup separado.
  Use a CLI ou o painel pra baixar periodicamente, especialmente antes
  de mudanças grandes.

## 8. Custos esperados (escritório pequeno)

- Vercel Hobby: grátis até 100GB/mês de bandwidth.
- Supabase Free: até 500MB DB + 1GB Storage. Suficiente para começar.
- Resend Free: 3k e-mails/mês.
- Domínio: ~R$ 40-80/ano.

**Total inicial: ~R$ 5-7/mês** (só o domínio diluído).
