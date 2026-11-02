import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Studio Associato — Gestionale Consulenti del Lavoro",
  description:
    "Piattaforma professionale per Consulenti del Lavoro: Anagrafica Aziende, Elaborazione LUL e Scadenzario Fiscale F24 / UNIEMENS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#F7F7F5] text-[#111827] selection:bg-[#111827] selection:text-white">
        {children}
      </body>
    </html>
  );
}
