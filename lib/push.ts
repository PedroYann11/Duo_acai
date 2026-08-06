import { getSupabase } from "@/lib/supabase";

/**
 * Notificações push (Web Push/VAPID) do painel admin em PWA.
 * A chave pública é... pública mesmo, por definição do protocolo VAPID —
 * não precisa ficar em variável de ambiente. A privada nunca sai do
 * Supabase (fica guardada no Vault, só a edge function acessa).
 */
export const VAPID_PUBLIC_KEY =
  "BP9JFoJpxbv4l69hf1bB7e4ago4RoiBPNRHmAu5sbr2QX_L_FbLZhUVbbDgpVIlJBZuDDMGT6oD3or3VhR-MiuE";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function suportaPush(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function statusNotificacoes(): Promise<
  "sem-suporte" | "negada" | "inativa" | "ativa"
> {
  if (!suportaPush()) return "sem-suporte";
  if (Notification.permission === "denied") return "negada";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "ativa" : "inativa";
}

export async function ativarNotificacoes(): Promise<
  { ok: true } | { ok: false; motivo: string }
> {
  if (!suportaPush()) return { ok: false, motivo: "sem-suporte" };

  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return { ok: false, motivo: "permissao-negada" };

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }

  const json = sub.toJSON();
  const { error } = await getSupabase().from("push_subscriptions").upsert(
    {
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
      user_agent: navigator.userAgent,
      active: true,
    },
    { onConflict: "endpoint" }
  );

  if (error) return { ok: false, motivo: error.message };
  return { ok: true };
}

export async function desativarNotificacoes(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;

  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await getSupabase().from("push_subscriptions").delete().eq("endpoint", endpoint);
}
