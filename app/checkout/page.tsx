"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STORE, formatBRL } from "@/lib/store";
import { useProducts } from "@/lib/products-context";
import { useCart } from "@/lib/cart";
import { criarPedidoSite } from "@/lib/data";
import { gerarPixCopiaECola } from "@/lib/pix";
import QRCode from "qrcode";

type Pagamento = "Pix" | "Dinheiro" | "Cartão na entrega";

export default function Checkout() {
  const PRODUCTS = useProducts();
  const { items, subtotal, total, clear } = useCart();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [referencia, setReferencia] = useState("");
  const [pagamento, setPagamento] = useState<Pagamento>("Pix");
  const [troco, setTroco] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState<{
    numero: string;
    total: number;
  } | null>(null);

  const valido =
    items.length > 0 &&
    nome.trim() &&
    telefone.trim().replace(/\D/g, "").length >= 10 &&
    rua.trim() &&
    numero.trim() &&
    bairro.trim();

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
        delivery_fee: STORE.deliveryFee,
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
      `Entrega: ${formatBRL(STORE.deliveryFee)}`,
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
    window.location.href = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(msg)}`;
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
            {"Já fomos buscar seu açaí no canto mais gelado do freezer. "}
            Total de{" "}
            <strong>{formatBRL(confirmado.total)}</strong> — pagamento na
            entrega ({pagamento}
            {pagamento === "Dinheiro" && troco.trim()
              ? `, troco para ${troco.trim()}`
              : ""}
            ). Avisamos no seu WhatsApp quando sair pra entrega!
          </p>
          {pagamento === "Pix" && STORE.pixKey && (
            <BlocoPix total={confirmado.total} numero={confirmado.numero} />
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
            <div className="resumo-item">
              <span>Entrega</span>
              <span>{formatBRL(STORE.deliveryFee)}</span>
            </div>
            <div className="resumo-item" style={{ fontWeight: 700 }}>
              <span>Total</span>
              <span>{formatBRL(total)}</span>
            </div>
          </div>

          <div className="bloco">
            <h2>Seus dados</h2>
            <div className="campo">
              <label htmlFor="nome">Nome *</label>
              <input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="campo">
              <label htmlFor="telefone">Telefone / WhatsApp *</label>
              <input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
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
              <input
                id="bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Bairro"
              />
            </div>
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

          <button
            className="btn-principal"
            onClick={finalizarPedido}
            disabled={!valido || enviando}
          >
            {enviando ? "Enviando pedido…" : "Finalizar pedido"}
          </button>
          <p className="aviso">
            Finalizou, a gente já sai correndo buscar seu açaí no Polo Norte.
            Prefere pedir pelo WhatsApp?{" "}
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
function BlocoPix({ total, numero }: { total: number; numero: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const codigo = gerarPixCopiaECola({
    chave: STORE.pixKey,
    nome: STORE.pixName,
    cidade: STORE.pixCity,
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
      <h2>Pague agora com Pix</h2>
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
