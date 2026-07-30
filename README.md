# Duo Açaí — Site de pedidos

Site oficial da Duo Açaí com cardápio, carrinho e checkout via WhatsApp.

## O que já está pronto (Parte 1)

- Cardápio com os 5 sabores, fotos e preços
- Carrinho com persistência (não perde ao recarregar a página)
- Checkout com endereço de entrega e forma de pagamento
- Pedido formatado enviado direto pro WhatsApp da loja
- Visual 100% Duo: paleta açaí + creme, mobile-first

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000

## Como publicar na Vercel

1. Suba este projeto pro GitHub (repositório privado é ok)
2. Em vercel.com → **Add New Project** → importe o repositório
3. A Vercel detecta Next.js sozinha — só clicar em **Deploy**
4. (Opcional) Em Settings → Domains, conecte o domínio próprio (ex.: duoacai.com.br)

## Onde editar as coisas

Tudo que muda com frequência está em **`lib/store.ts`**:

- Preços e descrições dos sabores
- Marcar sabor como esgotado (`available: false`)
- Taxa de entrega (`deliveryFee`)
- Horário de funcionamento e número do WhatsApp

Fotos dos produtos ficam em **`public/products/`** — pra trocar, basta
substituir o arquivo mantendo o mesmo nome.

## Próximas partes

- **Parte 2 — Painel admin + Supabase**: produtos e pedidos no banco de dados,
  painel em `/admin` com login, pedidos chegando em tempo real e mudança de
  status. O schema do banco já está pronto em `supabase/schema.sql`.
- **Parte 3 — Mercado Pago**: pagamento online com Pix e cartão direto no site.
