export default function About() {
  return (
    <section className="prose max-w-3xl">
      <h1>Sobre el proyecto</h1>
      <p>
        Este TFG busca crear una aplicación educativa que enseñe inversión en
        bolsa mediante retos históricos y explicaciones de IA (XAI), evitando
        fuga de futuro y con métricas de aprendizaje.
      </p>
      <ul>
        <li>Retos con datos históricos y decisión guiada.</li>
        <li>Explicaciones locales (SHAP) y contrafactuales.</li>
        <li>Laboratorio “what-if” y gestión del riesgo.</li>
      </ul>
    </section>
  );
}
