// Máscaras de formatação para inputs (cliente e painel).

/** Formata telefone brasileiro conforme digita: (88) 9 9271-7158 */
export function mascaraTelefone(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 7)
    return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3)}`;
  // 8 dígitos após o DDD → (XX) 9 XXXX-XXXX
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

/** Só os dígitos do telefone (para salvar/enviar) */
export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

const MINUSCULAS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "a",
  "o",
]);

/** Primeira letra de cada palavra em maiúscula (respeita "de", "da"...) */
export function capitalizarNome(valor: string): string {
  return valor
    .toLowerCase()
    .split(" ")
    .map((palavra, i) => {
      if (i > 0 && MINUSCULAS.has(palavra)) return palavra;
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(" ");
}

/** Capitaliza no blur (não atrapalha a digitação) */
export function capitalizarEndereco(valor: string): string {
  return capitalizarNome(valor.trim());
}
