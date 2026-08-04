-- ============================================================
-- v2.1 (Fase 2) — retirada na loja + promoções em tempo real
-- Rodar no Supabase -> SQL Editor -> Run (seguro repetir)
-- ============================================================

-- Tipo de entrega do pedido: 'entrega' (padrão, mantém pedidos antigos) ou 'retirada'
alter table orders
  add column if not exists delivery_type text not null default 'entrega'
  check (delivery_type in ('entrega', 'retirada'));

-- Promoções/cupons passam a atualizar o site na hora, sem precisar recarregar
do $$
begin
  alter publication supabase_realtime add table promotions;
exception when duplicate_object then
  null;
end $$;
