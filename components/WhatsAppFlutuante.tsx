"use client";

import { usePathname } from "next/navigation";
import { STORE } from "@/lib/store";
import { useSettings } from "@/lib/settings-context";

/** Botão flutuante de WhatsApp, visível em todo o site (menos no /admin) */
export function WhatsAppFlutuante() {
  const pathname = usePathname();
  const { config } = useSettings();

  if (pathname?.startsWith("/admin")) return null;

  const numero = config.contact.whatsapp || STORE.whatsapp;

  return (
    <a
      className="wpp-flutuante"
      href={`https://wa.me/${numero}`}
      target="_blank"
      rel="noopener"
      aria-label="Falar no WhatsApp da Duo Açaí"
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.79 14.13c-.24.68-1.4 1.33-1.94 1.4-.5.07-1.05.1-3.03-.65-2.55-.98-4.2-3.57-4.33-3.74-.13-.17-1.03-1.37-1.03-2.62s.65-1.86.88-2.11c.23-.25.5-.31.67-.31.17 0 .33 0 .48.01.15.01.36-.06.56.43.24.58.81 2 .88 2.14.07.14.11.31.02.5-.09.19-.14.31-.28.47-.14.16-.29.36-.42.48-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.93 1.23 2.21 1.37.28.14.44.12.61-.07.17-.19.71-.83.9-1.11.19-.28.38-.24.63-.14.26.09 1.65.78 1.93.92.28.14.47.21.53.33.07.12.07.68-.17 1.36Z" />
      </svg>
    </a>
  );
}
