-- Егор Муха — Supabase setup for public portfolio + admin CMS.
-- Run this script in Supabase SQL Editor.

-- ============================================================
-- 1. RLS: public site can read content; authenticated admin can write.
-- ============================================================

alter table public.artist enable row level security;
alter table public.contacts enable row level security;
alter table public.site_settings enable row level security;
alter table public.works enable row level security;

drop policy if exists "public can read artist" on public.artist;
drop policy if exists "authenticated can manage artist" on public.artist;
create policy "public can read artist"
  on public.artist for select
  using (true);
create policy "authenticated can manage artist"
  on public.artist for all to authenticated
  using (true) with check (true);

drop policy if exists "public can read contacts" on public.contacts;
drop policy if exists "authenticated can manage contacts" on public.contacts;
create policy "public can read contacts"
  on public.contacts for select
  using (true);
create policy "authenticated can manage contacts"
  on public.contacts for all to authenticated
  using (true) with check (true);

drop policy if exists "public can read site settings" on public.site_settings;
drop policy if exists "authenticated can manage site settings" on public.site_settings;
create policy "public can read site settings"
  on public.site_settings for select
  using (true);
create policy "authenticated can manage site settings"
  on public.site_settings for all to authenticated
  using (true) with check (true);

drop policy if exists "public can read works" on public.works;
drop policy if exists "authenticated can manage works" on public.works;
create policy "public can read works"
  on public.works for select
  using (true);
create policy "authenticated can manage works"
  on public.works for all to authenticated
  using (true) with check (true);

-- ============================================================
-- 2. Public Storage bucket.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do update set public = true;

drop policy if exists "public can read portfolio images" on storage.objects;
drop policy if exists "authenticated can upload portfolio images" on storage.objects;
drop policy if exists "authenticated can update portfolio images" on storage.objects;
drop policy if exists "authenticated can delete portfolio images" on storage.objects;

create policy "public can read portfolio images"
  on storage.objects for select
  using (bucket_id = 'portfolio');

create policy "authenticated can upload portfolio images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio');

create policy "authenticated can update portfolio images"
  on storage.objects for update to authenticated
  using (bucket_id = 'portfolio')
  with check (bucket_id = 'portfolio');

create policy "authenticated can delete portfolio images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio');

-- ============================================================
-- 3. Initial content from the current static site.
--    Images remain local until replaced from the admin panel.
-- ============================================================

insert into public.artist (name, short_bio, biography, portrait_path)
select
  'Егор Муха',
  'Молодой скульптор. Информация об авторе появится здесь.',
  E'Здесь будет размещена подробная биография Егора Мухи.\n\nТекст пока является временной заглушкой. Позже сюда будет добавлена настоящая биография, информация об образовании, художественном пути, направлениях работы и других важных этапах творчества.',
  '/images/portrait.jpg'
where not exists (select 1 from public.artist);

insert into public.contacts (title, text, email, telegram)
select
  'Контакты',
  'По вопросам сотрудничества и другим вопросам можно связаться с Егором.',
  'example@example.com',
  '@example'
where not exists (select 1 from public.contacts);

insert into public.site_settings (logo_path, logo_alt, background_path)
select
  '/images/logo.png',
  'Егор Муха',
  '/images/background.jpg'
where not exists (select 1 from public.site_settings);

insert into public.works (title, year, material, description, image_path, sort_order, is_featured)
select * from (values
  ('Работа 01', 2026, 'Материал', 'Описание работы.', '/images/works/work-01.jpg', 0, true),
  ('Работа 02', 2026, 'Материал', 'Описание работы.', '/images/works/work-02.jpg', 1, true),
  ('Работа 03', 2026, 'Материал', 'Описание работы.', '/images/works/work-03.jpg', 2, true),
  ('Работа 04', 2026, 'Материал', 'Описание работы.', '/images/works/work-04.jpg', 3, false),
  ('Работа 05', 2026, 'Материал', 'Описание работы.', '/images/works/work-05.jpg', 4, false),
  ('Работа 06', 2026, 'Материал', 'Описание работы.', '/images/works/work-06.jpg', 5, false),
  ('Работа 07', 2026, 'Материал', 'Описание работы.', '/images/works/work-07.jpg', 6, false),
  ('Работа 08', 2026, 'Материал', 'Описание работы.', '/images/works/work-08.jpg', 7, false),
  ('Работа 09', 2026, 'Материал', 'Описание работы.', '/images/works/work-09.jpg', 8, false),
  ('Работа 10', 2026, 'Материал', 'Описание работы.', '/images/works/work-10.jpg', 9, false)
) as seed(title, year, material, description, image_path, sort_order, is_featured)
where not exists (select 1 from public.works);

-- ============================================================
-- 4. CMS maintenance fields.
--    Run this section if the tables already existed before the CMS update.
-- ============================================================

alter table public.artist add column if not exists updated_at timestamp with time zone not null default now();
alter table public.contacts add column if not exists updated_at timestamp with time zone not null default now();
alter table public.site_settings add column if not exists updated_at timestamp with time zone not null default now();
alter table public.works add column if not exists updated_at timestamp with time zone not null default now();
alter table public.works add column if not exists is_published boolean not null default true;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists artist_set_updated_at on public.artist;
create trigger artist_set_updated_at before update on public.artist
for each row execute function public.set_updated_at();

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at before update on public.contacts
for each row execute function public.set_updated_at();

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at before update on public.site_settings
for each row execute function public.set_updated_at();

drop trigger if exists works_set_updated_at on public.works;
create trigger works_set_updated_at before update on public.works
for each row execute function public.set_updated_at();
