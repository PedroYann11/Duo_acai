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
            Bem-vindo à Duo Açaí, o original açaí da garrafa. Açaí + creme que
            vão te surpreender do primeiro ao último gole. Qual vai ser o seu
            Duo?
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

/* Contorno oficial da garrafa Duo (duo_garrafa.svg do cliente): gargalo
   estreito, ombro que abre até a largura cheia e corpo em 4 gomos. */
const CORPO_TOPO =
  "M43.5 24.5H98.5C102.642 24.5 106 27.8579 106 32V46.8525C106 50.2911 108.089 53.3284 111.124 54.8555C129.192 63.9457 141.5 79.8506 141.5 104.481V133C141.5 135.314 140.953 137.433 139.665 138.966C138.39 140.483 136.325 141.5 133.125 141.5H8.875C6.04493 141.5 3.96713 140.492 2.5918 138.954C1.20886 137.408 0.5 135.284 0.5 133V104.481C0.5 83.0204 12.828 64.4283 30.9082 54.8994C33.9065 53.3192 36 50.2923 36 46.8525V32C36 27.8579 39.3579 24.5 43.5 24.5Z";

const TAMPA =
  "M32 0.5H110C112.485 0.5 114.5 2.51472 114.5 5V35C114.5 37.4853 112.485 39.5 110 39.5H32C29.5147 39.5 27.5 37.4853 27.5 35V5C27.5 2.51472 29.5147 0.5 32 0.5Z";

/* Gomos do corpo, nas medidas exatas do arquivo. Cada gomo recebe um sabor,
   de baixo pra cima; o ombro em cima fica dividido entre paçoca e açaí. */
const GOMOS = [
  { y: 142.5, h: 44, cor: "#a8c36b", camada: "c4" }, // pistache
  { y: 187.5, h: 44, cor: "#5a3a22", camada: "c3" }, // nutella
  { y: 232.5, h: 45, cor: "#f6ecda", camada: "c2" }, // ninho
  { y: 278.114, h: 53.3857, cor: "#f2c230", camada: "c1" }, // maracujá
];

/* Divisa entre paçoca e açaí, com a ondinha que dá o charme */
const DIVISA = 101;
const ACAI_COM_ONDA = `M0 18 H142 V${DIVISA} Q106.5 ${DIVISA + 7} 71 ${DIVISA} Q35.5 ${DIVISA - 7} 0 ${DIVISA} Z`;
/* mesma forma, só que esticada pra cima: é ela que cai, e a de cima recorta.
   A sobra evita que o repique da queda abra um buraco no topo da faixa. */
const ACAI_QUE_CAI = `M0 -60 H142 V${DIVISA} Q106.5 ${DIVISA + 7} 71 ${DIVISA} Q35.5 ${DIVISA - 7} 0 ${DIVISA} Z`;
/* onde o corpo da garrafa começa: é daqui que os sabores surgem, caindo */
const TOPO_CORPO = 142;

/* Garrafa Duo enchendo com os sabores, camada por camada.
   viewBox com 1 unidade de folga pra borda do traço não ser cortada. */
function BottleFill() {
  return (
    <svg
      className="bottle"
      viewBox="-1 -1 144 334"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* o recorte segue cada gomo separadamente, senão a cor vaza nos
            cantos arredondados que separam uma listra da outra */}
        <clipPath id="corpo-clip">
          <path d={CORPO_TOPO} />
          {GOMOS.map((g, i) => (
            <rect key={i} x="0.5" y={g.y} width="141" height={g.h} rx="7.5" />
          ))}
        </clipPath>
        {/* cada sabor cai do alto do corpo até o lugar dele. O trajeto para no
            começo do corpo de propósito: se passasse pelo gargalo e pelo ombro,
            pareceria que a paçoca e o açaí já tinham caído antes da vez. */}
        {GOMOS.map((g, i) => (
          <clipPath key={i} id={`queda-${i}`}>
            <rect x="0" y={TOPO_CORPO} width="142" height={g.y + g.h - TOPO_CORPO} />
          </clipPath>
        ))}
        {/* a paçoca desce pelo gargalo, como se estivesse sendo servida */}
        <clipPath id="queda-pacoca">
          <rect x="0" y="24" width="142" height={141.5 - 24} />
        </clipPath>
        <clipPath id="faixa-acai">
          <path d={ACAI_COM_ONDA} />
        </clipPath>
      </defs>

      {/* garrafa vazia */}
      <g opacity="0.5">
        <path d={CORPO_TOPO} fill="#efe8f5" />
        {GOMOS.map((g, i) => (
          <rect key={i} x="0.5" y={g.y} width="141" height={g.h} rx="7.5" fill="#efe8f5" />
        ))}
      </g>

      {/* sabores: cada um cai na sua vez, de baixo pra cima, e só aparece
          dentro da própria faixa */}
      <g clipPath="url(#corpo-clip)">
        {GOMOS.map((g, i) => (
          <g key={i} clipPath={`url(#queda-${i})`}>
            <rect
              className={`camada ${g.camada}`}
              x="0.5"
              y={g.y}
              width="141"
              height={g.h}
              fill={g.cor}
            />
          </g>
        ))}
        {/* paçoca: parte de baixo do ombro (o 5º sabor, que não cabia nos gomos) */}
        <g clipPath="url(#queda-pacoca)">
          <rect className="camada c5" x="0" y="94" width="142" height="47.5" fill="#d8b98a" />
        </g>
        {/* açaí: gargalo e topo do ombro, com a ondinha no encontro com a paçoca */}
        <g clipPath="url(#faixa-acai)">
          <path className="camada c6" d={ACAI_QUE_CAI} fill="#4a1140" />
        </g>
        {/* brilho do plástico */}
        <rect x="12" y="55" width="9" height="270" fill="#ffffff" opacity="0.2" rx="4" />
      </g>

      {/* contorno do gargalo e ombro */}
      <path d={CORPO_TOPO} fill="none" stroke="var(--lilas)" strokeWidth="1.4" />

      {/* gomos do corpo */}
      {GOMOS.map((g, i) => (
        <rect
          key={i}
          x="0.5"
          y={g.y}
          width="141"
          height={g.h}
          rx="7.5"
          fill="none"
          stroke="var(--lilas)"
          strokeWidth="1.4"
        />
      ))}

      {/* tampa roxa */}
      <path d={TAMPA} fill="var(--roxo)" stroke="var(--lilas)" strokeWidth="1.4" />
    </svg>
  );
}
