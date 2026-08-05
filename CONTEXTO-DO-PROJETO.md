# Contexto do Projeto — Duo Açaí

> Leia este arquivo antes de mexer no projeto. Ele resume o estado atual,
> as decisões técnicas já tomadas (e por quê) e o que vem pela frente.
> Escrito para retomada em outra sessão/ferramenta.

---

## 1. O que é

Site de delivery + painel administrativo da **Duo Açaí** (Crato/CE), loja de
açaí em garrafa. Dois objetivos:

1. **Sistema em produção** para a loja real.
2. **Produto replicável** para vender a outras lojas, competindo com Goomer,
   Anota AI, Cardápio Web, Saipos e MenuDino. O diferencial declarado é:
   **site totalmente personalizado com a identidade visual da loja, sem
   mensalidade e sem comissão por pedido** — contra o link genérico deles.

**No ar:** https://duo-acai.vercel.app
**Repositório:** github.com/PedroYann11/Duo_acai (branch `main`)
**Versão atual:** v2.0

---

## 2. Stack e infraestrutura

- **Next.js 14** (App Router, TypeScript) — sem Tailwind, CSS puro em
  `app/globals.css` com variáveis CSS.
- **Vercel** — deploy automático a cada push na `main`. Plano Hobby.
- **Supabase** (South America / São Paulo) — Postgres + Auth + Storage +
  Realtime. Plano gratuito.
  - Variáveis na Vercel: `NEXT_PUBLIC_SUPABASE_URL` e
    `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a chave "publishable"/anon; a
    `secret` NUNCA é usada no front).
- **WhatsApp** via link `wa.me` (sem API paga).
- **Pix** via BR Code gerado no próprio site (`lib/pix.ts`), sem gateway.

**Loja:** Rua José Marrocos, 145 — Pinto Madeira, Crato/CE
(lat -7.233266, lng -39.407392 — usado como origem no cálculo por km).
Chave Pix: 07228088360.

---

## 3. Estrutura de arquivos

```
app/
  layout.tsx          providers aninhados (Settings > Products > Promo > Cart)
  page.tsx            home: Header, StoreStatus, Hero, MenuGrid, footer
  globals.css         TODO o CSS do projeto (variáveis no :root)
  checkout/page.tsx   checkout, tela de confirmação, bloco Pix, tela "fechado"
  admin/page.tsx      painel inteiro (~2000 linhas — candidato a divisão)
components/
  Shop.tsx            Header, CartDrawer, ProductCard, MenuGrid
  Hero.tsx            hero com parallax + garrafinha SVG animada
  StoreStatus.tsx     faixas de banner e de loja fechada
lib/
  store.ts            configuração RESERVA (fallback) + tipos + formatBRL
  cart.tsx            carrinho (localStorage)
  products-context.tsx  produtos do banco, com fallback para store.ts
  settings-context.tsx  configurações da loja, tema, horários, km
  promo-context.tsx     promoções: combos e cupons + cálculo de desconto
  data.ts             TODA a conversa com o Supabase (pedidos, produtos,
                      vendedores, configs, bairros, promoções, indicadores)
  supabase.ts         cliente Supabase (supabaseOn = variáveis presentes?)
  pix.ts              gerador do BR Code (EMV + CRC16)
  image.ts            corta/redimensiona foto para 640x800 no navegador
  masks.ts            máscara de telefone e capitalização
supabase/
  setup-mestre.sql    ⭐ banco completo do zero (usar para loja nova)
  schema.sql, etapa1-completa.sql, v2-promocoes.sql  (histórico incremental)
public/
  products/*.jpg      fotos iniciais (novas fotos vão para o Storage)
  logo-duo.png, icone-garrafa.png, favicon.png
```

Docs: `README.md` (setup), `GUIA-DE-EDICAO.md` (manual do lojista),
`PLANO-PAINEL-ADMIN.md` (análise de concorrentes e roadmap).

---

## 4. Decisões técnicas importantes (não desfazer sem entender)

**Padrão "plano B" em tudo.** Se o Supabase falhar ou não estiver
configurado, o site continua vendendo: produtos caem para a lista de
`lib/store.ts`, configurações para `CONFIG_PADRAO`, e o checkout envia o
pedido pelo WhatsApp. `supabaseOn` é o interruptor dessa lógica.

**ID do pedido gerado no cliente.** Em `criarPedidoSite`, o UUID é criado no
navegador antes do insert. Motivo: a política RLS permite ao anônimo
INSERIR mas não LER pedidos — um `.select()` após o insert falhava
silenciosamente no celular do cliente (não logado) e caía no plano B do
WhatsApp. Foi um bug real; não reintroduzir `.select()` ali.

**Emojis: só no site, nunca no WhatsApp.** Emojis literais no fonte se
corrompiam (viravam "?") no caminho zip → Windows → GitHub. Todos os
emojis do site são escritos escapados (`"\u{1F7E3}"`) em JSX. As mensagens
de WhatsApp são 100% texto puro, sem emoji, por decisão do cliente.

**`store_settings` é chave/valor com `jsonb`.** Desenhado assim para que
configurações novas (tema, modo km, etc.) não exijam migração de banco.
Ao adicionar config nova, basta incluir em `CONFIG_PADRAO` e salvar.

**Tema aplicado via CSS variables** em `aplicarTema()` — muda
`--roxo`, `--acai`, etc. no `document.documentElement`. Por isso o CSS
inteiro depende dessas variáveis; evite cores hardcoded.

**Fotos:** processadas no navegador (`lib/image.ts`, corte central 4:5 →
640×800 JPEG) antes de subir ao bucket `product-images`.

**Entrega por km:** Haversine (linha reta) × 1.3 como aproximação do
trajeto real. Não usa API de rotas (seria paga). Se o cliente negar a
geolocalização, cai na taxa padrão.

**Remoção é sempre "suave"** (`active = false`) para preservar histórico
de vendas.

---

## 5. Funcionalidades atuais

**Site:** hero com parallax e garrafinha SVG que enche com os sabores;
cardápio do banco com stepper +/− no card; carrinho persistente com
desconto de combo aplicado; checkout com máscaras, cupom, taxa fixa /
por bairro / por km; tela de confirmação na paleta da marca com número do
pedido e QR Pix (+ copia e cola); tela dedicada de "estamos fechados" com
horário de reabertura; faixas de banner e de fechado.

**Painel `/admin`** (login por email/senha do Supabase; senha simples só no
modo local). Sidebar lateral no desktop, barra inferior tipo app no mobile:
- **Registrar** — venda manual (balcão/dinheiro/WhatsApp) com vendedor
- **Dashboard** — KPIs, ticket médio, gráfico de linha 7 dias, donuts de
  pagamento e canal, ranking de sabores, vendas por vendedor
- **Pedidos** — tempo real, status Recebido → Saiu p/ entrega (+ abre
  WhatsApp com aviso pronto ao cliente) → Entregue; som + notificação do
  navegador, só para pedidos do site
- **Produtos** — CRUD completo com upload de foto, ordenação, esgotado
- **Loja** — aberta/fechada (férias), banner, entrega (3 modos), horários
  por dia, datas especiais, aparência (cores), contato e Pix
- **Promoções** — combo "leve X por Y" (automático) e cupons (% ou R$)
- **Equipe** — vendedores (Pedro Kailã e Marcelo Teixeira cadastrados)

---

## 6. Roadmap

**Próximos candidatos (decidir prioridade com o Pedro):**

1. **Segurança para virar produto** — validar pedido no servidor (Edge
   Function que recalcula preços/promoções contra o banco antes de aceitar)
   + limite anti-spam por IP. Hoje o total é calculado no cliente.
2. **Mercado Pago** — Pix automático e cartão online.
3. Etapa 2/3 do `PLANO-PAINEL-ADMIN.md`: promoção relâmpago com contagem,
   estatísticas de visitas/cliques, estoque do dia, adicionais,
   fidelidade, avaliações.
4. **Dívida técnica:** dividir `app/admin/page.tsx` em componentes por aba;
   agregar relatórios no banco quando o histórico crescer muito (hoje o
   dashboard agrega os 500 pedidos mais recentes em memória).

**Infra quando virar negócio:** Vercel Pro (US$20/mês — obrigatório para
uso comercial, cobre todos os clientes) e, com 3+ clientes, Supabase Pro
(US$25/mês por organização) pelos backups automáticos.

---

## 7. Fluxo de trabalho com o Pedro

- Ele prefere **uma versão completa por vez** (não vários arquivos soltos).
- **Antes de subir código que exija banco novo**, entregar o SQL para ele
  rodar no SQL Editor do Supabase primeiro.
- Testar de verdade antes de entregar (build + servidor + lógica).
- Explicar em português claro, sem jargão, e dar o roteiro de teste.
- Ele edita coisas simples direto no GitHub (preço, textos) — quando isso
  acontecer, sincronizar no projeto local para não sobrescrever.
- Versionamento em uso: v1.5, v1.6 … v2.0.
