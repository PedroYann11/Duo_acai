import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true quando as variáveis do Supabase estão configuradas */
export const supabaseOn = Boolean(url && anon);

const CHAVE_LEMBRAR = "duo-lembrar-dispositivo";

/** true por padrão: se nunca escolheu, mantém o login (o dono quer ficar logado) */
export function getLembrarDispositivo(): boolean {
  try {
    return localStorage.getItem(CHAVE_LEMBRAR) !== "0";
  } catch {
    return true;
  }
}

export function setLembrarDispositivo(lembrar: boolean) {
  try {
    localStorage.setItem(CHAVE_LEMBRAR, lembrar ? "1" : "0");
  } catch {}
}

/**
 * true quando o painel está rodando instalado (ícone na tela de início),
 * não numa aba comum do navegador.
 */
function emModoApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.matchMedia?.("(display-mode: standalone)").matches === true ||
      (window.navigator as any).standalone === true
    );
  } catch {
    return false;
  }
}

/**
 * Storage do login. Decide, a cada leitura/escrita, se a sessão sobrevive ao
 * fechar o navegador (localStorage) ou some junto (sessionStorage) — de acordo
 * com o "Lembrar de mim" da tela de login.
 *
 * - Instalado como app (tela de início): SEMPRE localStorage. O sessionStorage
 *   não sobrevive a fechar/reabrir o app (cada abertura conta como sessão nova),
 *   então "não lembrar" ali derrubava o login toda hora.
 * - Tudo dentro de try/catch: se o acesso ao storage falhar (modo privado, etc.),
 *   o supabase-js cairia pra memória e o login sumiria a cada reload — evitamos
 *   isso devolvendo null sem estourar exceção.
 */
function guardaAtual(): Storage | null {
  try {
    return emModoApp() || getLembrarDispositivo() ? localStorage : sessionStorage;
  } catch {
    try {
      return localStorage;
    } catch {
      return null;
    }
  }
}

const storageComLembrete = {
  getItem: (chave: string) => {
    try {
      return guardaAtual()?.getItem(chave) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (chave: string, valor: string) => {
    try {
      guardaAtual()?.setItem(chave, valor);
    } catch {}
  },
  removeItem: (chave: string) => {
    try {
      localStorage.removeItem(chave);
    } catch {}
    try {
      sessionStorage.removeItem(chave);
    } catch {}
  },
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!url || !anon)
      throw new Error("Supabase não configurado (variáveis de ambiente)");
    client = createClient(url, anon, {
      auth: {
        storage: storageComLembrete,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
