"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { STORE } from "@/lib/store";
import { estiloTema, useSettings } from "@/lib/settings-context";

/**
 * Tela de boas-vindas antes do cardápio: cliente escolhe entre pedir,
 * falar com a Duo, virar revendedor ou contratar pra evento.
 * Aparece sempre que o site abre — exceto logo depois de finalizar um
 * pedido, quando "Voltar ao cardápio" marca duo-pular-pretela pra não
 * repetir a pergunta pra quem acabou de comprar.
 */
export function PreTela() {
  const [ativa, setAtiva] = useState(true);
  const { config } = useSettings();
  const numero = config.contact.whatsapp || STORE.whatsapp;

  useEffect(() => {
    if (sessionStorage.getItem("duo-pular-pretela")) {
      sessionStorage.removeItem("duo-pular-pretela");
      setAtiva(false);
    }
  }, []);

  useEffect(() => {
    if (!ativa) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [ativa]);

  if (!ativa) return null;

  const linkWpp = (mensagem: string) =>
    `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;

  return (
    <div
      className="pre-tela"
      style={estiloTema(config.temas.preTela) as CSSProperties}
    >
      <div className="pre-tela-topo">
        <span className="logo pre-tela-logo">
          <img src="/icone-garrafa.png" alt="" className="logo-icone" />
          <span className="logo-texto">
            DUO
            <span>O açaí da garrafa</span>
          </span>
        </span>
        <p className="pre-tela-sub">O que você quer fazer?</p>

        <button
          className="btn-principal pre-tela-cta"
          onClick={() => setAtiva(false)}
        >
          <IconeMenu /> Ver cardápio e pedir
        </button>
      </div>

      <svg
        className="pre-tela-swirl"
        viewBox="0 0 1440 70"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,40 C120,70 240,10 360,25 C480,40 560,65 720,50 C880,35 960,5 1100,20 C1240,35 1340,60 1440,35 L1440,70 L0,70 Z"
          fill="var(--creme)"
        />
      </svg>

      <div className="pre-tela-baixo">
        <a
          className="pre-tela-link"
          href={linkWpp("Oi! Vim pelo site da Duo Açaí e queria falar com vocês.")}
          target="_blank"
          rel="noopener"
        >
          <span className="pre-tela-link-icone">
            <IconeWhatsApp />
          </span>
          Falar com a Duo no WhatsApp
        </a>
        <a
          className="pre-tela-link"
          href={linkWpp(
            "Oi! Vi o site da Duo Açaí e tenho interesse em ser revendedor(a). Pode me passar mais informações?"
          )}
          target="_blank"
          rel="noopener"
        >
          <span className="pre-tela-link-icone">
            <IconeMaleta />
          </span>
          Quero ser revendedor(a) Duo
        </a>
        <a
          className="pre-tela-link"
          href={linkWpp(
            "Oi! Vi o site da Duo Açaí e queria saber sobre contratar vocês pra um evento ou festa."
          )}
          target="_blank"
          rel="noopener"
        >
          <span className="pre-tela-link-icone">
            <IconePresente />
          </span>
          Contratar pra eventos e festas
        </a>
      </div>
    </div>
  );
}

function IconeMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function IconeWhatsApp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.79 14.13c-.24.68-1.4 1.33-1.94 1.4-.5.07-1.05.1-3.03-.65-2.55-.98-4.2-3.57-4.33-3.74-.13-.17-1.03-1.37-1.03-2.62s.65-1.86.88-2.11c.23-.25.5-.31.67-.31.17 0 .33 0 .48.01.15.01.36-.06.56.43.24.58.81 2 .88 2.14.07.14.11.31.02.5-.09.19-.14.31-.28.47-.14.16-.29.36-.42.48-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.93 1.23 2.21 1.37.28.14.44.12.61-.07.17-.19.71-.83.9-1.11.19-.28.38-.24.63-.14.26.09 1.65.78 1.93.92.28.14.47.21.53.33.07.12.07.68-.17 1.36Z" />
    </svg>
  );
}

function IconeMaleta() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <path d="M2 13h20" />
    </svg>
  );
}

function IconePresente() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="13" rx="1" />
      <path d="M3 8h18M12 8v13" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}
