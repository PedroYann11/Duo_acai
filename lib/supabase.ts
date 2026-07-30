import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true quando as variáveis do Supabase estão configuradas */
export const supabaseOn = Boolean(url && anon);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!url || !anon)
      throw new Error("Supabase não configurado (variáveis de ambiente)");
    client = createClient(url, anon);
  }
  return client;
}
