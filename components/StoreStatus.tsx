"use client";

import { situacaoDaLoja, useSettings } from "@/lib/settings-context";
import { usePromos } from "@/lib/promo-context";

/** Faixas do topo do site: banner promocional e aviso de loja fechada */
export function StoreStatus() {
  const { config } = useSettings();
  const situacao = situacaoDaLoja(config);
  const promos = usePromos();

  // uma promoção ativa com banner próprio manda mais que o banner manual —
  // assim o dono não precisa cadastrar as duas coisas separadas
  const promoComBanner = promos.find(
    (p) => p.active && p.banner_text && p.banner_text.trim()
  );
  const textoBanner = promoComBanner
    ? promoComBanner.banner_text!.trim()
    : config.banner.active && config.banner.text.trim()
      ? config.banner.text
      : "";

  return (
    <>
      {textoBanner && <div className="faixa-banner">{textoBanner}</div>}
      {!situacao.aberta && (
        <div className="faixa-fechado">
          {situacao.motivo}
          {situacao.reabre ? ` ${situacao.reabre}.` : ""} Mas pode pedir —
          preparamos assim que abrirmos!
        </div>
      )}
    </>
  );
}
