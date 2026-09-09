# Configuração do Supabase

Guia passo a passo para configurar o Supabase com autenticação Google e banco de dados.

## 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com/) e faça login
2. Clique em **New Project**
3. Preencha:
   - **Organization**: selecione ou crie uma organização
   - **Project name**: `sistema-anotacoes-eprotocolo` (ou outro nome)
   - **Database Password**: defina uma senha segura
   - **Region**: selecione a região mais próxima
4. Aguarde a criação do projeto

## 2. Obter URL e Chave Anon

Após criar o projeto:

1. Acesse **Settings** > **API**
2. Copie:
   - **Project URL** (ex: `https://abcde.supabase.co`)
   - **Project API Keys** > **anon public**

3. Cole no arquivo `.env`:

```env
VITE_SUPABASE_URL=https://abcde.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_AUTHORIZED_EMAIL=seu-email@gmail.com
```

## 3. Executar SQL

1. Acesse o **SQL Editor** no painel do Supabase
2. Copie todo o conteúdo do arquivo `docs/supabase.sql`
3. Cole no editor SQL
4. Clique em **Run** para executar

Isso criará:
- Tabela `tasks`
- Tabela `scheduled_tasks`
- Tabela `fixed_notes`
- Tabela `dispatch_templates`
- Tabela `dispatch_history`
- Índices para performance
- Triggers de `updated_at`
- Row Level Security (RLS) em todas as tabelas
- Policies para acesso exclusivo do usuário

## 4. Configurar Autenticação Google

### 4.1 Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. No menu lateral, acesse **APIs & Services** > **Library**
4. Pesquise e ative a API **Google+ API** (ou **Google Identity**)
5. Acesse **APIs & Services** > **Credentials**
6. Clique em **Create Credentials** > **OAuth client ID**
7. Se solicitado, configure a **OAuth consent screen**:
   - **User Type**: External
   - **App Name**: Sistema de Anotações
   - **Email**: seu email
   - **Scopes**: adicionar `email` e `profile`
8. Crie o **OAuth Client ID**:
   - **Application type**: Web application
   - **Name**: Sistema de Anotações
   - **Authorized redirect URIs**: adicione a URL do Supabase:
     ```
     https://abcde.supabase.co/auth/v1/callback
     ```
     (substitua `abcde` pelo ID do seu projeto)
9. Copie o **Client ID** e **Client Secret**

### 4.2 Supabase Auth

1. No painel do Supabase, acesse **Authentication** > **Providers**
2. Encontre **Google** e ative-o
3. Cole:
   - **Client ID**: o Client ID do Google Cloud
   - **Client Secret**: o Client Secret do Google Cloud
4. Clique em **Save**

### 4.3 URLs de Redirecionamento

1. No Supabase, acesse **Authentication** > **URL Configuration**
2. Configure:
   - **Site URL**: URL do seu site (ex: `https://seudominio.com` ou `http://localhost:3000` para desenvolvimento)
   - **Redirect URLs**: adicione as URLs para redirecionamento após login:
     - `http://localhost:3000` (desenvolvimento)
     - `https://seudominio.com` (produção)

## 5. Proteção do Email Autorizado

O sistema valida o email no frontend (`assets/js/config.js`). Para adicionar uma camada extra de segurança:

### Opção A: Database Function (Recomendado)

No SQL Editor, crie uma função que verifica o email:

```sql
CREATE OR REPLACE FUNCTION check_authorized_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email != 'seu-email@gmail.com' THEN
        RAISE EXCEPTION 'Unauthorized user';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Opção B: Auth Hook

Configure um Auth Hook no Supabase para verificar o email antes de criar a sessão.

## 6. Testar

1. Execute `npm run dev`
2. Acesse `http://localhost:3000`
3. Clique em **Entrar com Google**
4. Faça login com a conta autorizada
5. Verifique se o sistema carrega corretamente
6. Teste criar tarefas, anotações e despachos

## Solução de Problemas

### Login não funciona

- Verifique se o Google OAuth está configurado corretamente
- Confirme as URLs de redirecionamento
- Verifique o console do navegador para erros

### Dados não são salvos

- Verifique se o SQL foi executado corretamente
- Confirme que as tabelas existem (Settings > Table Editor)
- Verifique as RLS policies

### Erro "Unauthorized"

- Verifique se o email em `config.js` está correto
- Confirme que está logando com a conta Google correta
