-- =============================================================
-- LEMBRETES POR E-MAIL - TAREFAS AGENDADAS
-- Rode no Supabase Dashboard > SQL Editor > New query
-- Etapa 1 e Etapa 2, nesta ordem.
-- =============================================================

-- =============================================================
-- ETAPA 1 - Gerar e guardar o segredo de acesso a funcao
-- Copie o valor exibido em "reminder_secret" e guarde.
-- Voce vai precisar dele na Etapa 3 (Secrets da Edge Function).
-- =============================================================

DO $$
DECLARE
    novo_segredo TEXT := encode(gen_random_bytes(32), 'hex');
BEGIN
    EXECUTE format(
        'ALTER DATABASE postgres SET "app.reminder_secret" = %L',
        novo_segredo
    );
    RAISE NOTICE 'Copie este valor para a Etapa 3 -> REMINDER_SECRET: %', novo_segredo;
END $$;

-- Se a mensagem acima nao aparecer, consulte direto:
SELECT current_setting('app.reminder_secret', true) AS reminder_secret;

-- ⚠ Se "ALTER DATABASE ... SET" nao for permitido no seu plano,
--   pule a Etapa 1 e use o metodo simples da Etapa 2b.


-- =============================================================
-- ETAPA 2 - Estrutura do banco e agendamento
-- =============================================================

-- 2.1) Coluna que garante UM e-mail por tarefa
ALTER TABLE public.scheduled_tasks
    ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;

-- 2.2) Extensoes necessarias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2.3) (Opcional) Agenda mais frequente = aviso mais rapido.
--      Padrao deste projeto: 1x por hora, no minuto 0.
CREATE OR REPLACE FUNCTION public.app_reminder_cron() RETURNS void AS $$
BEGIN
    PERFORM net.http_post(
        url := 'https://cvfbhwvabefahsuslncm.supabase.co/functions/v1/send-task-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-app-token', current_setting('app.reminder_secret', true)
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
    );
END;
$$ LANGUAGE plpgsql;

-- 2.4) Cria/atualiza o agendamento (idempotente)
SELECT cron.unschedule('send-task-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-task-reminders');

SELECT cron.schedule(
    'send-task-reminders',
    '0 * * * *',          -- a cada hora, no minuto 0
    'SELECT public.app_reminder_cron();'
);

-- 2.5) Confirma o agendamento
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'send-task-reminders';


-- =============================================================
-- ETAPA 2b - SEM o segredo (alternativa mais simples)
-- Use esta se a Etapa 1 falhar.
-- Rode APENAS o trecho abaixo e troque <SEU_SEGREDO> pelo valor
-- que voce vai definir tambem na Etapa 3.
-- =============================================================
/*
SELECT cron.unschedule('send-task-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-task-reminders');

SELECT cron.schedule(
    'send-task-reminders',
    '0 * * * *',
    $$ SELECT net.http_post(
        url := 'https://cvfbhwvabefahsuslncm.supabase.co/functions/v1/send-task-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-app-token', '<SEU_SEGREDO>'
        ),
        body := '{}'::jsonb
    ) $$
);
*/


-- =============================================================
-- DESATIVAR
-- =============================================================
-- SELECT cron.unschedule('send-task-reminders');