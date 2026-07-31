"use client";

import { situacaoDaLoja, useSettings } from "@/lib/settings-context";

/** Faixas do topo do site: banner promocional e aviso de loja fechada */
export function StoreStatus() {
  const { config } = useSettings();
  const situacao = situacaoDaLoja(config);

  return (
    <>
      {config.banner.active && config.banner.text.trim() && (
        <div className="faixa-banner">{config.banner.text}</div>
      )}
      {!situacao.aberta && (
        <div className="faixa-fechado">
          Estamos fechados no momento — {situacao.motivo}
        </div>
      )}
    </>
  );
}
