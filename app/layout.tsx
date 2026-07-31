import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import { ProductsProvider } from "@/lib/products-context";

export const metadata: Metadata = {
  title: "Duo Açaí — O açaí da garrafa",
  description:
    "Cremoso, gelado e viciante. Peça o Duo Açaí no delivery: Maracujá, Ninho, Nutella, Pistache e Paçoca.",
  openGraph: {
    title: "Duo Açaí — O açaí da garrafa",
    description: "Cremoso • Gelado • Viciante. Peça já o seu!",
    locale: "pt_BR",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Instrument+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ProductsProvider>
          <CartProvider>{children}</CartProvider>
        </ProductsProvider>
      </body>
    </html>
  );
}
