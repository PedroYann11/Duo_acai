import type { Metadata, Viewport } from "next";

/**
 * Metadados exclusivos do /admin: fazem o painel virar PWA instalável
 * (manifest com scope "/admin") sem afetar o site principal, que continua
 * sendo só um site normal.
 */
export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Duo Painel",
  },
};

export const viewport: Viewport = {
  themeColor: "#61174c",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
