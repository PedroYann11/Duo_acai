// Processa a foto no próprio navegador antes do upload:
// corta pelo centro na proporção 4:5 e redimensiona para 640x800 (JPEG).
// Assim toda foto do cardápio sai padronizada, venha do celular ou do PC.

const LARGURA = 640;
const ALTURA = 800;

export async function processarFoto(file: File): Promise<Blob> {
  const img = await carregarImagem(file);

  const alvo = LARGURA / ALTURA; // 0.8
  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;

  if (img.width / img.height > alvo) {
    // imagem muito larga: corta as laterais
    sw = Math.round(img.height * alvo);
    sx = Math.round((img.width - sw) / 2);
  } else {
    // imagem muito alta: corta topo/baixo
    sh = Math.round(img.width / alvo);
    sy = Math.round((img.height - sh) / 2);
  }

  const canvas = document.createElement("canvas");
  canvas.width = LARGURA;
  canvas.height = ALTURA;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, LARGURA, ALTURA);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao processar"))),
      "image/jpeg",
      0.87
    );
  });
}

function carregarImagem(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem"));
    };
    img.src = url;
  });
}
