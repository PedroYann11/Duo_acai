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

/** compara a chave da assinatura já existente com a chave atual do app */
function mesmaChave(
  atual: ArrayBuffer | null | undefined,
  desejada: Uint8Array
): boolean {
  if (!atual) return false;
  const a = new Uint8Array(atual);
  if (a.length !== desejada.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== desejada[i]) return false;
  return true;
}

export function suportaPush(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** registra o service worker e devolve um registro com worker ATIVO */
export async function garantirServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
    return null;
  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    // `ready` só resolve quando existe um worker ativo controlando a página —
    // é isso que evita assinar o push antes da hora (a causa do "só funciona
    // às vezes" / "tive que reinstalar várias vezes")
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
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

  // 1) permissão primeiro, ainda dentro do gesto do clique (exigência do iOS)
  let permissao = Notification.permission;
  if (permissao === "default") {
    try {
      permissao = await Notification.requestPermission();
    } catch {
      return { ok: false, motivo: "permissao-negada" };
    }
  }
  if (permissao !== "granted") return { ok: false, motivo: "permissao-negada" };

  // 2) garante um service worker ATIVO antes de assinar
  const reg = await garantirServiceWorker();
  if (!reg) return { ok: false, motivo: "sw-falhou" };

  // 3) reaproveita a assinatura só se a chave bater; senão recria.
  //    (reinstalar o app pode deixar uma assinatura velha, com chave antiga,
  //    presa no navegador — assinar por cima dela dá erro)
  const chave = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  let sub: PushSubscription | null = null;
  try {
    sub = await reg.pushManager.getSubscription();
    if (sub && !mesmaChave(sub.options?.applicationServerKey, chave)) {
      try {
        await sub.unsubscribe();
      } catch {}
      sub = null;
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: chave as BufferSource,
      });
    }
  } catch (e: any) {
    return { ok: false, motivo: `assinatura-falhou: ${e?.message || e}` };
  }

  // 4) salva no banco (upsert por endpoint pra não duplicar)
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, motivo: "assinatura-incompleta" };
  }
  const { error } = await getSupabase().from("push_subscriptions").upsert(
    {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
      active: true,
    },
    { onConflict: "endpoint" }
  );

  if (error) return { ok: false, motivo: error.message };
  return { ok: true };
}

export async function desativarNotificacoes(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await getSupabase().from("push_subscriptions").delete().eq("endpoint", endpoint);
  } catch {}
}
