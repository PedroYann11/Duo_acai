"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { STORE } from "./store";
import { useProducts } from "./products-context";

export type CartItem = { productId: string; qty: number };

type CartContextType = {
  items: CartItem[];
  add: (productId: string) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  totalItems: number;
  subtotal: number;
  total: number;
};

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "duo-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const PRODUCTS = useProducts();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  const add = (productId: string) =>
    setItems((prev) => {
      const found = prev.find((i) => i.productId === productId);
      if (found)
        return prev.map((i) =>
          i.productId === productId ? { ...i, qty: i.qty + 1 } : i
        );
      return [...prev, { productId, qty: 1 }];
    });

  const remove = (productId: string) =>
    setItems((prev) => prev.filter((i) => i.productId !== productId));

  const setQty = (productId: string, qty: number) => {
    if (qty <= 0) return remove(productId);
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, qty } : i))
    );
  };

  const clear = () => setItems([]);

  const { totalItems, subtotal } = useMemo(() => {
    let count = 0;
    let sub = 0;
    for (const item of items) {
      const p = PRODUCTS.find((p) => p.id === item.productId);
      if (!p) continue;
      count += item.qty;
      sub += p.price * item.qty;
    }
    return { totalItems: count, subtotal: sub };
  }, [items, PRODUCTS]);

  const total = subtotal + (items.length > 0 ? STORE.deliveryFee : 0);

  return (
    <CartContext.Provider
      value={{ items, add, remove, setQty, clear, totalItems, subtotal, total }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de <CartProvider>");
  return ctx;
}
