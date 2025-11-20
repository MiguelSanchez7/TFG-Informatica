// src/app/login/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setMessageType(null);

    try {
      const user = await loginUser(email, password);
      setMessage(`Inicio de sesión correcto. Bienvenido, ${user.username}.`);
      setMessageType("success");

      // Guardar usuario globalmente y redirigir al inicio
      login(user);
      setTimeout(() => {
        router.push("/");
      }, 800);
    } catch (err: any) {
      setMessage(err.message || "Ha ocurrido un error en el inicio de sesión");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen font-sans tracking-tight bg-[#020617] text-[#e5e7eb]">
      {/* Fondo difuminado similar */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-8rem] h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-[#0a0f1f]/40 to-[#1e293b]/25 blur-[90px]" />
        <div className="absolute right-[-4rem] bottom-[-4rem] h-[18rem] w-[18rem] rounded-full bg-gradient-to-tr from-[#111827]/30 to-[#0f172a]/40 blur-[90px]" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
        {/* Cabecera con volver */}
        <header className="flex items-center justify-between mb-10">
          <div>
            <p className="text-[11px] tracking-[0.25em] uppercase text-[#64748b]">
              TFG · Plataforma educativa con IA
            </p>
            <h1 className="mt-2 text-xl font-semibold text-[#e5e7eb]">
              Inicia sesión
            </h1>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#cbd5e1] hover:text-white transition-colors"
          >
            <span className="text-xs">←</span> Volver al inicio
          </Link>
        </header>

        {/* Contenido centrado */}
        <div className="flex flex-1 flex-col items-center justify-center pb-10">
          <div
            className="w-full max-w-md rounded-2xl border border-[#1f2933]
                       bg-[#020617]/70 backdrop-blur-sm shadow-[0_18px_45px_rgba(15,23,42,0.65)]
                       px-7 py-8"
          >
            <h2 className="text-lg font-semibold text-[#e5e7eb]">
              Accede a tu cuenta
            </h2>
            <p className="mt-1 text-sm text-[#94a3b8]">
              Continúa donde lo dejaste con tus retos, explicaciones XAI y escenarios de riesgo.
            </p>

            {/* Mensaje de estado */}
            {message && (
              <div
                className={`mt-5 rounded-md border px-3 py-2 text-sm ${
                  messageType === "success"
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                    : "border-rose-500/60 bg-rose-500/10 text-rose-200"
                }`}
              >
                {message}
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="text-xs font-medium uppercase tracking-[0.16em] text-[#9ca3af]"
                >
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-[#1f2937] bg-[#020617]/60 px-3 py-2.5 text-sm
                             text-[#e5e7eb] placeholder:text-[#4b5563] outline-none
                             focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]"
                  placeholder="tucorreo@ejemplo.com"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="text-xs font-medium uppercase tracking-[0.16em] text-[#9ca3af]"
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-[#1f2937] bg-[#020617]/60 px-3 py-2.5 text-sm
                             text-[#e5e7eb] placeholder:text-[#4b5563] outline-none
                             focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]"
                  placeholder="Tu contraseña"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 inline-flex w-full items-center justify-center rounded-md
                           border border-[#1f2937] bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#020617]
                           px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.14em]
                           text-[#e5e7eb] shadow-sm
                           hover:from-[#111827] hover:via-[#020617] hover:to-[#000000]
                           disabled:opacity-60 disabled:cursor-not-allowed
                           transition-all duration-200"
              >
                {loading ? "Verificando..." : "Iniciar sesión"}
              </button>
            </form>

            <p className="mt-5 text-xs text-[#6b7280]">
              ¿Aún no tienes cuenta?{" "}
              <Link href="/register" className="text-[#e5e7eb] hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
