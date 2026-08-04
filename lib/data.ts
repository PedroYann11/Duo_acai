// Camada de dados dos pedidos/vendas.
// Com Supabase configurado: tudo vai pra nuvem e sincroniza.
// Sem Supabase: vendas do balcão ficam no navegador (modo local).

import { getSupabase, supabaseOn } from "./supabase";

export type Canal = "site" | "whatsapp" | "balcao";
export type Status =
  | "recebido"
  | "em_preparo"
  | "saiu_entrega"
  | "entregue"
  | "cancelado";

export type ItemPedido = {
  product_slug: string;
  product_name: string;
  unit_price: number;
  qty: number;
};

export type TipoEntrega = "entrega" | "retirada";

export type Pedido = {
  id: string;
  channel: Canal;
  delivery_type: TipoEntrega;
  customer_name: string | null;
  customer_phone: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  reference: string | null;
  payment_method: string;
  change_for: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: Status;
  seller_name: string | null;
  created_at: string;
  itens: ItemPedido[];
};

export const STATUS_LABEL: Record<Status, string> = {
  recebido: "Recebido",
  em_preparo: "Em preparo",
  saiu_entrega: "Saiu p/ entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const PROXIMO_STATUS: Partial<Record<Status, Status>> = {
  recebido: "saiu_entrega",
  em_preparo: "saiu_entrega", // legado: pedidos antigos ainda saem daqui
  saiu_entrega: "entregue",
};

const KEY_LOCAL = "duo-pedidos-local-v1";

// ---------- criação ----------

export async function criarPedidoSite(dados: {
  delivery_type: TipoEntrega;
  customer_name: string;
  customer_phone: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  reference: string | null;
  payment_method: string;
  change_for: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  itens: ItemPedido[];
}): Promise<string | null> {
  if (!supabaseOn) return null;
  try {
    const sb = getSupabase();
    const { itens, ...pedido } = dados;
    // O id é gerado aqui (e não lido de volta do banco) porque o cliente
    // anônimo tem permissão de INSERIR pedidos, mas não de LER — só o admin lê.
    const id = gerarUuid();
    const { error } = await sb.from("orders").insert({
      ...pedido,
      id,
      channel: "site",
      status: "recebido",
      seller_name: null,
    });
    if (error) return null;
    const { error: e2 } = await sb
      .from("order_items")
      .insert(itens.map((i) => ({ ...i, order_id: id })));
    if (e2) return null;
    return id;
  } catch {
    return null;
  }
}

/** UUID v4 com fallback para navegadores antigos */
function gerarUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function registrarVendaBalcao(dados: {
  payment_method: string;
  total: number;
  seller_name: string | null;
  itens: ItemPedido[];
}): Promise<void> {
  const pedido: Pedido = {
    id: crypto.randomUUID(),
    channel: "balcao",
    delivery_type: "retirada",
    customer_name: null,
    customer_phone: null,
    street: null,
    number: null,
    neighborhood: null,
    reference: null,
    payment_method: dados.payment_method,
    change_for: null,
    subtotal: dados.total,
    delivery_fee: 0,
    total: dados.total,
    status: "entregue",
    seller_name: dados.seller_name,
    created_at: new Date().toISOString(),
    itens: dados.itens,
  };

  if (supabaseOn) {
    const sb = getSupabase();
    const { itens, id, created_at, ...resto } = pedido;
    const { data, error } = await sb
      .from("orders")
      .insert(resto)
      .select("id")
      .single();
    if (error || !data) throw new Error("Falha ao salvar no banco");
    const { error: e2 } = await sb
      .from("order_items")
      .insert(itens.map((i) => ({ ...i, order_id: data.id })));
    if (e2) throw new Error("Falha ao salvar itens");
  } else {
    const todos = listarLocal();
    todos.unshift(pedido);
    localStorage.setItem(KEY_LOCAL, JSON.stringify(todos));
  }
}

// ---------- leitura ----------

function listarLocal(): Pedido[] {
  try {
    const raw = localStorage.getItem(KEY_LOCAL);
    return raw ? (JSON.parse(raw) as Pedido[]) : [];
  } catch {
    return [];
  }
}

export async function listarPedidos(): Promise<Pedido[]> {
  if (!supabaseOn) return listarLocal();
  const sb = getSupabase();
  const { data, error } = await sb
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error || !data) return [];
  return data.map((o: any) => ({
    ...o,
    itens: (o.order_items || []) as ItemPedido[],
  }));
}

export async function atualizarStatus(id: string, status: Status) {
  if (supabaseOn) {
    const sb = getSupabase();
    await sb.from("orders").update({ status }).eq("id", id);
  } else {
    const todos = listarLocal().map((p) =>
      p.id === id ? { ...p, status } : p
    );
    localStorage.setItem(KEY_LOCAL, JSON.stringify(todos));
  }
}

export async function apagarPedido(id: string) {
  if (supabaseOn) {
    const sb = getSupabase();
    await sb.from("orders").delete().eq("id", id);
  } else {
    const todos = listarLocal().filter((p) => p.id !== id);
    localStorage.setItem(KEY_LOCAL, JSON.stringify(todos));
  }
}

/** Assina novos pedidos em tempo real. Retorna função para cancelar. */
export function aoChegarPedido(
  callback: (
    evento: "INSERT" | "UPDATE" | "DELETE",
    canalPedido: string | null
  ) => void
): () => void {
  if (!supabaseOn) return () => {};
  const sb = getSupabase();
  const canal = sb
    .channel("pedidos-novos")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      (payload) =>
        callback(
          payload.eventType as "INSERT" | "UPDATE" | "DELETE",
          (payload.new as any)?.channel ?? null
        )
    )
    .subscribe();
  return () => {
    sb.removeChannel(canal);
  };
}

/** Monta link de WhatsApp para um telefone brasileiro */
export function linkWhatsApp(telefone: string, mensagem: string): string {
  let digitos = telefone.replace(/\D/g, "");
  if (!digitos.startsWith("55")) digitos = "55" + digitos;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
}

// ---------- vendedores ----------

export type Vendedor = {
  id: string;
  name: string;
  role: string | null;
  salary: number | null;
  monthly_goal: number | null;
};

const KEY_VENDEDORES = "duo-vendedores-v1";
const VENDEDORES_PADRAO: Vendedor[] = [
  { id: "v1", name: "Pedro Kailã", role: null, salary: null, monthly_goal: null },
  { id: "v2", name: "Marcelo Teixeira", role: null, salary: null, monthly_goal: null },
];

function vendedoresLocais(): Vendedor[] {
  try {
    const raw = localStorage.getItem(KEY_VENDEDORES);
    if (raw) return JSON.parse(raw) as Vendedor[];
  } catch {}
  localStorage.setItem(KEY_VENDEDORES, JSON.stringify(VENDEDORES_PADRAO));
  return VENDEDORES_PADRAO;
}

export async function listarVendedores(): Promise<Vendedor[]> {
  if (!supabaseOn) return vendedoresLocais();
  const sb = getSupabase();
  const { data, error } = await sb
    .from("sellers")
    .select("id, name, role, salary, monthly_goal")
    .eq("active", true)
    .order("name");
  if (error || !data) return [];
  return data.map((v: any) => ({
    ...v,
    salary: v.salary != null ? Number(v.salary) : null,
    monthly_goal: v.monthly_goal != null ? Number(v.monthly_goal) : null,
  }));
}

export async function adicionarVendedor(nome: string): Promise<void> {
  const limpo = nome.trim();
  if (!limpo) throw new Error("Nome vazio");
  if (supabaseOn) {
    const sb = getSupabase();
    const { error } = await sb.from("sellers").insert({ name: limpo });
    if (error) throw new Error("Não foi possível salvar (nome repetido?)");
  } else {
    const todos = vendedoresLocais();
    if (todos.some((v) => v.name.toLowerCase() === limpo.toLowerCase()))
      throw new Error("Esse nome já existe");
    todos.push({
      id: crypto.randomUUID(),
      name: limpo,
      role: null,
      salary: null,
      monthly_goal: null,
    });
    localStorage.setItem(KEY_VENDEDORES, JSON.stringify(todos));
  }
}

export async function atualizarVendedor(
  id: string,
  dados: { role: string | null; salary: number | null; monthly_goal: number | null }
): Promise<void> {
  if (supabaseOn) {
    const sb = getSupabase();
    const { error } = await sb.from("sellers").update(dados).eq("id", id);
    if (error) throw new Error("Não foi possível salvar");
  } else {
    const todos = vendedoresLocais().map((v) =>
      v.id === id ? { ...v, ...dados } : v
    );
    localStorage.setItem(KEY_VENDEDORES, JSON.stringify(todos));
  }
}

export async function removerVendedor(id: string): Promise<void> {
  if (supabaseOn) {
    const sb = getSupabase();
    // desativa em vez de apagar, pra manter o histórico das vendas
    await sb.from("sellers").update({ active: false }).eq("id", id);
  } else {
    const todos = vendedoresLocais().filter((v) => v.id !== id);
    localStorage.setItem(KEY_VENDEDORES, JSON.stringify(todos));
  }
}

/** Vendas do mês atual de um vendedor específico (pra tela dele) */
export function resumoDoMes(pedidos: Pedido[], sellerName: string) {
  const agora = new Date();
  const doMes = pedidos.filter((p) => {
    if (p.status === "cancelado" || p.seller_name !== sellerName) return false;
    const d = new Date(p.created_at);
    return (
      d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear()
    );
  });
  return {
    qtd: doMes.length,
    receita: doMes.reduce((soma, p) => soma + Number(p.total), 0),
  };
}

// ---------- indicadores ----------

function inicioDoDia(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function resumo(pedidos: Pedido[]) {
  const validos = pedidos.filter((p) => p.status !== "cancelado");
  const hoje = inicioDoDia(new Date());
  const seteDias = new Date(hoje);
  seteDias.setDate(seteDias.getDate() - 6);
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  let recHoje = 0,
    qtdHoje = 0,
    rec7 = 0,
    qtd7 = 0,
    recMes = 0,
    qtdMes = 0,
    recTotal = 0;

  const porPagamento: Record<string, number> = {};
  const porCanal: Record<string, number> = {};
  const porVendedor: Record<string, number> = {};
  const porProduto: Record<
    string,
    { nome: string; qtd: number; receita: number }
  > = {};

  for (const p of validos) {
    const d = new Date(p.created_at);
    recTotal += Number(p.total);
    porPagamento[p.payment_method] =
      (porPagamento[p.payment_method] || 0) + Number(p.total);
    porCanal[p.channel] = (porCanal[p.channel] || 0) + Number(p.total);
    if (p.seller_name)
      porVendedor[p.seller_name] =
        (porVendedor[p.seller_name] || 0) + Number(p.total);
    if (d >= hoje) {
      recHoje += Number(p.total);
      qtdHoje++;
    }
    if (d >= seteDias) {
      rec7 += Number(p.total);
      qtd7++;
    }
    if (d.getFullYear() === anoAtual && d.getMonth() === mesAtual) {
      recMes += Number(p.total);
      qtdMes++;
    }
    for (const item of p.itens) {
      if (!porProduto[item.product_slug])
        porProduto[item.product_slug] = {
          nome: item.product_name,
          qtd: 0,
          receita: 0,
        };
      porProduto[item.product_slug].qtd += item.qty;
      porProduto[item.product_slug].receita +=
        item.qty * Number(item.unit_price);
    }
  }

  const ranking = Object.entries(porProduto)
    .map(([slug, dados]) => ({ slug, ...dados }))
    .sort((a, b) => b.qtd - a.qtd);

  // série dos últimos 7 dias (para o gráfico de linha)
  const serie: { dia: string; valor: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const rotulo = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][d.getDay()];
    let soma = 0;
    for (const p of validos) {
      const pd = new Date(p.created_at);
      if (
        pd.getFullYear() === d.getFullYear() &&
        pd.getMonth() === d.getMonth() &&
        pd.getDate() === d.getDate()
      )
        soma += Number(p.total);
    }
    serie.push({ dia: rotulo, valor: Math.round(soma * 100) / 100 });
  }

  const ticketMedio = validos.length > 0 ? recTotal / validos.length : 0;

  return {
    serie,
    ticketMedio,
    recHoje,
    qtdHoje,
    rec7,
    qtd7,
    recMes,
    qtdMes,
    recTotal,
    totalPedidos: validos.length,
    porPagamento,
    porCanal,
    porVendedor,
    ranking,
  };
}

export type ClienteInativo = {
  telefone: string;
  nome: string;
  ultimoPedidoEm: string;
  diasSemPedir: number;
  totalPedidos: number;
};

/**
 * Agrupa os pedidos (já carregados) por telefone e lista quem não pede
 * há X dias ou mais. Roda em cima dos mesmos pedidos do dashboard — não
 * busca cliente que nunca apareceu nos últimos 500 pedidos.
 */
export function clientesInativos(
  pedidos: Pedido[],
  diasSemPedido: number
): ClienteInativo[] {
  const porTelefone = new Map<string, Pedido[]>();
  for (const p of pedidos) {
    if (p.status === "cancelado") continue;
    const tel = (p.customer_phone || "").replace(/\D/g, "");
    if (!tel) continue;
    if (!porTelefone.has(tel)) porTelefone.set(tel, []);
    porTelefone.get(tel)!.push(p);
  }

  const agora = Date.now();
  const resultado: ClienteInativo[] = [];

  porTelefone.forEach((doCliente, telefone) => {
    const ultimo = doCliente.reduce((max, p) =>
      new Date(p.created_at) > new Date(max.created_at) ? p : max
    );
    const dias = Math.floor(
      (agora - new Date(ultimo.created_at).getTime()) / 86400000
    );
    if (dias >= diasSemPedido) {
      resultado.push({
        telefone,
        nome: ultimo.customer_name || "Cliente",
        ultimoPedidoEm: ultimo.created_at,
        diasSemPedir: dias,
        totalPedidos: doCliente.length,
      });
    }
  });

  return resultado.sort((a, b) => b.diasSemPedir - a.diasSemPedir);
}


// ---------- gestão de produtos (aba Produtos do admin) ----------

export type ProdutoAdmin = {
  id: string; // uuid do banco
  slug: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  available: boolean;
  sort_order: number;
  highlight_label: string | null;
};

export async function listarProdutosAdmin(): Promise<ProdutoAdmin[]> {
  if (!supabaseOn) return [];
  const sb = getSupabase();
  const { data, error } = await sb
    .from("products")
    .select(
      "id, slug, name, description, price, image_url, available, sort_order, highlight_label"
    )
    .eq("active", true)
    .order("sort_order");
  if (error || !data) return [];
  return data.map((p: any) => ({ ...p, price: Number(p.price) }));
}

export async function salvarProduto(
  id: string,
  campos: {
    name: string;
    description: string;
    price: number;
    highlight_label: string | null;
  }
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("products").update(campos).eq("id", id);
  if (error) throw new Error("Não foi possível salvar");
}

export async function alternarDisponibilidade(
  id: string,
  available: boolean
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("products").update({ available }).eq("id", id);
  if (error) throw new Error("Não foi possível atualizar");
}


// ---------- criar / remover / reordenar / foto (Sprint 2) ----------

function slugificar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "produto";
}

export async function criarProduto(campos: {
  name: string;
  description: string;
  price: number;
  image_url: string;
}): Promise<void> {
  const sb = getSupabase();
  const { data: maiores } = await sb
    .from("products")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const ordem = (maiores?.[0]?.sort_order ?? 0) + 1;

  let slug = slugificar(campos.name);
  let { error } = await sb
    .from("products")
    .insert({ ...campos, slug, sort_order: ordem });
  if (error && (error as any).code === "23505") {
    // nome/slug repetido: tenta com sufixo único
    slug = `${slug}-${Date.now().toString(36)}`;
    const r2 = await sb
      .from("products")
      .insert({ ...campos, slug, sort_order: ordem });
    error = r2.error;
  }
  if (error) throw new Error("Não foi possível criar o produto");
}

export async function removerProduto(id: string): Promise<void> {
  // remoção "suave": sai do site, mas o histórico de vendas fica intacto
  const sb = getSupabase();
  const { error } = await sb
    .from("products")
    .update({ active: false })
    .eq("id", id);
  if (error) throw new Error("Não foi possível remover");
}

export async function trocarOrdem(
  a: { id: string; sort_order: number },
  b: { id: string; sort_order: number }
): Promise<void> {
  const sb = getSupabase();
  await sb.from("products").update({ sort_order: b.sort_order }).eq("id", a.id);
  await sb.from("products").update({ sort_order: a.sort_order }).eq("id", b.id);
}

export async function enviarFotoProduto(
  blob: Blob,
  slugBase: string
): Promise<string> {
  const sb = getSupabase();
  const caminho = `${slugificar(slugBase)}-${Date.now().toString(36)}.jpg`;
  const { error } = await sb.storage
    .from("product-images")
    .upload(caminho, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error("Falha no envio da foto");
  const { data } = sb.storage.from("product-images").getPublicUrl(caminho);
  return data.publicUrl;
}

export async function atualizarFotoProduto(
  id: string,
  imageUrl: string
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("products")
    .update({ image_url: imageUrl })
    .eq("id", id);
  if (error) throw new Error("Não foi possível salvar a foto");
}


// ---------- configurações da loja e bairros (aba Loja) ----------

export async function salvarConfig(key: string, value: unknown): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("store_settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw new Error("Não foi possível salvar");
}

export type BairroAdmin = {
  id: string;
  name: string;
  fee: number;
  active: boolean;
};

export async function listarBairrosAdmin(): Promise<BairroAdmin[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("neighborhoods")
    .select("id, name, fee, active")
    .order("name");
  if (error || !data) return [];
  return data.map((b: any) => ({ ...b, fee: Number(b.fee) }));
}

export async function criarBairro(name: string, fee: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("neighborhoods")
    .insert({ name: name.trim(), fee });
  if (error) throw new Error("Não foi possível criar (nome repetido?)");
}

export async function removerBairro(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("neighborhoods").delete().eq("id", id);
  if (error) throw new Error("Não foi possível remover");
}


// ---------- promoções (aba Promoções) ----------

export type PromocaoAdmin = {
  id: string;
  name: string;
  kind: "combo" | "coupon";
  combo_qty: number | null;
  combo_price: number | null;
  code: string | null;
  discount_kind: "percent" | "fixed" | null;
  discount_value: number | null;
  min_order: number;
  active: boolean;
  banner_text: string | null;
};

export async function listarPromocoes(): Promise<PromocaoAdmin[]> {
  if (!supabaseOn) return [];
  const sb = getSupabase();
  const { data, error } = await sb
    .from("promotions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((p: any) => ({
    ...p,
    combo_price: p.combo_price != null ? Number(p.combo_price) : null,
    discount_value: p.discount_value != null ? Number(p.discount_value) : null,
    min_order: Number(p.min_order || 0),
  }));
}

export async function criarPromocao(
  p: Omit<PromocaoAdmin, "id">
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("promotions").insert(p);
  if (error) throw new Error("Não foi possível criar a promoção");
}

export async function alternarPromocao(
  id: string,
  active: boolean
): Promise<void> {
  const sb = getSupabase();
  await sb.from("promotions").update({ active }).eq("id", id);
}

export async function removerPromocao(id: string): Promise<void> {
  const sb = getSupabase();
  await sb.from("promotions").delete().eq("id", id);
}
