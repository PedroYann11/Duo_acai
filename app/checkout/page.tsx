"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STORE, formatBRL } from "@/lib/store";
import { useProducts } from "@/lib/products-context";
import {
  distanciaKm,
  situacaoDaLoja,
  useSettings,
} from "@/lib/settings-context";
import {
  usePromos,
  calcularDescontoCombo,
  aplicarCupom,
} from "@/lib/promo-context";
import {
  mascaraTelefone,
  capitalizarEndereco,
} from "@/lib/masks";
import { useCart } from "@/lib/cart";
import { criarPedidoSite } from "@/lib/data";
import { gerarPixCopiaECola } from "@/lib/pix";
import QRCode from "qrcode";

type Pagamento = "Pix" | "Dinheiro" | "Cartão na entrega";

export default function Checkout() {
  const PRODUCTS = useProducts();
  const { config, bairros } = useSettings();
  const { items, subtotal, clear } = useCart();
  const situacao = situacaoDaLoja(config);
  const modo = config.delivery.mode;
  const porBairro = modo === "neighborhood" && bairros.length > 0;
  const porKm = modo === "km";
  const [kmInfo, setKmInfo] = useState<{ km: number; taxa: number } | null>(
    null
  );
  const [calculandoKm, setCalculandoKm] = useState(false);
  const [erroKm, setErroKm] = useState("");

  const calcularPorLocalizacao = () => {
    setErroKm("");
    if (!("geolocation" in navigator)) {
      setErroKm("Seu navegador não permite localização. Usaremos a taxa padrão.");
      return;
    }
    setCalculandoKm(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // linha reta x 1.3 pra aproximar o trajeto real das ruas
        const kmReta = distanciaKm(
          config.delivery.store_lat,
          config.delivery.store_lng,
          pos.coords.latitude,
          pos.coords.longitude
        );
        const km = Math.round(kmReta * 1.3 * 10) / 10;
        const taxa =
          Math.round(
            (config.delivery.km_base + km * config.delivery.km_price) * 100
          ) / 100;
        setKmInfo({ km, taxa });
        setCalculandoKm(false);
      },
      () => {
        setErroKm(
          "Não conseguimos sua localização. Sem ela, vale a taxa padrão."
        );
        setCalculandoKm(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [referencia, setReferencia] = useState("");
  const [pagamento, setPagamento] = useState<Pagamento>("Pix");
  const [troco, setTroco] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cupomTexto, setCupomTexto] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<{
    desconto: number;
    msg: string;
    code: string;
  } | null>(null);
  const [cupomErro, setCupomErro] = useState("");
  const [confirmado, setConfirmado] = useState<{
    numero: string;
    total: number;
  } | null>(null);
  const promos = usePromos();

  const precosItens = items.flatMap((it) => {
    const p = PRODUCTS.find((x) => x.id === it.productId);
    return p ? Array(it.qty).fill(p.price) : [];
  });
  const { desconto: descontoCombo, promo: promoCombo } = calcularDescontoCombo(
    precosItens,
    promos
  );
  const descontoCupom = cupomAplicado?.desconto || 0;
  const descontoTotal = descontoCombo + descontoCupom;

  const aplicarCupomTexto = () => {
    setCupomErro("");
    const r = aplicarCupom(cupomTexto, subtotal, promos);
    if (r.ok) {
      setCupomAplicado({
        desconto: r.desconto,
        msg: r.msg,
        code: cupomTexto.trim().toUpperCase(),
      });
    } else {
      setCupomAplicado(null);
      setCupomErro(r.msg || "Cupom inválido.");
    }
  };

  const bairroSelecionado = porBairro
    ? bairros.find((b) => b.name === bairro) || null
    : null;
  const taxaEntrega = porBairro
    ? bairroSelecionado?.fee ?? 0
    : porKm && kmInfo
      ? kmInfo.taxa
      : config.delivery.fee;
  const total = subtotal - descontoTotal + taxaEntrega;
  const minimo = config.delivery.min_order || 0;
  const abaixoDoMinimo = minimo > 0 && subtotal < minimo;

  const valido =
    items.length > 0 &&
    situacao.aberta &&
    !abaixoDoMinimo &&
    nome.trim() &&
    telefone.trim().replace(/\D/g, "").length >= 10 &&
    rua.trim() &&
    numero.trim() &&
    bairro.trim() &&
    (!porBairro || Boolean(bairroSelecionado));

  const finalizarPedido = async () => {
    if (!valido || enviando) return;
    setEnviando(true);

    const itensPedido = items
      .map((item) => {
        const p = PRODUCTS.find((p) => p.id === item.productId);
        if (!p) return null;
        return {
          product_slug: p.id,
          product_name: p.name,
          unit_price: p.price,
          qty: item.qty,
        };
      })
      .filter(Boolean) as {
      product_slug: string;
      product_name: string;
      unit_price: number;
      qty: number;
    }[];

    // salva no banco -> tela de confirmação; se falhar, segue pelo WhatsApp
    let pedidoId: string | null = null;
    try {
      pedidoId = await criarPedidoSite({
        customer_name: nome.trim(),
        customer_phone: telefone.trim() || null,
        street: rua.trim(),
        number: numero.trim(),
        neighborhood: bairro.trim(),
        reference: referencia.trim() || null,
        payment_method: pagamento,
        change_for:
          pagamento === "Dinheiro" && troco.trim() ? troco.trim() : null,
        subtotal,
        delivery_fee: taxaEntrega,
        total,
        itens: itensPedido,
      });
    } catch {}

    if (pedidoId) {
      const totalPedido = total;
      clear();
      setConfirmado({
        numero: pedidoId.slice(0, 6).toUpperCase(),
        total: totalPedido,
      });
      setEnviando(false);
      window.scrollTo({ top: 0 });
      return;
    }

    // Plano B: banco indisponível -> pedido segue pelo WhatsApp
    const linhas = itensPedido
      .map((i) => `- ${i.qty}x ${i.product_name} — ${formatBRL(i.unit_price * i.qty)}`)
      .join("\n");

    const msg = [
      `*NOVO PEDIDO — ${STORE.name.toUpperCase()}*`,
      ``,
      linhas,
      ``,
      `Subtotal: ${formatBRL(subtotal)}`,
      descontoTotal > 0 ? `Desconto: -${formatBRL(descontoTotal)}` : "",
      `Entrega: ${formatBRL(taxaEntrega)}`,
      `*Total: ${formatBRL(total)}*`,
      ``,
      `*Cliente:* ${nome.trim()}`,
      telefone.trim() ? `*Telefone:* ${telefone.trim()}` : "",
      `*Endereço:* ${rua.trim()}, ${numero.trim()} — ${bairro.trim()}`,
      referencia.trim() ? `*Referência:* ${referencia.trim()}` : "",
      ``,
      `*Pagamento:* ${pagamento}${
        pagamento === "Dinheiro" && troco.trim()
          ? ` (troco para ${troco.trim()})`
          : ""
      }`,
    ]
      .filter((l) => l !== "")
      .join("\n");

    // location.href não sofre bloqueio de popup no celular;
    // o carrinho é mantido para o cliente poder tentar de novo se voltar.
    setEnviando(false);
    window.location.href = `https://wa.me/${config.contact.whatsapp || STORE.whatsapp}?text=${encodeURIComponent(msg)}`;
  };

  if (confirmado) {
    return (
      <div className="checkout">
        <div className="confirmacao">
          <div className="confirmacao-icone">{"\u2713"}</div>
          <h1>Pedido recebido!</h1>
          <p className="confirmacao-numero">
            Pedido <strong>#{confirmado.numero}</strong>
          </p>
          <p className="confirmacao-texto">
            {"Já fomos buscar seu açaí no canto mais gelado do freezer "}
            {"\u{1F9CA}"} Total de{" "}
            <strong>{formatBRL(confirmado.total)}</strong> — pagamento na
            entrega ({pagamento}
            {pagamento === "Dinheiro" && troco.trim()
              ? `, troco para ${troco.trim()}`
              : ""}
            ). {"Avisamos no seu WhatsApp quando sair pra entrega! "}
            {"\u{1F6F5}"}
          </p>
          {pagamento === "Pix" && (config.contact.pix_key || STORE.pixKey) && (
            <BlocoPix
              total={confirmado.total}
              numero={confirmado.numero}
              pix={config.contact}
            />
          )}
          <div className="confirmacao-acoes">
            <a
              href={`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(
                `Oi! Fiz o pedido #${confirmado.numero} pelo site da Duo`
              )}`}
              target="_blank"
              rel="noopener"
              className="btn-suave"
            >
              Falar com a Duo no WhatsApp
            </a>
            <Link href="/" className="btn-principal" style={{ maxWidth: 260 }}>
              Voltar ao cardápio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!situacao.aberta) {
    return (
      <div className="checkout">
        <div className="confirmacao fechado-card">
          <div className="fechado-icone">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <h1>Estamos fechados</h1>
          <p className="confirmacao-texto">{situacao.motivo}</p>
          <p className="confirmacao-texto" style={{ marginTop: 8 }}>
            Seu carrinho fica guardado — é só voltar quando a gente abrir.
          </p>
          <div className="confirmacao-acoes">
            <Link href="/" className="btn-principal" style={{ maxWidth: 260 }}>
              Voltar ao cardápio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!situacao.aberta) {
    return (
      <div className="checkout">
        <div className="fechado-card">
          <div className="fechado-emoji">{"\u{1F634}"}</div>
          <h1>Estamos fechados</h1>
          <p className="fechado-motivo">{situacao.motivo}</p>
          {situacao.reabre && (
            <p className="fechado-reabre">
              {"\u{1F552}"} {situacao.reabre}
            </p>
          )}
          <p className="fechado-obs">
            Seu carrinho fica guardado — é só voltar quando abrirmos que o
            açaí está garantido. {"\u{1F49C}"}
          </p>
          <Link href="/" className="btn-principal" style={{ maxWidth: 260, margin: "18px auto 0" }}>
            Voltar ao cardápio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout">
      <Link href="/" className="voltar">
        ← Voltar ao cardápio
      </Link>
      <h1>Fechar pedido</h1>
      <p className="sub">Entregamos na sua porta. Preencha os dados abaixo.</p>

      {items.length === 0 ? (
        <div className="bloco">
          <p>
            Seu carrinho está vazio.{" "}
            <Link href="/" style={{ color: "var(--roxo)", fontWeight: 600 }}>
              Voltar ao cardápio
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="bloco">
            <h2>Resumo</h2>
            {items.map((item) => {
              const p = PRODUCTS.find((p) => p.id === item.productId);
              if (!p) return null;
              return (
                <div className="resumo-item" key={item.productId}>
                  <span>
                    {item.qty}x {p.name}
                  </span>
                  <span>{formatBRL(p.price * item.qty)}</span>
                </div>
              );
            })}
            {descontoCombo > 0 && (
              <div className="resumo-item" style={{ color: "var(--roxo)" }}>
                <span>{promoCombo?.name || "Promoção"}</span>
                <span>-{formatBRL(descontoCombo)}</span>
              </div>
            )}
            {descontoCupom > 0 && (
              <div className="resumo-item" style={{ color: "var(--roxo)" }}>
                <span>Cupom {cupomAplicado?.code}</span>
                <span>-{formatBRL(descontoCupom)}</span>
              </div>
            )}
            <div className="resumo-item">
              <span>
                Entrega
                {porBairro && bairroSelecionado
                  ? ` (${bairroSelecionado.name})`
                  : porKm && kmInfo
                    ? ` (~${kmInfo.km.toFixed(1).replace(".", ",")} km)`
                    : ""}
              </span>
              <span>
                {porBairro && !bairroSelecionado
                  ? "escolha o bairro"
                  : formatBRL(taxaEntrega)}
              </span>
            </div>
            <div className="resumo-item" style={{ fontWeight: 700 }}>
              <span>Total</span>
              <span>{formatBRL(total)}</span>
            </div>
          </div>

          <div className="bloco">
            <h2>Cupom de desconto</h2>
            <div className="cupom-linha">
              <input
                value={cupomTexto}
                onChange={(e) => {
                  setCupomTexto(e.target.value.toUpperCase());
                  setCupomErro("");
                }}
                placeholder="Tem um cupom? Digite aqui"
              />
              <button className="btn-suave" onClick={aplicarCupomTexto}>
                Aplicar
              </button>
            </div>
            {cupomAplicado && (
              <p className="cupom-ok">{cupomAplicado.msg}</p>
            )}
            {cupomErro && <p className="cupom-erro">{cupomErro}</p>}
          </div>

          <div className="bloco">
            <h2>Seus dados</h2>
            <div className="campo">
              <label htmlFor="nome">Nome *</label>
              <input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onBlur={() => setNome(capitalizarEndereco(nome))}
                placeholder="Seu nome"
              />
            </div>
            <div className="campo">
              <label htmlFor="telefone">Telefone / WhatsApp *</label>
              <input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
                placeholder="(88) 9 9999-9999"
                inputMode="tel"
              />
            </div>
          </div>

          <div className="bloco">
            <h2>Endereço de entrega</h2>
            <div className="duas-colunas">
              <div className="campo">
                <label htmlFor="rua">Rua *</label>
                <input
                  id="rua"
                  value={rua}
                  onChange={(e) => setRua(e.target.value)}
                  onBlur={() => setRua(capitalizarEndereco(rua))}
                  placeholder="Rua / Avenida"
                />
              </div>
              <div className="campo">
                <label htmlFor="numero">Número *</label>
                <input
                  id="numero"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="123"
                />
              </div>
            </div>
            <div className="campo">
              <label htmlFor="bairro">Bairro *</label>
              {porBairro ? (
                <select
                  id="bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className="select-bairro"
                >
                  <option value="">Escolha o bairro…</option>
                  {bairros.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name} — entrega {formatBRL(b.fee)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Bairro"
                />
              )}
            </div>
            {porKm && (
              <div className="km-bloco">
                <button
                  className="btn-suave"
                  onClick={calcularPorLocalizacao}
                  disabled={calculandoKm}
                >
                  {calculandoKm
                    ? "Calculando…"
                    : `${"\u{1F4CD}"} Calcular entrega pela minha localização`}
                </button>
                {kmInfo && (
                  <p className="km-resultado">
                    Aprox. {kmInfo.km.toFixed(1).replace(".", ",")} km —
                    entrega {formatBRL(kmInfo.taxa)}
                  </p>
                )}
                {erroKm && <p className="km-erro">{erroKm}</p>}
              </div>
            )}
            <div className="campo">
              <label htmlFor="referencia">Ponto de referência (opcional)</label>
              <input
                id="referencia"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Perto de..."
              />
            </div>
          </div>

          <div className="bloco">
            <h2>Pagamento</h2>
            {(["Pix", "Dinheiro", "Cartão na entrega"] as Pagamento[]).map(
              (opcao) => (
                <label className="opcao" key={opcao}>
                  <input
                    type="radio"
                    name="pagamento"
                    checked={pagamento === opcao}
                    onChange={() => setPagamento(opcao)}
                  />
                  {opcao}
                </label>
              )
            )}
            {pagamento === "Dinheiro" && (
              <div className="campo" style={{ marginTop: 10 }}>
                <label htmlFor="troco">Troco para quanto?</label>
                <input
                  id="troco"
                  value={troco}
                  onChange={(e) => setTroco(e.target.value)}
                  placeholder="R$ 50,00"
                />
              </div>
            )}
          </div>

          {abaixoDoMinimo && (
            <p className="aviso-bloqueio">
              Pedido mínimo de {formatBRL(minimo)} (faltam{" "}
              {formatBRL(minimo - subtotal)}).
            </p>
          )}
          <button
            className="btn-principal"
            onClick={finalizarPedido}
            disabled={!valido || enviando}
          >
            {enviando ? "Enviando pedido…" : "Finalizar pedido"}
          </button>
          <p className="aviso">
            {"Finalizou, a gente já sai correndo buscar seu açaí no Polo Norte "}
            {"\u{1F9CA}\u{1F7E3}"} Prefere pedir pelo WhatsApp?{" "}
            <a
              href={`https://wa.me/${STORE.whatsapp}`}
              target="_blank"
              rel="noopener"
              style={{ color: "var(--roxo)", fontWeight: 600 }}
            >
              Clique aqui
            </a>
            . Pagamento online (Pix e cartão) chega em breve.
          </p>
        </>
      )}
    </div>
  );
}


/* ---------- Bloco Pix: QR code + copia e cola ---------- */
function BlocoPix({
  total,
  numero,
  pix,
}: {
  total: number;
  numero: string;
  pix: { pix_key: string; pix_name: string; pix_city: string };
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const codigo = gerarPixCopiaECola({
    chave: pix.pix_key || STORE.pixKey,
    nome: pix.pix_name || STORE.pixName,
    cidade: pix.pix_city || STORE.pixCity,
    valor: total,
    txid: `DUO${numero}`,
  });

  useEffect(() => {
    QRCode.toDataURL(codigo, { width: 240, margin: 1 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [codigo]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      // fallback para navegadores antigos
      const area = document.createElement("textarea");
      area.value = codigo;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="bloco-pix">
      <h2>{"Pague agora com Pix \u26A1"}</h2>
      <p>
        Escaneie o QR code ou copie o código abaixo — o valor de{" "}
        <strong>{formatBRL(total)}</strong> já vai preenchido.
      </p>
      {qr && <img src={qr} alt="QR code do Pix" className="pix-qr" />}
      <button className="pix-copiar" onClick={copiar}>
        {copiado ? "Código copiado!" : "Copiar código Pix"}
      </button>
      <p className="pix-obs">
        Depois de pagar, envie o comprovante no nosso WhatsApp pelo botão
        abaixo.
      </p>
    </div>
  );
}
