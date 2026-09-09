-- =============================================
-- LEMBRETES POR EMAIL - TAREFAS AGENDADAS
-- Rode este script no SQL Editor do Supabase.
-- Altere <PROJECT_REF> e <SEU_TOKEN_REMINDER_SECRET>.
-- =============================================

-- 1) Coluna para marcar o envio do email (uma vez por tarefa)
ALTER TABLE public.scheduled_tasks ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;

-- 2) Habilitar as extensoes necessarias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3) Agendar a execucao da Edge Function a cada 2 horas.
--    O pg_net "acorda" a Edge Function, que envia os emails via Resend.
--    (substitua <PROJECT_REF> e <SEU_TOKEN_REMINDER_SECRET>)
SELECT cron.schedule(
    'send-task-reminders',
    '0 */2 * * *',
    $$ SELECT net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-task-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-app-token', '<SEU_TOKEN_REMINDER_SECRET>'
        ),
        body := '{}'
    ) $$
);

-- 4) (Opcional) Remover o agendamento, se um dia quiser desativar:
-- SELECT cron.unschedule('send-task-reminders');