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

export type Pedido = {
  id: string;
  channel: Canal;
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
  customer_name: string;
  customer_phone: string | null;
  street: string;
  number: string;
  neighborhood: string;
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

export type Vendedor = { id: string; name: string };

const KEY_VENDEDORES = "duo-vendedores-v1";
const VENDEDORES_PADRAO: Vendedor[] = [
  { id: "v1", name: "Pedro Kailã" },
  { id: "v2", name: "Marcelo Teixeira" },
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
    .select("id, name")
    .eq("active", true)
    .order("name");
  if (error || !data) return [];
  return data as Vendedor[];
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
    todos.push({ id: crypto.randomUUID(), name: limpo });
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

  let recHoje = 0,
    qtdHoje = 0,
    rec7 = 0,
    qtd7 = 0,
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

  return {
    recHoje,
    qtdHoje,
    rec7,
    qtd7,
    recTotal,
    totalPedidos: validos.length,
    porPagamento,
    porCanal,
    porVendedor,
    ranking,
  };
}
