"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { STORE, formatBRL } from "@/lib/store";
import { useProducts } from "@/lib/products-context";
import { processarFoto } from "@/lib/image";
import { mascaraTelefone } from "@/lib/masks";
import {
  CONFIG_PADRAO,
  TEMA_PADRAO,
  aplicarTema,
  estiloTema,
  useSettings,
  type ConfigLoja,
  type Tema,
} from "@/lib/settings-context";
import {
  supabaseOn,
  getSupabase,
  getLembrarDispositivo,
  setLembrarDispositivo,
} from "@/lib/supabase";
import { BAIRROS_CRATO } from "@/lib/bairros-crato";
import {
  ativarNotificacoes,
  desativarNotificacoes,
  garantirServiceWorker,
} from "@/lib/push";
import {
  listarPedidos,
  registrarVendaBalcao,
  listarVendedores,
  adicionarVendedor,
  atualizarVendedor,
  removerVendedor,
  listarEquipePublica,
  vendasDoMesPublico,
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
  listarPromocoes,
  criarPromocao,
  alternarPromocao,
  removerPromocao,
  type PromocaoAdmin,
  listarBairrosAdmin,
  criarBairro,
  removerBairro,
  type BairroAdmin,
  atualizarStatus,
  apagarPedido,
  aoChegarPedido,
  resumo,
  clientesInativos,
  STATUS_LABEL,
  PROXIMO_STATUS,
  linkWhatsApp,
  type Pedido,
  type Status,
} from "@/lib/data";

/* ================= Login ================= */

export default function Admin() {
  const [logado, setLogado] = useState(false);
  const [modoFuncionario, setModoFuncionario] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    setLembrar(getLembrarDispositivo());
  }, []);

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
      setLembrarDispositivo(lembrar);
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

  if (!logado && modoFuncionario) {
    return <AreaFuncionario onSair={() => setModoFuncionario(false)} />;
  }

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
                <div className="campo-senha">
                  <input
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && entrar()}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="campo-senha-olho"
                    onClick={() => setMostrarSenha((v) => !v)}
                    aria-label={mostrarSenha ? "Esconder senha" : "Mostrar senha"}
                    tabIndex={-1}
                  >
                    {mostrarSenha ? "\u{1F648}" : "\u{1F441}\u{FE0F}"}
                  </button>
                </div>
              </div>
              <label className="campo-checkbox">
                <input
                  type="checkbox"
                  checked={lembrar}
                  onChange={(e) => setLembrar(e.target.checked)}
                />
                Lembrar de mim nesse dispositivo
              </label>
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

        <div className="bloco">
          <h2>É da equipe?</h2>
          <p style={{ color: "var(--texto-suave)", fontSize: "0.88rem", marginBottom: 12 }}>
            Veja suas vendas e sua meta do mês sem precisar da senha do dono.
          </p>
          <button
            className="btn-suave"
            style={{ width: "100%" }}
            onClick={() => setModoFuncionario(true)}
          >
            {"\u{1F464}"} Sou funcionário
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
  const { config } = useSettings();
  const [aba, setAba] = useState<
    | "vender"
    | "dashboard"
    | "pedidos"
    | "vendedores"
    | "produtos"
    | "loja"
    | "promocoes"
  >("vender");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [toast, setToast] = useState("");
  const [notifOn, setNotifOn] = useState(false);

  const recarregar = async () => setPedidos(await listarPedidos());

  useEffect(() => {
    const querNotif = localStorage.getItem("duo-notif") === "1";
    setNotifOn(querNotif);
    // registra o service worker (deixa o painel instalável) e, se o dono já
    // tinha ativado as notificações e a permissão continua concedida, re-garante
    // a assinatura por baixo dos panos — ela pode ter se perdido ao reinstalar
    // o app, e é isso que fazia "parar de funcionar até reinstalar de novo".
    garantirServiceWorker().then(() => {
      if (
        querNotif &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        ativarNotificacoes().catch(() => {});
      }
    });
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
        // com o painel aberto: toca o sino. A notificação visual (banner)
        // vem pelo push do service worker, que funciona no celular também —
        // o `new Notification()` da página quebrava no Chrome mobile.
        tocarSino();
        mostrarNotificacaoLocal(
          "Novo pedido na Duo!",
          "Abra a aba Pedidos pra ver os detalhes."
        );
      }
    });
    return cancelar;
  }, []);

  const alternarNotif = async () => {
    if (notifOn) {
      localStorage.setItem("duo-notif", "0");
      setNotifOn(false);
      try {
        await desativarNotificacoes();
      } catch {}
      return;
    }
    // liga o som já (funciona com a aba aberta) e desbloqueia o áudio
    localStorage.setItem("duo-notif", "1");
    setNotifOn(true);
    tocarSino();

    // ativa o push de verdade — chega no celular mesmo com o painel fechado,
    // se instalado como app. A permissão é pedida dentro do próprio clique.
    const r = await ativarNotificacoes();
    if (r.ok) {
      avisar("Notificações ativadas ✓ (mesmo com o app fechado)");
    } else if (r.motivo === "sem-suporte") {
      avisar("Som ligado. Pra avisar com o app fechado, instale o painel na tela de início.");
    } else if (r.motivo === "permissao-negada") {
      avisar("Som ligado. Notificação no celular bloqueada — libere nas configs do navegador.");
    } else {
      avisar("Som ligado. A notificação no celular falhou — tente de novo.");
    }
  };

  const avisar = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const pendentes = pedidos.filter(
    (p) => p.channel === "site" && !["entregue", "cancelado"].includes(p.status)
  ).length;

  const abas: { id: typeof aba; rotulo: string; icone: string; badge?: number }[] =
    [
      { id: "vender", rotulo: "Registrar", icone: "\u{1F4B5}" },
      { id: "dashboard", rotulo: "Dashboard", icone: "\u{1F4CA}" },
      {
        id: "pedidos",
        rotulo: "Pedidos",
        icone: "\u{1F6F5}",
        badge: pendentes,
      },
      { id: "produtos", rotulo: "Produtos", icone: "\u{1F379}" },
      { id: "loja", rotulo: "Loja", icone: "\u{1F3EA}" },
      { id: "promocoes", rotulo: "Promoções", icone: "\u{1F525}" },
      { id: "vendedores", rotulo: "Funcionários", icone: "\u{1F465}" },
    ];

  return (
    <div
      className="admin-layout"
      style={estiloTema(config.temas.admin) as CSSProperties}
    >
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <img src="/icone-garrafa.png" alt="Duo" />
          <div>
            <strong>DUO</strong>
            <span>painel</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {abas.map((a) => (
            <button
              key={a.id}
              className={`sidebar-item ${aba === a.id ? "ativo" : ""}`}
              onClick={() => setAba(a.id)}
            >
              <span className="sidebar-icone">{a.icone}</span>
              <span className="sidebar-rotulo">{a.rotulo}</span>
              {a.badge ? <span className="sidebar-badge">{a.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-rodape">
          <button
            className="btn-som"
            onClick={alternarNotif}
            title={notifOn ? "Notificações: ligadas" : "Notificações: desligadas"}
          >
            {notifOn ? "\u{1F50A}" : "\u{1F507}"}
          </button>
          <button
            className="btn-sair"
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
      </aside>

      <main className="admin-conteudo">
      <div className="admin-topbar-mobile">
        <div className="admin-logo">
          <img src="/icone-garrafa.png" alt="Duo" />
          <div>
            <strong>DUO</strong>
          </div>
        </div>
        <button
          className="btn-som"
          onClick={alternarNotif}
          title={notifOn ? "Notificações: ligadas" : "Notificações: desligadas"}
        >
          {notifOn ? "\u{1F50A}" : "\u{1F507}"}
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
      {aba === "promocoes" && <Promocoes avisar={avisar} />}

      {!supabaseOn && (
        <p className="aviso-local">
          <strong>Modo local:</strong> o Supabase ainda não foi conectado, então
          as vendas registradas aqui ficam só neste navegador e os pedidos do
          site não entram sozinhos. Siga o passo a passo do README pra ativar a
          nuvem.
        </p>
      )}
      </main>

      {toast && <div className="toast-ok">{toast}</div>}
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

/* Notificação visual com o painel aberto. Usa showNotification do service
   worker (funciona no desktop E no celular); o construtor `new Notification()`
   quebra no Chrome mobile. Mesma tag do push pra não duplicar o banner. */
function mostrarNotificacaoLocal(titulo: string, corpo: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted")
    return;
  navigator.serviceWorker?.ready
    .then((reg) =>
      reg.showNotification(titulo, {
        body: corpo,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "duo-pedido",
      })
    )
    .catch(() => {});
}

/* ================= Registrar venda (balcão/WhatsApp/dinheiro) ================= */

/* data de hoje no fuso local, no formato YYYY-MM-DD que o <input type=date> usa */
function dataLocalHoje(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/* converte a data escolhida (YYYY-MM-DD) em ISO. Se for hoje, usa o horário
   real de agora (ordena certo no dashboard); se for outro dia, meio-dia local. */
function isoDaData(dia: string): string {
  if (!dia || dia === dataLocalHoje()) return new Date().toISOString();
  const d = new Date(`${dia}T12:00:00`);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

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
  const [dataVenda, setDataVenda] = useState(dataLocalHoje());

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
        created_at: isoDaData(dataVenda),
      });
      setQtds({});
      setDataVenda(dataLocalHoje());
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

      <div className="bloco">
        <h2>Quando foi a venda?</h2>
        <div className="campo">
          <input
            type="date"
            className="input-data"
            value={dataVenda}
            max={dataLocalHoje()}
            onChange={(e) => setDataVenda(e.target.value)}
          />
        </div>
        <p className="aviso" style={{ margin: 0 }}>
          Já vem com a data de hoje. Mude só se estiver lançando uma venda de
          outro dia.
        </p>
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

const CORES_GRAFICO = ["#61174c", "#f2c230", "#a8c36b", "#c7a3dc", "#5a3a22"];

/* Faixa explicando como instalar o painel como app no celular — some
   sozinha depois que o dono dispensa (localStorage) ou se já estiver
   rodando instalado (modo standalone). */
function DicaInstalarApp() {
  const [visivel, setVisivel] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const jaInstalado =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    const dispensada = localStorage.getItem("duo-pwa-hint") === "0";
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setVisivel(!jaInstalado && !dispensada);
  }, []);

  if (!visivel) return null;

  return (
    <div className="dica-instalar">
      <span className="dica-instalar-icone">📲</span>
      <div className="dica-instalar-texto">
        <strong>Instale o painel como app no celular</strong>
        <p>
          {ios
            ? 'No Safari: toque em Compartilhar (□↑) e depois em "Adicionar à Tela de Início".'
            : 'No Chrome: toque no menu (⋮) e depois em "Instalar app" ou "Adicionar à tela inicial".'}
          {" "}Assim as notificações de pedido chegam mesmo com o app fechado.
        </p>
      </div>
      <button
        className="dica-instalar-fechar"
        onClick={() => {
          localStorage.setItem("duo-pwa-hint", "0");
          setVisivel(false);
        }}
        aria-label="Dispensar"
      >
        ✕
      </button>
    </div>
  );
}

function Dashboard({ pedidos }: { pedidos: Pedido[] }) {
  const r = useMemo(() => resumo(pedidos), [pedidos]);
  const maxQtd = r.ranking.length ? r.ranking[0].qtd : 1;
  const [diasLimite, setDiasLimite] = useState("15");
  const limiteNum = parseInt(diasLimite) || 15;
  const inativos = useMemo(
    () => clientesInativos(pedidos, limiteNum),
    [pedidos, limiteNum]
  );

  return (
    <>
      <DicaInstalarApp />
      {/* faturamento acumulado em destaque, e os recortes menores em 2x2 */}
      <div className="kpi-hero">
        <div className="rotulo">Faturamento acumulado</div>
        <div className="valor">{formatBRL(r.recTotal)}</div>
        <div className="detalhe">
          {r.totalPedidos} venda(s) desde o início
        </div>
      </div>
      <div className="kpis">
        <div className="kpi destaque">
          <div className="rotulo">Hoje</div>
          <div className="valor">{formatBRL(r.recHoje)}</div>
          <div className="detalhe">{r.qtdHoje} venda(s)</div>
        </div>
        <div className="kpi">
          <div className="rotulo">7 dias</div>
          <div className="valor">{formatBRL(r.rec7)}</div>
          <div className="detalhe">{r.qtd7} venda(s)</div>
        </div>
        <div className="kpi">
          <div className="rotulo">Este mês</div>
          <div className="valor">{formatBRL(r.recMes)}</div>
          <div className="detalhe">{r.qtdMes} venda(s)</div>
        </div>
        <div className="kpi">
          <div className="rotulo">Ticket médio</div>
          <div className="valor">{formatBRL(r.ticketMedio)}</div>
          <div className="detalhe">por venda</div>
        </div>
      </div>

      <div className="bloco">
        <h2>Faturamento dos últimos 7 dias</h2>
        <GraficoLinha serie={r.serie} />
      </div>

      <div className="dash-duas">
        <div className="bloco">
          <h2>Formas de pagamento</h2>
          <GraficoDonut dados={r.porPagamento} />
        </div>
        <div className="bloco">
          <h2>Por canal</h2>
          <GraficoDonut dados={r.porCanal} nomes={NOME_CANAL} />
        </div>
      </div>

      <div className="bloco">
        <h2>Sabores — do mais ao menos vendido</h2>
        {r.ranking.length === 0 && (
          <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>
            Ainda sem vendas. Aparecem aqui assim que entrarem.
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

      {Object.keys(r.porVendedor).length > 0 && (
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
        </div>
      )}

      <div className="bloco">
        <h2>Clientes sem pedir há um tempo</h2>
        <div className="campo" style={{ maxWidth: 220 }}>
          <label>Avisar quem não pede há quantos dias?</label>
          <input
            inputMode="numeric"
            value={diasLimite}
            onChange={(e) => setDiasLimite(e.target.value)}
          />
        </div>
        {inativos.length === 0 && (
          <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>
            Ninguém se encaixa nesse período (ou ainda não há pedidos com
            telefone suficientes).
          </p>
        )}
        {inativos.map((c) => {
          const primeiroNome = c.nome.split(" ")[0];
          const msg = `Oi ${primeiroNome}! Aqui é da Duo Açaí \u{1F49C} Notamos que faz ${c.diasSemPedir} dias que você não pede com a gente... bateu aquela vontade de um açaí geladinho? Estamos com tudo pronto pra te atender! \u{1FAD0}`;
          return (
            <div className="hist-item" key={c.telefone}>
              <div style={{ flex: 1 }}>
                <strong>{c.nome}</strong>
                <div style={{ fontSize: "0.82rem", color: "var(--texto-suave)" }}>
                  {c.diasSemPedir} dias sem pedir · {c.totalPedidos} pedido(s)
                  no histórico
                </div>
              </div>
              <a
                className="btn-suave"
                href={linkWhatsApp(c.telefone, msg)}
                target="_blank"
                rel="noopener"
              >
                Notificar
              </a>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* Gráfico de linha em SVG (faturamento por dia).
   viewBox estreito de propósito: no celular o SVG é esticado até a largura
   da tela, então quanto menor o viewBox, maiores as letras ficam na prática. */
function GraficoLinha({ serie }: { serie: { dia: string; valor: number }[] }) {
  const W = 360;
  const H = 210;
  const padX = 16;
  const topo = 34; // espaço pros valores acima da linha
  const base = H - 34; // espaço pros nomes dos dias
  const max = Math.max(...serie.map((s) => s.valor), 1);
  const passoX = (W - padX * 2) / Math.max(serie.length - 1, 1);
  const pontos = serie.map((s, i) => ({
    x: padX + i * passoX,
    y: base - (s.valor / max) * (base - topo),
    ...s,
  }));
  const caminho = pontos
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const area = `${caminho} L ${pontos[pontos.length - 1].x} ${base} L ${pontos[0].x} ${base} Z`;

  const melhor = serie.reduce(
    (a, b) => (b.valor > a.valor ? b : a),
    serie[0] || { dia: "", valor: 0 }
  );

  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="grafico-linha"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--roxo)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--roxo)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          y1={base}
          x2={W}
          y2={base}
          stroke="var(--creme-2)"
          strokeWidth="1"
        />
        <path d={area} fill="url(#areaGrad)" />
        <path
          d={caminho}
          fill="none"
          stroke="var(--roxo)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {pontos.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="var(--roxo)" />
            {p.valor > 0 && (
              /* alterna a altura do rótulo pra dois dias seguidos não se sobreporem */
              <text
                x={p.x}
                y={p.y - (i % 2 === 0 ? 10 : 21)}
                textAnchor={i === 0 ? "start" : i === pontos.length - 1 ? "end" : "middle"}
                fontSize="9.5"
                fill="var(--roxo)"
                fontWeight="700"
              >
                {formatBRL(p.valor)}
              </text>
            )}
            <text
              x={p.x}
              y={base + 20}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="var(--texto-suave)"
            >
              {p.dia}
            </text>
          </g>
        ))}
      </svg>
      {melhor.valor > 0 && (
        <p style={{ color: "var(--texto-suave)", fontSize: "0.85rem", marginTop: 6 }}>
          Melhor dia da semana: <strong>{melhor.dia}</strong> com{" "}
          {formatBRL(melhor.valor)}
        </p>
      )}
    </>
  );
}

/* Gráfico donut em SVG */
function GraficoDonut({
  dados,
  nomes,
}: {
  dados: Record<string, number>;
  nomes?: Record<string, string>;
}) {
  const entradas = Object.entries(dados).filter(([, v]) => v > 0);
  const total = entradas.reduce((a, [, v]) => a + v, 0);

  if (total === 0)
    return (
      <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>
        Sem dados ainda.
      </p>
    );

  const raio = 52;
  const circ = 2 * Math.PI * raio;
  let acumulado = 0;
  const fatias = entradas.map(([nome, valor], i) => {
    const fracao = valor / total;
    const dash = fracao * circ;
    const offset = circ - acumulado * circ;
    acumulado += fracao;
    return {
      nome: nomes?.[nome] || nome,
      valor,
      cor: CORES_GRAFICO[i % CORES_GRAFICO.length],
      dash,
      offset,
      pct: Math.round(fracao * 100),
    };
  });

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" className="donut">
        {fatias.map((f, i) => (
          <circle
            key={i}
            cx="70"
            cy="70"
            r={raio}
            fill="none"
            stroke={f.cor}
            strokeWidth="18"
            strokeDasharray={`${f.dash} ${circ - f.dash}`}
            strokeDashoffset={f.offset}
            transform="rotate(-90 70 70)"
          />
        ))}
        <text
          x="70"
          y="66"
          textAnchor="middle"
          fontSize="11"
          fill="var(--texto-suave)"
        >
          total
        </text>
        <text
          x="70"
          y="82"
          textAnchor="middle"
          fontSize="13"
          fontWeight="800"
          fill="var(--roxo)"
          fontFamily="Bricolage Grotesque, sans-serif"
        >
          {formatBRL(total).replace("R$\u00a0", "")}
        </text>
      </svg>
      <div className="donut-legenda">
        {fatias.map((f, i) => (
          <div className="donut-item" key={i}>
            <span className="donut-cor" style={{ background: f.cor }} />
            <span className="donut-nome">{f.nome}</span>
            <span className="donut-valor">
              {f.pct}% · {formatBRL(f.valor)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= Área do funcionário (sem login do dono) ================= */

function AreaFuncionario({ onSair }: { onSair: () => void }) {
  const [lista, setLista] = useState<Vendedor[]>([]);
  const [selecionado, setSelecionado] = useState<Vendedor | null>(null);
  const [vendas, setVendas] = useState<{ qtd: number; receita: number } | null>(
    null
  );
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    listarEquipePublica()
      .then(setLista)
      .finally(() => setCarregando(false));
  }, []);

  const escolher = async (v: Vendedor) => {
    setSelecionado(v);
    setVendas(null);
    setVendas(await vendasDoMesPublico(v.name));
  };

  const metaValor = selecionado?.monthly_goal || 0;
  const progresso =
    metaValor > 0 && vendas
      ? Math.min(100, (vendas.receita / metaValor) * 100)
      : 0;

  return (
    <div className="admin" style={{ maxWidth: 460 }}>
      <h1>Área do funcionário</h1>

      {!selecionado ? (
        <div className="bloco">
          <h2>Quem é você?</h2>
          {carregando && <p style={{ color: "var(--texto-suave)" }}>Carregando…</p>}
          <div className="pill-group">
            {lista.map((v) => (
              <button key={v.id} className="pill" onClick={() => escolher(v)}>
                {v.name}
              </button>
            ))}
          </div>
          {!carregando && lista.length === 0 && (
            <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>
              Ninguém cadastrado ainda. Peça pro dono te adicionar no painel.
            </p>
          )}
        </div>
      ) : (
        <div className="bloco">
          <button
            className="btn-suave"
            style={{ marginBottom: 14 }}
            onClick={() => {
              setSelecionado(null);
              setVendas(null);
            }}
          >
            {"\u{2190}"} Trocar
          </button>
          <h2>Oi, {selecionado.name.split(" ")[0]}!</h2>
          {selecionado.role && (
            <p style={{ color: "var(--texto-suave)", marginBottom: 10 }}>
              {selecionado.role}
            </p>
          )}
          <div className="kpis">
            <div className="kpi destaque">
              <div className="rotulo">Minhas vendas no mês</div>
              <div className="valor">{formatBRL(vendas?.receita || 0)}</div>
              <div className="detalhe">{vendas?.qtd || 0} venda(s)</div>
            </div>
            <div className="kpi">
              <div className="rotulo">Meta do mês</div>
              <div className="valor">
                {metaValor > 0 ? formatBRL(metaValor) : "—"}
              </div>
              <div className="detalhe">
                {metaValor > 0 ? `${progresso.toFixed(0)}% atingido` : "sem meta"}
              </div>
            </div>
          </div>
          {metaValor > 0 && (
            <div className="barra-trilho" style={{ marginTop: 14 }}>
              <div className="barra-fill" style={{ width: `${progresso}%` }} />
            </div>
          )}
          {metaValor === 0 && (
            <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem", marginTop: 10 }}>
              O dono ainda não definiu uma meta do mês pra você.
            </p>
          )}
        </div>
      )}

      <button className="btn-suave" onClick={onSair} style={{ width: "100%" }}>
        {"\u{2190}"} Voltar ao login do painel
      </button>
      <Link href="/" className="voltar" style={{ marginTop: 14 }}>
        Ir para a loja
      </Link>
    </div>
  );
}

/* ================= Vendedores ================= */

function Vendedores({ avisar }: { avisar: (msg: string) => void }) {
  const [lista, setLista] = useState<Vendedor[]>([]);
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

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
      avisar("Funcionário adicionado ✓");
    } catch (e: any) {
      avisar(e.message || "Erro ao adicionar");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="bloco">
        <h2>Novo funcionário</h2>
        <div className="campo">
          <label htmlFor="novo-vendedor">Nome</label>
          <input
            id="novo-vendedor"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
            placeholder="Nome do funcionário"
          />
        </div>
        <button className="btn-principal" onClick={adicionar}>
          {salvando ? "Salvando…" : "Adicionar"}
        </button>
      </div>

      <div className="bloco">
        <h2>Equipe</h2>
        {lista.map((v) => (
          <FuncionarioLinha
            key={v.id}
            vendedor={v}
            aberto={editando === v.id}
            onEditar={() => setEditando(editando === v.id ? null : v.id)}
            onMudou={carregar}
            avisar={avisar}
          />
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

function FuncionarioLinha({
  vendedor,
  aberto,
  onEditar,
  onMudou,
  avisar,
}: {
  vendedor: Vendedor;
  aberto: boolean;
  onEditar: () => void;
  onMudou: () => void;
  avisar: (msg: string) => void;
}) {
  const [role, setRole] = useState(vendedor.role || "");
  const [salary, setSalary] = useState(
    vendedor.salary != null ? String(vendedor.salary).replace(".", ",") : ""
  );
  const [meta, setMeta] = useState(
    vendedor.monthly_goal != null
      ? String(vendedor.monthly_goal).replace(".", ",")
      : ""
  );
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    try {
      await atualizarVendedor(vendedor.id, {
        role: role.trim() || null,
        salary: salary.trim() ? parseFloat(salary.replace(",", ".")) : null,
        monthly_goal: meta.trim() ? parseFloat(meta.replace(",", ".")) : null,
      });
      avisar("Funcionário atualizado ✓");
      onMudou();
    } catch {
      avisar("Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="produto-admin">
      <div className="hist-item">
        <span>
          {vendedor.name}
          {vendedor.role ? ` · ${vendedor.role}` : ""}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-suave" onClick={onEditar}>
            {aberto ? "Fechar" : "Editar"}
          </button>
          <button
            className="btn-x"
            onClick={async () => {
              if (
                confirm(
                  `Remover ${vendedor.name}? As vendas antigas continuam no histórico.`
                )
              ) {
                await removerVendedor(vendedor.id);
                onMudou();
              }
            }}
          >
            remover
          </button>
        </div>
      </div>
      {aberto && (
        <div className="produto-admin-form">
          <div className="campo">
            <label>Cargo/função</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ex.: Atendente, Entregador"
            />
          </div>
          <div className="duas-colunas">
            <div className="campo">
              <label>Salário (R$)</label>
              <input
                inputMode="decimal"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="1500,00"
              />
            </div>
            <div className="campo">
              <label>Meta de vendas do mês (R$)</label>
              <input
                inputMode="decimal"
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                placeholder="5000,00"
              />
            </div>
          </div>
          <button className="btn-principal" onClick={salvar}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      )}
    </div>
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
          {pedido.delivery_type === "retirada" ? " · \u{1F3EA} retirada" : ""}
          {pedido.seller_name ? ` · vend. ${pedido.seller_name}` : ""}
          {pedido.customer_name ? ` · ${pedido.customer_name}` : ""} ·{" "}
          {formatBRL(Number(pedido.total))} · {pedido.payment_method}
        </div>
        <div style={{ fontSize: "0.85rem", marginTop: 2 }}>
          {pedido.itens
            .map((i) => `${i.qty}x ${i.product_name.replace("Duo ", "")}`)
            .join(", ")}
        </div>
        {!compacto && pedido.delivery_type === "retirada" && (
          <div style={{ fontSize: "0.85rem", color: "var(--texto-suave)", marginTop: 2 }}>
            {"\u{1F3EA}"} Cliente vem retirar na loja
            {pedido.customer_phone ? ` · 📞 ${pedido.customer_phone}` : ""}
            {pedido.change_for ? ` · troco p/ ${pedido.change_for}` : ""}
          </div>
        )}
        {!compacto && pedido.delivery_type !== "retirada" && pedido.street && (
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
  const [destaque, setDestaque] = useState(produto.highlight_label || "");
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
        highlight_label: destaque.trim() || null,
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
          <div className="campo">
            <label>Selo de destaque (opcional)</label>
            <input
              value={destaque}
              onChange={(e) => setDestaque(e.target.value)}
              placeholder="Ex.: DUO DO MÊS, MAIS PEDIDO, NOVIDADE"
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
  const [zonaAparencia, setZonaAparencia] = useState<
    "preTela" | "cardapio" | "admin"
  >("cardapio");

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

      {/* -------- Retirada na loja -------- */}
      <div className="bloco">
        <h2>Retirada na loja</h2>
        <div className="pill-group" style={{ marginBottom: 12 }}>
          <button
            className={`pill ${cfg.pickup.enabled ? "ativo" : ""}`}
            onClick={() =>
              setCfg({ ...cfg, pickup: { ...cfg.pickup, enabled: true } })
            }
          >
            Permitir retirada
          </button>
          <button
            className={`pill ${!cfg.pickup.enabled ? "ativo" : ""}`}
            onClick={() =>
              setCfg({ ...cfg, pickup: { ...cfg.pickup, enabled: false } })
            }
          >
            Só entrega
          </button>
        </div>
        {cfg.pickup.enabled && (
          <div className="campo">
            <label>Endereço mostrado pro cliente</label>
            <input
              value={cfg.pickup.address}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  pickup: { ...cfg.pickup, address: e.target.value },
                })
              }
              placeholder="Rua José Marrocos, 145 — Pinto Madeira, Crato/CE"
            />
          </div>
        )}
        <button
          className="btn-principal"
          onClick={() => salvar("pickup", cfg.pickup, "Retirada salva")}
        >
          Salvar retirada
        </button>
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
        <h2>Aparência</h2>
        <p style={{ color: "var(--texto-suave)", fontSize: "0.88rem", marginBottom: 12 }}>
          Cada área tem sua própria paleta — assim dá pra personalizar a
          pré-tela, o cardápio (site do cliente) e o painel admin
          separadamente.
        </p>
        <div className="pill-group" style={{ marginBottom: 14 }}>
          <button
            className={`pill ${zonaAparencia === "preTela" ? "ativo" : ""}`}
            onClick={() => setZonaAparencia("preTela")}
          >
            Pré-tela
          </button>
          <button
            className={`pill ${zonaAparencia === "cardapio" ? "ativo" : ""}`}
            onClick={() => setZonaAparencia("cardapio")}
          >
            Cardápio (site)
          </button>
          <button
            className={`pill ${zonaAparencia === "admin" ? "ativo" : ""}`}
            onClick={() => setZonaAparencia("admin")}
          >
            Painel admin
          </button>
        </div>
        <div className="cores-grid">
          {(
            [
              ["roxo", "Cor da marca (botões e preços)"],
              ["acai", "Fundo escuro"],
              ["lilas", "Detalhes claros"],
              ["creme", "Fundo claro"],
              ["maracuja", "Destaque"],
            ] as [keyof Tema, string][]
          ).map(([chave, rotulo]) => (
            <label className="cor-item" key={chave}>
              <input
                type="color"
                value={cfg.temas[zonaAparencia][chave]}
                onChange={(e) => {
                  const novoTema = {
                    ...cfg.temas[zonaAparencia],
                    [chave]: e.target.value,
                  };
                  const novosTemas = { ...cfg.temas, [zonaAparencia]: novoTema };
                  setCfg({ ...cfg, temas: novosTemas });
                  if (zonaAparencia === "cardapio") aplicarTema(novoTema);
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
            onClick={() => salvar("temas", cfg.temas, "Cores salvas")}
          >
            Salvar cores
          </button>
          <button
            className="btn-suave"
            onClick={() => {
              const novosTemas = {
                ...cfg.temas,
                [zonaAparencia]: { ...TEMA_PADRAO },
              };
              setCfg({ ...cfg, temas: novosTemas });
              if (zonaAparencia === "cardapio") aplicarTema(TEMA_PADRAO);
            }}
          >
            Restaurar padrão
          </button>
        </div>
        <p style={{ color: "var(--texto-suave)", fontSize: "0.8rem", marginTop: 10 }}>
          {zonaAparencia === "cardapio"
            ? "A prévia do cardápio muda aqui na hora; clientes veem depois de salvar."
            : "Salve e recarregue essa tela pra ver o resultado."}
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
  const [outro, setOutro] = useState(""); // bairro que não está na lista
  const [taxa, setTaxa] = useState("");

  // esconde da lista os bairros que já foram cadastrados
  const jaCadastrados = new Set(
    bairros.map((b) => b.name.trim().toLowerCase())
  );
  const disponiveis = BAIRROS_CRATO.filter(
    (b) => !jaCadastrados.has(b.toLowerCase())
  );

  const adicionar = async () => {
    const escolhido = (nome === "__outro" ? outro : nome).trim();
    const valor = parseFloat(taxa.replace(",", "."));
    if (!escolhido || isNaN(valor) || valor < 0) {
      avisar("Escolha o bairro e informe a taxa");
      return;
    }
    try {
      await criarBairro(escolhido, valor);
      setNome("");
      setOutro("");
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
          <select
            className="select-bairro"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          >
            <option value="">Escolha o bairro…</option>
            {disponiveis.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
            <option value="__outro">Outro bairro (digitar)</option>
          </select>
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
      {nome === "__outro" && (
        <div className="campo">
          <label>Nome do bairro</label>
          <input
            value={outro}
            onChange={(e) => setOutro(e.target.value)}
            placeholder="Digite o bairro"
          />
        </div>
      )}
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


/* ================= Promoções ================= */

function Promocoes({ avisar }: { avisar: (msg: string) => void }) {
  const [lista, setLista] = useState<PromocaoAdmin[]>([]);
  const [tipo, setTipo] = useState<"combo" | "coupon">("combo");
  const [carregando, setCarregando] = useState(true);

  // combo
  const [nome, setNome] = useState("");
  const [qty, setQty] = useState("2");
  const [preco, setPreco] = useState("");
  // cupom
  const [code, setCode] = useState("");
  const [descTipo, setDescTipo] = useState<"percent" | "fixed">("fixed");
  const [descValor, setDescValor] = useState("");
  const [minPedido, setMinPedido] = useState("");
  // banner (pré-preenchido com sugestão, editável)
  const [bannerTexto, setBannerTexto] = useState("");

  const sugestaoBanner =
    tipo === "combo"
      ? `\u{1F525} Hoje: leve ${qty || "X"} por ${
          preco ? formatBRL(parseFloat(preco.replace(",", ".")) || 0) : "Y"
        }!`
      : `\u{1F3F7} Use o cupom ${code || "XXXX"} e ganhe ${
          descValor
            ? descTipo === "percent"
              ? `${descValor}%`
              : formatBRL(parseFloat(descValor.replace(",", ".")) || 0)
            : "desconto"
        } de desconto!`;

  const carregar = async () => {
    setLista(await listarPromocoes());
    setCarregando(false);
  };
  useEffect(() => {
    carregar();
  }, []);

  const criar = async () => {
    try {
      if (tipo === "combo") {
        const q = parseInt(qty);
        const p = parseFloat(preco.replace(",", "."));
        if (!nome.trim() || !q || q < 2 || isNaN(p) || p <= 0) {
          avisar("Confira nome, quantidade (2+) e preço");
          return;
        }
        await criarPromocao({
          name: nome.trim(),
          kind: "combo",
          combo_qty: q,
          combo_price: p,
          code: null,
          discount_kind: null,
          discount_value: null,
          min_order: 0,
          active: true,
          banner_text: (bannerTexto.trim() || sugestaoBanner).trim() || null,
        });
      } else {
        const v = parseFloat(descValor.replace(",", "."));
        if (!code.trim() || isNaN(v) || v <= 0) {
          avisar("Confira o código e o valor do desconto");
          return;
        }
        await criarPromocao({
          name: `Cupom ${code.trim().toUpperCase()}`,
          kind: "coupon",
          combo_qty: null,
          combo_price: null,
          code: code.trim().toUpperCase(),
          discount_kind: descTipo,
          discount_value: v,
          min_order: parseFloat(minPedido.replace(",", ".")) || 0,
          active: true,
          banner_text: (bannerTexto.trim() || sugestaoBanner).trim() || null,
        });
      }
      setNome("");
      setPreco("");
      setCode("");
      setDescValor("");
      setMinPedido("");
      setBannerTexto("");
      carregar();
      avisar("Promoção criada");
    } catch (e: any) {
      avisar(e.message || "Erro ao criar");
    }
  };

  if (!supabaseOn)
    return (
      <p className="aviso-local">
        As promoções precisam do Supabase conectado. Rode também o arquivo
        supabase/v2-promocoes.sql no SQL Editor.
      </p>
    );

  return (
    <>
      <div className="bloco">
        <h2>Nova promoção</h2>
        <div className="pill-group" style={{ marginBottom: 14 }}>
          <button
            className={`pill ${tipo === "combo" ? "ativo" : ""}`}
            onClick={() => setTipo("combo")}
          >
            Combo (leve X por Y)
          </button>
          <button
            className={`pill ${tipo === "coupon" ? "ativo" : ""}`}
            onClick={() => setTipo("coupon")}
          >
            Cupom de desconto
          </button>
        </div>

        {tipo === "combo" ? (
          <>
            <div className="campo">
              <label>Nome (aparece pro cliente)</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="2 garrafas por R$35"
              />
            </div>
            <div className="duas-colunas">
              <div className="campo">
                <label>Quantidade</label>
                <input
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="2"
                />
              </div>
              <div className="campo">
                <label>Preço do combo (R$)</label>
                <input
                  inputMode="decimal"
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  placeholder="35,00"
                />
              </div>
            </div>
            <p className="aviso" style={{ textAlign: "left" }}>
              A cada {qty || "X"} garrafas no carrinho, o cliente paga{" "}
              {preco ? formatBRL(parseFloat(preco.replace(",", ".")) || 0) : "o preço do combo"}.
              Aplica sozinho — vale pra qualquer sabor.
            </p>
          </>
        ) : (
          <>
            <div className="campo">
              <label>Código do cupom</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="DUO10"
                style={{ textTransform: "uppercase" }}
              />
            </div>
            <div className="pill-group" style={{ marginBottom: 12 }}>
              <button
                className={`pill ${descTipo === "fixed" ? "ativo" : ""}`}
                onClick={() => setDescTipo("fixed")}
              >
                R$ fixo
              </button>
              <button
                className={`pill ${descTipo === "percent" ? "ativo" : ""}`}
                onClick={() => setDescTipo("percent")}
              >
                % percentual
              </button>
            </div>
            <div className="duas-colunas">
              <div className="campo">
                <label>{descTipo === "fixed" ? "Desconto (R$)" : "Desconto (%)"}</label>
                <input
                  inputMode="decimal"
                  value={descValor}
                  onChange={(e) => setDescValor(e.target.value)}
                  placeholder={descTipo === "fixed" ? "5,00" : "10"}
                />
              </div>
              <div className="campo">
                <label>Pedido mínimo (R$, opcional)</label>
                <input
                  inputMode="decimal"
                  value={minPedido}
                  onChange={(e) => setMinPedido(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </>
        )}

        <div className="campo">
          <label>Banner no topo do site (opcional, sugerimos um texto)</label>
          <input
            value={bannerTexto}
            onChange={(e) => setBannerTexto(e.target.value)}
            placeholder={sugestaoBanner}
          />
        </div>
        <p className="aviso" style={{ textAlign: "left", marginBottom: 10 }}>
          Enquanto essa promoção estiver ativa, esse texto aparece sozinho na
          faixa do topo do site — não precisa mexer no banner manual da aba
          Loja.
        </p>

        <button className="btn-principal" onClick={criar}>
          Criar promoção
        </button>
      </div>

      <div className="bloco">
        <h2>Promoções ativas</h2>
        {carregando && <p style={{ color: "var(--texto-suave)" }}>Carregando…</p>}
        {!carregando && lista.length === 0 && (
          <p style={{ color: "var(--texto-suave)", fontSize: "0.9rem" }}>
            Nenhuma promoção ainda.
          </p>
        )}
        {lista.map((p) => (
          <div className="hist-item" key={p.id}>
            <div style={{ flex: 1 }}>
              <strong>{p.name}</strong>
              <div style={{ fontSize: "0.82rem", color: "var(--texto-suave)" }}>
                {p.kind === "combo"
                  ? `Leve ${p.combo_qty} por ${formatBRL(p.combo_price || 0)}`
                  : `Código ${p.code} · ${
                      p.discount_kind === "percent"
                        ? `${p.discount_value}%`
                        : formatBRL(p.discount_value || 0)
                    }${p.min_order ? ` · mín. ${formatBRL(p.min_order)}` : ""}`}
              </div>
              {p.active && p.banner_text && (
                <div style={{ fontSize: "0.8rem", color: "var(--roxo)", marginTop: 2 }}>
                  {"\u{1F4E3}"} Banner: {p.banner_text}
                </div>
              )}
            </div>
            <button
              className={`pill ${p.active ? "ativo" : ""}`}
              onClick={async () => {
                await alternarPromocao(p.id, !p.active);
                carregar();
              }}
            >
              {p.active ? "Ativa" : "Pausada"}
            </button>
            <button
              className="btn-x"
              onClick={async () => {
                if (confirm("Remover esta promoção?")) {
                  await removerPromocao(p.id);
                  carregar();
                }
              }}
            >
              remover
            </button>
          </div>
        ))}
      </div>
    </>
  );
}