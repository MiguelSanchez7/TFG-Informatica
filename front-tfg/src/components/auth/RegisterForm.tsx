"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";

const roleOptions = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
];

const PASSWORD_MIN_LENGTH = 8;

type RegisterStatus = "idle" | "success" | "error";

export default function RegisterForm() {
  const { registerUser, initialized } = useAuthContext();
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    role: roleOptions[0]?.value ?? "principiante",
  });
  const [status, setStatus] = useState<RegisterStatus>("idle");
  const [message, setMessage] = useState<string>("");

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (status !== "idle") {
      setStatus("idle");
      setMessage("");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!initialized) {
      return;
    }

    if (formData.password.length < PASSWORD_MIN_LENGTH) {
      setStatus("error");
      setMessage(
        `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres para garantizar una mayor seguridad.`,
      );
      return;
    }

    if (!formData.name.trim()) {
      setStatus("error");
      setMessage("Introduce tu nombre para personalizar la experiencia.");
      return;
    }

    const result = registerUser({
      name: formData.name.trim(),
      username: formData.username.trim(),
      password: formData.password,
      role: formData.role,
    });

    if (!result.success) {
      setStatus("error");
      setMessage(result.error);
      return;
    }

    setStatus("success");
    setMessage("Tu cuenta se ha creado correctamente. Ya puedes iniciar sesión.");
    setFormData({
      name: "",
      username: "",
      password: "",
      role: roleOptions[0]?.value ?? "principiante",
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-3xl border border-white/10 bg-white/80 p-8 shadow-xl backdrop-blur dark:border-white/5 dark:bg-[#0b132f]/80">
      <header className="space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-300">
          Registro
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Crea una cuenta gratuita
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Guarda tu avance y recibe retos personalizados adaptados a tu perfil financiero.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Nombre y apellidos
          </label>
          <input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-white/10 dark:bg-[#111a3a] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
            placeholder="Introduce tu nombre completo"
            autoComplete="name"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="username" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Usuario
          </label>
          <input
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-white/10 dark:bg-[#111a3a] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
            placeholder="Elige un nombre de usuario"
            autoComplete="username"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-white/10 dark:bg-[#111a3a] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
            placeholder="Crea una contraseña segura"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="role" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Nivel de experiencia
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-white/10 dark:bg-[#111a3a] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={!initialized}
          className="mt-2 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-indigo-400/80 dark:focus:ring-offset-[#0b1020]"
        >
          {initialized ? "Crear cuenta" : "Preparando formulario..."}
        </button>
      </form>

      <div className="rounded-2xl border border-indigo-200/60 bg-indigo-50/70 p-4 text-sm text-indigo-900 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-100">
        <p className="font-semibold">¿Ya tienes cuenta?</p>
        <p className="mt-1 text-xs text-indigo-800 dark:text-indigo-200/80">
          Accede con tu usuario y continúa con tus retos guardados.
        </p>
        <Link
          href="/login"
          className="mt-3 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-indigo-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-indigo-400/60 dark:focus:ring-offset-[#0b1020]"
        >
          Iniciar sesión
        </Link>
      </div>

      {status === "success" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
          <p className="font-semibold">Registro completado</p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-200/80">
            {message}
          </p>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          <p className="font-semibold">No hemos podido crear tu cuenta</p>
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-200/80">{message}</p>
        </div>
      ) : null}
    </div>
  );
}
