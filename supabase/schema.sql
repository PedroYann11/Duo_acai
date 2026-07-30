-- ============================================================
-- DUO AÇAÍ — Schema do banco
-- Como usar: Supabase -> SQL Editor -> colar tudo -> Run
-- ============================================================

-- Pedidos (do site, do WhatsApp e do balcão)
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'site',   -- 'site' | 'whatsapp' | 'balcao'
  customer_name text,
  customer_phone text,
  street text,
  number text,
  neighborhood text,
  reference text,
  payment_method text not null,           -- 'Pix' | 'Dinheiro' | 'Crédito' | 'Cartão na entrega'
  change_for text,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  status text not null default 'recebido', -- recebido | em_preparo | saiu_entrega | entregue | cancelado
  seller_name text,                       -- vendedor (vendas de balcão/manual)
  created_at timestamptz default now()
);

-- Itens de cada pedido
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_slug text not null,   -- ex.: 'ninho', 'nutella'
  product_name text not null,
  unit_price numeric(10,2) not null,
  qty int not null check (qty > 0)
);

-- Vendedores (só nomes)
create table if not exists sellers (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  active boolean default true,
  created_at timestamptz default now()
);

insert into sellers (name) values
  ('Pedro Kailã'),
  ('Marcelo Teixeira')
on conflict (name) do nothing;

create index if not exists idx_orders_created on orders (created_at desc);
create index if not exists idx_items_order on order_items (order_id);

-- ---------- Segurança (RLS) ----------
alter table orders enable row level security;
alter table order_items enable row level security;

-- Qualquer visitante do site pode CRIAR um pedido...
drop policy if exists "criar pedido" on orders;
create policy "criar pedido" on orders
  for insert with check (true);

drop policy if exists "criar itens" on order_items;
create policy "criar itens" on order_items
  for insert with check (true);

-- ...mas só o admin logado pode LER e ATUALIZAR
-- (protege endereço e telefone dos clientes)
drop policy if exists "admin le pedidos" on orders;
create policy "admin le pedidos" on orders
  for select using (auth.role() = 'authenticated');

drop policy if exists "admin atualiza pedidos" on orders;
create policy "admin atualiza pedidos" on orders
  for update using (auth.role() = 'authenticated');

drop policy if exists "admin apaga pedidos" on orders;
create policy "admin apaga pedidos" on orders
  for delete using (auth.role() = 'authenticated');

drop policy if exists "admin le itens" on order_items;
create policy "admin le itens" on order_items
  for select using (auth.role() = 'authenticated');

drop policy if exists "admin apaga itens" on order_items;
create policy "admin apaga itens" on order_items
  for delete using (auth.role() = 'authenticated');

alter table sellers enable row level security;

drop policy if exists "admin gerencia vendedores" on sellers;
create policy "admin gerencia vendedores" on sellers
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------- Tempo real (pedido novo aparece na hora no painel) ----------
do $$
begin
  alter publication supabase_realtime add table orders;
exception when duplicate_object then
  null;
end $$;
