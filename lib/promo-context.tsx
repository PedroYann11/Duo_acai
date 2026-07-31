"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getSupabase, supabaseOn } from "./supabase";

export type Promocao = {
  id: string;
  name: string;
  kind: "combo" | "coupon";
  combo_qty: number | null;
  combo_price: number | null;
  code: string | null;
  discount_kind: "percent" | "fixed" | null;
  discount_value: number | null;
  min_order: number;
  active: boolean;
};

const PromoContext = createContext<{ promos: Promocao[] }>({ promos: [] });

export function PromoProvider({ children }: { children: ReactNode }) {
  const [promos, setPromos] = useState<Promocao[]>([]);

  useEffect(() => {
    if (!supabaseOn) return;
    (async () => {
      try {
        const sb = getSupabase();
        const { data } = await sb
          .from("promotions")
          .select("*")
          .eq("active", true);
        if (data)
          setPromos(
            data.map((p: any) => ({
              ...p,
              combo_price: p.combo_price != null ? Number(p.combo_price) : null,
              discount_value:
                p.discount_value != null ? Number(p.discount_value) : null,
              min_order: Number(p.min_order || 0),
            }))
          );
      } catch {
        // sem promoções: segue sem desconto
      }
    })();
  }, []);

  return (
    <PromoContext.Provider value={{ promos }}>{children}</PromoContext.Provider>
  );
}

export function usePromos() {
  return useContext(PromoContext).promos;
}

/**
 * Aplica o melhor combo automático sobre o subtotal.
 * Combo "leve X por Y": cada grupo de X itens (os mais caros primeiro)
 * passa a custar Y. Retorna o desconto total (>= 0).
 */
export function calcularDescontoCombo(
  precosItens: number[],
  promos: Promocao[]
): { desconto: number; promo: Promocao | null } {
  const combos = promos.filter(
    (p) => p.kind === "combo" && p.combo_qty && p.combo_price != null
  );
  if (combos.length === 0 || precosItens.length === 0)
    return { desconto: 0, promo: null };

  // ordena itens do mais caro pro mais barato
  const precos = [...precosItens].sort((a, b) => b - a);

  let melhorDesconto = 0;
  let melhorPromo: Promocao | null = null;

  for (const combo of combos) {
    const qty = combo.combo_qty!;
    const preco = combo.combo_price!;
    let desconto = 0;
    // forma grupos de "qty" itens; cada grupo completo vira "preco"
    for (let i = 0; i + qty <= precos.length; i += qty) {
      const somaGrupo = precos
        .slice(i, i + qty)
        .reduce((a, b) => a + b, 0);
      if (somaGrupo > preco) desconto += somaGrupo - preco;
    }
    if (desconto > melhorDesconto) {
      melhorDesconto = desconto;
      melhorPromo = combo;
    }
  }

  return { desconto: melhorDesconto, promo: melhorPromo };
}

/** Valida um cupom digitado e retorna o desconto sobre o subtotal */
export function aplicarCupom(
  codigo: string,
  subtotal: number,
  promos: Promocao[]
): { ok: boolean; desconto: number; msg: string; promo: Promocao | null } {
  const code = codigo.trim().toUpperCase();
  if (!code) return { ok: false, desconto: 0, msg: "", promo: null };

  const cupom = promos.find(
    (p) => p.kind === "coupon" && (p.code || "").toUpperCase() === code
  );
  if (!cupom)
    return { ok: false, desconto: 0, msg: "Cupom não encontrado.", promo: null };
  if (subtotal < cupom.min_order)
    return {
      ok: false,
      desconto: 0,
      msg: `Cupom válido a partir de R$ ${cupom.min_order.toFixed(2).replace(".", ",")}.`,
      promo: null,
    };

  let desconto = 0;
  if (cupom.discount_kind === "percent")
    desconto = (subtotal * (cupom.discount_value || 0)) / 100;
  else desconto = cupom.discount_value || 0;

  desconto = Math.min(desconto, subtotal); // nunca maior que o subtotal
  desconto = Math.round(desconto * 100) / 100;

  return {
    ok: true,
    desconto,
    msg: `Cupom aplicado: -R$ ${desconto.toFixed(2).replace(".", ",")}`,
    promo: cupom,
  };
}
