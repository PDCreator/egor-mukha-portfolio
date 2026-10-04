# Deploy to Vercel

## 1. Build locally

```bash
npm install
npm run build
```

## 2. Push to GitHub

```bash
git add .
git commit -m "Improve portfolio CMS"
git push origin main
```

## 3. Import into Vercel

Create a Vercel project from the GitHub repository.

Framework preset: **Vite**

Build command:

```text
npm run build
```

Output directory:

```text
dist
```

## 4. Add Environment Variables in Vercel

Production / Preview / Development should use the same variables unless separate Supabase projects are desired:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_STORAGE_BUCKET=portfolio
```

Do not commit `.env.local`.

## 5. Supabase Auth

In Supabase Authentication settings, add the deployed Vercel domain to the allowed redirect URLs if email/password auth uses redirects in the future.

The current login uses the Supabase session directly and does not require a hardcoded domain.

## 6. Supabase SQL migration

Before deploying the updated CMS, run the complete `supabase/admin_setup.sql` in the Supabase SQL Editor. The script is safe to re-run for policies, triggers and the added CMS fields.
