import { STORE } from "@/lib/store";
import { Header, MenuGrid } from "@/components/Shop";
import { StoreStatus } from "@/components/StoreStatus";
import { Hero } from "@/components/Hero";
import { HorarioTexto } from "@/components/HorarioTexto";
import { PreTela } from "@/components/PreTela";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <>
      <PreTela />
      <Header />
      <StoreStatus />

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
          <HorarioTexto />
        </p>
        <MenuGrid />
      </main>

      <footer className="footer">
        <div className="container">
          <Logo escala={1.3} className="footer-logo" />
          <p>
            <HorarioTexto />
          </p>
          <div className="footer-redes">
            <a
              href={`https://instagram.com/${STORE.instagram}`}
              target="_blank"
              rel="noopener"
              aria-label={`Instagram @${STORE.instagram}`}
            >
              <IconeInstagram />
              <span>@{STORE.instagram}</span>
            </a>
            <a
              href={`https://wa.me/${STORE.whatsapp}`}
              target="_blank"
              rel="noopener"
              aria-label="WhatsApp da Duo Açaí"
            >
              <IconeWhatsApp />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

function IconeInstagram() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconeWhatsApp() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.79 14.13c-.24.68-1.4 1.33-1.94 1.4-.5.07-1.05.1-3.03-.65-2.55-.98-4.2-3.57-4.33-3.74-.13-.17-1.03-1.37-1.03-2.62s.65-1.86.88-2.11c.23-.25.5-.31.67-.31.17 0 .33 0 .48.01.15.01.36-.06.56.43.24.58.81 2 .88 2.14.07.14.11.31.02.5-.09.19-.14.31-.28.47-.14.16-.29.36-.42.48-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.93 1.23 2.21 1.37.28.14.44.12.61-.07.17-.19.71-.83.9-1.11.19-.28.38-.24.63-.14.26.09 1.65.78 1.93.92.28.14.47.21.53.33.07.12.07.68-.17 1.36Z" />
    </svg>
  );
}
