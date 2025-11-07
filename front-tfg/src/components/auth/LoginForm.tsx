"use client";

import { FormEvent, useMemo, useState } from "react";
import { users } from "@/data/mockUsers";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [activeUser, setActiveUser] = useState<(typeof users)[number] | null>(
    null,
  );

  const credentialsMap = useMemo(() => {
    return users.reduce((map, user) => {
      map.set(user.username.toLowerCase(), user);
      return map;
    }, new Map<string, (typeof users)[number]>());
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const user = credentialsMap.get(username.trim().toLowerCase());
    if (!user || user.password !== password) {
      setStatus("error");
      setActiveUser(null);
      return;
    }

    setActiveUser(user);
    setStatus("success");
  };

  const handleReset = () => {
    setUsername("");
    setPassword("");
    setStatus("idle");
    setActiveUser(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-3xl border border-white/10 bg-white/80 p-8 shadow-xl backdrop-blur dark:border-white/5 dark:bg-[#0b132f]/80">
      <header className="space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-300">
          Acceso
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Inicia sesión en la plataforma
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Usa las credenciales de demostración para explorar el panel educativo
          de finanzas.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="username" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Usuario
          </label>
          <input
            id="username"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-white/10 dark:bg-[#111a3a] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
            placeholder="Introduce tu usuario"
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
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-white/10 dark:bg-[#111a3a] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
            placeholder="Introduce tu contraseña"
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          className="mt-2 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-100 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-indigo-400/80 dark:focus:ring-offset-[#0b1020]"
        >
          Acceder
        </button>
      </form>

      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
        <p className="font-medium text-slate-700 dark:text-slate-100">
          Usuarios de prueba disponibles
        </p>
        <ul className="grid gap-2">
          {users.map((user) => (
            <li
              key={user.username}
              className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:border-white/10 dark:bg-[#111a3a] dark:text-slate-300"
            >
              <span>{user.username}</span>
              <span>{user.password}</span>
            </li>
          ))}
        </ul>
      </div>

      {status === "success" && activeUser ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
          <p className="font-semibold">¡Bienvenido, {activeUser.name}!</p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-200/80">
            Ya puedes continuar con los retos personalizados según tu nivel de
            conocimiento financiero.
          </p>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          <p className="font-semibold">Credenciales no válidas</p>
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-200/80">
            Revisa el usuario y la contraseña. Puedes consultar los accesos de
            prueba superiores.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-3 inline-flex items-center justify-center rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-400/70 focus:ring-offset-2 focus:ring-offset-rose-50 dark:bg-rose-500 dark:hover:bg-rose-400 dark:focus:ring-rose-400/50 dark:focus:ring-offset-[#0b1020]"
          >
            Intentar de nuevo
          </button>
        </div>
      ) : null}
    </div>
  );
}
