import { STORE } from "@/lib/store";

/**
 * Logo da Duo: ícone da garrafa + "DUO" com a assinatura embaixo.
 * A assinatura é distribuída letra a letra (flex space-between) pra ocupar
 * exatamente a mesma largura do "DUO", igual à logo oficial.
 * `escala` multiplica todos os tamanhos (1 = header, 1.6 = pré-tela).
 */
export function Logo({
  escala = 1,
  className = "",
}: {
  escala?: number;
  className?: string;
}) {
  return (
    <span
      className={`logo ${className}`}
      style={{ "--logo-escala": escala } as React.CSSProperties}
    >
      <img src="/icone-garrafa.png" alt="" className="logo-icone" />
      <span className="logo-texto">
        <span className="logo-titulo">DUO</span>
        <span className="logo-tagline" aria-label={STORE.tagline}>
          {"O AÇAÍ DA GARRAFA".split("").map((letra, i) => (
            <span key={i} aria-hidden="true">
              {letra === " " ? " " : letra}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
