"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PRODUCTS, STORE, formatBRL } from "@/lib/store";
import { supabaseOn, getSupabase } from "@/lib/supabase";
import {
  listarPedidos,
  registrarVendaBalcao,
  listarVendedores,
  adicionarVendedor,
  removerVendedor,
  type Vendedor,
  atualizarStatus,
  apagarPedido,
  aoChegarPedido,
  resumo,
  STATUS_LABEL,
  PROXIMO_STATUS,
  linkWhatsApp,
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
  const [aba, setAba] = useState<
    "vender" | "dashboard" | "pedidos" | "vendedores"
  >("vender");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [toast, setToast] = useState("");
  const [notifOn, setNotifOn] = useState(false);

  const recarregar = async () => setPedidos(await listarPedidos());

  useEffect(() => {
    setNotifOn(localStorage.getItem("duo-notif") === "1");
  }, []);

  useEffect(() => {
    recarregar();
    const cancelar = aoChegarPedido((evento, canalPedido) => {
      recarregar();
      if (
        evento === "INSERT" &&
        canalPedido === "site" &&
        localStorage.getItem("duo-notif") === "1"
      ) {
        tocarSino();
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          new Notification("Novo pedido na Duo!", {
            body: "Abra a aba Pedidos pra ver os detalhes.",
          });
        }
      }
    });
    return cancelar;
  }, []);

  const alternarNotif = async () => {
    if (notifOn) {
      localStorage.setItem("duo-notif", "0");
      setNotifOn(false);
      return;
    }
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      try {
        await Notification.requestPermission();
      } catch {}
    }
    localStorage.setItem("duo-notif", "1");
    setNotifOn(true);
    tocarSino(); // demonstração + desbloqueia o áudio no navegador
  };

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
        <button
          className={`admin-tab ${aba === "vendedores" ? "ativo" : ""}`}
          onClick={() => setAba("vendedores")}
        >
          Vendedores
        </button>
        <button
          className="admin-tab"
          onClick={alternarNotif}
          title="Som e notificação quando chegar pedido novo"
        >
          {notifOn ? "Som: ligado" : "Som: desligado"}
        </button>
        <button
          className="admin-tab"
          title="Sair do painel"
          onClick={async () => {
            if (!confirm("Sair do painel?")) return;
            if (supabaseOn) await getSupabase().auth.signOut();
            sessionStorage.removeItem("duo-admin");
            window.location.reload();
          }}
        >
          Sair
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
      {aba === "vendedores" && <Vendedores avisar={avisar} />}

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

/* Sino de pedido novo (Web Audio, sem arquivo de som) */
function tocarSino() {
  try {
    const ctx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const notas = [880, 1174.66]; // lá 5 -> ré 6
    notas.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.55);
    });
  } catch {}
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
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [vendedor, setVendedor] = useState<string | null>(null);

  useEffect(() => {
    listarVendedores().then((v) => {
      setVendedores(v);
      if (v.length > 0) setVendedor(v[0].name);
    });
  }, []);

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
      await registrarVendaBalcao({
        payment_method: pagamento,
        total,
        seller_name: vendedor,
        itens,
      });
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
        <h2>Quem vendeu?</h2>
        <div className="pill-group">
          {vendedores.map((v) => (
            <button
              key={v.id}
              className={`pill ${vendedor === v.name ? "ativo" : ""}`}
              onClick={() => setVendedor(v.name)}
            >
              {v.name}
            </button>
          ))}
          {vendedores.length === 0 && (
            <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>
              Nenhum vendedor cadastrado — adicione na aba Vendedores.
            </p>
          )}
        </div>
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

      <div className="bloco">
        <h2>Vendas por vendedor</h2>
        {Object.entries(r.porVendedor)
          .sort((a, b) => b[1] - a[1])
          .map(([nome, valor]) => {
            const maxV = Math.max(...Object.values(r.porVendedor), 1);
            return (
              <div className="barra-linha" key={nome}>
                <span>{nome}</span>
                <div className="barra-trilho">
                  <div
                    className="barra-fill"
                    style={{ width: `${(valor / maxV) * 100}%` }}
                  />
                </div>
                <span className="barra-qtd">{formatBRL(valor)}</span>
              </div>
            );
          })}
        {Object.keys(r.porVendedor).length === 0 && (
          <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>
            Aparece aqui quando houver vendas registradas com vendedor.
          </p>
        )}
      </div>
    </>
  );
}

/* ================= Vendedores ================= */

function Vendedores({ avisar }: { avisar: (msg: string) => void }) {
  const [lista, setLista] = useState<Vendedor[]>([]);
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = () => listarVendedores().then(setLista);
  useEffect(() => {
    carregar();
  }, []);

  const adicionar = async () => {
    if (!nome.trim() || salvando) return;
    setSalvando(true);
    try {
      await adicionarVendedor(nome);
      setNome("");
      carregar();
      avisar("Vendedor adicionado ✓");
    } catch (e: any) {
      avisar(e.message || "Erro ao adicionar");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="bloco">
        <h2>Novo vendedor</h2>
        <div className="campo">
          <label htmlFor="novo-vendedor">Nome</label>
          <input
            id="novo-vendedor"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
            placeholder="Nome do vendedor"
          />
        </div>
        <button className="btn-principal" onClick={adicionar}>
          {salvando ? "Salvando…" : "Adicionar"}
        </button>
      </div>

      <div className="bloco">
        <h2>Equipe</h2>
        {lista.map((v) => (
          <div className="hist-item" key={v.id}>
            <span>{v.name}</span>
            <button
              className="btn-x"
              onClick={async () => {
                if (confirm(`Remover ${v.name}? As vendas antigas continuam no histórico.`)) {
                  await removerVendedor(v.id);
                  carregar();
                }
              }}
            >
              remover
            </button>
          </div>
        ))}
        {lista.length === 0 && (
          <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>
            Ninguém cadastrado ainda.
          </p>
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
          {pedido.seller_name ? ` · vend. ${pedido.seller_name}` : ""}
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
                  if (proximo === "saiu_entrega" && pedido.customer_phone) {
                    const msg = `Oi${
                      pedido.customer_name ? " " + pedido.customer_name.split(" ")[0] : ""
                    }! Aqui é da Duo Açaí. Seu pedido #${pedido.id
                      .slice(0, 6)
                      .toUpperCase()} acabou de sair pra entrega. Já já chega aí!`;
                    window.open(
                      linkWhatsApp(pedido.customer_phone, msg),
                      "_blank"
                    );
                  }
                }}
              >
                → {STATUS_LABEL[proximo]}
                {proximo === "saiu_entrega" && pedido.customer_phone
                  ? " + avisar cliente"
                  : ""}
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
