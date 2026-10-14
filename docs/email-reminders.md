# Lembretes por E-mail (Tarefas Agendadas)

Quando uma tarefa agendada chega na data final (ou passa dela), o sistema envia um e-mail de aviso.
O envio é feito por uma **Edge Function** do Supabase, agendada pelo **pg_cron**.

## Como funciona

1. A cada hora, o `pg_cron` chama a Edge Function `send-task-reminders`.
2. A função consulta as tarefas com `due_date <= hoje` que ainda não receberam aviso (`email_sent = false`).
3. Para cada tarefa, envia um e-mail pelo [Resend](https://resend.com).
4. Marca a tarefa como avisada (`email_sent = true`) para não enviar de novo.
5. No sistema, o card da tarefa passa a exibir o selo **Aviso enviado**.

## Configuração

### 1) Criar conta no Resend

1. Acesse [resend.com](https://resend.com) e crie uma conta (pode logar com o Google).
2. Copie sua **API Key** em *API Keys* (ex: `re_...`).
3. (Opcional) Verifique um domínio próprio. Sem domínio, use o remetente `onboarding@resend.dev`,
   que só consegue enviar para o e-mail da sua própria conta Resend — suficiente para este uso pessoal.

### 2) Rodar o SQL no Supabase

Supabase Dashboard → **SQL Editor** → **New query** → cole o conteúdo de `docs/email-reminders.sql`.

O script tem duas etapas:

- **Etapa 1** gera um segredo aleatório e o guarda no próprio banco. **Copie o valor exibido** — ele será
  usado na Etapa 3. Se a mensagem não aparecer, consulte `SELECT current_setting('app.reminder_secret', true);`
- **Etapa 2** cria a coluna `email_sent`, habilita `pg_cron`/`pg_net` e agenda a função de hora em hora.
  O `PROJECT_REF` já está preenchido no script.

> Se `ALTER DATABASE ... SET` for bloqueado no seu plano, use a **Etapa 2b** do script: basta trocar
> `<SEU_SEGREDO>` e pular a Etapa 1.

### 3) Publicar a Edge Function

Supabase Dashboard → **Edge Functions** → **Create New Function** → nomeie `send-task-reminders`.
Cole o conteúdo de `supabase/functions/send-task-reminders/index.ts` e adicione os segredos
(aba **Secrets**):

| Segredo | Valor |
|---|---|
| `RESEND_API_KEY` | sua chave do `re_...` |
| `AUTHORIZED_EMAIL` | `brunobatistascrock@gmail.com` |
| `REMINDER_SECRET` | o valor copiado na Etapa 1 |
| `REMINDER_FROM` | opcional — ex: `Avisos <avisos@seudominio.com>` |

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetados automaticamente pelo Supabase.

Depois clique em **Deploy**.

### Alternativa com a CLI

```bash
npx supabase login
npx supabase link --project-ref cvfbhwvabefahsuslncm
npx supabase secrets set RESEND_API_KEY=re_... AUTHORIZED_EMAIL=brunobatistascrock@gmail.com REMINDER_SECRET=<segredo>
npx supabase functions deploy send-task-reminders
```

### 4) Testar

1. Crie uma tarefa agendada com a **data final de hoje**.
2. Verifique em `SELECT * FROM scheduled_tasks WHERE due_date = CURRENT_DATE;` que ela aparece.
3. Dispare na hora (sem esperar o cron):

```bash
curl -X POST "https://cvfbhwvabefahsuslncm.supabase.co/functions/v1/send-task-reminders" \
  -H "x-app-token: <SEU_SEGREDO>"
```

A resposta traz `results` com o status de cada tarefa. Depois de enviar, o `email_sent` vira `true` e o
card ganha o selo **Aviso enviado**.

## Observações

- O e-mail é enviado **uma vez por tarefa** (mesmo que o sistema fique dias sem abrir).
- Se a tarefa já estiver atrasada, o assunto e o corpo indicam **Atrasada**.
- O horário do cron pode ser ajustado no SQL (`0 * * * *` = a cada hora, `0 */2 * * *` = a cada 2 horas).
- Para desativar: `SELECT cron.unschedule('send-task-reminders');`
- Use `email_sent` na tabela `scheduled_tasks` para controle; a coluna é criada pelo SQL acima.