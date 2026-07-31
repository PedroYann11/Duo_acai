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

export type ConfigLoja = {
  store_open: { open: boolean; message: string };
  banner: { active: boolean; text: string };
  delivery: { fee: number; min_order: number; by_neighborhood: boolean };
  hours: Record<string, HorarioDia>;
  special_dates: { date: string; label: string }[];
  contact: {
    whatsapp: string;
    pix_key: string;
    pix_name: string;
    pix_city: string;
  };
};

export type Bairro = { id: string; name: string; fee: number };

const HORARIO_PADRAO: Record<string, HorarioDia> = Object.fromEntries(
  ["0", "1", "2", "3", "4", "5", "6"].map((d) => [
    d,
    { closed: false, open: "10:00", close: "22:00" },
  ])
);

export const CONFIG_PADRAO: ConfigLoja = {
  store_open: { open: true, message: "" },
  banner: { active: false, text: "" },
  delivery: {
    fee: STORE.deliveryFee,
    min_order: STORE.minOrder,
    by_neighborhood: false,
  },
  hours: HORARIO_PADRAO,
  special_dates: [],
  contact: {
    whatsapp: STORE.whatsapp,
    pix_key: STORE.pixKey,
    pix_name: STORE.pixName,
    pix_city: STORE.pixCity,
  },
};

type Ctx = { config: ConfigLoja; bairros: Bairro[] };

const SettingsContext = createContext<Ctx>({
  config: CONFIG_PADRAO,
  bairros: [],
});

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
            novo[linha.key] = { ...(novo as any)[linha.key], ...linha.value };
            if (linha.key === "special_dates") novo[linha.key] = linha.value;
          }
          setConfig(novo as ConfigLoja);
        }
        if (viz.data)
          setBairros(
            viz.data.map((b: any) => ({ ...b, fee: Number(b.fee) }))
          );
      } catch {
        // plano B silencioso: usa padrão do código
      }
    })();
  }, []);

  return (
    <SettingsContext.Provider value={{ config, bairros }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): Ctx {
  return useContext(SettingsContext);
}

/** Situação da loja neste exato momento (usa o relógio do visitante) */
export function situacaoDaLoja(config: ConfigLoja): {
  aberta: boolean;
  motivo: string;
} {
  if (!config.store_open.open) {
    return {
      aberta: false,
      motivo:
        config.store_open.message ||
        "Estamos em uma pausa. Voltamos em breve!",
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
    };
  }

  const dia = config.hours[String(agora.getDay())];
  if (!dia || dia.closed) {
    return { aberta: false, motivo: "Hoje estamos fechados. Até amanhã!" };
  }

  const hm = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  const dentro =
    dia.open <= dia.close
      ? hm >= dia.open && hm <= dia.close
      : hm >= dia.open || hm <= dia.close; // vira a madrugada

  if (!dentro) {
    return {
      aberta: false,
      motivo:
        hm < dia.open
          ? `Abrimos hoje às ${dia.open}. Já já tem açaí!`
          : `Encerramos por hoje. Amanhã tem mais!`,
    };
  }

  return { aberta: true, motivo: "" };
}
