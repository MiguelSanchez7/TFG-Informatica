"use client";

// src/app/register/page.tsx
// Formulario de registro que usa el AuthContext para crear usuarios reales en la API.
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type Rol = "alumno" | "profesor";

const initialState = {
  nombre: "",
  password: "",
  rol: "alumno" as Rol,
};

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(form.nombre, form.password, form.rol);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#131a2e]">
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Crea un usuario real que se guardará en PostgreSQL mediante Prisma.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="label" htmlFor="nombre">
            Nombre de usuario
          </label>
          <input
            id="nombre"
            name="nombre"
            className="input"
            required
            value={form.nombre}
            onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            minLength={6}
            required
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          />
        </div>

        <div>
          <label className="label" htmlFor="rol">
            Rol
          </label>
          <select
            id="rol"
            name="rol"
            className="input"
            value={form.rol}
            onChange={(e) => setForm((prev) => ({ ...prev, rol: e.target.value as Rol }))}
          >
            <option value="alumno">Alumno</option>
            <option value="profesor">Profesor</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Creando cuenta..." : "Registrarme"}
        </button>
      </form>
    </section>
  );
}
