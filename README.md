# Finanças App

App de controle de finanças pessoais — mobile-first, Next.js + Supabase.

## Deploy

### 1. Criar repositório no GitHub

1. Acesse https://github.com/new
2. Nome do repo: `financas-app`
3. Visibilidade: **Private** (recomendado, contém configs pessoais)
4. NÃO inicialize com README ou .gitignore
5. Clique em **Create repository**

### 2. Subir o código para o GitHub

No PC, abra o **PowerShell** dentro da pasta do projeto e rode:

```bash
git init
git add .
git commit -m "Versão inicial"
git branch -M main
git remote add origin https://github.com/guisdesign/financas-app.git
git push -u origin main
```

### 3. Deploy na Vercel

1. Acesse https://vercel.com/new
2. Importe o repositório `guisdesign/financas-app`
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://pdrlzvxwdtanmfzvksiq.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (chave do `.env.local`)
4. Clique em **Deploy**

### 4. Configurar URL no Supabase

Após o deploy, copie a URL da Vercel (algo como `https://financas-app-xyz.vercel.app`).

No Supabase → **Authentication** → **URL Configuration**:
- **Site URL**: cole a URL da Vercel
- **Redirect URLs**: adicione `https://financas-app-xyz.vercel.app/auth/callback`

## Estrutura

- Next.js 14 (App Router) com TypeScript
- Tailwind CSS para estilização
- Supabase para auth (magic link) e banco
- Tabelas: lancamentos, recorrentes, categorias, faturas_pagas, orcamentos_mes, config, previstos_status

## Desenvolvimento local

```bash
npm install
npm run dev
```

Acesse http://localhost:3000
