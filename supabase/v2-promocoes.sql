-- ============================================================
-- v2.0 — Promoções e cupons
-- Rodar no Supabase -> SQL Editor -> Run (seguro repetir)
-- ============================================================

create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- ex.: "2 garrafas por R$35"
  kind text not null,                 -- 'combo' | 'coupon'
  -- combo: leve X unidades (de qualquer produto) por preço fixo
  combo_qty int,                      -- ex.: 2
  combo_price numeric(10,2),          -- ex.: 35.00
  -- coupon: código com desconto
  code text,                          -- ex.: "DUO10"
  discount_kind text,                 -- 'percent' | 'fixed'
  discount_value numeric(10,2),       -- 10 (=10%) ou 5.00 (=R$5)
  min_order numeric(10,2) default 0,
  active boolean default true,
  created_at timestamptz default now()
);

alter table promotions enable row level security;

drop policy if exists "promocoes ativas visiveis" on promotions;
create policy "promocoes ativas visiveis" on promotions
  for select using (active = true);

drop policy if exists "admin gerencia promocoes" on promotions;
create policy "admin gerencia promocoes" on promotions
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
