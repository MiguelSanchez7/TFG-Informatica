import type { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";
import { demoUsers } from "@/data/mockUsers";

export const metadata: Metadata = {
  title: "Crear cuenta | TFG Inversión con IA",
  description:
    "Regístrate para guardar tu progreso financiero y acceder a rutas personalizadas.",
};

export default function RegisterPage() {
  return (
    <section className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div className="space-y-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
          Comienza gratis
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Diseña tu ruta financiera personalizada
        </h1>
        <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          Registra una cuenta para desbloquear paneles adaptativos, guardar tu progreso y
          recibir recomendaciones explicables en función de tu perfil de riesgo.
        </p>
        <div className="rounded-3xl border border-indigo-200/60 bg-indigo-50/70 p-6 text-sm text-indigo-900 shadow-inner dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-100">
          <p className="font-semibold uppercase tracking-[0.25em] text-indigo-700 dark:text-indigo-200">
            Perfiles sugeridos
          </p>
          <ul className="mt-3 space-y-2">
            {demoUsers.map((user) => (
              <li key={user.username} className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-indigo-600 shadow-sm dark:bg-indigo-500/30 dark:text-indigo-100">
                  {user.role.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{user.name}</p>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300">
                    {user.role}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <RegisterForm />
    </section>
  );
}
