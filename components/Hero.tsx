"use client";

import { useEffect, useRef } from "react";

/**
 * Hero com parallax suave + garrafinha Duo sendo enchida
 * com os sabores, camada por camada (CSS puro, leve).
 */
export function Hero() {
  const glowRef = useRef<HTMLDivElement>(null);
  const bottleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduz) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (glowRef.current)
          glowRef.current.style.transform = `translateY(${y * 0.35}px)`;
        if (bottleRef.current)
          bottleRef.current.style.transform = `translateY(${y * 0.15}px)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="hero">
      <div className="hero-glow" ref={glowRef} aria-hidden="true" />
      <div className="hero-inner hero-duas">
        <div className="hero-texto">
          <span className="hero-eyebrow">Cremoso • Gelado • Viciante</span>
          <h1>
            O açaí <em>da garrafa</em>
          </h1>
          <p>
            Açaí cremoso em camadas com os cremes mais pedidos, direto na
            garrafa e na sua porta. Escolhe o sabor, o resto é com a gente.
          </p>
          <a href="#cardapio" className="hero-cta">
            Ver cardápio
          </a>
        </div>

        <div className="hero-garrafa" ref={bottleRef} aria-hidden="true">
          <BottleFill />
        </div>
      </div>
    </section>
  );
}

/* Garrafinha SVG (formato "leiteira" 300ml, quadrada) enchendo com os 5 sabores + açaí por cima */
function BottleFill() {
  return (
    <svg
      className="bottle"
      viewBox="0 0 140 300"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id="corpo-clip">
          {/* funil contínuo da tampa até o corpo, do mesmo tamanho da camada de açaí (a de cima) */}
          <path d="M41 32 Q26 60 24 87 L24 257 Q24 274 38 276 L102 276 Q116 274 116 257 L116 87 Q114 60 99 32 Z" />
        </clipPath>
      </defs>

      {/* camadas dos sabores (dentro do clip do corpo); a de cima (açaí) ocupa exatamente o funil */}
      <g clipPath="url(#corpo-clip)">
        {/* vidro vazio */}
        <rect x="24" y="32" width="92" height="244" fill="#efe8f5" opacity="0.5" />
        {/* cada camada tem 34px e "cai" na sua vez; a última (mais no fundo) sobra até a base */}
        <rect className="camada c1" x="24" y="223" width="92" height="60" fill="#f2c230" />
        <rect className="camada c2" x="24" y="189" width="92" height="34" fill="#f6ecda" />
        <rect className="camada c3" x="24" y="155" width="92" height="34" fill="#5a3a22" />
        <rect className="camada c4" x="24" y="121" width="92" height="34" fill="#a8c36b" />
        <rect className="camada c5" x="24" y="87" width="92" height="34" fill="#d8b98a" />
        <rect className="camada c6" x="24" y="32" width="92" height="55" fill="#4a1140" />
        {/* ondinha no topo da última camada */}
        <g className="camada c6">
          <path
            d="M24 87 Q46 81 70 87 T116 87 L116 82 Q94 88 70 82 T24 82 Z"
            fill="#4a1140"
          />
        </g>
        {/* brilho do vidro */}
        <rect x="31" y="32" width="7" height="244" fill="#ffffff" opacity="0.22" rx="4" />
      </g>

      {/* contorno: funil contínuo da tampa pro corpo quadrado, terminando junto com a camada de açaí */}
      <path
        d="M41 32 Q26 60 24 87 L24 257 Q24 274 38 276 L102 276 Q116 274 116 257 L116 87 Q114 60 99 32"
        fill="none"
        stroke="var(--lilas)"
        strokeWidth="2.5"
        opacity="0.8"
      />

      {/* gomos: anel na junção do ombro com o corpo, mais 2 aneis no corpo reto */}
      <g stroke="var(--lilas)" strokeWidth="1.6" opacity="0.45">
        <line x1="24" y1="87" x2="116" y2="87" />
        <line x1="24" y1="144" x2="116" y2="144" />
        <line x1="24" y1="200" x2="116" y2="200" />
      </g>

      {/* tampa: roxa, como a garrafa real; desenhada por cima pra "tampar" a garrafa sem folga */}
      <rect x="41" y="0" width="58" height="36" rx="8" fill="var(--roxo)" stroke="var(--lilas)" strokeWidth="1.2" opacity="0.95" />
      <rect x="41" y="26" width="58" height="1.6" fill="var(--acai)" opacity="0.5" />

      {/* rótulo DUO: ícone da garrafa + nome, no gomo do meio */}
      <circle cx="70" cy="172" r="26" fill="#fffdf8" opacity="0.97" />
      <circle cx="70" cy="172" r="26" fill="none" stroke="var(--roxo)" strokeWidth="1" opacity="0.25" />
      <image href="/icone-garrafa.png" x="57" y="149" width="26" height="22" />
      <text
        x="70"
        y="184"
        textAnchor="middle"
        fontFamily="Bricolage Grotesque, sans-serif"
        fontWeight="800"
        fontSize="12"
        fill="#61174c"
      >
        DUO
      </text>
      <text
        x="70"
        y="193"
        textAnchor="middle"
        fontFamily="Instrument Sans, sans-serif"
        fontWeight="700"
        fontSize="6"
        letterSpacing="0.5"
        fill="#7a5a72"
      >
        AÇAÍ
      </text>
    </svg>
  );
}
