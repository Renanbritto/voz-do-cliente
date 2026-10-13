import type { Metadata } from "next";
import { Comfortaa } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const comfortaa = Comfortaa({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-comfortaa",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://voz-do-cliente.vercel.app"),
  title: "Voz do Cliente (VoC) | RN Intelligence Analytics",
  description:
    "Inteligência de Voz do Cliente com Gemini 1.5 Flash, Structured Outputs, Diagrama de Pareto 80/20 de prejuízo financeiro e FinOps por token em tempo real.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Voz do Cliente (VoC) | RN Intelligence Analytics",
    description:
      "Transformação de avaliações não estruturadas em causas-raiz acionáveis, FinOps por token e Diagrama de Pareto 80/20 de perdas financeiras.",
    url: "https://voz-do-cliente.vercel.app",
    siteName: "Voz do Cliente • RN Intelligence",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 675,
        alt: "Voz do Cliente (VoC) • RN Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Voz do Cliente (VoC) | RN Intelligence Analytics",
    description:
      "Transformação de avaliações não estruturadas em causas-raiz acionáveis, FinOps por token e Diagrama de Pareto 80/20.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`dark ${comfortaa.variable}`}>
      <body
        className={`${comfortaa.className} font-sans min-h-screen antialiased bg-[#090d16] text-slate-100 selection:bg-rose-500/30 selection:text-white`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
