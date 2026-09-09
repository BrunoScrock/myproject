# Sistema de Anotações e E-Protocolo

Sistema pessoal web para organização de tarefas, anotações e geração de despachos do E-Protocolo.

## Funcionalidades

- **Tarefas do Dia** - Crie, edite, copie e exclua tarefas diárias
- **Tarefas Agendadas** - Programe tarefas com data final e receba notificações
- **Auditoria do Sistema** - Histórico completo de tudo que foi criado, alterado ou excluído (veja [docs/audit.sql](docs/audit.sql))
- **Anotações Fixas** - Mantenha anotações importantes organizadas com cores
- **Gerador de Despachos** - Gere despachos para Liberação de Sistema e Ausência de Perfil
- **Conversor de Horas** - Converta entre horário normal (H:MM) e horas decimais, e vice-versa
- **Removedor de Caracteres** - Limpe números, CPFs, processos etc.
- **Modo Claro/Escuro** - Tema personalizável
- **Autenticação Google** - Login seguro via Supabase Auth
- **Banco de Dados Persistente** - Dados salvos no Supabase PostgreSQL
- **Migração Automática** - Importe dados do localStorage antigo
- **Responsivo** - Funciona em desktop, notebook, tablet e celular

## Pré-requisitos

- [Node.js](https://nodejs.org/) (v18+)
- Conta no [Supabase](https://supabase.com/)
- Projeto no [Google Cloud Console](https://console.cloud.google.com/)

## Instalação

```bash
cd sistema-anotacoes-eprotocolo
npm install
```

## Configuração

### 1. Variáveis de Ambiente

Copie o arquivo de exemplo e preencha com seus dados:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
VITE_AUTHORIZED_EMAIL=seu-email@gmail.com
```

### 2. Configuração do Supabase

Consulte [docs/supabase.md](docs/supabase.md) para o guia completo.

### 3. Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto ou selecione um existente
3. Ative a API do Google+
4. Crie credenciais OAuth 2.0
5. Configure o Redirect URI no Supabase

## Desenvolvimento

```bash
npm run dev
```

O servidor será iniciado em `http://localhost:3000`.

## Build

```bash
npm run build
```

O output será gerado na pasta `dist/`.

## Deploy

### GitHub Pages

```bash
npm run build
# Envie a pasta dist/ para a branch gh-pages
```

### Cloudflare Pages / Netlify / Vercel

1. Conecte o repositório GitHub
2. Configure o build command: `npm run build`
3. Configure o output directory: `dist`
4. Adicione as variáveis de ambiente no painel da plataforma

## Estrutura do Projeto

```
sistema-anotacoes-eprotocolo/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── .gitignore
├── README.md
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── config.js
│   │   ├── supabase.js
│   │   ├── auth.js
│   │   ├── tasks.js
│   │   ├── scheduled-tasks.js
│   │   ├── fixed-notes.js
│   │   ├── eprotocolo.js
│   │   ├── hours.js
│   │   ├── audit.js
│   │   ├── migration.js
│   │   └── app.js
│   └── icons/
└── docs/
    ├── supabase.sql
    ├── audit.sql
    ├── supabase.md
    └── configuracao.md
```

## Segurança

- Autenticação exclusiva via Google OAuth (Supabase Auth)
- Apenas um e-mail autorizado pode acessar o sistema
- Todas as tabelas protegidas com Row Level Security (RLS)
- Chave `service_role` nunca exposta no frontend
- Dados vinculados ao `user_id` do Supabase Auth

## Tecnologias

- HTML5 / CSS3 / JavaScript (ES6 Modules)
- [Supabase](https://supabase.com/) - Auth + PostgreSQL
- [Vite](https://vitejs.dev/) - Dev server e build
- Google Material Icons
- Fonte Inter
