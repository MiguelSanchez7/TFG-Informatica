import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";
import { demoUsers } from "@/data/mockUsers";

export const metadata: Metadata = {
  title: "Iniciar sesión | TFG Inversión con IA",
  description:
    "Accede a la plataforma educativa de finanzas con los usuarios de demostración.",
};

export default function LoginPage() {
  return (
    <section className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div className="space-y-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
          Demo interactiva
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Centraliza tu progreso desde un acceso seguro
        </h1>
        <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          Este prototipo integra un flujo de autenticación local para probar la
          experiencia de onboarding. Inicia sesión con cualquiera de los perfiles
          disponibles y descubre rutas adaptadas a tu nivel: desde fundamentos de
          ahorro y budgeting hasta estrategias avanzadas con IA explicable.
        </p>
        <div className="rounded-3xl border border-indigo-200/60 bg-indigo-50/70 p-6 text-sm text-indigo-900 shadow-inner dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-100">
          <p className="font-semibold uppercase tracking-[0.25em] text-indigo-700 dark:text-indigo-200">
            Roles incluidos
          </p>
          <ul className="mt-3 space-y-2">
            {demoUsers.map((user) => (
              <li key={user.username} className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-indigo-600 shadow-sm dark:bg-indigo-500/30 dark:text-indigo-100">
                  {user.role.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {user.name}
                  </p>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300">
                    {user.role}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <LoginForm />
    </section>
  );
}
