export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-gray-200/70 bg-white/60 backdrop-blur dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mx-auto max-w-6xl px-5 py-8 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p>© {year} TFG — Ingeniería Informática</p>
          <p className="opacity-80">Uso educativo. No es asesoramiento financiero.</p>
        </div>
      </div>
    </footer>
  );
}
