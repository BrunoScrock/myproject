# Lembretes por E-mail (Tarefas Agendadas)

Quando uma tarefa agendada chega na data final (ou passa dela), o sistema envia um e-mail de aviso.
O envio é feito por uma **Edge Function** do Supabase, agendada pelo **pg_cron**.

## Como funciona

1. A cada 2 horas, o `pg_cron` chama a Edge Function `send-task-reminders`.
2. A função consulta as tarefas com `due_date <= hoje` que ainda não receberam aviso (`email_sent = false`).
3. Para cada tarefa, envia um e-mail pelo [Resend](https://resend.com).
4. Marca a tarefa como avisada (`email_sent = true`) para não enviar de novo.

## Configuração

### 1) Criar conta no Resend

1. Acesse [resend.com](https://resend.com) e crie uma conta (pode logar com o Google).
2. Copie sua **API Key** em *API Keys* (ex: `re_...`).
3. (Opcional) Verifique um domínio próprio. Sem domínio, use o remetente `onboarding@resend.dev`,
   que só consegue enviar para o e-mail da sua própria conta Resend — suficiente para este uso pessoal.

### 2) Rodar o SQL no Supabase

Abra o Supabase Dashboard → **SQL Editor** → New query e cole o conteúdo de
`docs/email-reminders.sql`, substituindo:

- `<PROJECT_REF>` → o ref do seu projeto (está na URL: `https://<PROJECT_REF>.supabase.co`)
- `<SEU_TOKEN_REMINDER_SECRET>` → uma senha aleatória que você escolher (serve para proteger a função)

### 3) Criar a Edge Function

Opção A — **Dashboard (sem instalar nada)**:

1. Sua SQL Editor → escreva `select current_setting('role')` não precisa. Vá em **Edge Functions** → **Create New Function** → nomeie `send-task-reminders`.
2. Cole o conteúdo de `supabase/functions/send-task-reminders/index.ts`.
3. Em **Secrets** (aba Configure/Deploy), adicione:
   - `RESEND_API_KEY` → sua chave do Resend
   - `AUTHORIZED_EMAIL` → `brunobatistascrock@gmail.com`
   - `REMINDER_SECRET` → o mesmo `<SEU_TOKEN_REMINDER_SECRET>` usado no SQL
   - `SUPABASE_SERVICE_ROLE_KEY` → Settings → API → `service_role` (guardar com segurança)
4. Deploy.

Opção B — **CLI do Supabase**:

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase secrets set RESEND_API_KEY=re_... AUTHORIZED_EMAIL=brunobatistascrock@gmail.com REMINDER_SECRET=...
npx supabase secrets set --env-var-name SUPABASE_SERVICE_ROLE_KEY SUPABASE_SERVICE_ROLE_KEY=<service_role>
npx supabase functions deploy send-task-reminders
```

(No CLI, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetados automaticamente quando a função é publicada sem `--no-verify-jwt`... na dúvida, use a Opção A.)

### 4) Testar

Com um agendamento criado, edite uma **Tarefa Agendada** e coloque a **data final de hoje**.
Espere o próximo horário do cron (ou rode manualmente o comando da etapa 3 do SQL) e confira a caixa de entrada do e-mail.
Também é possível testar na hora chamando a URL da função diretamente:

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/send-task-reminders" \
  -H "x-app-token: <SEU_TOKEN_REMINDER_SECRET>"
```

## Observações

- O e-mail é enviado **uma vez por tarefa** (mesmo que o sistema fique dias sem abrir).
- O horário do cron pode ser ajustado no SQL (`0 */2 * * *` = a cada 2 horas).
- Para desativar: `SELECT cron.unschedule('send-task-reminders');`
- Use `email_sent` na tabela `scheduled_tasks` para controle; a coluna é criada pelo SQL acima.