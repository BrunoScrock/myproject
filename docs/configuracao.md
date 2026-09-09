# Configuração do Projeto

## Variáveis de Ambiente

O projeto utiliza Vite para gerenciar variáveis de ambiente.

### Arquivo `.env`

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
VITE_AUTHORIZED_EMAIL=seu-email@gmail.com
```

### Campos

| Variável | Descrição | Onde encontrar |
|----------|-----------|----------------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | Supabase > Settings > API |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase | Supabase > Settings > API |
| `VITE_AUTHORIZED_EMAIL` | Email autorizado a acessar o sistema | Definir manualmente |

## Configuração Central

As variáveis são centralizadas em `assets/js/config.js`:

```javascript
export const CONFIG = {
    authorizedEmail: import.meta.env.VITE_AUTHORIZED_EMAIL || "",
    supabase: {
        url: import.meta.env.VITE_SUPABASE_URL || "",
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ""
    }
};
```

## Google Cloud Console

### Criar OAuth Client

1. Acesse [console.cloud.google.com](https://console.cloud.google.com/)
2. Crie projeto
3. Ative API Google+
4. Crie OAuth 2.0 Client ID (Web application)
5. Redirect URI: `https://[project-id].supabase.co/auth/v1/callback`

### Supabase Auth

1. Authentication > Providers > Google
2. Cole Client ID e Client Secret
3. Save

### URLs de Redirecionamento

No Supabase > Authentication > URL Configuration:
- Site URL: `http://localhost:3000` (dev) ou URL do deploy
- Redirect URLs: mesma URL do Site URL

## Hospedagem

### GitHub Pages

1. Suba o código no GitHub
2. Build: `npm run build`
3. Deploy a pasta `dist/` na branch `gh-pages`
4. Configure a URL do Supabase com o domínio do GitHub Pages

### Cloudflare Pages

1. Conecte o repositório
2. Build command: `npm run build`
3. Output directory: `dist`
4. Adicione variáveis de ambiente no painel

### Netlify / Vercel

1. Conecte o repositório
2. Configure build e output
3. Adicione variáveis de ambiente
