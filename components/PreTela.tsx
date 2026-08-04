"use client";

import { useEffect, useState } from "react";
import { STORE } from "@/lib/store";
import { useSettings } from "@/lib/settings-context";

/**
 * Tela de boas-vindas antes do cardápio: cliente escolhe entre pedir,
 * falar com a Duo, virar revendedor ou contratar pra evento.
 * Aparece sempre que o site abre (decisão do dono, não é "só 1ª visita").
 */
export function PreTela() {
  const [ativa, setAtiva] = useState(true);
  const { config } = useSettings();
  const numero = config.contact.whatsapp || STORE.whatsapp;

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
    <div className="pre-tela">
      <div className="pre-tela-conteudo">
        <span className="logo pre-tela-logo">
          <img src="/icone-garrafa.png" alt="" className="logo-icone" />
          <span className="logo-texto">
            DUO
            <span>O açaí da garrafa</span>
          </span>
        </span>
        <p className="pre-tela-sub">O que você quer fazer?</p>

        <button className="btn-principal" onClick={() => setAtiva(false)}>
          {"\u{1F7E3}"} Ver cardápio e pedir
        </button>
        <a
          className="pre-tela-link"
          href={linkWpp("Oi! Vim pelo site da Duo Açaí e queria falar com vocês.")}
          target="_blank"
          rel="noopener"
        >
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
          Contratar pra eventos e festas
        </a>
      </div>
    </div>
  );
}
