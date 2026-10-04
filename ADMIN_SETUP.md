# Admin CMS setup

## 1. Environment

Copy `.env.example` to `.env.local` and fill in the Supabase project URL and publishable key.

## 2. Supabase

Run `supabase/admin_setup.sql` in the Supabase SQL Editor.

The script:
- enables RLS for all four content tables;
- allows public SELECT;
- allows authenticated users to INSERT/UPDATE/DELETE;
- creates the public `portfolio` Storage bucket;
- adds Storage policies;
- seeds the current static portfolio content if the tables are empty.

## 3. Admin account

Create an administrator in Supabase Authentication → Users. The admin panel uses email/password authentication.

Open `/admin/login` and sign in with that account.

## 4. Images

Existing `/images/...` paths continue to work. When an image is replaced or a new work is added, the file is uploaded to:

- `portfolio/works/...`
- `portfolio/artist/...`
- `portfolio/site/...`

The database stores the Storage path, not the binary file.
