"use client";

import { useState } from "react";
import Link from "next/link";
import { STORE, formatBRL, type Product } from "@/lib/store";
import { useProducts } from "@/lib/products-context";
import { useSettings } from "@/lib/settings-context";
import { useCart } from "@/lib/cart";

/* ---------- Header ---------- */
export function Header() {
  const { totalItems } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link href="/" className="logo">
            DUO
            <span>O açaí da garrafa</span>
          </Link>
          <button className="btn-cart" onClick={() => setOpen(true)}>
            Carrinho
            <span className="cart-count">{totalItems}</span>
          </button>
        </div>
      </header>
      {open && <CartDrawer onClose={() => setOpen(false)} />}
    </>
  );
}

/* ---------- Drawer do carrinho ---------- */
function CartDrawer({ onClose }: { onClose: () => void }) {
  const PRODUCTS = useProducts();
  const { config, bairros } = useSettings();
  const { items, setQty, subtotal } = useCart();
  const porBairro = config.delivery.by_neighborhood && bairros.length > 0;
  const taxa = config.delivery.fee;
  const total = subtotal + (porBairro ? 0 : taxa);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Carrinho">
        <div className="drawer-head">
          <h2>Seu pedido</h2>
          <button className="btn-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="drawer-items">
          {items.length === 0 && (
            <p className="drawer-vazio">
              Seu carrinho está vazio.
              <br />
              Escolha um sabor no cardápio pra começar!
            </p>
          )}
          {items.map((item) => {
            const p = PRODUCTS.find((p) => p.id === item.productId);
            if (!p) return null;
            return (
              <div className="item" key={item.productId}>
                <img src={p.image} alt={p.name} />
                <div className="item-info">
                  <h4>{p.name}</h4>
                  <span>{formatBRL(p.price)}</span>
                </div>
                <div className="qty">
                  <button
                    onClick={() => setQty(item.productId, item.qty - 1)}
                    aria-label={`Diminuir ${p.name}`}
                  >
                    −
                  </button>
                  <strong>{item.qty}</strong>
                  <button
                    onClick={() => setQty(item.productId, item.qty + 1)}
                    aria-label={`Aumentar ${p.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {items.length > 0 && (
          <div className="drawer-foot">
            <div className="linha-total">
              <span>Subtotal</span>
              <span>{formatBRL(subtotal)}</span>
            </div>
            <div className="linha-total">
              <span>Entrega</span>
              <span>{porBairro ? "por bairro" : formatBRL(taxa)}</span>
            </div>
            <div className="linha-total forte">
              <span>{porBairro ? "Subtotal" : "Total"}</span>
              <span>{formatBRL(total)}</span>
            </div>
            <Link href="/checkout" className="btn-principal" onClick={onClose}>
              Fechar pedido
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

/* ---------- Card de produto ---------- */
export function ProductCard({ product }: { product: Product }) {
  const { items, add, setQty } = useCart();
  const qty = items.find((i) => i.productId === product.id)?.qty ?? 0;

  return (
    <article className={`card ${product.available ? "" : "esgotado"}`}>
      <img className="card-img" src={product.image} alt={product.name} />
      <div className="card-body">
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="card-foot">
          <span className="price">{formatBRL(product.price)}</span>
          {qty === 0 ? (
            <button
              className="btn-add"
              onClick={() => add(product.id)}
              disabled={!product.available}
            >
              {product.available ? "Adicionar" : "Esgotado"}
            </button>
          ) : (
            <div className="qty card-qty">
              <button
                onClick={() => setQty(product.id, qty - 1)}
                aria-label={`Diminuir ${product.name}`}
              >
                −
              </button>
              <strong>{qty}</strong>
              <button
                onClick={() => setQty(product.id, qty + 1)}
                aria-label={`Aumentar ${product.name}`}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}


/* ---------- Grade do cardápio (lê produtos do banco) ---------- */
export function MenuGrid() {
  const products = useProducts();
  return (
    <div className="grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
