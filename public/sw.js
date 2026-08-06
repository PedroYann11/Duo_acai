// Service worker do painel Duo Açaí (PWA).
// Cuida só de duas coisas: deixar o painel instalável como app e mostrar as
// notificações push de pedido novo — sem cache agressivo, pra não servir
// tela desatualizada pro dono.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// passthrough — só existe pra atender critério de instalabilidade de PWA
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let dados = { title: "Duo Açaí", body: "Você tem uma novidade no painel.", url: "/admin" };
  try {
    if (event.data) dados = { ...dados, ...event.data.json() };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(dados.title, {
      body: dados.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: dados.url || "/admin" },
      vibrate: [120, 60, 120],
      tag: "duo-pedido",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if (janela.url.includes("/admin") && "focus" in janela) {
          return janela.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
