"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STORE, formatBRL } from "@/lib/store";
import { useProducts } from "@/lib/products-context";
import {
  distanciaKm,
  previsaoPedido,
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

type Pagamento = "Pix" | "Dinheiro" | "Cartão de crédito";

/* Ícone de cada forma de pagamento (visual, sem dependência externa) */
function IconePagamento({ tipo }: { tipo: Pagamento }) {
  if (tipo === "Pix") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="7" width="10" height="10" rx="2.5" transform="rotate(45 12 12)" />
        <path d="M7 12 Q9.5 9 12 12 T17 12" />
      </svg>
    );
  }
  if (tipo === "Dinheiro") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="6" width="19" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M6.5 9v0M17.5 15v0" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" />
      <path d="M6 15h4" />
    </svg>
  );
}

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
  const pickupHabilitado = config.pickup.enabled;
  const [tipoEntrega, setTipoEntrega] = useState<"entrega" | "retirada">(
    "entrega"
  );
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [semNumero, setSemNumero] = useState(false);
  const [bairro, setBairro] = useState("");
  const [referencia, setReferencia] = useState("");
  const [pagamento, setPagamento] = useState<Pagamento>("Pix");
  const [troco, setTroco] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cupomTexto, setCupomTexto] = useState("");
  const [cupomAplicadoCode, setCupomAplicadoCode] = useState<string | null>(
    null
  );
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
  // recalcula sempre a partir do cupom aplicado + carrinho atual (não fica desatualizado)
  const cupomResultado = cupomAplicadoCode
    ? aplicarCupom(cupomAplicadoCode, subtotal, promos)
    : null;
  const descontoCupom = cupomResultado?.ok ? cupomResultado.desconto : 0;
  const descontoTotal = descontoCombo + descontoCupom;

  const aplicarCupomTexto = () => {
    setCupomErro("");
    const r = aplicarCupom(cupomTexto, subtotal, promos);
    if (r.ok) {
      setCupomAplicadoCode(cupomTexto.trim().toUpperCase());
    } else {
      setCupomAplicadoCode(null);
      setCupomErro(r.msg || "Cupom inválido.");
    }
  };

  const bairroSelecionado = porBairro
    ? bairros.find((b) => b.name === bairro) || null
    : null;
  const taxaEntrega =
    tipoEntrega === "retirada"
      ? 0
      : porBairro
        ? bairroSelecionado?.fee ?? 0
        : porKm && kmInfo
          ? kmInfo.taxa
          : config.delivery.fee;
  const numeroFinal = semNumero ? "S/N" : numero.trim();
  const total = subtotal - descontoTotal + taxaEntrega;
  const minimo = config.delivery.min_order || 0;
  const abaixoDoMinimo = minimo > 0 && subtotal < minimo;

  const valido =
    items.length > 0 &&
    !abaixoDoMinimo &&
    nome.trim() &&
    telefone.trim().replace(/\D/g, "").length >= 10 &&
    (tipoEntrega === "retirada" ||
      (rua.trim() &&
        (semNumero || numero.trim()) &&
        bairro.trim() &&
        (!porBairro || Boolean(bairroSelecionado))));

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
        delivery_type: tipoEntrega,
        customer_name: nome.trim(),
        customer_phone: telefone.trim() || null,
        street: tipoEntrega === "retirada" ? null : rua.trim(),
        number: tipoEntrega === "retirada" ? null : numeroFinal,
        neighborhood: tipoEntrega === "retirada" ? null : bairro.trim(),
        reference:
          tipoEntrega === "retirada" ? null : referencia.trim() || null,
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
      !situacao.aberta
        ? `⚠️ Chegou com a loja fechada (${situacao.motivo}) — combinar previsão com o cliente.`
        : "",
      ``,
      linhas,
      ``,
      `Subtotal: ${formatBRL(subtotal)}`,
      descontoTotal > 0 ? `Desconto: -${formatBRL(descontoTotal)}` : "",
      tipoEntrega === "retirada"
        ? `Entrega: retirada na loja`
        : `Entrega: ${formatBRL(taxaEntrega)}`,
      `*Total: ${formatBRL(total)}*`,
      ``,
      `*Cliente:* ${nome.trim()}`,
      telefone.trim() ? `*Telefone:* ${telefone.trim()}` : "",
      tipoEntrega === "retirada"
        ? `*Retirada na loja*`
        : `*Endereço:* ${rua.trim()}, ${numeroFinal} — ${bairro.trim()}`,
      tipoEntrega === "entrega" && referencia.trim()
        ? `*Referência:* ${referencia.trim()}`
        : "",
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
            <strong>{formatBRL(confirmado.total)}</strong> —{" "}
            {tipoEntrega === "retirada" ? "pagamento na retirada" : "pagamento na entrega"}{" "}
            ({pagamento}
            {pagamento === "Dinheiro" && troco.trim()
              ? `, troco para ${troco.trim()}`
              : ""}
            ).{" "}
            {tipoEntrega === "retirada"
              ? "Avisamos no seu WhatsApp quando estiver pronto! "
              : "Avisamos no seu WhatsApp quando sair pra entrega! "}
            {"\u{1F6F5}"}
          </p>
          <p className="confirmacao-texto" style={{ marginTop: 4 }}>
            {"⏱️"} {previsaoPedido(situacao, tipoEntrega)}
          </p>
          {tipoEntrega === "retirada" && (
            <p className="confirmacao-texto" style={{ marginTop: 4 }}>
              {"\u{1F3EA}"} {config.pickup.address}
            </p>
          )}
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
            <Link
              href="/"
              className="btn-principal"
              style={{ maxWidth: 260 }}
              onClick={() => {
                sessionStorage.setItem("duo-pular-pretela", "1");
              }}
            >
              Voltar ao cardápio
            </Link>
          </div>
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
      <p className="sub">Escolha como quer receber e preencha os dados abaixo.</p>

      {!situacao.aberta && (
        <div className="aviso-fechado">
          <span className="aviso-fechado-icone">{"\u{1F634}"}</span>
          <div>
            <h2>Estamos fechados agora</h2>
            <p>{previsaoPedido(situacao, tipoEntrega)}</p>
          </div>
        </div>
      )}

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
                <span>Cupom {cupomAplicadoCode}</span>
                <span>-{formatBRL(descontoCupom)}</span>
              </div>
            )}
            <div className="resumo-item">
              <span>
                {tipoEntrega === "retirada" ? "Retirada na loja" : "Entrega"}
                {tipoEntrega === "entrega" && porBairro && bairroSelecionado
                  ? ` (${bairroSelecionado.name})`
                  : tipoEntrega === "entrega" && porKm && kmInfo
                    ? ` (~${kmInfo.km.toFixed(1).replace(".", ",")} km)`
                    : ""}
              </span>
              <span>
                {tipoEntrega === "retirada"
                  ? "Grátis"
                  : porBairro && !bairroSelecionado
                    ? "escolha o bairro"
                    : formatBRL(taxaEntrega)}
              </span>
            </div>
            <div className="resumo-item" style={{ fontWeight: 700 }}>
              <span>Total</span>
              <span>{formatBRL(total)}</span>
            </div>
            {/* com a loja fechada o aviso roxo do topo já explica a previsão */}
            {situacao.aberta && (
              <p className="km-resultado" style={{ marginTop: 6 }}>
                {"⏱️"} {previsaoPedido(situacao, tipoEntrega)}
              </p>
            )}
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
            {cupomAplicadoCode && cupomResultado?.ok && (
              <p className="cupom-ok">{cupomResultado.msg}</p>
            )}
            {cupomAplicadoCode && !cupomResultado?.ok && (
              <p className="cupom-erro">
                Cupom {cupomAplicadoCode} deixou de valer:{" "}
                {cupomResultado?.msg || "não é mais válido pra esse carrinho."}
              </p>
            )}
            {cupomErro && <p className="cupom-erro">{cupomErro}</p>}
          </div>

          {pickupHabilitado && (
            <div className="bloco">
              <h2>Como você quer receber?</h2>
              <div className="pill-group">
                <button
                  type="button"
                  className={`pill ${tipoEntrega === "entrega" ? "ativo" : ""}`}
                  onClick={() => setTipoEntrega("entrega")}
                >
                  Entrega
                </button>
                <button
                  type="button"
                  className={`pill ${tipoEntrega === "retirada" ? "ativo" : ""}`}
                  onClick={() => setTipoEntrega("retirada")}
                >
                  Retirar na loja
                </button>
              </div>
            </div>
          )}

          {tipoEntrega === "retirada" ? (
            <div className="bloco">
              <h2>Retirada na loja</h2>
              <p className="km-resultado">
                {"\u{1F3EA}"} {config.pickup.address}
              </p>
            </div>
          ) : null}

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

          {tipoEntrega === "entrega" && (
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
                    disabled={semNumero}
                  />
                  <label className="opcao-sem-numero">
                    <input
                      type="checkbox"
                      checked={semNumero}
                      onChange={(e) => {
                        setSemNumero(e.target.checked);
                        if (e.target.checked) setNumero("");
                      }}
                    />
                    Sem número / Casa sem número
                  </label>
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
          )}

          <div className="bloco">
            <h2>Pagamento</h2>
            {(["Pix", "Dinheiro", "Cartão de crédito"] as Pagamento[]).map(
              (opcao) => (
                <label className="opcao" key={opcao}>
                  <input
                    type="radio"
                    name="pagamento"
                    checked={pagamento === opcao}
                    onChange={() => setPagamento(opcao)}
                  />
                  <span className="opcao-icone">
                    <IconePagamento tipo={opcao} />
                  </span>
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
