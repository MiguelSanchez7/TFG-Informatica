// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

export const metadata: Metadata = {
  title: "TFG · Plataforma educativa con IA",
  description: "Plataforma didáctica para aprender a invertir con IA explicativa y generativa.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-[#020617]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
