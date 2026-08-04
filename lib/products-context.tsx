"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { PRODUCTS, type Product } from "./store";
import { getSupabase, supabaseOn } from "./supabase";

/**
 * Fonte dos produtos do site.
 * Com Supabase: lê do banco (o que o admin edita vale na hora).
 * Sem Supabase ou se o banco falhar: usa a lista do código (plano B),
 * então o site NUNCA fica sem cardápio.
 */

const ProductsContext = createContext<{ products: Product[] }>({
  products: PRODUCTS,
});

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);

  useEffect(() => {
    if (!supabaseOn) return;
    (async () => {
      try {
        const sb = getSupabase();
        const { data, error } = await sb
          .from("products")
          .select(
            "slug, name, description, price, image_url, available, highlight_label"
          )
          .eq("active", true)
          .order("sort_order");
        if (error || !data || data.length === 0) return; // mantém plano B
        setProducts(
          data.map((p: any) => ({
            id: p.slug,
            name: p.name,
            flavor: p.name.replace("Duo ", ""),
            description: p.description || "",
            price: Number(p.price),
            image: p.image_url || "/products/" + p.slug + ".jpg",
            available: Boolean(p.available),
            highlightLabel: p.highlight_label || null,
          }))
        );
      } catch {
        // plano B silencioso
      }
    })();
  }, []);

  return (
    <ProductsContext.Provider value={{ products }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts(): Product[] {
  return useContext(ProductsContext).products;
}
