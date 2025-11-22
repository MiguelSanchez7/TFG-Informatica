"use client";

import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";

// Países ordenados alfabéticamente (los más habituales)
const COUNTRIES = [
  "Afganistán",
  "Alemania",
  "Arabia Saudita",
  "Argelia",
  "Argentina",
  "Australia",
  "Austria",
  "Bangladés",
  "Bélgica",
  "Bolivia",
  "Brasil",
  "Bulgaria",
  "Canadá",
  "Catar",
  "Chile",
  "China",
  "Chipre",
  "Colombia",
  "Corea del Sur",
  "Costa Rica",
  "Croacia",
  "Cuba",
  "Dinamarca",
  "Ecuador",
  "Egipto",
  "Emiratos Árabes Unidos",
  "Eslovaquia",
  "Eslovenia",
  "España",
  "Estados Unidos",
  "Estonia",
  "Filipinas",
  "Finlandia",
  "Francia",
  "Georgia",
  "Grecia",
  "Guatemala",
  "Hong Kong",
  "Hungría",
  "India",
  "Indonesia",
  "Irak",
  "Irán",
  "Irlanda",
  "Israel",
  "Italia",
  "Japón",
  "Jordania",
  "Kazajistán",
  "Kenia",
  "Kuwait",
  "Letonia",
  "Lituania",
  "Luxemburgo",
  "Malasia",
  "Marruecos",
  "México",
  "Nigeria",
  "Noruega",
  "Nueva Zelanda",
  "Países Bajos",
  "Pakistán",
  "Panamá",
  "Paraguay",
  "Perú",
  "Polonia",
  "Portugal",
  "Puerto Rico",
  "Reino Unido",
  "República Checa",
  "República Dominicana",
  "Rumanía",
  "Rusia",
  "Serbia",
  "Singapur",
  "Sri Lanka",
  "Sudáfrica",
  "Suecia",
  "Suiza",
  "Tailandia",
  "Taiwán",
  "Túnez",
  "Turquía",
  "Ucrania",
  "Uruguay",
  "Venezuela",
  "Vietnam",
  "Yemen",
];

export default function ProfilePage() {
  const { user, setUser } = useAuth() as any;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // sincronizar inputs cuando cambie el usuario del contexto
  useEffect(() => {
    setFirstName(user?.name ?? "");
    setLastName(user?.surname ?? "");
    setCountry(user?.country ?? "");
  }, [user]);

  if (!user) {
    return (
      <main className="min-h-screen bg-[#020617] text-white">
        <Navbar />
        <div className="pt-28 text-center">Debes iniciar sesión</div>
      </main>
    );
  }

  const initial = user.username.charAt(0).toUpperCase();
  const levelValue = user.level ?? 1;
  const levelLabel =
    levelValue <= 1 ? "Principiante" : levelValue <= 3 ? "Intermedio" : "Avanzado";

  const fullName =
    (user.name || "") + (user.surname ? " " + user.surname : "");
  const displayName = fullName.trim() || user.username;
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("es-ES")
    : "—";

  const avatarUrl: string | null = user.avatar_url ?? null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: firstName || null,
          surname: lastName || null,
          country: country || null,
        }),
      });

      if (!res.ok) {
        let msg = "No se pudieron guardar los cambios";
        try {
          const data = await res.json();
          if (data.detail) msg = data.detail;
        } catch {
          // ignoramos
        }
        throw new Error(msg);
      }

      const updated = await res.json();
      setUser(updated);
      setMessage("Perfil guardado correctamente");
    } catch (err: any) {
      setError(err.message || "Error inesperado al guardar el perfil");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setMessage(null);
    setError(null);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData, error: urlError } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      if (urlError) {
        throw urlError;
      }

      const publicUrl = publicData.publicUrl;

      // Guardar la URL en nuestro backend
      const res = await fetch(`${API_URL}/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: publicUrl }),
      });

      if (!res.ok) {
        let msg = "No se pudo actualizar la foto de perfil";
        try {
          const data = await res.json();
          if (data.detail) msg = data.detail;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const updated = await res.json();
      setUser(updated);
      setMessage("Foto de perfil actualizada");
    } catch (err: any) {
      setError(
        err.message || "Error inesperado al subir la foto de perfil"
      );
    } finally {
      setUploadingAvatar(false);
      // para poder volver a subir el mismo archivo si se quiere
      e.target.value = "";
    }
  }

  return (
    <main className="relative min-h-screen bg-[#020617] text-[#e5e7eb]">
      <Navbar />

      {/* Fondo global */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#020617] via-[#020617] to-transparent" />
        <div className="absolute left-1/2 top-[-10rem] h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-[#0b1120]/40 to-[#1e293b]/10 blur-[120px]" />
      </div>

      <section className="pt-28 pb-20 px-4 sm:px-6 max-w-6xl mx-auto space-y-6">
        {/* Cabecera */}
        <header className="flex flex-col gap-2">
          <p className="text-xs tracking-[0.25em] uppercase text-[#64748b]">
            Cuenta
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#f9fafb]">
            Mi perfil
          </h1>
          <p className="text-sm sm:text-base text-[#94a3b8] max-w-xl">
            Gestiona tu información básica y tu perfil de inversor dentro de la
            plataforma.
          </p>
        </header>

        {/* Mensajes de estado */}
        {(message || error) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              error
                ? "border-red-500/60 bg-red-500/5 text-red-200"
                : "border-emerald-500/60 bg-emerald-500/5 text-emerald-200"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.7fr)] items-start">
          {/* Tarjeta lateral: resumen usuario */}
          <aside className="bg-[#020617]/80 border border-[#1f2937] rounded-3xl p-6 sm:p-7 shadow-sm shadow-black/40 backdrop-blur">
            {/* Avatar + badge + nombre */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div
                  className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full 
                             bg-[#e5e7eb] text-[#0f172a]
                             flex items-center justify-center 
                             text-3xl font-bold shadow-inner overflow-hidden"
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initial}</span>
                  )}
                </div>

                {/* Badge de nivel centrado */}
                <span
                    className="absolute left-1/2 -translate-x-1/2 -bottom-4
                              rounded-full bg-emerald-500 px-2 py-0.5
                              text-[10px] font-semibold uppercase tracking-[0.16em]
                              text-[#e5fdf4] shadow shadow-emerald-900/70"
                  >
                    {levelLabel}
                </span>


                {/* Botón para cambiar avatar */}
                <label
                  className="absolute -right-1 -bottom-1 h-8 w-8 rounded-full
                             bg-white text-[#020617] border border-[#cbd5e1]
                             flex items-center justify-center text-xs font-semibold
                             shadow-sm cursor-pointer hover:bg-[#e5e7eb] transition"
                >
                  {uploadingAvatar ? "…" : "✎"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>

              <div className="text-center space-y-1 mt-2">
                <p className="text-lg font-semibold text-[#f9fafb]">
                  {displayName}
                </p>
                <p className="text-xs uppercase tracking-[0.2em] text-[#64748b]">
                  @{user.username}
                </p>
              </div>
            </div>

            {/* Chips de stats */}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#1f2937] bg-[#020617] px-3 py-1.5 text-xs text-[#cbd5e1]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-medium">Nivel {levelValue}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#1f2937] bg-[#020617] px-3 py-1.5 text-xs text-[#cbd5e1]">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                <span className="font-medium">
                  {user.points ?? 0} puntos XP
                </span>
              </div>
            </div>

            {/* Datos detallados */}
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="text-[#64748b]">Correo</span>
                <span className="text-right text-[#e5e7eb] break-all">
                  {user.email}
                </span>
              </div>

              {user.name && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[#64748b]">Nombre</span>
                  <span className="text-right text-[#e5e7eb]">
                    {user.name}
                  </span>
                </div>
              )}

              {user.surname && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[#64748b]">Apellidos</span>
                  <span className="text-right text-[#e5e7eb]">
                    {user.surname}
                  </span>
                </div>
              )}

              {user.country && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[#64748b]">País</span>
                  <span className="text-right text-[#e5e7eb]">
                    {user.country}
                  </span>
                </div>
              )}

              <div className="h-px bg-gradient-to-r from-transparent via-[#111827] to-transparent my-2" />

              <div className="flex items-start justify-between gap-4">
                <span className="text-[#64748b]">Miembro desde</span>
                <span className="text-right text-[#e5e7eb] text-xs">
                  {memberSince}
                </span>
              </div>
            </div>
          </aside>

          {/* Formulario de perfil */}
          <section className="bg-[#020617]/80 border border-[#1f2937] rounded-3xl p-6 sm:p-7 shadow-sm shadow-black/40 backdrop-blur">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-[#f9fafb]">
                  Información personal
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  Estos datos se usan para personalizar tu experiencia en la
                  plataforma.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nombre, apellidos y país */}
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Nombre */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-[0.16em] text-[#64748b]">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ej. Mario"
                    className="rounded-lg bg-[#020617] border border-[#1f2937] px-3.5 py-2.5 text-sm text-[#e5e7eb] placeholder:text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition"
                  />
                </div>

                {/* Apellidos */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-[0.16em] text-[#64748b]">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ej. Martín del Cerro"
                    className="rounded-lg bg-[#020617] border border-[#1f2937] px-3.5 py-2.5 text-sm text-[#e5e7eb] placeholder:text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition"
                  />
                </div>

                {/* País (select) */}
                <div className="flex flex-col space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-[0.16em] text-[#64748b]">
                    País
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="rounded-lg bg-[#020617] border border-[#1f2937] px-3.5 py-2.5 text-sm text-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition"
                  >
                    <option value="">Selecciona un país</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="h-px bg-[#111827] my-2" />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-[#64748b]">
                  Más adelante podrás añadir objetivos de inversión, horizonte
                  temporal y preferencias de riesgo.
                </p>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-xl 
                             bg-white text-black border border-[#cbd5e1]
                             px-5 py-2.5 text-sm font-semibold 
                             shadow-sm hover:bg-[#f1f5f9] 
                             cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed 
                             transition"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
