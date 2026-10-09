import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Cinzel, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bebas = Bebas_Neue({ variable: "--font-bebas", weight: "400", subsets: ["latin"] });
const cinzel = Cinzel({ variable: "--font-cinzel", weight: ["500", "700", "900"], subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://verdict-vista.vercel.app"), // your real deployed URL
  title: "THE VERDICT by VISTA",
  description: "VISTA presents THE VERDICT. Three battles. One verdict. 16–17 October, APJ Block, NMAMIT.",
  openGraph: {
    title: "THE VERDICT by VISTA",
    description: "A Competitive Simulation Summit. Three battles. One verdict. 16–17 October, APJ Block, NMAMIT.",
    url: "/",
    siteName: "THE VERDICT",
    images: [{ url: "/og.jpg", width: 1280, height: 1600, alt: "THE VERDICT – A Competitive Simulation Summit" }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "THE VERDICT by VISTA",
    description: "A Competitive Simulation Summit. 16–17 October, APJ Block, NMAMIT.",
    images: ["/og.jpg"],
  },
};
export const viewport: Viewport = { themeColor: "#060509" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable} ${cinzel.variable} h-full antialiased`}>
      <body className="grain min-h-full flex flex-col">{children}</body>
    </html>
  );
}
