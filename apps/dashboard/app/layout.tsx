import { Outfit } from "next/font/google";

import "./globals.css";

const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = { title: "Painel · Vitrio", robots: { index: false, follow: false } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${sans.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
