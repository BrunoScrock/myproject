import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const authorizedEmail = Deno.env.get("AUTHORIZED_EMAIL") ?? "";
const appToken = Deno.env.get("REMINDER_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const token = req.headers.get("x-app-token") ?? "";
  if (token !== appToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
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
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  const results = [];
  for (const task of tasks ?? []) {
    const title = (task.title || "Tarefa sem titulo").replace(/</g, "&lt;");
    const desc = (task.description || "Sem descricao.").replace(/</g, "&lt;");
    const due = task.due_date || today;

    const resResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Lembretes <onboarding@resend.dev>",
        to: [authorizedEmail],
        subject: `Lembrete: ${title}`,
        html: `
          <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #f7f9fc; border-radius: 12px;">
            <div style="background: #2563EB; color: #fff; padding: 16px 20px; border-radius: 8px;">
              <strong style="font-size: 18px;">Sistema de Anotacoes - Lembrete de Tarefa</strong>
            </div>
            <div style="background: #fff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 12px;">
              <h2 style="margin: 0 0 8px; color: #1e293b;">${title}</h2>
              <p style="margin: 0 0 12px; color: #475569; white-space: pre-wrap;">${desc}</p>
              <p style="margin: 0 0 4px; color: #475569;">Data final: <strong style="color: #2563EB;">${due}</strong></p>
            </div>
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 16px;">
              Acesse o sistema para mais detalhes.
            </p>
          </div>
        `,
      }),
    });

    if (resResponse.ok) {
      await supabase.from("scheduled_tasks").update({ email_sent: true }).eq("id", task.id);
      results.push({ id: task.id, status: "enviado" });
    } else {
      results.push({ id: task.id, status: "falha", detail: await resResponse.text() });
    }
  }

  return new Response(JSON.stringify({ checkedAt: today, results }), { status: 200, headers: corsHeaders });
});