/**
 * send-task-reminders
 * Envia um aviso por e-mail para as tarefas agendadas que chegaram na data final.
 *
 * Agendamento: pg_cron chama esta funcao via pg_net (ver docs/email-reminders.sql).
 * Cada tarefa recebe UM e-mail; `email_sent = true` impede reenvio.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const authorizedEmail = Deno.env.get("AUTHORIZED_EMAIL") ?? "";
const appToken = Deno.env.get("REMINDER_SECRET") ?? "";
const senderEmail = Deno.env.get("REMINDER_FROM") ?? "Sistema de Anotações <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

/** Escapa texto para interpolar com seguranca no corpo HTML do e-mail. */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateBr(iso) {
  if (!iso) return "-";
  const [y, m, d] = String(iso).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

function buildEmailHtml(task, today) {
  const titulo = escapeHtml(task.title || "Tarefa sem título");
  const descricao = escapeHtml(task.description || "Sem descrição.");
  const data = escapeHtml(formatDateBr(task.due_date));

  const atraso = task.due_date && task.due_date < today
    ? `<p style="margin:0 0 12px;color:#b91c1c;font-weight:600;">
         Esta tarefa está <strong>atrasada</strong>.
       </p>`
    : `<p style="margin:0 0 12px;color:#0f766e;font-weight:600;">
         A data final desta tarefa é <strong>hoje</strong>.
       </p>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:24px;background:#fafafa;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr><td>
      <div style="background:#0f766e;color:#ffffff;padding:18px 22px;border-radius:10px 10px 0 0;">
        <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;font-weight:600;">
          Sistema de Anotações
        </div>
        <div style="font-size:19px;font-weight:700;margin-top:4px;">Aviso de tarefa agendada</div>
      </div>

      <div style="background:#ffffff;padding:24px;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 10px 10px;">
        ${atraso}
        <h2 style="margin:0 0 10px;font-size:18px;color:#18181b;line-height:1.35;">${titulo}</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#71717a;line-height:1.6;white-space:pre-wrap;">${descricao}</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background:#f4f4f5;border-radius:8px;border-left:3px solid #0f766e;">
          <tr><td style="padding:12px 14px;font-size:13px;color:#71717a;">
            Data final
            <div style="font-size:16px;font-weight:700;color:#0f766e;margin-top:2px;">${data}</div>
          </td></tr>
        </table>

        <p style="margin:18px 0 0;font-size:13px;color:#a1a1aa;line-height:1.6;">
          Acesse o sistema para revisar, editar ou concluir esta tarefa.
        </p>
      </div>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const token = req.headers.get("x-app-token") ?? "";
  if (!appToken || token !== appToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  if (!resendApiKey || !authorizedEmail || !supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Credenciais nao configuradas no Edge Function" }),
      { status: 500, headers: corsHeaders }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const today = new Date().toISOString().slice(0, 10);

  const { data: tasks, error } = await supabase
    .from("scheduled_tasks")
    .select("id, title, description, due_date")
    .lte("due_date", today)
    .eq("email_sent", false);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  const results = [];

  for (const task of tasks ?? []) {
    const subject = task.due_date && task.due_date < today
      ? `Atrasada: ${task.title || "Tarefa agendada"}`
      : `Hoje: ${task.title || "Tarefa agendada"}`;

    let response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: senderEmail,
          to: [authorizedEmail],
          subject,
          html: buildEmailHtml(task, today),
        }),
      });
    } catch (err) {
      console.error("Falha de rede ao enviar e-mail:", err?.message ?? err);
      results.push({ id: task.id, status: "falha", detail: "erro de rede" });
      continue;
    }

    if (response.ok) {
      // Marca como enviado para não repetir no próximo ciclo do cron
      const { error: updateError } = await supabase
        .from("scheduled_tasks")
        .update({ email_sent: true })
        .eq("id", task.id);

      if (updateError) {
        console.error("Falha ao marcar email_sent:", updateError.message);
        results.push({ id: task.id, status: "parcial", detail: "enviou mas nao marcou" });
      } else {
        results.push({ id: task.id, status: "enviado" });
      }
    } else {
      results.push({
        id: task.id,
        status: "falha",
        detail: await response.text(),
      });
    }
  }

  return new Response(
    JSON.stringify({
      checkedAt: today,
      total: tasks?.length ?? 0,
      results,
    }),
    { status: 200, headers: corsHeaders }
  );
});