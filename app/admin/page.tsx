"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PRODUCTS, STORE, formatBRL } from "@/lib/store";
import { supabaseOn, getSupabase } from "@/lib/supabase";
import {
  listarPedidos,
  registrarVendaBalcao,
  atualizarStatus,
  apagarPedido,
  aoChegarPedido,
  resumo,
  STATUS_LABEL,
  PROXIMO_STATUS,
  type Pedido,
  type Status,
} from "@/lib/data";

/* ================= Login ================= */

export default function Admin() {
  const [logado, setLogado] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    (async () => {
      if (supabaseOn) {
        const { data } = await getSupabase().auth.getSession();
        if (data.session) setLogado(true);
      } else if (sessionStorage.getItem("duo-admin") === "1") {
        setLogado(true);
      }
      setVerificando(false);
    })();
  }, []);

  const entrar = async () => {
    setErro("");
    if (supabaseOn) {
      const { error } = await getSupabase().auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) setErro("Email ou senha incorretos.");
      else setLogado(true);
    } else {
      if (pin === STORE.adminPin) {
        sessionStorage.setItem("duo-admin", "1");
        setLogado(true);
      } else setErro("Senha incorreta.");
    }
  };

  if (verificando) return <div className="admin"><p>Carregando…</p></div>;

  if (!logado) {
    return (
      <div className="admin" style={{ maxWidth: 380 }}>
        <h1>Painel Duo</h1>
        <div className="bloco">
          {supabaseOn ? (
            <>
              <div className="campo">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@duoacai.com"
                />
              </div>
              <div className="campo">
                <label htmlFor="senha">Senha</label>
                <input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && entrar()}
                  placeholder="••••••••"
                />
              </div>
            </>
          ) : (
            <div className="campo">
              <label htmlFor="pin">Senha de acesso</label>
              <input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && entrar()}
                placeholder="••••••"
              />
            </div>
          )}
          {erro && (
            <p style={{ color: "#b23b3b", fontSize: "0.85rem", marginBottom: 10 }}>
              {erro}
            </p>
          )}
          <button className="btn-principal" onClick={entrar}>
            Entrar
          </button>
        </div>
        <Link href="/" className="voltar">← Voltar à loja</Link>
      </div>
    );
  }

  return <Painel />;
}

/* ================= Painel ================= */

function Painel() {
  const [aba, setAba] = useState<"vender" | "dashboard" | "pedidos">("vender");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [toast, setToast] = useState("");

  const recarregar = async () => setPedidos(await listarPedidos());

  useEffect(() => {
    recarregar();
    const cancelar = aoChegarPedido(recarregar);
    return cancelar;
  }, []);

  const avisar = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const pendentes = pedidos.filter(
    (p) => p.channel === "site" && !["entregue", "cancelado"].includes(p.status)
  ).length;

  return (
    <div className="admin">
      <h1>Painel Duo</h1>
      <div className="admin-tabs">
        <button
          className={`admin-tab ${aba === "vender" ? "ativo" : ""}`}
          onClick={() => setAba("vender")}
        >
          Registrar venda
        </button>
        <button
          className={`admin-tab ${aba === "dashboard" ? "ativo" : ""}`}
          onClick={() => setAba("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`admin-tab ${aba === "pedidos" ? "ativo" : ""}`}
          onClick={() => setAba("pedidos")}
        >
          Pedidos{pendentes > 0 ? ` (${pendentes})` : ""}
        </button>
      </div>

      {aba === "vender" && (
        <RegistrarVenda
          onSalvo={() => {
            recarregar();
            avisar("Venda registrada ✓");
          }}
          onErro={() => avisar("Erro ao salvar — tente de novo")}
        />
      )}
      {aba === "dashboard" && <Dashboard pedidos={pedidos} />}
      {aba === "pedidos" && (
        <Pedidos pedidos={pedidos} onMudou={recarregar} />
      )}

      {toast && <div className="toast-ok">{toast}</div>}
      {!supabaseOn && (
        <p className="aviso-local">
          <strong>Modo local:</strong> o Supabase ainda não foi conectado, então
          as vendas registradas aqui ficam só neste navegador e os pedidos do
          site não entram sozinhos. Siga o passo a passo do README pra ativar a
          nuvem.
        </p>
      )}
    </div>
  );
}

/* ================= Registrar venda (balcão/WhatsApp/dinheiro) ================= */

function RegistrarVenda({
  onSalvo,
  onErro,
}: {
  onSalvo: () => void;
  onErro: () => void;
}) {
  const [qtds, setQtds] = useState<Record<string, number>>({});
  const [pagamento, setPagamento] = useState("Pix");
  const [salvando, setSalvando] = useState(false);

  const mudar = (id: string, delta: number) =>
    setQtds((prev) => {
      const novo = Math.max(0, (prev[id] || 0) + delta);
      const copia = { ...prev, [id]: novo };
      if (novo === 0) delete copia[id];
      return copia;
    });

  const total = Object.entries(qtds).reduce((acc, [id, q]) => {
    const p = PRODUCTS.find((p) => p.id === id);
    return acc + (p ? p.price * q : 0);
  }, 0);

  const registrar = async () => {
    const itens = Object.entries(qtds).map(([id, qty]) => {
      const p = PRODUCTS.find((p) => p.id === id)!;
      return {
        product_slug: id,
        product_name: p.name,
        unit_price: p.price,
        qty,
      };
    });
    if (itens.length === 0 || salvando) return;
    setSalvando(true);
    try {
      await registrarVendaBalcao({ payment_method: pagamento, total, itens });
      setQtds({});
      onSalvo();
    } catch {
      onErro();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="bloco">
        <h2>O que vendeu?</h2>
        {PRODUCTS.map((p) => (
          <div className="venda-produto" key={p.id}>
            <div>
              <div className="nome">{p.name}</div>
              <div className="preco-un">{formatBRL(p.price)}</div>
            </div>
            <div className="qty">
              <button onClick={() => mudar(p.id, -1)} aria-label="Menos">−</button>
              <strong>{qtds[p.id] || 0}</strong>
              <button onClick={() => mudar(p.id, 1)} aria-label="Mais">+</button>
            </div>
          </div>
        ))}
      </div>

      <div className="bloco">
        <h2>Como pagou?</h2>
        <div className="pill-group">
          {["Pix", "Dinheiro", "Crédito"].map((f) => (
            <button
              key={f}
              className={`pill ${pagamento === f ? "ativo" : ""}`}
              onClick={() => setPagamento(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <button
        className="btn-principal"
        onClick={registrar}
        style={{ opacity: total > 0 && !salvando ? 1 : 0.5 }}
      >
        {salvando ? "Salvando…" : `Registrar venda — ${formatBRL(total)}`}
      </button>
      <p className="aviso" style={{ marginTop: 12 }}>
        Use pra vendas de balcão, dinheiro vivo ou pedidos que chegaram direto
        no WhatsApp. Os pedidos feitos pelo site entram sozinhos no dashboard.
      </p>
    </>
  );
}

/* ================= Dashboard ================= */

const NOME_CANAL: Record<string, string> = {
  site: "Site",
  whatsapp: "WhatsApp",
  balcao: "Balcão / manual",
};

function Dashboard({ pedidos }: { pedidos: Pedido[] }) {
  const r = useMemo(() => resumo(pedidos), [pedidos]);
  const maxQtd = r.ranking.length ? r.ranking[0].qtd : 1;
  const maxPag = Math.max(...Object.values(r.porPagamento), 1);
  const maxCanal = Math.max(...Object.values(r.porCanal), 1);

  return (
    <>
      <div className="kpis">
        <div className="kpi">
          <div className="rotulo">Hoje</div>
          <div className="valor">{formatBRL(r.recHoje)}</div>
          <div className="detalhe">{r.qtdHoje} venda(s)</div>
        </div>
        <div className="kpi">
          <div className="rotulo">Últimos 7 dias</div>
          <div className="valor">{formatBRL(r.rec7)}</div>
          <div className="detalhe">{r.qtd7} venda(s)</div>
        </div>
        <div className="kpi">
          <div className="rotulo">Total geral</div>
          <div className="valor">{formatBRL(r.recTotal)}</div>
          <div className="detalhe">{r.totalPedidos} venda(s)</div>
        </div>
      </div>

      <div className="bloco">
        <h2>Sabores — do mais vendido ao menos vendido</h2>
        {r.ranking.length === 0 && (
          <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>
            Ainda sem vendas. Elas aparecem aqui assim que entrarem pelo site ou
            forem registradas.
          </p>
        )}
        {r.ranking.map((item, i) => (
          <div className="barra-linha" key={item.slug}>
            <span>
              {item.nome.replace("Duo ", "")}
              {i === r.ranking.length - 1 && r.ranking.length > 1 && (
                <span className="tag-pior">menos vendido</span>
              )}
            </span>
            <div className="barra-trilho">
              <div
                className={`barra-fill ${
                  i === r.ranking.length - 1 && r.ranking.length > 1
                    ? "destaque-min"
                    : ""
                }`}
                style={{ width: `${(item.qtd / maxQtd) * 100}%` }}
              />
            </div>
            <span className="barra-qtd">{item.qtd} un</span>
          </div>
        ))}
      </div>

      <div className="bloco">
        <h2>Receita por forma de pagamento</h2>
        {Object.entries(r.porPagamento).map(([forma, valor]) => (
          <div className="barra-linha" key={forma}>
            <span>{forma}</span>
            <div className="barra-trilho">
              <div
                className="barra-fill"
                style={{ width: `${(valor / maxPag) * 100}%` }}
              />
            </div>
            <span className="barra-qtd">{formatBRL(valor)}</span>
          </div>
        ))}
        {Object.keys(r.porPagamento).length === 0 && (
          <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>—</p>
        )}
      </div>

      <div className="bloco">
        <h2>Receita por canal</h2>
        {Object.entries(r.porCanal).map(([canal, valor]) => (
          <div className="barra-linha" key={canal}>
            <span>{NOME_CANAL[canal] || canal}</span>
            <div className="barra-trilho">
              <div
                className="barra-fill"
                style={{ width: `${(valor / maxCanal) * 100}%` }}
              />
            </div>
            <span className="barra-qtd">{formatBRL(valor)}</span>
          </div>
        ))}
        {Object.keys(r.porCanal).length === 0 && (
          <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>—</p>
        )}
      </div>
    </>
  );
}

/* ================= Pedidos ================= */

function Pedidos({
  pedidos,
  onMudou,
}: {
  pedidos: Pedido[];
  onMudou: () => void;
}) {
  const ativos = pedidos.filter(
    (p) => !["entregue", "cancelado"].includes(p.status)
  );
  const historico = pedidos
    .filter((p) => ["entregue", "cancelado"].includes(p.status))
    .slice(0, 15);

  return (
    <>
      <div className="bloco">
        <h2>Em andamento</h2>
        {ativos.length === 0 && (
          <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>
            Nenhum pedido em andamento agora.
          </p>
        )}
        {ativos.map((p) => (
          <CartaoPedido key={p.id} pedido={p} onMudou={onMudou} />
        ))}
      </div>
      <div className="bloco">
        <h2>Finalizados recentes</h2>
        {historico.length === 0 && (
          <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>—</p>
        )}
        {historico.map((p) => (
          <CartaoPedido key={p.id} pedido={p} onMudou={onMudou} compacto />
        ))}
      </div>
    </>
  );
}

function CartaoPedido({
  pedido,
  onMudou,
  compacto = false,
}: {
  pedido: Pedido;
  onMudou: () => void;
  compacto?: boolean;
}) {
  const proximo = PROXIMO_STATUS[pedido.status];
  const quando = new Date(pedido.created_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="hist-item" style={{ alignItems: "flex-start" }}>
      <div style={{ flex: 1 }}>
        <div>
          <strong>{NOME_CANAL[pedido.channel] || pedido.channel}</strong>
          {pedido.customer_name ? ` · ${pedido.customer_name}` : ""} ·{" "}
          {formatBRL(Number(pedido.total))} · {pedido.payment_method}
        </div>
        <div style={{ fontSize: "0.85rem", marginTop: 2 }}>
          {pedido.itens
            .map((i) => `${i.qty}x ${i.product_name.replace("Duo ", "")}`)
            .join(", ")}
        </div>
        {!compacto && pedido.street && (
          <div style={{ fontSize: "0.85rem", color: "var(--texto-suave)", marginTop: 2 }}>
            📍 {pedido.street}, {pedido.number} — {pedido.neighborhood}
            {pedido.reference ? ` (${pedido.reference})` : ""}
            {pedido.customer_phone ? ` · 📞 ${pedido.customer_phone}` : ""}
            {pedido.change_for ? ` · troco p/ ${pedido.change_for}` : ""}
          </div>
        )}
        <div className="quando">
          {quando} · {STATUS_LABEL[pedido.status]}
        </div>
        {!compacto && (
          <div className="pill-group" style={{ marginTop: 8 }}>
            {proximo && (
              <button
                className="pill ativo"
                onClick={async () => {
                  await atualizarStatus(pedido.id, proximo);
                  onMudou();
                }}
              >
                → {STATUS_LABEL[proximo]}
              </button>
            )}
            {pedido.status !== "cancelado" && (
              <button
                className="pill"
                onClick={async () => {
                  if (confirm("Cancelar este pedido?")) {
                    await atualizarStatus(pedido.id, "cancelado");
                    onMudou();
                  }
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>
      {compacto && (
        <button
          className="btn-x"
          onClick={async () => {
            if (confirm("Apagar este registro?")) {
              await apagarPedido(pedido.id);
              onMudou();
            }
          }}
        >
          apagar
        </button>
      )}
    </div>
  );
}
