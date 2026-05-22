import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MedRoute — Votre GPS du parcours de soin",
  description:
    "Décrivez vos symptômes, obtenez un parcours de soin personnalisé avec les bons spécialistes dans le bon ordre.",
  openGraph: {
    title: "MedRoute",
    description: "Votre GPS du parcours de soin",
    siteName: "MedRoute",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        {children}
      </body>
    </html>
  );
}
