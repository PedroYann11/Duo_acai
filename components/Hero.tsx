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
          <span className="garrafa-legenda">todos os sabores, uma garrafa</span>
        </div>
      </div>
    </section>
  );
}

/* Garrafinha SVG enchendo com os 5 sabores + açaí por cima */
function BottleFill() {
  return (
    <svg
      className="bottle"
      viewBox="0 0 140 300"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id="corpo-clip">
          {/* corpo da garrafa com ombros arredondados */}
          <path d="M35 80 Q35 68 47 66 L93 66 Q105 68 105 80 L105 262 Q105 274 93 276 L47 276 Q35 274 35 262 Z" />
        </clipPath>
      </defs>

      {/* tampa */}
      <rect x="48" y="18" width="44" height="20" rx="5" fill="#6d2a91" />
      <rect x="48" y="24" width="44" height="3" fill="#5a2178" opacity="0.6" />
      {/* gargalo */}
      <rect x="55" y="38" width="30" height="28" rx="4" fill="#e9e2f2" opacity="0.55" />

      {/* camadas dos sabores (dentro do clip do corpo) */}
      <g clipPath="url(#corpo-clip)">
        {/* vidro vazio */}
        <rect x="35" y="66" width="70" height="210" fill="#efe8f5" opacity="0.5" />
        {/* cada camada tem 35px e "cai" na sua vez */}
        <rect className="camada c1" x="35" y="241" width="70" height="35" fill="#f2c230" />
        <rect className="camada c2" x="35" y="206" width="70" height="35" fill="#f6ecda" />
        <rect className="camada c3" x="35" y="171" width="70" height="35" fill="#5a3a22" />
        <rect className="camada c4" x="35" y="136" width="70" height="35" fill="#a8c36b" />
        <rect className="camada c5" x="35" y="101" width="70" height="35" fill="#d8b98a" />
        <rect className="camada c6" x="35" y="66" width="70" height="35" fill="#4a1140" />
        {/* ondinhas entre camadas */}
        <g className="camada c6">
          <path
            d="M35 101 Q52 95 70 101 T105 101 L105 96 Q88 102 70 96 T35 96 Z"
            fill="#4a1140"
          />
        </g>
        {/* brilho do vidro */}
        <rect x="42" y="66" width="8" height="210" fill="#ffffff" opacity="0.22" rx="4" />
      </g>

      {/* contorno do corpo + gomos */}
      <path
        d="M35 80 Q35 68 47 66 L93 66 Q105 68 105 80 L105 262 Q105 274 93 276 L47 276 Q35 274 35 262 Z"
        fill="none"
        stroke="#c7a3dc"
        strokeWidth="2.5"
        opacity="0.8"
      />
      <g stroke="#c7a3dc" strokeWidth="1.4" opacity="0.35">
        <line x1="37" y1="120" x2="103" y2="120" />
        <line x1="37" y1="160" x2="103" y2="160" />
        <line x1="37" y1="200" x2="103" y2="200" />
        <line x1="37" y1="240" x2="103" y2="240" />
      </g>

      {/* rótulo DUO */}
      <circle cx="70" cy="175" r="27" fill="#fffdf8" opacity="0.95" />
      <text
        x="70"
        y="172"
        textAnchor="middle"
        fontFamily="Bricolage Grotesque, sans-serif"
        fontWeight="800"
        fontSize="16"
        fill="#61174c"
      >
        DUO
      </text>
      <text
        x="70"
        y="184"
        textAnchor="middle"
        fontFamily="Instrument Sans, sans-serif"
        fontWeight="600"
        fontSize="5"
        fill="#7a5a72"
        textLength="38"
        lengthAdjust="spacingAndGlyphs"
      >
        O AÇAÍ DA GARRAFA
      </text>
    </svg>
  );
}
