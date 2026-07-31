-- ============================================================
-- ETAPA 1 COMPLETA — rodar ANTES de subir a v1.8 pro GitHub
-- Supabase -> SQL Editor -> colar tudo -> Run
-- Seguro rodar mais de uma vez (não duplica nada).
-- ============================================================

-- ---------- 1. PRODUTOS ----------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text default '',
  price numeric(10,2) not null,
  image_url text default '',
  available boolean default true,
  sort_order int default 0,
  active boolean default true,
  created_at timestamptz default now()
);

insert into products (slug, name, description, price, image_url, available, sort_order) values
  ('maracuja', 'Duo Maracujá', 'Açaí cremoso em camadas com creme de maracujá de verdade, com sementinhas e tudo.', 18.90, '/products/maracuja.jpg', true, 1),
  ('ninho',    'Duo Ninho',    'A dupla clássica: açaí gelado marmorizado com creme de leite Ninho.',                18.90, '/products/ninho.jpg',    true, 2),
  ('nutella',  'Duo Nutella',  'Açaí intenso misturado com Nutella de ponta a ponta da garrafa.',                    18.90, '/products/nutella.jpg',  true, 3),
  ('pistache', 'Duo Pistache', 'O queridinho: açaí com creme de pistache, cremoso e diferente de tudo.',             19.90, '/products/pistache.jpg', true, 4),
  ('pacoca',   'Duo Paçoca',   'Açaí batido com paçoca, aquele sabor de amendoim em cada gole.',                     18.90, '/products/pacoca.jpg',   true, 5)
on conflict (slug) do nothing;

alter table products enable row level security;

drop policy if exists "produtos ativos visiveis" on products;
create policy "produtos ativos visiveis" on products
  for select using (active = true);

drop policy if exists "admin gerencia produtos" on products;
create policy "admin gerencia produtos" on products
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------- 2. FOTOS (Storage) ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "fotos publicas" on storage.objects;
create policy "fotos publicas" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "admin envia fotos" on storage.objects;
create policy "admin envia fotos" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "admin troca fotos" on storage.objects;
create policy "admin troca fotos" on storage.objects
  for update using (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "admin apaga fotos" on storage.objects;
create policy "admin apaga fotos" on storage.objects
  for delete using (bucket_id = 'product-images' and auth.role() = 'authenticated');

-- ---------- 3. CONFIGURAÇÕES DA LOJA ----------
create table if not exists store_settings (
  key text primary key,
  value jsonb not null
);

insert into store_settings (key, value) values
  ('store_open', '{"open": true, "message": ""}'),
  ('banner', '{"active": false, "text": ""}'),
  ('delivery', '{"fee": 5.0, "min_order": 0, "by_neighborhood": false}'),
  ('hours', '{
    "0": {"closed": false, "open": "10:00", "close": "22:00"},
    "1": {"closed": false, "open": "10:00", "close": "22:00"},
    "2": {"closed": false, "open": "10:00", "close": "22:00"},
    "3": {"closed": false, "open": "10:00", "close": "22:00"},
    "4": {"closed": false, "open": "10:00", "close": "22:00"},
    "5": {"closed": false, "open": "10:00", "close": "22:00"},
    "6": {"closed": false, "open": "10:00", "close": "22:00"}
  }'),
  ('special_dates', '[]'),
  ('contact', '{"whatsapp": "5588992615069", "pix_key": "07228088360", "pix_name": "DUO ACAI", "pix_city": "CRATO"}'),
  ('theme', '{"acai": "#2e0b26", "roxo": "#61174c", "lilas": "#c7a3dc", "creme": "#f6ecda", "maracuja": "#f2c230"}')
on conflict (key) do nothing;

alter table store_settings enable row level security;

drop policy if exists "config visivel" on store_settings;
create policy "config visivel" on store_settings
  for select using (true);

drop policy if exists "admin gerencia config" on store_settings;
create policy "admin gerencia config" on store_settings
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------- 4. BAIRROS (taxa de entrega por bairro) ----------
create table if not exists neighborhoods (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  fee numeric(10,2) not null default 0,
  active boolean default true,
  created_at timestamptz default now()
);

alter table neighborhoods enable row level security;

drop policy if exists "bairros visiveis" on neighborhoods;
create policy "bairros visiveis" on neighborhoods
  for select using (active = true);

drop policy if exists "admin gerencia bairros" on neighborhoods;
create policy "admin gerencia bairros" on neighborhoods
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
