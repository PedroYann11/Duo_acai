import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true quando as variáveis do Supabase estão configuradas */
export const supabaseOn = Boolean(url && anon);

const CHAVE_LEMBRAR = "duo-lembrar-dispositivo";

/** true por padrão: se nunca escolheu, mantém o login (comportamento de antes) */
export function getLembrarDispositivo(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(CHAVE_LEMBRAR) !== "0";
}

export function setLembrarDispositivo(lembrar: boolean) {
  localStorage.setItem(CHAVE_LEMBRAR, lembrar ? "1" : "0");
}

/**
 * Storage que decide, a cada leitura/escrita, se o login sobrevive ao
 * fechar o navegador (localStorage) ou some junto (sessionStorage) —
 * de acordo com o "Lembrar de mim" marcado na tela de login.
 */
const storageComLembrete = {
  getItem: (chave: string) => {
    const guarda = getLembrarDispositivo() ? localStorage : sessionStorage;
    return guarda.getItem(chave);
  },
  setItem: (chave: string, valor: string) => {
    const guarda = getLembrarDispositivo() ? localStorage : sessionStorage;
    guarda.setItem(chave, valor);
  },
  removeItem: (chave: string) => {
    localStorage.removeItem(chave);
    sessionStorage.removeItem(chave);
  },
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!url || !anon)
      throw new Error("Supabase não configurado (variáveis de ambiente)");
    client = createClient(url, anon, {
      auth: { storage: storageComLembrete },
    });
  }
  return client;
}
