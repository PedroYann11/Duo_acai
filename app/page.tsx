import { PRODUCTS, STORE } from "@/lib/store";
import { Header, ProductCard } from "@/components/Shop";
import { Hero } from "@/components/Hero";

export default function Home() {
  return (
    <>
      <Header />

      <Hero />

      {/* Assinatura: o creme escorrendo no açaí */}
      <svg
        className="swirl"
        viewBox="0 0 1440 70"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,40 C120,70 240,10 360,25 C480,40 560,65 720,50 C880,35 960,5 1100,20 C1240,35 1340,60 1440,35 L1440,70 L0,70 Z"
          fill="var(--creme)"
        />
      </svg>

      <main className="menu container" id="cardapio">
        <h2 className="menu-title">Escolha o seu Duo</h2>
        <p className="menu-sub">
          A partir de R$ 18,90 · {STORE.openHours}
        </p>
        <div className="grid">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <span className="logo">
            DUO
            <span>O açaí da garrafa</span>
          </span>
          <p>
            {STORE.openHours} ·{" "}
            <a
              href={`https://instagram.com/${STORE.instagram}`}
              target="_blank"
              rel="noopener"
            >
              @{STORE.instagram}
            </a>{" "}
            ·{" "}
            <a
              href={`https://wa.me/${STORE.whatsapp}`}
              target="_blank"
              rel="noopener"
            >
              WhatsApp
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
