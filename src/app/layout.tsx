import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Cinzel, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bebas = Bebas_Neue({ variable: "--font-bebas", weight: "400", subsets: ["latin"] });
const cinzel = Cinzel({ variable: "--font-cinzel", weight: ["500", "700", "900"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "THE VERDICT — VISTA, NMAMIT",
  description: "VISTA presents THE VERDICT. Three battles. One verdict. 16–17 October, APJ Block, NMAMIT.",
};

export const viewport: Viewport = { themeColor: "#060509" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable} ${cinzel.variable} h-full antialiased`}>
      <body className="grain min-h-full flex flex-col">{children}</body>
    </html>
  );
}
