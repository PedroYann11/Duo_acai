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

## Conectar o Supabase (banco de dados na nuvem)

Com o Supabase conectado, os pedidos do site entram sozinhos no dashboard
e as vendas registradas no admin sincronizam entre aparelhos.

1. Crie uma conta gratuita em supabase.com e um novo projeto
   (região: South America / São Paulo)
2. No menu **SQL Editor**, cole todo o conteúdo de `supabase/schema.sql`
   e clique em **Run**
3. No menu **Authentication → Users → Add user**, crie o usuário do admin
   (email e senha que a Duo vai usar pra entrar no painel)
4. No menu **Settings → API**, copie a **Project URL** e a chave **anon public**
5. Na Vercel: **Settings → Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = a Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = a chave anon
6. Clique em **Redeploy** (aba Deployments → ⋯ → Redeploy)

Pronto: o /admin passa a pedir email e senha, e os pedidos do site
aparecem na aba Pedidos em tempo real.

Sem o Supabase configurado, o site continua funcionando normalmente em
"modo local": pedidos vão só pro WhatsApp e o admin usa senha simples
com dados salvos no navegador.

## Painel admin (/admin)

Acesse **seudominio.com/admin** (ou duo-acai.vercel.app/admin).

- Com Supabase: login com o email e senha criados no passo 3 acima
- Sem Supabase (modo local): senha padrão `duo2026` — troque em `lib/store.ts`
- **Registrar venda**: toque nos + dos sabores vendidos, escolha Pix,
  Dinheiro ou Crédito e confirme. Leva 5 segundos.
- **Dashboard**: faturamento de hoje / 7 dias / total, ranking do sabor
  mais vendido ao menos vendido, e receita por forma de pagamento.
- **Pedidos**: acompanhe os pedidos do site em tempo real e mude o status
  (Recebido → Em preparo → Saiu p/ entrega → Entregue)
- Use "Registrar venda" pra balcão, dinheiro vivo e pedidos que chegaram
  direto no WhatsApp — os do site entram sozinhos

## Próximas partes

- **Parte 2 — Painel admin + Supabase**: produtos e pedidos no banco de dados,
  painel em `/admin` com login, pedidos chegando em tempo real e mudança de
  status. O schema do banco já está pronto em `supabase/schema.sql`.
- **Parte 3 — Mercado Pago**: pagamento online com Pix e cartão direto no site.
