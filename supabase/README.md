# Backend (Supabase) — Fase 1

Este diretório contém as **migrations** (schema + RLS) do Family Location. O código do app
lê as credenciais de `.env` (veja `.env.example` na raiz). Nada aqui expõe segredos.

## O que já está pronto (no repo)
- `migrations/20260902120000_init.sql` — todas as tabelas (§10), papéis (§8), convites (§9),
  triggers, funções `SECURITY DEFINER`, **RLS** completa (§20) e Realtime para localização/locais.

## O que depende das SUAS contas (não dá para automatizar)
Estes passos exigem login nas suas contas — me avise quando concluir e eu sigo com o código de auth.

### 1) Criar o projeto Supabase (grátis)
1. Acesse https://supabase.com → **New project** (região mais próxima; guarde a senha do DB).
2. Em **Project Settings → API**, copie:
   - `Project URL`  → `EXPO_PUBLIC_SUPABASE_URL`
   - `anon public`  → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Cole em um arquivo `.env` na raiz (copie de `.env.example`). O `.env` já está no `.gitignore`.

### 2) Aplicar as migrations
- **Opção fácil (Dashboard):** abra **SQL Editor**, cole o conteúdo de
  `migrations/20260902120000_init.sql` e rode.
- **Opção CLI:** instale a Supabase CLI, `supabase link --project-ref <ref>` e `supabase db push`.

### 3) Configurar o Login com Google
1. **Google Cloud Console** (https://console.cloud.google.com) → crie um projeto → **APIs & Services → Credentials**.
2. Configure a **OAuth consent screen** (External) com seu e-mail.
3. Crie um **OAuth Client ID** do tipo **Web** e copie o Client ID/Secret.
4. No **Supabase → Authentication → Providers → Google**: cole o Client ID/Secret e **habilite**.
5. Em **Authentication → URL Configuration**, adicione a redirect do app
   (`familylocation://` — o `scheme` já está no `app.json`).
6. Coloque os client IDs necessários no `.env` (`EXPO_PUBLIC_GOOGLE_*`).

> Depois desses passos, me diga que está pronto: eu conecto o cliente Supabase, o fluxo de
> login com Google, a persistência de sessão e o gate de rotas — e testamos no seu Expo Go.
