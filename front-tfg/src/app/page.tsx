export default function Home() {
  return (
    <section className="grid gap-10">
      {/* HERO */}
      <div className="grid items-center gap-8 sm:grid-cols-2">
        <div>
          <h1 className="h1 text-brand-700 dark:text-white">
            IA explicativa y generativa para decidir mejor
          </h1>
          <p className="lead mt-4">
            Entrena con retos históricos, entiende las señales con XAI
            (SHAP/contrafactuales) y practica gestión de riesgo en un entorno seguro.
          </p>

          <div className="mt-6 flex gap-3">
            <a href="/about" className="btn-primary">Objetivos del TFG</a>
            <a href="#demo" className="btn-ghost">Ver demo</a>
          </div>
        </div>

        <div className="card">
          <div className="aspect-[16/10] w-full rounded-xl bg-gradient-to-tr from-brand-100 to-white dark:from-white/10 dark:to-white/[0.06]" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Aquí irá el gráfico OHLCV con overlays de atención/SHAP.
          </p>
        </div>
      </div>

      {/* FEATURES */}
      <div className="grid gap-4 sm:grid-cols-3" id="demo">
        {[
          {
            title: "Retos históricos",
            desc: "Decide comprar/evitar con datos hasta la fecha T. Sin fuga de futuro.",
          },
          {
            title: "Explicaciones XAI",
            desc: "Top señales a favor/en contra, confianza y contrafactuales simples.",
          },
          {
            title: "Laboratorio riesgo",
            desc: "Simula stop/objetivo, payoff y drawdown esperado con sliders.",
          },
        ].map((f) => (
          <div key={f.title} className="card">
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
