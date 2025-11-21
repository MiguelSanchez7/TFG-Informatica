"use client";

import { useState } from "react";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../lib/api";

export default function ProfilePage() {
  const { user, setUser } = useAuth() as any;

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [country, setCountry] = useState(user?.country ?? "");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!user) {
    return (
      <main className="min-h-screen bg-[#020617] text-white">
        <Navbar />
        <div className="pt-28 text-center">Debes iniciar sesión</div>
      </main>
    );
  }

  const initial = user.username.charAt(0).toUpperCase();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName || null,
          country: country || null,
        }),
      });

      if (!res.ok) throw new Error("No se pudieron guardar los cambios");

      const updated = await res.json();
      setUser(updated);
      setMessage("Perfil guardado correctamente");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-[#020617] text-[#e5e7eb]">
      <Navbar />

      {/* Fondo bonito */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10rem] h-[26rem] w-[26rem] 
                        -translate-x-1/2 rounded-full 
                        bg-gradient-to-tr from-[#0a0f1f]/30 to-[#1e293b]/20 blur-[100px]" />
      </div>

      <section className="pt-32 px-6 pb-20 max-w-4xl mx-auto">

        {/* Título */}
        <h1 className="text-4xl font-bold mb-8">Mi perfil</h1>

        <div className="grid md:grid-cols-[1fr_2fr] gap-10">

          {/* Tarjeta lateral */}
          <div className="bg-[#0f172a]/60 border border-[#1f2937] p-6 rounded-2xl text-center space-y-4">
            <div className="w-24 h-24 mx-auto rounded-full bg-[#1e293b] 
                            flex items-center justify-center text-3xl font-bold">
              {initial}
            </div>

            <p className="text-lg font-semibold mt-4">{user.username}</p>
            <p className="text-sm text-[#94a3b8]">{user.email}</p>

            <div className="pt-4 space-y-2 text-sm">
              <p>Puntos: <span className="font-semibold">{user.points}</span></p>
              <p>Nivel: <span className="font-semibold">{user.level}</span></p>
            </div>
          </div>

          {/* Formulario */}
          <form
            onSubmit={handleSubmit}
            className="bg-[#0f172a]/60 border border-[#1f2937] 
                       p-6 rounded-2xl space-y-5"
          >
            <h2 className="text-xl font-semibold">Información personal</h2>

            {/* Nombre completo */}
            <div className="flex flex-col">
              <label className="mb-1 text-[#94a3b8]">Nombre completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-[#020617] border border-[#1f2937] px-3 py-2 rounded-md"
              />
            </div>

            {/* País */}
            <div className="flex flex-col">
              <label className="mb-1 text-[#94a3b8]">País</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="bg-[#020617] border border-[#1f2937] px-3 py-2 rounded-md"
              />
            </div>

            {message && (
              <p className="text-sm text-[#cbd5e1]">{message}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="bg-[#1e293b] border border-[#334155] px-4 py-2 rounded-md 
                         hover:bg-[#334155] transition font-medium"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>

        </div>
      </section>
    </main>
  );
}
