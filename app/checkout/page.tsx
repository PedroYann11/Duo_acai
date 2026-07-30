"use client";

import { useState } from "react";
import Link from "next/link";
import { PRODUCTS, STORE, formatBRL } from "@/lib/store";
import { useCart } from "@/lib/cart";
import { criarPedidoSite } from "@/lib/data";

type Pagamento = "Pix" | "Dinheiro" | "Cartão na entrega";

export default function Checkout() {
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

  const valido =
    items.length > 0 && nome.trim() && rua.trim() && numero.trim() && bairro.trim();

  const enviarWhatsApp = async () => {
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

    // salva no banco (dashboard) — se falhar, o pedido segue pelo WhatsApp
    try {
      await criarPedidoSite({
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

    const linhas = itensPedido
      .map((i) => `▪ ${i.qty}x ${i.product_name} — ${formatBRL(i.unit_price * i.qty)}`)
      .join("\n");

    const msg = [
      `🟣 *NOVO PEDIDO — ${STORE.name.toUpperCase()}*`,
      ``,
      linhas,
      ``,
      `Subtotal: ${formatBRL(subtotal)}`,
      `Entrega: ${formatBRL(STORE.deliveryFee)}`,
      `*Total: ${formatBRL(total)}*`,
      ``,
      `👤 *Cliente:* ${nome.trim()}`,
      telefone.trim() ? `📞 ${telefone.trim()}` : "",
      `📍 *Endereço:* ${rua.trim()}, ${numero.trim()} — ${bairro.trim()}`,
      referencia.trim() ? `🧭 Referência: ${referencia.trim()}` : "",
      ``,
      `💳 *Pagamento:* ${pagamento}${
        pagamento === "Dinheiro" && troco.trim()
          ? ` (troco para ${troco.trim()})`
          : ""
      }`,
    ]
      .filter((l) => l !== "")
      .join("\n");

    const url = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    clear();
    setEnviando(false);
  };

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
              <label htmlFor="telefone">Telefone (opcional)</label>
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
            className="btn-whats"
            onClick={enviarWhatsApp}
            disabled={!valido || enviando}
          >
            {enviando ? "Registrando pedido…" : "Enviar pedido pelo WhatsApp"}
          </button>
          <p className="aviso">
            Você será direcionado ao WhatsApp da Duo com o pedido pronto — é só
            apertar enviar. Pagamento online (Pix e cartão) chega em breve.
          </p>
        </>
      )}
    </div>
  );
}
