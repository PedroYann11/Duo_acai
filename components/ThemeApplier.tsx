"use client";

import { useEffect } from "react";
import { TEMA_PADRAO, useSettings } from "@/lib/settings-context";

/** Aplica as cores configuradas na aba Loja do painel em todo o site. */
export function ThemeApplier() {
  const { config } = useSettings();

  useEffect(() => {
    const tema = { ...TEMA_PADRAO, ...config.theme };
    const raiz = document.documentElement.style;
    raiz.setProperty("--acai", tema.acai);
    raiz.setProperty("--roxo", tema.roxo);
    raiz.setProperty("--lilas", tema.lilas);
    raiz.setProperty("--creme", tema.creme);
    raiz.setProperty("--maracuja", tema.maracuja);
    // cores derivadas, pra manter tudo harmônico sem pedir mais escolhas
    raiz.setProperty("--acai-2", misturar(tema.acai, tema.roxo, 0.5));
    raiz.setProperty("--creme-2", escurecer(tema.creme, 0.07));
  }, [config.theme]);

  return null;
}

function hexParaRgb(hex: string): [number, number, number] {
  const limpo = hex.replace("#", "");
  const n = parseInt(
    limpo.length === 3
      ? limpo
          .split("")
          .map((c) => c + c)
          .join("")
      : limpo,
    16
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbParaHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function misturar(a: string, b: string, peso: number): string {
  try {
    const [r1, g1, b1] = hexParaRgb(a);
    const [r2, g2, b2] = hexParaRgb(b);
    return rgbParaHex(
      r1 + (r2 - r1) * peso,
      g1 + (g2 - g1) * peso,
      b1 + (b2 - b1) * peso
    );
  } catch {
    return a;
  }
}

function escurecer(hex: string, pct: number): string {
  try {
    const [r, g, b] = hexParaRgb(hex);
    return rgbParaHex(r * (1 - pct), g * (1 - pct), b * (1 - pct));
  } catch {
    return hex;
  }
}
