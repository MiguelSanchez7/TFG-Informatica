"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { getConcepts } from "../../lib/api";

type LessonLevel = "base" | "intermedio" | "avanzado";

type Lesson = {
  id: string;
  slug: string;
  level: LessonLevel;
  title: string;
  summary: string;
  whyItMatters: string;
  keyIdeas: string[];
  example: string;
  checkQuestion: string;
  checkAnswer: string;
  orderIndex?: number | null;
};

type GlossaryItem = {
  id: string;
  term: string;
  definition: string;
  orderIndex?: number | null;
};

type ConceptsPayload = {
  lessons: Lesson[];
  glossary: GlossaryItem[];
};

const levelLabels: Record<LessonLevel, string> = {
  base: "Base",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export default function ConceptosPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [glossary, setGlossary] = useState<GlossaryItem[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<LessonLevel | "todos">("todos");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [revealedAnswer, setRevealedAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getConcepts()
      .then((payload: ConceptsPayload) => {
        if (cancelled) return;
        setLessons(payload.lessons);
        setGlossary(payload.glossary);
        setSelectedLessonId(payload.lessons[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar los conceptos");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredLessons = useMemo(
    () =>
      selectedLevel === "todos"
        ? lessons
        : lessons.filter((lesson) => lesson.level === selectedLevel),
    [lessons, selectedLevel]
  );

  const selectedLesson =
    lessons.find((lesson) => lesson.id === selectedLessonId) ?? filteredLessons[0];

  function chooseLevel(level: LessonLevel | "todos") {
    const nextLessons =
      level === "todos"
        ? lessons
        : lessons.filter((lesson) => lesson.level === level);

    setSelectedLevel(level);
    setSelectedLessonId(nextLessons[0]?.id ?? null);
    setRevealedAnswer(false);
  }

  function chooseLesson(lessonId: string) {
    setSelectedLessonId(lessonId);
    setRevealedAnswer(false);
  }

  return (
    <main className="min-h-screen bg-[#07110f] text-[#eef7f1]">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4 text-sm">
          <Link
            href="/"
            className="rounded-md border border-[#2b4a3e] px-3 py-2 text-[#cfe8da] transition hover:bg-[#10251f]"
          >
            Volver al inicio
          </Link>
          <span className="rounded-md bg-[#d7f365] px-3 py-2 text-xs font-semibold uppercase text-[#07110f]">
            Aula de inversion
          </span>
        </div>

        <section className="relative mb-8 overflow-hidden rounded-lg border border-[#2b4a3e] bg-[#0d1f1a]">
          <Image
            src="/profile-bg.jpg"
            alt="Grafico financiero usado como contexto visual de aprendizaje"
            fill
            className="object-cover opacity-25"
            priority
          />
          <div className="relative grid gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1.3fr,0.7fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d7f365]">
                Conceptos clave
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl">
                Aprende a leer el mercado antes de tomar decisiones.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#d8e8df] sm:text-base">
                Recorre la teoria esencial de inversion con ejemplos sencillos,
                preguntas de control y terminos que aparecen en los retos.
              </p>
            </div>

            <div className="rounded-lg border border-[#416253] bg-[#07110f]/85 p-4">
              <p className="text-sm font-semibold text-white">
                Metodo recomendado
              </p>
              <ol className="mt-3 space-y-2 text-sm text-[#cfe8da]">
                <li>1. Lee la idea principal.</li>
                <li>2. Mira el ejemplo.</li>
                <li>3. Responde la pregunta sin mirar la solucion.</li>
                <li>4. Aplica el concepto en un reto historico.</li>
              </ol>
            </div>
          </div>
        </section>

        {isLoading && (
          <section className="rounded-lg border border-[#2b4a3e] bg-[#0d1f1a] p-6 text-sm text-[#d8e8df]">
            Cargando conceptos...
          </section>
        )}

        {!isLoading && error && (
          <section className="rounded-lg border border-[#7f3a3a] bg-[#2b1010] p-6 text-sm text-[#ffd6d6]">
            {error}. Comprueba que el backend esta arrancado y que has ejecutado
            el SQL de conceptos en Supabase.
          </section>
        )}

        {!isLoading && !error && !selectedLesson && (
          <section className="rounded-lg border border-[#2b4a3e] bg-[#0d1f1a] p-6 text-sm text-[#d8e8df]">
            No hay conceptos publicados todavia.
          </section>
        )}

        {!isLoading && !error && selectedLesson && (
          <>
            <section className="mb-6 flex flex-wrap gap-2">
              {(["todos", "base", "intermedio", "avanzado"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => chooseLevel(level)}
                  className={`rounded-md border px-4 py-2 text-sm font-medium transition ${
                    selectedLevel === level
                      ? "border-[#d7f365] bg-[#d7f365] text-[#07110f]"
                      : "border-[#2b4a3e] bg-[#0d1f1a] text-[#cfe8da] hover:border-[#6fa88a]"
                  }`}
                >
                  {level === "todos" ? "Todos" : levelLabels[level]}
                </button>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.9fr,1.6fr]">
              <aside className="space-y-3">
                {filteredLessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => chooseLesson(lesson.id)}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      selectedLesson.id === lesson.id
                        ? "border-[#d7f365] bg-[#17352b]"
                        : "border-[#2b4a3e] bg-[#0d1f1a] hover:border-[#6fa88a]"
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase text-[#d7f365]">
                      {levelLabels[lesson.level]}
                    </span>
                    <h2 className="mt-1 text-base font-semibold text-white">
                      {lesson.title}
                    </h2>
                    <p className="mt-2 text-sm leading-5 text-[#bdd7c9]">
                      {lesson.summary}
                    </p>
                  </button>
                ))}
              </aside>

              <article className="rounded-lg border border-[#2b4a3e] bg-[#0d1f1a] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="rounded-md bg-[#163f32] px-2 py-1 text-xs font-semibold uppercase text-[#d7f365]">
                      {levelLabels[selectedLesson.level]}
                    </span>
                    <h2 className="mt-3 text-2xl font-bold text-white">
                      {selectedLesson.title}
                    </h2>
                  </div>
                  <Link
                    href="/retos-historicos"
                    className="rounded-md bg-[#eef7f1] px-4 py-2 text-sm font-semibold text-[#07110f] transition hover:bg-[#d7f365]"
                  >
                    Practicar en retos
                  </Link>
                </div>

                <div className="mt-6 grid gap-5 xl:grid-cols-2">
                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[#d7f365]">
                      Idea principal
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#d8e8df]">
                      {selectedLesson.summary}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[#d8e8df]">
                      {selectedLesson.whyItMatters}
                    </p>
                  </section>

                  <section className="rounded-lg border border-[#416253] bg-[#07110f] p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[#d7f365]">
                      Ejemplo
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#d8e8df]">
                      {selectedLesson.example}
                    </p>
                  </section>
                </div>

                <section className="mt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#d7f365]">
                    Claves para recordar
                  </h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {selectedLesson.keyIdeas.map((idea) => (
                      <div
                        key={idea}
                        className="rounded-lg border border-[#2b4a3e] bg-[#10251f] p-4 text-sm leading-5 text-[#d8e8df]"
                      >
                        {idea}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mt-6 rounded-lg border border-[#416253] bg-[#07110f] p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#d7f365]">
                    Pregunta de repaso
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#eef7f1]">
                    {selectedLesson.checkQuestion}
                  </p>
                  <button
                    type="button"
                    onClick={() => setRevealedAnswer((value) => !value)}
                    className="mt-4 rounded-md border border-[#d7f365] px-4 py-2 text-sm font-semibold text-[#d7f365] transition hover:bg-[#d7f365] hover:text-[#07110f]"
                  >
                    {revealedAnswer ? "Ocultar respuesta" : "Ver respuesta"}
                  </button>
                  {revealedAnswer && (
                    <p className="mt-4 rounded-md bg-[#17352b] p-3 text-sm leading-6 text-[#d8e8df]">
                      {selectedLesson.checkAnswer}
                    </p>
                  )}
                </section>
              </article>
            </section>

            <section className="mt-8 rounded-lg border border-[#2b4a3e] bg-[#0d1f1a] p-5 sm:p-6">
              <h2 className="text-xl font-bold text-white">Glosario rapido</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {glossary.map((item) => (
                  <div key={item.id} className="rounded-lg border border-[#2b4a3e] p-4">
                    <h3 className="font-semibold text-[#d7f365]">{item.term}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#d8e8df]">
                      {item.definition}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs leading-5 text-[#9bb9aa]">
                Contenido educativo. No sustituye una recomendacion financiera
                personalizada.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
