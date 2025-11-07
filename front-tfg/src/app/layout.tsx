import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "TFG | Inversión con IA (XAI)",
  description: "Plataforma didáctica con retos históricos y explicaciones de IA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${display.variable} bg-gray-50 text-gray-900 dark:bg-[#0b1020] dark:text-gray-100`}
      >
        {/* Fondo sutil */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_-10%,rgba(79,70,229,0.20),transparent_60%)] dark:bg-[radial-gradient(60%_60%_at_50%_-10%,rgba(99,102,241,0.25),transparent_60%)]" />
        </div>

        {/* ---- NUEVO: wrapper a pantalla completa ---- */}
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            {/* main crece y empuja el Footer abajo */}
            <main className="flex-1 mx-auto w-full max-w-6xl px-5 py-10">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
