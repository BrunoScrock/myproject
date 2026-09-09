-- =============================================
-- SISTEMA PESSOAL DE ANOTACOES E E-PROTOCOLO
-- SQL para Supabase PostgreSQL
-- =============================================

-- Habilitar extensao UUID (geralmente ja habilitada no Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELA: tasks (Tarefas do Dia)
-- =============================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(user_id, position);

-- =============================================
-- TABELA: scheduled_tasks (Tarefas Agendadas)
-- =============================================
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT '',
    description TEXT DEFAULT '',
    due_date DATE,
    notification_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_user_id ON scheduled_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_due_date ON scheduled_tasks(user_id, due_date);

-- =============================================
-- TABELA: fixed_notes (Anotacoes Fixas)
-- =============================================
CREATE TABLE IF NOT EXISTS fixed_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    color TEXT DEFAULT 'default',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fixed_notes_user_id ON fixed_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_fixed_notes_position ON fixed_notes(user_id, position);

-- =============================================
-- TABELA: dispatch_templates (Modelos de Despacho)
-- =============================================
CREATE TABLE IF NOT EXISTS dispatch_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    template TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_templates_user_id ON dispatch_templates(user_id);

-- =============================================
-- TABELA: dispatch_history (Historico de Despachos)
-- =============================================
CREATE TABLE IF NOT EXISTS dispatch_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    generated_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_history_user_id ON dispatch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_history_created_at ON dispatch_history(user_id, created_at DESC);

-- =============================================
-- FUNCAO: updated_at trigger
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_tasks_updated_at BEFORE UPDATE ON scheduled_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fixed_notes_updated_at BEFORE UPDATE ON fixed_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dispatch_templates_updated_at BEFORE UPDATE ON dispatch_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLICIES: tasks
-- =============================================
CREATE POLICY "Users can view their own tasks"
    ON tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
    ON tasks FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- POLICIES: scheduled_tasks
-- =============================================
CREATE POLICY "Users can view their own scheduled_tasks"
    ON scheduled_tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled_tasks"
    ON scheduled_tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled_tasks"
    ON scheduled_tasks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled_tasks"
    ON scheduled_tasks FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- POLICIES: fixed_notes
-- =============================================
CREATE POLICY "Users can view their own fixed_notes"
    ON fixed_notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fixed_notes"
    ON fixed_notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fixed_notes"
    ON fixed_notes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fixed_notes"
    ON fixed_notes FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- POLICIES: dispatch_templates
-- =============================================
CREATE POLICY "Users can view their own dispatch_templates"
    ON dispatch_templates FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dispatch_templates"
    ON dispatch_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dispatch_templates"
    ON dispatch_templates FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dispatch_templates"
    ON dispatch_templates FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- POLICIES: dispatch_history
-- =============================================
CREATE POLICY "Users can view their own dispatch_history"
    ON dispatch_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dispatch_history"
    ON dispatch_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dispatch_history"
    ON dispatch_history FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dispatch_history"
    ON dispatch_history FOR DELETE
    USING (auth.uid() = user_id);
