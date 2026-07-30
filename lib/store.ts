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
  openHours: "Todos os dias, 10h às 22h", // ajuste o horário real
  adminPin: "duo2026", // TROQUE esta senha do painel /admin
};

export type Product = {
  id: string;
  name: string;
  flavor: string;
  description: string;
  price: number;
  image: string;
  available: boolean;
};

export const PRODUCTS: Product[] = [
  {
    id: "maracuja",
    name: "Duo Maracujá",
    flavor: "Maracujá",
    description:
      "Açaí cremoso em camadas com creme de maracujá de verdade, com sementinhas e tudo.",
    price: 18.9,
    image: "/products/maracuja.jpg",
    available: true,
  },
  {
    id: "ninho",
    name: "Duo Ninho",
    flavor: "Leite Ninho",
    description:
      "A dupla clássica: açaí gelado marmorizado com creme de leite Ninho.",
    price: 18.9,
    image: "/products/ninho.jpg",
    available: true,
  },
  {
    id: "nutella",
    name: "Duo Nutella",
    flavor: "Nutella",
    description:
      "Açaí intenso misturado com Nutella de ponta a ponta da garrafa.",
    price: 18.9,
    image: "/products/nutella.jpg",
    available: true,
  },
  {
    id: "pistache",
    name: "Duo Pistache",
    flavor: "Pistache",
    description:
      "O queridinho: açaí com creme de pistache, cremoso e diferente de tudo.",
    price: 18.9,
    image: "/products/pistache.jpg",
    available: true,
  },
  {
    id: "pacoca",
    name: "Duo Paçoca",
    flavor: "Paçoca",
    description:
      "Açaí batido com paçoca, aquele sabor de amendoim em cada gole.",
    price: 18.9,
    image: "/products/pacoca.jpg",
    available: true,
  },
];

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
