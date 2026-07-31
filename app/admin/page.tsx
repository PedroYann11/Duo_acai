"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { STORE, formatBRL } from "@/lib/store";
import { useProducts } from "@/lib/products-context";
import { processarFoto } from "@/lib/image";
import {
  CONFIG_PADRAO,
  TEMA_PADRAO,
  aplicarTema,
  type ConfigLoja,
} from "@/lib/settings-context";
import { supabaseOn, getSupabase } from "@/lib/supabase";
import {
  listarPedidos,
  registrarVendaBalcao,
  listarVendedores,
  adicionarVendedor,
  removerVendedor,
  type Vendedor,
  listarProdutosAdmin,
  salvarProduto,
  alternarDisponibilidade,
  criarProduto,
  removerProduto,
  trocarOrdem,
  enviarFotoProduto,
  atualizarFotoProduto,
  type ProdutoAdmin,
  salvarConfig,
  listarBairrosAdmin,
  criarBairro,
  removerBairro,
  type BairroAdmin,
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
    "vender" | "dashboard" | "pedidos" | "vendedores" | "produtos" | "loja"
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
      <div className="admin-head">
        <h1>Painel Duo</h1>
        <button
          className="btn-som"
          onClick={alternarNotif}
          title={
            notifOn
              ? "Som de pedido novo: ligado (toque para desligar)"
              : "Som de pedido novo: desligado (toque para ligar)"
          }
        >
          {notifOn ? "\u{1F50A}" : "\u{1F507}"}
        </button>
      </div>
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
          className={`admin-tab ${aba === "produtos" ? "ativo" : ""}`}
          onClick={() => setAba("produtos")}
        >
          Produtos
        </button>
        <button
          className={`admin-tab ${aba === "loja" ? "ativo" : ""}`}
          onClick={() => setAba("loja")}
        >
          Loja
        </button>
        <button
          className={`admin-tab ${aba === "vendedores" ? "ativo" : ""}`}
          onClick={() => setAba("vendedores")}
        >
          Vendedores
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
      {aba === "produtos" && <Produtos avisar={avisar} />}
      {aba === "loja" && <Loja avisar={avisar} />}

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
  const PRODUCTS = useProducts();
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


/* ================= Produtos ================= */

function Produtos({ avisar }: { avisar: (msg: string) => void }) {
  const [lista, setLista] = useState<ProdutoAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  const carregar = async () => {
    setLista(await listarProdutosAdmin());
    setCarregando(false);
  };
  useEffect(() => {
    carregar();
  }, []);

  if (!supabaseOn) {
    return (
      <p className="aviso-local">
        A gestão de produtos precisa do Supabase conectado. Siga o passo a
        passo do README pra ativar.
      </p>
    );
  }

  return (
    <>
      <button
        className="btn-principal"
        style={{ marginBottom: 18 }}
        onClick={() => setCriando(!criando)}
      >
        {criando ? "Fechar" : "+ Novo produto"}
      </button>

      {criando && (
        <NovoProduto
          avisar={avisar}
          onCriado={() => {
            setCriando(false);
            carregar();
          }}
        />
      )}

      <div className="bloco">
        <h2>Cardápio</h2>
        {carregando && (
          <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>
            Carregando…
          </p>
        )}
        {!carregando && lista.length === 0 && (
          <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>
            Nenhum produto no banco ainda. Rode o arquivo
            supabase/etapa1-produtos.sql no SQL Editor do Supabase pra migrar
            o cardápio.
          </p>
        )}
        {lista.map((p, i) => (
          <CartaoProduto
            key={p.id}
            produto={p}
            anterior={i > 0 ? lista[i - 1] : null}
            proximo={i < lista.length - 1 ? lista[i + 1] : null}
            aberto={editando === p.id}
            onEditar={() =>
              setEditando(editando === p.id ? null : p.id)
            }
            onMudou={() => {
              carregar();
            }}
            avisar={avisar}
          />
        ))}
      </div>
      <p className="aviso-local">
        As mudanças valem na hora pra quem abrir o site. Ao remover um
        produto, as vendas antigas dele continuam no histórico e no
        dashboard.
      </p>
    </>
  );
}

function CartaoProduto({
  produto,
  anterior,
  proximo,
  aberto,
  onEditar,
  onMudou,
  avisar,
}: {
  produto: ProdutoAdmin;
  anterior: ProdutoAdmin | null;
  proximo: ProdutoAdmin | null;
  aberto: boolean;
  onEditar: () => void;
  onMudou: () => void;
  avisar: (msg: string) => void;
}) {
  const fotoRef = useRef<HTMLInputElement>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const trocarFoto = async (file: File) => {
    setEnviandoFoto(true);
    try {
      const blob = await processarFoto(file);
      const url = await enviarFotoProduto(blob, produto.slug);
      await atualizarFotoProduto(produto.id, url);
      avisar("Foto atualizada");
      onMudou();
    } catch (e: any) {
      avisar(e.message || "Erro na foto");
    } finally {
      setEnviandoFoto(false);
    }
  };

  const mover = async (direcao: -1 | 1) => {
    const vizinho = direcao === -1 ? anterior : proximo;
    if (!vizinho) return;
    await trocarOrdem(
      { id: produto.id, sort_order: produto.sort_order },
      { id: vizinho.id, sort_order: vizinho.sort_order }
    );
    onMudou();
  };

  const remover = async () => {
    if (
      !confirm(
        `Remover "${produto.name}" do cardápio? As vendas antigas continuam no histórico.`
      )
    )
      return;
    try {
      await removerProduto(produto.id);
      avisar("Produto removido");
      onMudou();
    } catch {
      avisar("Erro ao remover");
    }
  };
  const [nome, setNome] = useState(produto.name);
  const [descricao, setDescricao] = useState(produto.description);
  const [preco, setPreco] = useState(produto.price.toFixed(2).replace(".", ","));
  const [salvando, setSalvando] = useState(false);
  const [mudandoDisp, setMudandoDisp] = useState(false);

  const salvar = async () => {
    const valor = parseFloat(preco.replace(",", "."));
    if (!nome.trim() || isNaN(valor) || valor <= 0) {
      avisar("Confira o nome e o preço");
      return;
    }
    setSalvando(true);
    try {
      await salvarProduto(produto.id, {
        name: nome.trim(),
        description: descricao.trim(),
        price: valor,
      });
      avisar("Produto salvo");
      onMudou();
      onEditar();
    } catch {
      avisar("Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  const alternar = async () => {
    if (mudandoDisp) return;
    setMudandoDisp(true);
    try {
      await alternarDisponibilidade(produto.id, !produto.available);
      onMudou();
    } catch {
      avisar("Erro ao atualizar");
    } finally {
      setMudandoDisp(false);
    }
  };

  return (
    <div className="produto-admin">
      <div className="produto-admin-linha">
        <div className="ordem-setas">
          <button onClick={() => mover(-1)} disabled={!anterior} aria-label="Subir">
            ▲
          </button>
          <button onClick={() => mover(1)} disabled={!proximo} aria-label="Descer">
            ▼
          </button>
        </div>
        <button
          className="foto-botao"
          onClick={() => fotoRef.current?.click()}
          title="Toque para trocar a foto"
        >
          <img src={produto.image_url} alt={produto.name} />
          <span>{enviandoFoto ? "…" : "trocar"}</span>
        </button>
        <input
          ref={fotoRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) trocarFoto(f);
            e.target.value = "";
          }}
        />
        <div className="produto-admin-info">
          <strong>{produto.name}</strong>
          <span>{formatBRL(produto.price)}</span>
        </div>
        <button
          className={`pill ${produto.available ? "ativo" : ""}`}
          onClick={alternar}
          title="Toque para alternar disponível/esgotado"
        >
          {mudandoDisp ? "…" : produto.available ? "Disponível" : "Esgotado"}
        </button>
        <button className="btn-suave" onClick={onEditar}>
          {aberto ? "Fechar" : "Editar"}
        </button>
      </div>

      {aberto && (
        <div className="produto-admin-form">
          <div className="campo">
            <label>Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="campo">
            <label>Descrição</label>
            <textarea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="campo" style={{ maxWidth: 160 }}>
            <label>Preço (R$)</label>
            <input
              inputMode="decimal"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
            />
          </div>
          <div className="admin-acoes">
            <button className="btn-principal" onClick={salvar} style={{ flex: 1 }}>
              {salvando ? "Salvando…" : "Salvar alterações"}
            </button>
            <button className="btn-suave" style={{ color: "#b23b3b" }} onClick={remover}>
              Remover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Novo produto ---- */

function NovoProduto({
  avisar,
  onCriado,
}: {
  avisar: (msg: string) => void;
  onCriado: () => void;
}) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const fotoRef = useRef<HTMLInputElement>(null);

  const escolherFoto = (f: File) => {
    setFoto(f);
    setPreview(URL.createObjectURL(f));
  };

  const criar = async () => {
    const valor = parseFloat(preco.replace(",", "."));
    if (!nome.trim() || isNaN(valor) || valor <= 0) {
      avisar("Preencha nome e preço");
      return;
    }
    if (!foto) {
      avisar("Escolha uma foto");
      return;
    }
    setSalvando(true);
    try {
      const blob = await processarFoto(foto);
      const url = await enviarFotoProduto(blob, nome);
      await criarProduto({
        name: nome.trim(),
        description: descricao.trim(),
        price: valor,
        image_url: url,
      });
      avisar("Produto criado");
      onCriado();
    } catch (e: any) {
      avisar(e.message || "Erro ao criar");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bloco">
      <h2>Novo produto</h2>
      <div className="novo-produto-grid">
        <button
          className="foto-escolher"
          onClick={() => fotoRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="Prévia" />
          ) : (
            <span>
              Toque para
              <br />
              escolher a foto
            </span>
          )}
        </button>
        <input
          ref={fotoRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) escolherFoto(f);
            e.target.value = "";
          }}
        />
        <div style={{ flex: 1 }}>
          <div className="campo">
            <label>Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Duo Morango"
            />
          </div>
          <div className="campo">
            <label>Descrição</label>
            <textarea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Açaí com creme de morango fresquinho."
            />
          </div>
          <div className="campo" style={{ maxWidth: 160 }}>
            <label>Preço (R$)</label>
            <input
              inputMode="decimal"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              placeholder="19,90"
            />
          </div>
        </div>
      </div>
      <button className="btn-principal" onClick={criar}>
        {salvando ? "Criando…" : "Adicionar ao cardápio"}
      </button>
      <p className="aviso" style={{ marginTop: 10 }}>
        A foto é cortada e padronizada automaticamente (640×800). Pode mandar
        direto da galeria do celular.
      </p>
    </div>
  );
}


/* ================= Loja (configurações) ================= */

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function Loja({ avisar }: { avisar: (msg: string) => void }) {
  const [cfg, setCfg] = useState<ConfigLoja>(CONFIG_PADRAO);
  const [bairros, setBairros] = useState<BairroAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = async () => {
    try {
      const sb = getSupabase();
      const [{ data }, listaBairros] = await Promise.all([
        sb.from("store_settings").select("key, value"),
        listarBairrosAdmin(),
      ]);
      if (data) {
        const novo: any = { ...CONFIG_PADRAO };
        for (const linha of data) {
          if (linha.key === "special_dates") novo[linha.key] = linha.value;
          else novo[linha.key] = { ...(novo as any)[linha.key], ...linha.value };
        }
        setCfg(novo as ConfigLoja);
      }
      setBairros(listaBairros);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const salvar = async (key: keyof ConfigLoja, valor: unknown, msg: string) => {
    try {
      await salvarConfig(key, valor);
      avisar(msg);
    } catch {
      avisar("Erro ao salvar");
    }
  };

  if (!supabaseOn)
    return (
      <p className="aviso-local">
        As configurações da loja precisam do Supabase conectado.
      </p>
    );
  if (carregando)
    return <p style={{ color: "var(--texto-suave)" }}>Carregando…</p>;

  return (
    <>
      {/* -------- Status da loja -------- */}
      <div className="bloco">
        <h2>Status da loja</h2>
        <div className="pill-group" style={{ marginBottom: 12 }}>
          <button
            className={`pill ${cfg.store_open.open ? "ativo" : ""}`}
            onClick={() =>
              setCfg({ ...cfg, store_open: { ...cfg.store_open, open: true } })
            }
          >
            Aberta
          </button>
          <button
            className={`pill ${!cfg.store_open.open ? "ativo" : ""}`}
            onClick={() =>
              setCfg({ ...cfg, store_open: { ...cfg.store_open, open: false } })
            }
          >
            Fechada (modo férias)
          </button>
        </div>
        {!cfg.store_open.open && (
          <div className="campo">
            <label>Mensagem para os clientes</label>
            <input
              value={cfg.store_open.message}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  store_open: { ...cfg.store_open, message: e.target.value },
                })
              }
              placeholder="Voltamos dia 05/08!"
            />
          </div>
        )}
        <button
          className="btn-principal"
          onClick={() => salvar("store_open", cfg.store_open, "Status salvo")}
        >
          Salvar status
        </button>
      </div>

      {/* -------- Banner -------- */}
      <div className="bloco">
        <h2>Banner promocional</h2>
        <div className="pill-group" style={{ marginBottom: 12 }}>
          <button
            className={`pill ${cfg.banner.active ? "ativo" : ""}`}
            onClick={() =>
              setCfg({ ...cfg, banner: { ...cfg.banner, active: true } })
            }
          >
            Ligado
          </button>
          <button
            className={`pill ${!cfg.banner.active ? "ativo" : ""}`}
            onClick={() =>
              setCfg({ ...cfg, banner: { ...cfg.banner, active: false } })
            }
          >
            Desligado
          </button>
        </div>
        <div className="campo">
          <label>Texto (aparece numa faixa amarela no topo do site)</label>
          <input
            value={cfg.banner.text}
            onChange={(e) =>
              setCfg({ ...cfg, banner: { ...cfg.banner, text: e.target.value } })
            }
            placeholder="Hoje: 2 garrafas por R$ 35!"
          />
        </div>
        <button
          className="btn-principal"
          onClick={() => salvar("banner", cfg.banner, "Banner salvo")}
        >
          Salvar banner
        </button>
      </div>

      {/* -------- Entrega -------- */}
      <div className="bloco">
        <h2>Entrega</h2>
        <div className="duas-colunas">
          <div className="campo">
            <label>Taxa padrão (R$)</label>
            <input
              inputMode="decimal"
              value={String(cfg.delivery.fee).replace(".", ",")}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  delivery: {
                    ...cfg.delivery,
                    fee: parseFloat(e.target.value.replace(",", ".")) || 0,
                  },
                })
              }
            />
          </div>
          <div className="campo">
            <label>Pedido mínimo (R$, 0 = sem mínimo)</label>
            <input
              inputMode="decimal"
              value={String(cfg.delivery.min_order).replace(".", ",")}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  delivery: {
                    ...cfg.delivery,
                    min_order: parseFloat(e.target.value.replace(",", ".")) || 0,
                  },
                })
              }
            />
          </div>
        </div>
        <div className="pill-group" style={{ marginBottom: 12 }}>
          {(
            [
              ["fixed", "Taxa única"],
              ["neighborhood", "Por bairro"],
              ["km", "Por km"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              className={`pill ${cfg.delivery.mode === valor ? "ativo" : ""}`}
              onClick={() =>
                setCfg({
                  ...cfg,
                  delivery: {
                    ...cfg.delivery,
                    mode: valor,
                    by_neighborhood: valor === "neighborhood",
                  },
                })
              }
            >
              {rotulo}
            </button>
          ))}
        </div>

        {cfg.delivery.mode === "km" && (
          <div className="km-config">
            <div className="duas-colunas">
              <div className="campo">
                <label>Taxa base (R$)</label>
                <input
                  inputMode="decimal"
                  value={String(cfg.delivery.km_base).replace(".", ",")}
                  onChange={(e) =>
                    setCfg({
                      ...cfg,
                      delivery: {
                        ...cfg.delivery,
                        km_base:
                          parseFloat(e.target.value.replace(",", ".")) || 0,
                      },
                    })
                  }
                />
              </div>
              <div className="campo">
                <label>Preço por km (R$)</label>
                <input
                  inputMode="decimal"
                  value={String(cfg.delivery.km_price).replace(".", ",")}
                  onChange={(e) =>
                    setCfg({
                      ...cfg,
                      delivery: {
                        ...cfg.delivery,
                        km_price:
                          parseFloat(e.target.value.replace(",", ".")) || 0,
                      },
                    })
                  }
                />
              </div>
            </div>
            <p className="aviso" style={{ textAlign: "left", marginBottom: 10 }}>
              Ponto de partida: Rua José Marrocos, 145 — Pinto Madeira,
              Crato/CE. Entrega = taxa base + (km × preço por km). O cliente
              calcula pela localização dele; sem localização, vale a taxa
              padrão acima. Exemplo com os valores atuais: 2 km ={" "}
              {formatBRL(
                cfg.delivery.km_base + 2 * cfg.delivery.km_price
              )}
              .
            </p>
            <button
              className="btn-suave"
              onClick={() => {
                if (!("geolocation" in navigator)) return;
                navigator.geolocation.getCurrentPosition((pos) => {
                  setCfg({
                    ...cfg,
                    delivery: {
                      ...cfg.delivery,
                      store_lat: pos.coords.latitude,
                      store_lng: pos.coords.longitude,
                    },
                  });
                });
              }}
            >
              {"\u{1F4CD}"} Estou na loja agora — usar minha localização como ponto
            </button>
          </div>
        )}
        <button
          className="btn-principal"
          onClick={() => salvar("delivery", cfg.delivery, "Entrega salva")}
        >
          Salvar entrega
        </button>

        {cfg.delivery.mode === "neighborhood" && (
          <BairrosEditor
            bairros={bairros}
            onMudou={carregar}
            avisar={avisar}
          />
        )}
      </div>

      {/* -------- Horários -------- */}
      <div className="bloco">
        <h2>Horários de funcionamento</h2>
        {DIAS.map((nome, i) => {
          const d = cfg.hours[String(i)];
          return (
            <div className="linha-horario" key={i}>
              <button
                className={`pill ${!d.closed ? "ativo" : ""}`}
                onClick={() =>
                  setCfg({
                    ...cfg,
                    hours: {
                      ...cfg.hours,
                      [String(i)]: { ...d, closed: !d.closed },
                    },
                  })
                }
              >
                {nome.slice(0, 3)}
              </button>
              {d.closed ? (
                <span className="fechado-txt">fechado</span>
              ) : (
                <>
                  <input
                    type="time"
                    value={d.open}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        hours: {
                          ...cfg.hours,
                          [String(i)]: { ...d, open: e.target.value },
                        },
                      })
                    }
                  />
                  <span>às</span>
                  <input
                    type="time"
                    value={d.close}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        hours: {
                          ...cfg.hours,
                          [String(i)]: { ...d, close: e.target.value },
                        },
                      })
                    }
                  />
                </>
              )}
            </div>
          );
        })}
        <button
          className="btn-principal"
          style={{ marginTop: 10 }}
          onClick={() => salvar("hours", cfg.hours, "Horários salvos")}
        >
          Salvar horários
        </button>
      </div>

      {/* -------- Datas especiais -------- */}
      <div className="bloco">
        <h2>Datas especiais (fechado)</h2>
        <DatasEspeciais
          datas={cfg.special_dates}
          onChange={(novas) => setCfg({ ...cfg, special_dates: novas })}
        />
        <button
          className="btn-principal"
          onClick={() =>
            salvar("special_dates", cfg.special_dates, "Datas salvas")
          }
        >
          Salvar datas
        </button>
      </div>

      {/* -------- Aparência -------- */}
      <div className="bloco">
        <h2>Aparência do site</h2>
        <p style={{ color: "var(--texto-suave)", fontSize: "0.88rem", marginBottom: 12 }}>
          Toque em cada cor pra trocar. O site inteiro se adapta sozinho
          (botões, fundos, letreiro, garrafinha do topo).
        </p>
        <div className="cores-grid">
          {(
            [
              ["acai", "Fundo escuro (topo e rodapé)"],
              ["roxo", "Cor da marca (botões e preços)"],
              ["lilas", "Detalhes claros"],
              ["creme", "Fundo da página"],
              ["maracuja", "Destaque (botão amarelo)"],
            ] as [keyof typeof TEMA_PADRAO, string][]
          ).map(([chave, rotulo]) => (
            <label className="cor-item" key={chave}>
              <input
                type="color"
                value={cfg.theme[chave]}
                onChange={(e) =>
                  setCfg({
                    ...cfg,
                    theme: { ...cfg.theme, [chave]: e.target.value },
                  })
                }
              />
              <span>{rotulo}</span>
            </label>
          ))}
        </div>
        <div className="admin-acoes">
          <button
            className="btn-principal"
            style={{ flex: 1 }}
            onClick={() => salvar("theme", cfg.theme, "Cores salvas")}
          >
            Salvar cores
          </button>
          <button
            className="btn-suave"
            onClick={() => setCfg({ ...cfg, theme: { ...TEMA_PADRAO } })}
          >
            Restaurar padrão
          </button>
        </div>
        <p style={{ color: "var(--texto-suave)", fontSize: "0.8rem", marginTop: 10 }}>
          Depois de salvar, recarregue o site pra ver o resultado. Se salvar
          "Restaurar padrão", volta ao roxo original da Duo.
        </p>
      </div>

      {/* -------- Aparência -------- */}
      <div className="bloco">
        <h2>Aparência (cores do site)</h2>
        <div className="cores-grid">
          {(
            [
              ["roxo", "Roxo principal"],
              ["acai", "Açaí escuro (fundos)"],
              ["maracuja", "Amarelo destaque"],
              ["creme", "Fundo claro"],
              ["lilas", "Lilás (detalhes)"],
            ] as const
          ).map(([chave, rotulo]) => (
            <label className="cor-item" key={chave}>
              <input
                type="color"
                value={cfg.theme[chave]}
                onChange={(e) => {
                  const novoTema = { ...cfg.theme, [chave]: e.target.value };
                  setCfg({ ...cfg, theme: novoTema });
                  aplicarTema(novoTema); // prévia ao vivo no próprio painel
                }}
              />
              <span>{rotulo}</span>
            </label>
          ))}
        </div>
        <div className="admin-acoes">
          <button
            className="btn-principal"
            style={{ flex: 1 }}
            onClick={() => salvar("theme", cfg.theme, "Cores salvas")}
          >
            Salvar cores
          </button>
          <button
            className="btn-suave"
            onClick={() => {
              const padrao = { ...TEMA_PADRAO };
              setCfg({ ...cfg, theme: padrao });
              aplicarTema(padrao);
            }}
          >
            Restaurar padrão
          </button>
        </div>
        <p className="aviso" style={{ marginTop: 10 }}>
          A prévia muda aqui na hora; clientes veem depois de salvar.
        </p>
      </div>

      {/* -------- Contato e Pix -------- */}
      <div className="bloco">
        <h2>Contato e Pix</h2>
        <div className="campo">
          <label>WhatsApp da loja (55 + DDD + número)</label>
          <input
            value={cfg.contact.whatsapp}
            onChange={(e) =>
              setCfg({
                ...cfg,
                contact: { ...cfg.contact, whatsapp: e.target.value },
              })
            }
          />
        </div>
        <div className="campo">
          <label>Chave Pix</label>
          <input
            value={cfg.contact.pix_key}
            onChange={(e) =>
              setCfg({
                ...cfg,
                contact: { ...cfg.contact, pix_key: e.target.value },
              })
            }
          />
        </div>
        <div className="duas-colunas">
          <div className="campo">
            <label>Nome do recebedor</label>
            <input
              value={cfg.contact.pix_name}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  contact: { ...cfg.contact, pix_name: e.target.value },
                })
              }
            />
          </div>
          <div className="campo">
            <label>Cidade</label>
            <input
              value={cfg.contact.pix_city}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  contact: { ...cfg.contact, pix_city: e.target.value },
                })
              }
            />
          </div>
        </div>
        <button
          className="btn-principal"
          onClick={() => salvar("contact", cfg.contact, "Contato salvo")}
        >
          Salvar contato e Pix
        </button>
      </div>
    </>
  );
}

function BairrosEditor({
  bairros,
  onMudou,
  avisar,
}: {
  bairros: BairroAdmin[];
  onMudou: () => void;
  avisar: (msg: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [taxa, setTaxa] = useState("");

  const adicionar = async () => {
    const valor = parseFloat(taxa.replace(",", "."));
    if (!nome.trim() || isNaN(valor) || valor < 0) {
      avisar("Preencha bairro e taxa");
      return;
    }
    try {
      await criarBairro(nome, valor);
      setNome("");
      setTaxa("");
      onMudou();
      avisar("Bairro adicionado");
    } catch (e: any) {
      avisar(e.message);
    }
  };

  return (
    <div className="bairros-editor">
      <h3>Bairros atendidos</h3>
      {bairros.map((b) => (
        <div className="hist-item" key={b.id}>
          <span>
            {b.name} — {formatBRL(b.fee)}
          </span>
          <button
            className="btn-x"
            onClick={async () => {
              if (confirm(`Remover ${b.name}?`)) {
                await removerBairro(b.id);
                onMudou();
              }
            }}
          >
            remover
          </button>
        </div>
      ))}
      <div className="duas-colunas" style={{ marginTop: 10 }}>
        <div className="campo">
          <label>Bairro</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="campo">
          <label>Taxa (R$)</label>
          <input
            inputMode="decimal"
            value={taxa}
            onChange={(e) => setTaxa(e.target.value)}
          />
        </div>
      </div>
      <button className="btn-suave" onClick={adicionar}>
        + Adicionar bairro
      </button>
    </div>
  );
}

function DatasEspeciais({
  datas,
  onChange,
}: {
  datas: { date: string; label: string }[];
  onChange: (novas: { date: string; label: string }[]) => void;
}) {
  const [data, setData] = useState("");
  const [label, setLabel] = useState("");

  return (
    <>
      {datas.map((d, i) => (
        <div className="hist-item" key={i}>
          <span>
            {d.date.split("-").reverse().join("/")}
            {d.label ? ` — ${d.label}` : ""}
          </span>
          <button
            className="btn-x"
            onClick={() => onChange(datas.filter((_, j) => j !== i))}
          >
            remover
          </button>
        </div>
      ))}
      <div className="duas-colunas" style={{ marginTop: 10 }}>
        <div className="campo">
          <label>Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
        <div className="campo">
          <label>Motivo (opcional)</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Natal"
          />
        </div>
      </div>
      <button
        className="btn-suave"
        style={{ marginBottom: 12 }}
        onClick={() => {
          if (!data) return;
          onChange([...datas, { date: data, label: label.trim() }]);
          setData("");
          setLabel("");
        }}
      >
        + Adicionar data
      </button>
    </>
  );
}
