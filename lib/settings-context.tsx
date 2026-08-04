"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { STORE } from "./store";
import { getSupabase, supabaseOn } from "./supabase";

export type HorarioDia = { closed: boolean; open: string; close: string };

export type ModoEntrega = "fixed" | "neighborhood" | "km";

export type ConfigLoja = {
  store_open: { open: boolean; message: string };
  banner: { active: boolean; text: string };
  delivery: {
    fee: number;
    min_order: number;
    by_neighborhood: boolean; // legado (v1.8) — mantido por compatibilidade
    mode: ModoEntrega;
    km_base: number; // taxa base em R$
    km_price: number; // R$ por km
    store_lat: number;
    store_lng: number;
  };
  hours: Record<string, HorarioDia>;
  special_dates: { date: string; label: string }[];
  pickup: { enabled: boolean; address: string };
  contact: {
    whatsapp: string;
    pix_key: string;
    pix_name: string;
    pix_city: string;
  };
  temas: {
    preTela: Tema;
    cardapio: Tema;
    admin: Tema;
  };
};

export type Tema = {
  roxo: string;
  acai: string;
  maracuja: string;
  creme: string;
  lilas: string;
};

export type Bairro = { id: string; name: string; fee: number };

const HORARIO_PADRAO: Record<string, HorarioDia> = Object.fromEntries(
  ["0", "1", "2", "3", "4", "5", "6"].map((d) => [
    d,
    d === "2"
      ? { closed: true, open: "16:00", close: "22:00" } // terça: fechado
      : { closed: false, open: "16:00", close: "22:00" },
  ])
);

export const TEMA_PADRAO = {
  roxo: "#61174c",
  acai: "#2e0b26",
  maracuja: "#fffdf8",
  creme: "#f6ecda",
  lilas: "#c7a3dc",
};

export const CONFIG_PADRAO: ConfigLoja = {
  store_open: { open: true, message: "" },
  banner: { active: false, text: "" },
  delivery: {
    fee: STORE.deliveryFee,
    min_order: STORE.minOrder,
    by_neighborhood: false,
    mode: "fixed",
    km_base: 3.0,
    km_price: 1.0,
    store_lat: -7.233266, // Rua José Marrocos, 145 — Pinto Madeira, Crato/CE
    store_lng: -39.407392,
  },
  hours: HORARIO_PADRAO,
  special_dates: [],
  pickup: {
    enabled: true,
    address: "Rua José Marrocos, 145 — Pinto Madeira, Crato/CE",
  },
  contact: {
    whatsapp: STORE.whatsapp,
    pix_key: STORE.pixKey,
    pix_name: STORE.pixName,
    pix_city: STORE.pixCity,
  },
  temas: {
    preTela: { ...TEMA_PADRAO },
    cardapio: { ...TEMA_PADRAO },
    admin: { ...TEMA_PADRAO },
  },
};

type Ctx = { config: ConfigLoja; bairros: Bairro[] };

const SettingsContext = createContext<Ctx>({
  config: CONFIG_PADRAO,
  bairros: [],
});

/** Escurece uma cor hex (para o tom de hover derivado do roxo) */
export function escurecer(hex: string, fator = 0.75): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const n = (i: number) =>
    Math.max(0, Math.round(parseInt(m.slice(i, i + 2), 16) * fator))
      .toString(16)
      .padStart(2, "0");
  return `#${n(0)}${n(2)}${n(4)}`;
}

/** Cores calculadas (hover, bordas) a partir das 5 escolhidas de um tema */
export function estiloTema(tema: Tema): Record<string, string> {
  return {
    "--roxo": tema.roxo,
    "--acai": tema.acai,
    "--maracuja": tema.maracuja,
    "--creme": tema.creme,
    "--lilas": tema.lilas,
    "--acai-2": escurecer(tema.roxo, 0.72),
    "--creme-2": escurecer(tema.creme, 0.94),
  };
}

/** Aplica um tema no documento inteiro — usado pro tema global do cardápio */
export function aplicarTema(tema: Tema) {
  const r = document.documentElement.style;
  const estilo = estiloTema(tema);
  for (const chave in estilo) r.setProperty(chave, estilo[chave]);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ConfigLoja>(CONFIG_PADRAO);
  const [bairros, setBairros] = useState<Bairro[]>([]);

  useEffect(() => {
    if (!supabaseOn) return;
    (async () => {
      try {
        const sb = getSupabase();
        const [cfg, viz] = await Promise.all([
          sb.from("store_settings").select("key, value"),
          sb.from("neighborhoods").select("id, name, fee").order("name"),
        ]);
        if (cfg.data && cfg.data.length > 0) {
          const novo: any = { ...CONFIG_PADRAO };
          for (const linha of cfg.data) {
            if (linha.key === "special_dates") novo[linha.key] = linha.value;
            else
              novo[linha.key] = { ...(novo as any)[linha.key], ...linha.value };
          }
          // compatibilidade: v1.8 usava by_neighborhood em vez de mode
          if (!novo.delivery.mode) {
            novo.delivery.mode = novo.delivery.by_neighborhood
              ? "neighborhood"
              : "fixed";
          }
          setConfig(novo as ConfigLoja);
        }
        if (viz.data)
          setBairros(viz.data.map((b: any) => ({ ...b, fee: Number(b.fee) })));
      } catch {
        // plano B silencioso
      }
    })();
  }, []);

  // aplica o tema do cardápio no documento inteiro; pré-tela e admin têm
  // suas próprias paletas, aplicadas localmente em cada tela
  useEffect(() => {
    aplicarTema(config.temas.cardapio);
  }, [config.temas.cardapio]);

  return (
    <SettingsContext.Provider value={{ config, bairros }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): Ctx {
  return useContext(SettingsContext);
}

/** Distância aproximada em km entre dois pontos (Haversine, linha reta) */
export function distanciaKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const R = 6371;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const DIAS_SEMANA = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

/** Quando a loja abre de novo (texto amigável), ou null em modo férias */
export function proximaAbertura(config: ConfigLoja): string | null {
  if (!config.store_open.open) return null;

  const agora = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(agora);
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (config.special_dates.some((e) => e.date === iso)) continue;
    const dia = config.hours[String(d.getDay())];
    if (!dia || dia.closed) continue;

    if (i === 0) {
      const hm = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
      if (hm < dia.open) return `Abrimos hoje às ${dia.open}`;
      continue; // hoje já passou do horário
    }
    if (i === 1) return `Abrimos amanhã às ${dia.open}`;
    if (i < 7) return `Abrimos ${DIAS_SEMANA[d.getDay()]} às ${dia.open}`;
    return `Abrimos dia ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} às ${dia.open}`;
  }
  return null;
}

/** Situação da loja neste exato momento (relógio do visitante) */
export function situacaoDaLoja(config: ConfigLoja): {
  aberta: boolean;
  motivo: string;
  reabre: string | null;
} {
  if (!config.store_open.open) {
    return {
      aberta: false,
      motivo:
        config.store_open.message || "Estamos em uma pausa. Voltamos em breve!",
      reabre: null,
    };
  }

  const agora = new Date();
  const hojeIso = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
  const especial = config.special_dates.find((d) => d.date === hojeIso);
  if (especial) {
    return {
      aberta: false,
      motivo: especial.label
        ? `Hoje estamos fechados: ${especial.label}.`
        : "Hoje estamos fechados.",
      reabre: proximaAbertura(config),
    };
  }

  const dia = config.hours[String(agora.getDay())];
  if (!dia || dia.closed) {
    return {
      aberta: false,
      motivo: "Hoje estamos fechados.",
      reabre: proximaAbertura(config),
    };
  }

  const hm = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  const dentro =
    dia.open <= dia.close
      ? hm >= dia.open && hm <= dia.close
      : hm >= dia.open || hm <= dia.close;

  if (!dentro) {
    return {
      aberta: false,
      motivo:
        hm < dia.open ? "Ainda não abrimos hoje." : "Já encerramos por hoje.",
      reabre: proximaAbertura(config),
    };
  }

  return { aberta: true, motivo: "", reabre: null };
}

/** Texto amigável do horário de funcionamento, gerado a partir da configuração real */
export function resumoHorario(config: ConfigLoja): string {
  const dias = ["0", "1", "2", "3", "4", "5", "6"];
  const abertos = dias.filter((d) => !config.hours[d]?.closed);
  const fechados = dias
    .filter((d) => config.hours[d]?.closed)
    .map((d) => DIAS_SEMANA[Number(d)]);

  if (abertos.length === 0) return "Fechado até novo aviso";

  const janelas = new Set(
    abertos.map((d) => `${config.hours[d].open}-${config.hours[d].close}`)
  );
  if (janelas.size > 1) return "Horários variam por dia — confira no site";

  const dia = config.hours[abertos[0]];
  const horario = `${dia.open} às ${dia.close}`;
  if (fechados.length === 0) return `Todos os dias, ${horario}`;
  return `${horario} · fechado: ${fechados.join(", ")}`;
}

/** Tempo médio de preparo + entrega, hoje um valor fixo (~45 min) */
export const TEMPO_ENTREGA_MIN = 45;
/** Tempo médio só de preparo, para pedidos de retirada na loja */
export const TEMPO_RETIRADA_MIN = 20;

/** Texto de previsão pro cliente, considerando se a loja está aberta agora */
export function previsaoPedido(
  situacao: ReturnType<typeof situacaoDaLoja>,
  tipo: "entrega" | "retirada"
): string {
  const tempo = tipo === "retirada" ? TEMPO_RETIRADA_MIN : TEMPO_ENTREGA_MIN;
  const acao = tipo === "retirada" ? "Fica pronto" : "Chega";

  if (situacao.aberta) return `${acao} em até ${tempo} min`;

  const quando = situacao.reabre
    ? `assim que abrirmos (${situacao.reabre})`
    : "assim que voltarmos a atender";
  return `Estamos fechados agora, mas seu pedido é bem-vindo! Vamos preparar ${quando} e, depois disso, ${acao.toLowerCase()} em até ${tempo} min.`;
}
