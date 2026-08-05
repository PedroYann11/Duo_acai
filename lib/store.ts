// ============================================================
// CONFIGURAÇÃO DA LOJA — edite aqui preços, produtos e entrega
// (na Parte 2 isso migra para o Supabase e vira editável no admin)
// ============================================================

export const STORE = {
  name: "Duo Açaí",
  tagline: "O açaí da garrafa",
  whatsapp: "5588992615069", // número que recebe os pedidos
  instagram: "duoacai_ofc",
  deliveryFee: 5.0, // R$ — ajuste conforme a taxa real
  minOrder: 0, // pedido mínimo em R$ (0 = sem mínimo)
  openHours: "Todos os dias, exceto terça-feira, das 16:00 às 22:00",
  adminPin: "duo2026", // TROQUE esta senha do painel /admin (modo local)

  // ---- Pix da loja (para o QR code do checkout) ----
  // Espelha o que está salvo no painel (aba Loja > Contato e Pix).
  // Se deixar vazio (""), o site não mostra o QR e o cliente paga na entrega.
  pixKey: "88999938001",
  pixName: "DUO ACAI", // nome do recebedor, sem acento, máx 25 letras
  pixCity: "CRATO", // cidade do recebedor, máx 15 letras
};

export type Product = {
  id: string;
  name: string;
  flavor: string;
  description: string;
  price: number;
  image: string;
  available: boolean;
  highlightLabel?: string | null;
};

export const PRODUCTS: Product[] = [
  {
    id: "maracuja",
    name: "Duo Maracujá",
    flavor: "Maracujá",
    description:
      "A combinação perfeita entre o açaí cremoso da DUO e um creme de maracujá intenso, preparado com a própria fruta para garantir sabor autêntico, frescor e equilíbrio entre o doce e o cítrico. Uma experiência refrescante, marcante e simplesmente viciante.",
    price: 18.9,
    image: "/products/maracuja.jpg",
    available: true,
  },
  {
    id: "ninho",
    name: "Duo Ninho",
    flavor: "Leite Ninho",
    description:
      "A combinação perfeita de açaí intenso com creme de ninho ultra cremoso. Camadas que se encontram e entregam uma experiência simplesmente viciante.",
    price: 18.9,
    image: "/products/ninho.jpg",
    available: true,
  },
  {
    id: "nutella",
    name: "Duo Nutella",
    flavor: "Nutella",
    description:
      "Açaí intenso, creme de Nutella cremoso e uma combinação que transforma cada gole em puro prazer.",
    price: 18.9,
    image: "/products/nutella.jpg",
    available: true,
  },
  {
    id: "pistache",
    name: "Duo Pistache",
    flavor: "Pistache",
    description:
      "Açaí intenso, creme de pistache cremoso com pedaços crocantes que transformam cada gole em uma explosão de sabor.",
    price: 19.9,
    image: "/products/pistache.jpg",
    available: true,
  },
  {
    id: "pacoca",
    name: "Duo Paçoca",
    flavor: "Paçoca",
    description:
      "A combinação perfeita entre o açaí cremoso e o sabor marcante da paçoca. Camadas generosas que misturam o geladinho do açaí com a textura e o doce equilibrado do amendoim, criando uma experiência única.",
    price: 18.9,
    image: "/products/pacoca.jpg",
    available: true,
  },
];

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
