-- ============================================================
-- v2.2 (Fase 3) — destaque de produto, banner de promoção,
-- e cargo/salário/meta dos funcionários
-- Rodar no Supabase -> SQL Editor -> Run (seguro repetir)
-- ============================================================

-- Selo de destaque do produto (ex.: "DUO DO MÊS", "MAIS PEDIDO"). Vazio = sem selo.
alter table products
  add column if not exists highlight_label text;

-- Texto do banner do topo do site, específico de cada promoção
alter table promotions
  add column if not exists banner_text text;

-- Dados do funcionário
alter table sellers
  add column if not exists role text;
alter table sellers
  add column if not exists salary numeric(10,2);
alter table sellers
  add column if not exists monthly_goal numeric(10,2);
