-- ============================================================
-- DUO AÇAÍ — Schema do banco (rodar no SQL Editor do Supabase)
-- Usado a partir da Parte 2 (painel admin + pedidos no banco)
-- ============================================================

-- Produtos
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text default '',
  price numeric(10,2) not null,
  image_url text,
  available boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Pedidos
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text,
  street text not null,
  number text not null,
  neighborhood text not null,
  reference text,
  payment_method text not null,          -- 'pix_online' | 'card_online' | 'pix' | 'dinheiro' | 'cartao_entrega'
  change_for text,                       -- troco, se dinheiro
  channel text not null default 'site',  -- 'site' | 'whatsapp'
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null,
  total numeric(10,2) not null,
  status text not null default 'recebido', -- recebido | em_preparo | saiu_entrega | entregue | cancelado
  mp_payment_id text,                    -- id do pagamento no Mercado Pago (Parte 3)
  created_at timestamptz default now()
);

-- Itens do pedido
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,   -- nome congelado no momento do pedido
  unit_price numeric(10,2) not null,
  qty int not null check (qty > 0)
);

-- Configurações da loja (taxa de entrega, horário etc.)
create table if not exists store_settings (
  key text primary key,
  value text not null
);

insert into store_settings (key, value) values
  ('delivery_fee', '5.00'),
  ('open_hours', 'Todos os dias, 10h às 22h'),
  ('whatsapp', '5588992615069')
on conflict (key) do nothing;

-- Segurança (RLS): leitura pública de produtos, escrita só autenticado
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table store_settings enable row level security;

create policy "produtos visíveis para todos" on products
  for select using (true);

create policy "config visível para todos" on store_settings
  for select using (true);

-- Clientes criam pedidos (inserção anônima), mas só o admin lê/edita
create policy "qualquer um cria pedido" on orders
  for insert with check (true);

create policy "qualquer um cria itens" on order_items
  for insert with check (true);

create policy "admin lê pedidos" on orders
  for select using (auth.role() = 'authenticated');

create policy "admin atualiza pedidos" on orders
  for update using (auth.role() = 'authenticated');

create policy "admin lê itens" on order_items
  for select using (auth.role() = 'authenticated');

create policy "admin gerencia produtos" on products
  for all using (auth.role() = 'authenticated');

create policy "admin gerencia config" on store_settings
  for all using (auth.role() = 'authenticated');

-- Habilitar realtime nos pedidos (painel atualiza na hora)
alter publication supabase_realtime add table orders;
