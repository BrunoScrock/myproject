-- =============================================
-- AUDITORIA DO SISTEMA
-- Rode este script no SQL Editor do Supabase.
-- Registra (insercao, alteracao e exclusao) em
-- todas as tabelas do sistema, mantendo o
-- historico completo dos dados que ja foram salvos.
-- =============================================

-- 1) Tabela de auditoria
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(record_id);

-- 2) Funcao de auditoria (executada pelas triggers)
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    record_id_value UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        record_id_value := OLD.id;
    ELSE
        record_id_value := NEW.id;
    END IF;

    INSERT INTO audit_log (
        table_name,
        record_id,
        operation,
        old_data,
        new_data,
        user_id
    ) VALUES (
        TG_TABLE_NAME,
        record_id_value,
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        auth.uid()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Triggers no schema existente (aplicar identico no docs/supabase.sql p/ instalacoes novas)
DROP TRIGGER IF EXISTS audit_tasks ON tasks;
CREATE TRIGGER audit_tasks
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_scheduled_tasks ON scheduled_tasks;
CREATE TRIGGER audit_scheduled_tasks
    AFTER INSERT OR UPDATE OR DELETE ON scheduled_tasks
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_fixed_notes ON fixed_notes;
CREATE TRIGGER audit_fixed_notes
    AFTER INSERT OR UPDATE OR DELETE ON fixed_notes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_dispatch_templates ON dispatch_templates;
CREATE TRIGGER audit_dispatch_templates
    AFTER INSERT OR UPDATE OR DELETE ON dispatch_templates
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_dispatch_history ON dispatch_history;
CREATE TRIGGER audit_dispatch_history
    AFTER INSERT OR UPDATE OR DELETE ON dispatch_history
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- 4) RLS: somente leitura (append-only) pelo proprio usuario
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own audit_log" ON audit_log;
CREATE POLICY "Users can view their own audit_log"
    ON audit_log FOR SELECT
    USING (auth.uid() = user_id);

-- Observacoes:
-- - Nao ha policies de INSERT/UPDATE/DELETE: o app nao altera o historico.
-- - As triggers rodam como SECURITY DEFINER (proprietario da tabela),
--   portanto gravam em audit_log mesmo com RLS ativo.
-- - Registros criados ANTES deste script (historico antigo) nao aparecem
--   na auditoria; os proximos eventos passam a ser registrados.