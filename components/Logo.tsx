import { STORE } from "@/lib/store";

/**
 * Logo oficial da Duo (arte do cliente, arquivo em /public/logo-duo.svg):
 * garrafinha + "DUO / O açaí da garrafa" já numa imagem só, na posição
 * exata do original — evita desalinhar garrafa e texto como dois
 * elementos separados.
 * `escala` multiplica o tamanho (1 = header, 1.6 = pré-tela).
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
      <img src="/logo-duo.svg" alt={`Duo Açaí — ${STORE.tagline}`} className="logo-completo" />
    </span>
  );
}
