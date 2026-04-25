"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { addUserXp, askTutor, getConcepts } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

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

type QuizOption = {
  id: string;
  label: string;
};

type QuizQuestion = {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
};

type Quiz = {
  level: LessonLevel;
  title: string;
  description: string;
  xpRewardPerCorrect: number;
  xpPenaltyPerWrong: number;
  questions: QuizQuestion[];
};

type ConceptsPayload = {
  lessons: Lesson[];
  glossary: GlossaryItem[];
  quizzes: Quiz[];
};

type TutorMessage = {
  role: "user" | "assistant";
  content: string;
};

const levelLabels: Record<LessonLevel, string> = {
  base: "Base",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

const levelOrder: LessonLevel[] = ["base", "intermedio", "avanzado"];
const levelRequiredUserLevel: Record<LessonLevel, number> = {
  base: 1,
  intermedio: 4,
  avanzado: 7,
};

export default function ConceptosPage() {
  const { user, setUser } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [glossary, setGlossary] = useState<GlossaryItem[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<LessonLevel>("base");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [revealedAnswer, setRevealedAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [visitedLessonsByLevel, setVisitedLessonsByLevel] = useState<
    Partial<Record<LessonLevel, string[]>>
  >({});
  const [quizResult, setQuizResult] = useState<{
    correct: number;
    wrong: number;
    xpDelta: number;
    reviewedQuestions: Array<{
      id: string;
      question: string;
      wasCorrect: boolean;
      explanation: string;
      selectedLabel: string | null;
      correctLabel: string;
    }>;
  } | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizAttemptSeed, setQuizAttemptSeed] = useState(0);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [tutorQuestion, setTutorQuestion] = useState("");
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  const [tutorModelName, setTutorModelName] = useState<string | null>(null);
  const tutorResponseRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    getConcepts()
      .then((payload: ConceptsPayload) => {
        if (cancelled) return;
        setLessons(payload.lessons);
        setGlossary(payload.glossary);
        setQuizzes(payload.quizzes);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "No se pudieron cargar los conceptos"
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const userLevel = Math.max(1, user?.level ?? 1);
  const unlockedLevels = useMemo(
    () =>
      levelOrder.filter((level) => userLevel >= levelRequiredUserLevel[level]),
    [userLevel]
  );
  const accessibleLevels = useMemo<LessonLevel[]>(
    () => (unlockedLevels.length > 0 ? unlockedLevels : ["base"]),
    [unlockedLevels]
  );

  useEffect(() => {
    if (!accessibleLevels.includes(selectedLevel)) {
      setSelectedLevel(accessibleLevels[0]);
    }
  }, [accessibleLevels, selectedLevel]);

  const filteredLessons = useMemo(
    () => lessons.filter((lesson) => lesson.level === selectedLevel),
    [lessons, selectedLevel]
  );
  const selectedQuiz = quizzes.find((quiz) => quiz.level === selectedLevel) ?? null;
  const activeQuizQuestions = useMemo(() => {
    if (!selectedQuiz) return [];

    const questions = [...selectedQuiz.questions];
    let seed = quizAttemptSeed + questions.length;
    const nextRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let index = questions.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(nextRandom() * (index + 1));
      [questions[index], questions[randomIndex]] = [
        questions[randomIndex],
        questions[index],
      ];
    }

    return questions.slice(0, Math.min(3, questions.length));
  }, [selectedQuiz, quizAttemptSeed]);
  const selectedLesson =
    filteredLessons.find((lesson) => lesson.id === selectedLessonId) ?? filteredLessons[0];
  const selectedLessonIndex = filteredLessons.findIndex(
    (lesson) => lesson.id === selectedLesson?.id
  );
  const isBaseLevel = selectedLevel === "base";
  const visitedLessonIds = visitedLessonsByLevel[selectedLevel] ?? [];
  const hasCompletedCurrentLevel =
    filteredLessons.length > 0 &&
    filteredLessons.every((lesson) => visitedLessonIds.includes(lesson.id));
  const tutorSuggestions = useMemo(
    () => [
      `Explicame de forma sencilla el concepto "${selectedLesson?.title ?? "actual"}".`,
      `Ponme otro ejemplo practico sobre "${selectedLesson?.title ?? "este tema"}".`,
      `Cual es el error mas comun al entender "${selectedLesson?.title ?? "este concepto"}"?`,
    ],
    [selectedLesson?.title]
  );
  const latestTutorUserMessage = useMemo(
    () => [...tutorMessages].reverse().find((message) => message.role === "user") ?? null,
    [tutorMessages]
  );
  const latestTutorAssistantMessage = useMemo(
    () =>
      [...tutorMessages].reverse().find((message) => message.role === "assistant") ?? null,
    [tutorMessages]
  );

  useEffect(() => {
    setSelectedLessonId(filteredLessons[0]?.id ?? null);
    setRevealedAnswer(false);
    setQuizAnswers({});
    setQuizResult(null);
    setQuizFeedback(null);
    setQuizAttemptSeed((current) => current + 1);
  }, [filteredLessons, selectedLevel]);

  useEffect(() => {
    if (!selectedLesson?.id) return;

    setVisitedLessonsByLevel((current) => {
      const currentVisited = current[selectedLevel] ?? [];
      if (currentVisited.includes(selectedLesson.id)) {
        return current;
      }

      return {
        ...current,
        [selectedLevel]: [...currentVisited, selectedLesson.id],
      };
    });
  }, [selectedLesson?.id, selectedLevel]);

  useEffect(() => {
    setTutorQuestion("");
    setTutorMessages([]);
    setTutorError(null);
    setIsTutorLoading(false);
  }, [selectedLesson?.id]);

  useEffect(() => {
    if (latestTutorAssistantMessage && tutorResponseRef.current) {
      tutorResponseRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [latestTutorAssistantMessage]);

  function chooseLevel(level: LessonLevel) {
    setSelectedLevel(level);
    setSelectedLessonId(lessons.find((lesson) => lesson.level === level)?.id ?? null);
    setRevealedAnswer(false);
  }

  function chooseLesson(lessonId: string) {
    setSelectedLessonId(lessonId);
    setRevealedAnswer(false);
  }

  function goToAdjacentLesson(direction: "prev" | "next") {
    if (!filteredLessons.length || selectedLessonIndex < 0) return;

    const offset = direction === "next" ? 1 : -1;
    const nextLesson = filteredLessons[selectedLessonIndex + offset];
    if (!nextLesson) return;

    setSelectedLessonId(nextLesson.id);
    setRevealedAnswer(false);
  }

  function chooseQuizAnswer(questionId: string, optionId: string) {
    setQuizAnswers((current) => ({ ...current, [questionId]: optionId }));
  }

  function startNewQuizAttempt() {
    setQuizAnswers({});
    setQuizResult(null);
    setQuizFeedback(null);
    setQuizAttemptSeed((current) => current + 1);
  }

  async function submitQuiz() {
    if (!selectedQuiz || isSubmittingQuiz) return;

    const totalQuestions = activeQuizQuestions.length;
    if (Object.keys(quizAnswers).length !== totalQuestions) {
      setQuizResult(null);
      setQuizFeedback("Responde todas las preguntas del test antes de enviarlo.");
      return;
    }

    setIsSubmittingQuiz(true);
    setQuizFeedback(null);

    const reviewedQuestions = activeQuizQuestions.map((question) => {
      const selectedOptionId = quizAnswers[question.id];
      const selectedOption =
        question.options.find((option) => option.id === selectedOptionId) ?? null;
      const correctOption =
        question.options.find((option) => option.id === question.correctOptionId) ??
        question.options[0];

      return {
        id: question.id,
        question: question.question,
        wasCorrect: selectedOptionId === question.correctOptionId,
        explanation: question.explanation,
        selectedLabel: selectedOption?.label ?? null,
        correctLabel: correctOption.label,
      };
    });

    const correct = reviewedQuestions.filter(
      (question) => question.wasCorrect
    ).length;
    const wrong = totalQuestions - correct;
    const xpDelta =
      correct * selectedQuiz.xpRewardPerCorrect - wrong * selectedQuiz.xpPenaltyPerWrong;

    try {
      if (user?.id && xpDelta !== 0) {
        const updatedUser = await addUserXp(user.id, xpDelta);
        setUser(updatedUser);
      }
      setQuizResult({ correct, wrong, xpDelta, reviewedQuestions });
      setQuizFeedback("Resultado guardado correctamente.");
    } catch (err: unknown) {
      setQuizFeedback(
        err instanceof Error ? err.message : "No se pudo guardar el resultado del test"
      );
    } finally {
      setIsSubmittingQuiz(false);
    }
  }

  async function submitTutorQuestion(
    event?: FormEvent<HTMLFormElement>,
    preset?: string
  ) {
    event?.preventDefault();

    const nextQuestion = (preset ?? tutorQuestion).trim();
    if (!nextQuestion || isTutorLoading || !selectedLesson) return;

    const contextualQuestion = `${nextQuestion}\n\nContexto de la leccion actual: ${selectedLesson.title}. ${selectedLesson.summary}`;
    const nextMessages = [...tutorMessages, { role: "user" as const, content: nextQuestion }];

    setTutorMessages(nextMessages);
    setTutorQuestion("");
    setTutorError(null);
    setIsTutorLoading(true);

    try {
      const response = await askTutor(
        contextualQuestion,
        tutorMessages
      );
      setTutorMessages((current) => [
        ...current,
        { role: "assistant", content: response.answer },
      ]);
      setTutorModelName(response.model);
    } catch (err: unknown) {
      setTutorError(
        err instanceof Error ? err.message : "No se pudo obtener respuesta del tutor"
      );
      setTutorMessages(tutorMessages);
      setTutorQuestion(nextQuestion);
    } finally {
      setIsTutorLoading(false);
    }
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
                Recorre la teoria esencial por bloques, desbloquea contenido
                segun tu nivel y cierra cada etapa con un test puntuable.
              </p>
            </div>

            <div className="rounded-lg border border-[#416253] bg-[#07110f]/85 p-4">
              <p className="text-sm font-semibold text-white">
                Metodo recomendado
              </p>
              <ol className="mt-3 space-y-2 text-sm text-[#cfe8da]">
                <li>1. Completa las lecciones del bloque desbloqueado.</li>
                <li>2. Usa las preguntas de repaso para fijar conceptos.</li>
                <li>3. Haz el test final del nivel.</li>
                <li>4. Gana o pierde XP segun tus respuestas.</li>
              </ol>
            </div>
          </div>
        </section>

        {isLoading && (
          <section className="rounded-lg border border-[#2b4a3e] bg-[#0d1f1a] p-6 text-sm text-[#d8e8df]">
            Cargando conceptos...
          </section>
        )}

        {!isLoading && loadError && (
          <section className="rounded-lg border border-[#7f3a3a] bg-[#2b1010] p-6 text-sm text-[#ffd6d6]">
            {loadError}. Comprueba que el backend esta arrancado y que los archivos
            de contenido de conceptos existen en el proyecto.
          </section>
        )}

        {!isLoading && !loadError && !selectedLesson && (
          <section className="rounded-lg border border-[#2b4a3e] bg-[#0d1f1a] p-6 text-sm text-[#d8e8df]">
            No hay conceptos publicados todavia.
          </section>
        )}

        {!isLoading && !loadError && selectedLesson && (
          <>
            <section className="mb-6 grid gap-3 lg:grid-cols-3">
              {levelOrder.map((level) => {
                const unlocked = accessibleLevels.includes(level);
                const requiredLevel = levelRequiredUserLevel[level];

                return (
                  <button
                    key={level}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => unlocked && chooseLevel(level)}
                    className={`rounded-lg border p-4 text-left transition ${
                      selectedLevel === level && unlocked
                        ? "border-[#d7f365] bg-[#17352b]"
                        : unlocked
                          ? "border-[#2b4a3e] bg-[#0d1f1a] hover:border-[#6fa88a]"
                          : "border-[#243630] bg-[#0a1512] opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-white">
                        Nivel {levelLabels[level]}
                      </span>
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-semibold uppercase ${
                          unlocked
                            ? "bg-[#d7f365] text-[#07110f]"
                            : "bg-[#23332d] text-[#9bb9aa]"
                        }`}
                      >
                        {unlocked ? "Desbloqueado" : `Lvl ${requiredLevel}`}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-[#bdd7c9]">
                      {unlocked
                        ? "Puedes estudiar este bloque y hacer su test final."
                        : `Se abre cuando tu usuario alcance el nivel ${requiredLevel}.`}
                    </p>
                  </button>
                );
              })}
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.9fr,1.6fr]">
              <aside className="space-y-3">
                <div className="rounded-lg border border-[#2b4a3e] bg-[#0d1f1a] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#d7f365]">
                    Bloque activo
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-white">
                    {levelLabels[selectedLevel]}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#bdd7c9]">
                    {filteredLessons.length} lecciones y un test final para consolidar este nivel.
                  </p>
                </div>

                {isBaseLevel ? (
                  <div className="rounded-lg border border-[#2b4a3e] bg-[#0d1f1a] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#d7f365]">
                      Recorrido guiado
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#bdd7c9]">
                      En el nivel base veras una leccion cada vez. Usa las flechas para avanzar
                      paso a paso hasta completar el bloque.
                    </p>
                    <p className="mt-4 text-sm font-semibold text-white">
                      Leccion {selectedLessonIndex + 1} de {filteredLessons.length}
                    </p>
                    <p className="mt-2 text-sm text-[#9bb9aa]">
                      Progreso del bloque: {visitedLessonIds.length}/{filteredLessons.length} lecciones vistas
                    </p>
                  </div>
                ) : (
                  filteredLessons.map((lesson) => (
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
                  ))
                )}
              </aside>

              <div className="space-y-6">
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

                {isBaseLevel && (
                  <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-[#416253] bg-[#07110f] p-3">
                    <button
                      type="button"
                      onClick={() => goToAdjacentLesson("prev")}
                      disabled={selectedLessonIndex <= 0}
                      className="rounded-md border border-[#416253] px-4 py-2 text-sm font-semibold text-[#d8e8df] transition hover:border-[#6fa88a] hover:bg-[#10251f] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ← Anterior
                    </button>
                    <p className="text-sm text-[#bdd7c9]">
                      Paso {selectedLessonIndex + 1} de {filteredLessons.length}
                    </p>
                    <button
                      type="button"
                      onClick={() => goToAdjacentLesson("next")}
                      disabled={selectedLessonIndex >= filteredLessons.length - 1}
                      className="rounded-md border border-[#416253] px-4 py-2 text-sm font-semibold text-[#d8e8df] transition hover:border-[#6fa88a] hover:bg-[#10251f] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}

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

                {!isBaseLevel && (
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
                )}

                <section className="mt-6 rounded-lg border border-[#416253] bg-[#07110f] p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#d7f365]">
                        Tutor IA de la leccion
                      </p>
                      <h3 className="mt-2 text-xl font-bold text-white">
                        Resuelve dudas sobre {selectedLesson.title}
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d8e8df]">
                        Haz preguntas cortas sobre la leccion actual. El tutor responde con enfoque educativo y no como asesor financiero.
                      </p>
                    </div>
                    {tutorModelName && (
                      <p className="text-xs uppercase tracking-wide text-[#9bb9aa]">
                        Modelo: {tutorModelName}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {tutorSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => submitTutorQuestion(undefined, suggestion)}
                        disabled={isTutorLoading}
                        className="rounded-full border border-[#2b4a3e] px-3 py-2 text-sm text-[#d8e8df] transition hover:border-[#6fa88a] hover:bg-[#10251f] disabled:opacity-60"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={submitTutorQuestion} className="mt-4">
                    <textarea
                      value={tutorQuestion}
                      onChange={(event) => setTutorQuestion(event.target.value)}
                      placeholder={`Pregunta algo sobre ${selectedLesson.title.toLowerCase()}...`}
                      className="min-h-28 w-full rounded-lg border border-[#2b4a3e] bg-[#0d1f1a] px-4 py-3 text-sm text-[#eef7f1] outline-none transition focus:border-[#d7f365]"
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        disabled={isTutorLoading || !tutorQuestion.trim()}
                        className="rounded-md bg-[#d7f365] px-5 py-3 text-sm font-semibold text-[#07110f] transition hover:bg-[#e7ff8d] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isTutorLoading ? "Consultando..." : "Preguntar al tutor"}
                      </button>
                      <p className="text-xs leading-5 text-[#9bb9aa]">
                        Cuanto mas concreta sea la duda, mejor respondera.
                      </p>
                    </div>
                  </form>

                  {(latestTutorUserMessage || latestTutorAssistantMessage || isTutorLoading) && (
                    <section
                      ref={tutorResponseRef}
                      className="mt-5 rounded-lg border border-[#2b4a3e] bg-[#0d1f1a] p-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#d7f365]">
                        Interaccion actual
                      </p>
                      {latestTutorUserMessage && (
                        <div className="mt-3 rounded-md border border-[#2b4a3e] bg-[#10251f] p-3">
                          <p className="text-xs uppercase tracking-wide text-[#9bb9aa]">
                            Tu pregunta
                          </p>
                          <p className="mt-2 text-sm leading-6 text-white">
                            {latestTutorUserMessage.content}
                          </p>
                        </div>
                      )}
                      <div className="mt-3 rounded-md border border-[#416253] bg-[#07110f] p-4">
                        <p className="text-xs uppercase tracking-wide text-[#d7f365]">
                          Respuesta del tutor
                        </p>
                        {isTutorLoading && (
                          <div className="mt-3 space-y-3">
                            <p className="text-sm font-semibold text-white">
                              El tutor esta preparando la respuesta...
                            </p>
                            <div className="h-3 w-full rounded bg-[#17352b]" />
                            <div className="h-3 w-10/12 rounded bg-[#17352b]" />
                            <div className="h-3 w-8/12 rounded bg-[#17352b]" />
                          </div>
                        )}
                        {!isTutorLoading && latestTutorAssistantMessage && (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#d8e8df]">
                            {latestTutorAssistantMessage.content}
                          </p>
                        )}
                      </div>
                    </section>
                  )}

                  {tutorError && (
                    <div className="mt-4 rounded-md border border-[#7f3a3a] bg-[#2b1010] p-4 text-sm text-[#ffd6d6]">
                      {tutorError}
                    </div>
                  )}
                </section>
                </article>

                {selectedQuiz && hasCompletedCurrentLevel && (
                  <section className="rounded-lg border border-[#2b4a3e] bg-[#0d1f1a] p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#d7f365]">
                          Test final
                        </p>
                        <h2 className="mt-2 text-2xl font-bold text-white">
                          {selectedQuiz.title}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d8e8df]">
                          {selectedQuiz.description}
                        </p>
                        <p className="mt-2 text-sm text-[#9bb9aa]">
                          En cada intento veras 3 preguntas distintas elegidas del banco del nivel.
                        </p>
                      </div>
                      <div className="rounded-lg border border-[#416253] bg-[#07110f] p-4 text-sm text-[#cfe8da]">
                        <p>+{selectedQuiz.xpRewardPerCorrect} XP por acierto</p>
                        <p>-{selectedQuiz.xpPenaltyPerWrong} XP por fallo</p>
                        <p className="mt-2 text-[#9bb9aa]">
                          Banco total: {selectedQuiz.questions.length} preguntas
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      {activeQuizQuestions.map((question, index) => (
                        <div
                          key={question.id}
                          className="rounded-lg border border-[#2b4a3e] bg-[#10251f] p-4"
                        >
                          <p className="text-sm font-semibold text-white">
                            {index + 1}. {question.question}
                          </p>
                          <div className="mt-3 space-y-2">
                            {question.options.map((option) => {
                              const checked = quizAnswers[question.id] === option.id;
                              return (
                                <label
                                  key={option.id}
                                  className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition ${
                                    checked
                                      ? "border-[#d7f365] bg-[#17352b] text-white"
                                      : "border-[#2b4a3e] text-[#d8e8df] hover:border-[#6fa88a]"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={question.id}
                                    value={option.id}
                                    checked={checked}
                                    onChange={() => chooseQuizAnswer(question.id, option.id)}
                                    className="h-4 w-4 accent-[#d7f365]"
                                  />
                                  <span>{option.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={submitQuiz}
                        disabled={isSubmittingQuiz}
                        className="rounded-md bg-[#d7f365] px-5 py-3 text-sm font-semibold text-[#07110f] transition hover:bg-[#e7ff8d] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmittingQuiz ? "Corrigiendo..." : "Enviar test"}
                      </button>
                      <button
                        type="button"
                        onClick={startNewQuizAttempt}
                        disabled={isSubmittingQuiz}
                        className="rounded-md border border-[#416253] px-5 py-3 text-sm font-semibold text-[#d8e8df] transition hover:border-[#6fa88a] hover:bg-[#10251f] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Nuevo intento
                      </button>
                      {!user && (
                        <p className="text-sm text-[#9bb9aa]">
                          Puedes hacer el test sin iniciar sesion, pero la XP no se guardara.
                        </p>
                      )}
                    </div>

                    {quizFeedback && (
                      <p className="mt-4 text-sm text-[#d8e8df]">{quizFeedback}</p>
                    )}

                    {quizResult && (
                      <div className="mt-6 rounded-lg border border-[#416253] bg-[#07110f] p-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#d7f365]">
                          Resultado
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[#d8e8df]">
                          Has acertado {quizResult.correct} y fallado {quizResult.wrong}.
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          Cambio total de XP: {quizResult.xpDelta > 0 ? "+" : ""}
                          {quizResult.xpDelta}
                        </p>
                        {quizResult.correct === activeQuizQuestions.length && (
                          <div className="mt-4 rounded-md border border-[#d7f365] bg-[#17352b] p-4">
                            <p className="text-sm font-semibold text-white">
                              Test perfecto. Buen momento para practicar con contexto real.
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[#d8e8df]">
                              Te recomiendo pasar a retos historicos: veras una introduccion del evento y despues podras entrenar como en un escenario de mercado.
                            </p>
                            <Link
                              href="/retos-historicos"
                              className="mt-4 inline-flex rounded-md bg-[#d7f365] px-4 py-2 text-sm font-semibold text-[#07110f] transition hover:bg-[#e7ff8d]"
                            >
                              Ir a retos historicos
                            </Link>
                          </div>
                        )}
                        {quizResult.reviewedQuestions
                          .filter((question) => !question.wasCorrect)
                          .map((question) => (
                            <div
                              key={question.id}
                              className="mt-4 rounded-md border border-[#7f3a3a] bg-[#2b1010] p-4"
                            >
                              <p className="text-sm font-semibold text-white">
                                {question.question}
                              </p>
                              <p className="mt-2 text-sm text-[#ffd6d6]">
                                Tu respuesta: {question.selectedLabel ?? "Sin responder"}
                              </p>
                              <p className="mt-1 text-sm text-[#d7f365]">
                                Respuesta correcta: {question.correctLabel}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-[#d8e8df]">
                                {question.explanation}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </section>
                )}

                {selectedQuiz && !hasCompletedCurrentLevel && (
                  <section className="rounded-lg border border-[#2b4a3e] bg-[#0d1f1a] p-5 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#d7f365]">
                      Test bloqueado
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-white">
                      Completa primero todas las lecciones
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-[#d8e8df]">
                      El test final se desbloquea cuando hayas recorrido todas las partes del bloque actual.
                    </p>
                    <p className="mt-3 text-sm text-[#9bb9aa]">
                      Progreso actual: {visitedLessonIds.length}/{filteredLessons.length} lecciones vistas.
                    </p>
                  </section>
                )}
              </div>
            </section>

            <section className="mt-8 rounded-lg border border-[#2b4a3e] bg-[#0d1f1a] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white">Glosario rapido</h2>
                  <p className="mt-2 text-sm leading-6 text-[#9bb9aa]">
                    Consulta definiciones breves solo cuando las necesites.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGlossaryOpen((value) => !value)}
                  className="rounded-md border border-[#416253] px-4 py-2 text-sm font-semibold text-[#d8e8df] transition hover:border-[#6fa88a] hover:bg-[#10251f]"
                >
                  {isGlossaryOpen ? "Ocultar glosario" : "Ver glosario"}
                </button>
              </div>

              {isGlossaryOpen && (
                <div className="mt-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
