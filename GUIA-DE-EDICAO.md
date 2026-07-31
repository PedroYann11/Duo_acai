# Guia de Edição — Site Duo Açaí

Manual de como mexer em tudo no site: do preço de um sabor até as cores da
garrafinha animada. Guarde este arquivo — ele também fica na raiz do projeto.

---

## Como funciona o fluxo de edição

1. Abra o arquivo no **GitHub** → clique no ícone de **lápis** (Edit this file)
2. Faça a mudança → **Commit changes**
3. A **Vercel publica sozinha** em ~1 minuto (acompanhe na aba Deployments)

Regras de ouro pra não quebrar nada:

- **Números decimais usam ponto**: `19.9` (o site exibe "R$ 19,90" sozinho)
- **Textos ficam entre aspas** e terminam com vírgula: `name: "Duo Ninho",`
- Não apague vírgulas, chaves `{ }` ou colchetes `[ ]` sem querer
- Se o site quebrar depois de um commit, a Vercel mostra o erro em
  Deployments → clique no deploy vermelho → Build Logs. Dá pra reverter
  qualquer commit no GitHub em History → Revert, ou me mandar o erro.

---

## Mapa dos arquivos

| Arquivo | O que mora nele |
|---|---|
| `lib/store.ts` | **O coração das edições**: produtos, preços, sabores, taxa de entrega, horário, WhatsApp, Instagram, chave Pix, senha local do admin |
| `public/products/` | Fotos dos sabores |
| `app/page.tsx` | Página inicial: textos do letreiro (hero), subtítulo do cardápio, rodapé |
| `components/Hero.tsx` | Garrafinha animada (desenho, cores das camadas, rótulo) e parallax |
| `app/globals.css` | **Todas as cores do site**, fontes, tamanhos, animações |
| `app/checkout/page.tsx` | Página de fechar pedido: campos, textos, mensagem de WhatsApp, tela de confirmação, bloco Pix |
| `app/admin/page.tsx` | Painel: abas, dashboard, mensagem de "saiu pra entrega", som |
| `components/Shop.tsx` | Cabeçalho, carrinho lateral, cards dos produtos |
| `lib/data.ts` | Conversa com o banco (pedidos, vendedores, indicadores) |
| `lib/cart.tsx` | Lógica do carrinho |
| `lib/pix.ts` | Gerador do código Pix (padrão Banco Central) |
| `lib/supabase.ts` | Conexão com o banco |
| `supabase/schema.sql` | Estrutura do banco (já rodado, referência) |

**Não mexa sem necessidade**: `package.json`, `tsconfig.json`,
`next.config.mjs`, `lib/pix.ts`, `lib/supabase.ts` — são engrenagens internas.

---

## 1. Edições simples

> **NOVO**: com a Etapa 1 ativada (arquivo `supabase/etapa1-produtos.sql`
> rodado no Supabase), produtos passam a ser editados na aba **Produtos**
> do painel /admin — preço, nome, descrição e esgotado, sem tocar em
> código. O `lib/store.ts` vira a lista reserva (usada se o banco cair)
> e ainda vale para taxa, horário, Pix e contatos.

### Edições no `lib/store.ts`

### Mudar preço de um sabor
Ache o bloco do sabor e mude o `price`:
```ts
{ id: "pistache", ..., price: 19.9, ... }
```

### Mudar nome ou descrição de um sabor
```ts
name: "Duo Pistache",
description: "O queridinho: açaí com creme de pistache...",
```

### Marcar sabor como ESGOTADO (e voltar)
```ts
available: false,   // esgotado: card fica apagado, botão travado
available: true,    // disponível de novo
```

### Adicionar um sabor novo
Copie um bloco inteiro `{ ... },` de outro sabor, cole antes do `];` e ajuste:
```ts
{
  id: "morango",              // sem espaço, sem acento, único
  name: "Duo Morango",
  flavor: "Morango",
  description: "Açaí com creme de morango fresquinho.",
  price: 19.9,
  image: "/products/morango.jpg",   // suba a foto com esse nome (seção 2)
  available: true,
},
```
Para remover um sabor, apague o bloco `{ ... },` inteiro dele.

### Taxa de entrega, horário, contatos, Pix e senha
No topo do arquivo, no bloco `STORE`:
```ts
whatsapp: "5588992615069",  // número que recebe pedidos (55 + DDD + número)
instagram: "duoacai_ofc",
deliveryFee: 5.0,           // taxa de entrega
openHours: "Todos os dias, 10h às 22h",
adminPin: "duo2026",        // senha do admin SÓ no modo local (sem Supabase)
pixKey: "07228088360",      // chave Pix da loja
pixName: "DUO ACAI",        // nome do recebedor (sem acento, máx 25)
pixCity: "CRATO",           // cidade (máx 15)
```

---

## 2. Fotos dos sabores (`public/products/`)

- Para **trocar** uma foto: suba a nova com **o mesmo nome** do arquivo antigo
  (ex.: `pistache.jpg`). No GitHub: entre na pasta → Add file → Upload files →
  arraste → commit. O upload substitui o arquivo de mesmo nome.
- Para **sabor novo**: suba `nomedosabor.jpg` e use `/products/nomedosabor.jpg`
  no campo `image` do produto.
- Padrão das fotos: **640×800 pixels (proporção 4:5)**, JPG. Se a foto vier em
  outra proporção, o site corta pelo centro — geralmente fica bom, mas o ideal
  é já mandar em 4:5.

---

## 3. Letreiro do site / textos da página inicial (`app/page.tsx` e `components/Hero.tsx`)

O texto grande do topo mora em `components/Hero.tsx`:
```tsx
<span className="hero-eyebrow">Cremoso • Gelado • Viciante</span>
<h1>
  O açaí <em>da garrafa</em>     ← o que está em <em> fica AMARELO
</h1>
<p>
  Açaí cremoso em camadas com os cremes mais pedidos...
</p>
<a href="#cardapio" className="hero-cta">
  Ver cardápio                    ← texto do botão amarelo
</a>
```
E a legendinha embaixo da garrafa:
```tsx
<span className="garrafa-legenda">todos os sabores, uma garrafa</span>
```

Em `app/page.tsx` ficam:
```tsx
<h2 className="menu-title">Escolha o seu Duo</h2>       ← título do cardápio
A partir de R$ 18,90 · {STORE.openHours}                 ← subtítulo
```
E o rodapé (horário, Instagram e WhatsApp vêm automáticos do store.ts).

---

## 4. Cores do site (`app/globals.css`)

Todas as cores estão no topo, no bloco `:root`. Mudou ali, muda no site inteiro:
```css
--acai: #2e0b26;       /* açaí profundo (fundo do topo e rodapé) */
--acai-2: #4a1140;     /* açaí médio (botões ao passar o mouse) */
--roxo: #61174c;       /* roxo da marca (botões, preços) */
--lilas: #c7a3dc;      /* lilás (detalhes, letreiro pequeno) */
--creme: #f6ecda;      /* fundo creme da página */
--maracuja: #f2c230;   /* amarelo (botão do carrinho, destaques) */
```
Cores são códigos hex — pegue novos em https://htmlcolorcodes.com
Dica: mude uma de cada vez e veja o resultado, fica fácil de voltar atrás.

---

## 5. Garrafinha animada (`components/Hero.tsx`)

### Cores das camadas que caem na garrafa
Procure as linhas `<rect className="camada c1..."`. Cada uma é uma camada,
de baixo (c1) pra cima (c6):
```tsx
c1  fill="#f2c230"   ← maracujá (amarelo)
c2  fill="#f6ecda"   ← ninho (creme)
c3  fill="#5a3a22"   ← nutella (marrom)
c4  fill="#a8c36b"   ← pistache (verde)
c5  fill="#d8b98a"   ← paçoca (bege)
c6  fill="#4a1140"   ← açaí (roxo, camada do topo)
```
Troque o `fill` de qualquer uma pra mudar a cor. (A ondinha decorativa entre
camadas usa a cor da c6 — se mudar a c6, mude o `fill` do `<path>` logo
abaixo também.)

### Velocidade da animação
Em `app/globals.css`, procure `.camada` e mude:
```css
animation-duration: 14s;   /* ciclo completo; menor = mais rápido */
```

### Texto do rótulo da garrafa
Ainda em Hero.tsx, no final:
```tsx
<text ...>DUO</text>
<text ...>O AÇAÍ DA GARRAFA</text>
```

### Cor da tampa
```tsx
<rect x="48" y="18" ... fill="#6d2a91" />   ← tampa
```

---

## 6. Textos do checkout e da confirmação (`app/checkout/page.tsx`)

- Frase divertida do rodapé do checkout: procure `Polo Norte`
- Tela de confirmação: procure `Pedido recebido!` e `canto mais gelado do freezer`
- Bloco Pix: procure `Pague agora com Pix`
- **Mensagem de WhatsApp do pedido** (plano B): procure `NOVO PEDIDO` — cada
  linha entre crases `` ` `` é uma linha da mensagem

## 7. Painel admin (`app/admin/page.tsx`)

- **Mensagem de "saiu pra entrega"** pro cliente: procure `acabou de sair pra entrega`
- Texto da notificação: procure `Novo pedido na Duo!`
- Nomes dos status: em `lib/data.ts`, bloco `STATUS_LABEL`:
```ts
recebido: "Recebido",
saiu_entrega: "Saiu p/ entrega",
entregue: "Entregue",
```

## 8. Banco de dados (Supabase → SQL Editor)

```sql
delete from orders;                          -- zerar todos os pedidos (teste)
insert into sellers (name) values ('Fulano'); -- vendedor por SQL (ou use a aba Vendedores)
```
Usuários do painel: Supabase → Authentication → Users (Add user, com Auto Confirm).

---

## Rodando no seu computador (opcional)

Com o Node.js instalado:
```bash
npm install     # só na primeira vez
npm run dev     # abre em http://localhost:3000
```
Crie um arquivo `.env.local` copiando o `.env.example` e preenchendo as duas
variáveis do Supabase pra testar o banco localmente.

---

## Se algo der errado

1. Deployments na Vercel → deploy vermelho → **Build Logs** mostra o erro
2. GitHub → History do arquivo → **Revert** desfaz o commit
3. Ou me chama com o print do erro que eu resolvo 🍇
