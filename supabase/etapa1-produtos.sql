-- ============================================================
-- ETAPA 1 / SPRINT 1 — Produtos no banco
-- Rodar no Supabase -> SQL Editor -> Run
-- ============================================================

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text default '',
  price numeric(10,2) not null,
  image_url text default '',
  available boolean default true,   -- esgotado quando false
  sort_order int default 0,
  active boolean default true,      -- false = removido do site (histórico preservado)
  created_at timestamptz default now()
);

-- Migração dos 5 sabores atuais
insert into products (slug, name, description, price, image_url, available, sort_order) values
  ('maracuja', 'Duo Maracujá', 'Açaí cremoso em camadas com creme de maracujá de verdade, com sementinhas e tudo.', 18.90, '/products/maracuja.jpg', true, 1),
  ('ninho',    'Duo Ninho',    'A dupla clássica: açaí gelado marmorizado com creme de leite Ninho.',                18.90, '/products/ninho.jpg',    true, 2),
  ('nutella',  'Duo Nutella',  'Açaí intenso misturado com Nutella de ponta a ponta da garrafa.',                    18.90, '/products/nutella.jpg',  true, 3),
  ('pistache', 'Duo Pistache', 'O queridinho: açaí com creme de pistache, cremoso e diferente de tudo.',             19.90, '/products/pistache.jpg', true, 4),
  ('pacoca',   'Duo Paçoca',   'Açaí batido com paçoca, aquele sabor de amendoim em cada gole.',                     18.90, '/products/pacoca.jpg',   true, 5)
on conflict (slug) do nothing;

-- Segurança
alter table products enable row level security;

drop policy if exists "produtos ativos visiveis" on products;
create policy "produtos ativos visiveis" on products
  for select using (active = true);

drop policy if exists "admin gerencia produtos" on products;
create policy "admin gerencia produtos" on products
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
