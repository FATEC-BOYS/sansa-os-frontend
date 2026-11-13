import type { Metadata } from "next";
import "./globals.css";
import "./radar.css";
import "./whatsapp.css";
import "./sales.css";
import "./email.css";

export const metadata: Metadata = {
  title: "SANSA OS — Oficina Digital",
  description: "Painel operacional da SANSA Oficina Digital"
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
