// front-tfg/src/lib/api.ts

// URL base del backend
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function normalizeFetchError(error: unknown, fallbackMessage: string): never {
  if (error instanceof Error && error.message === "Failed to fetch") {
    throw new Error(
      `No se pudo conectar con el backend en ${API_URL}. Comprueba que está arrancado.`
    );
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error(fallbackMessage);
}

// ===============================
// Registro de usuario
// ===============================
export async function registerUser(
  username: string,
  email: string,
  password: string
) {
  try {
    const response = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      let errText = "Error en el registro";
      try {
        const err = await response.json();
        errText = err.detail || errText;
      } catch {}

      throw new Error(errText);
    }

    return response.json();
  } catch (error) {
    normalizeFetchError(error, "Ha ocurrido un error en el registro");
  }
}

// ===============================
// Login de usuario
// ===============================
export async function loginUser(email: string, password: string) {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      let errText = "Error en el login";
      try {
        const err = await response.json();
        errText = err.detail || errText;
      } catch {}

      throw new Error(errText);
    }

    return response.json();
  } catch (error) {
    normalizeFetchError(error, "Ha ocurrido un error en el inicio de sesión");
  }
}

export async function getUser(userId: string) {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: "GET",
  });

  if (!response.ok) {
    let errText = "Error obteniendo usuario";
    try {
      const err = await response.json();
      errText = err.detail || errText;
    } catch {}

    throw new Error(errText);
  }

  return response.json();
}

// ===============================
// Experiencia de usuario
// ===============================
export async function addUserXp(userId: string, xp: number) {
  const response = await fetch(`${API_URL}/users/${userId}/xp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ xp }),
  });

  if (!response.ok) {
    let errText = "Error actualizando la experiencia";
    try {
      const err = await response.json();
      errText = err.detail || errText;
    } catch {}

    throw new Error(errText);
  }

  return response.json();
}

export async function getConcepts() {
  try {
    const response = await fetch(`${API_URL}/concepts`, {
      method: "GET",
    });

    if (!response.ok) {
      let errText = "Error obteniendo conceptos";
      try {
        const err = await response.json();
        errText = err.detail || errText;
      } catch {}

      throw new Error(errText);
    }

    return response.json();
  } catch (error) {
    normalizeFetchError(error, "No se pudo obtener el contenido de conceptos");
  }
}

export async function askTutor(
  question: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
) {
  const response = await fetch(`${API_URL}/assistant/tutor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question, history }),
  });

  if (!response.ok) {
    let errText = "Error consultando al tutor";
    try {
      const err = await response.json();
      errText = err.detail || errText;
    } catch {}

    throw new Error(errText);
  }

  return response.json();
}

// ===============================
// Market Engine
// ===============================
export async function getRandomScenario(modelType?: string) {
  const params = new URLSearchParams();
  if (modelType) params.set("model_type", modelType);
  const query = params.toString() ? `?${params.toString()}` : "";

  const response = await fetch(`${API_URL}/market/scenario/random${query}`, {
    method: "GET",
  });

  if (!response.ok) {
    let errText = "Error obteniendo escenario random";
    try {
      const err = await response.json();
      errText = err.detail || errText;
    } catch {}
    throw new Error(errText);
  }

  return response.json();
}

export async function getScenarioByDateRange(
  startDate: string,
  endDate: string,
  seed?: number,
  modelType?: string
) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  if (typeof seed === "number") {
    params.set("seed", String(seed));
  }
  if (modelType) {
    params.set("model_type", modelType);
  }

  const response = await fetch(`${API_URL}/market/scenario/by-date?${params}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    let errText = "Error obteniendo escenario historico";
    try {
      const err = await response.json();
      errText = err.detail || errText;
    } catch {}
    throw new Error(errText);
  }

  return response.json();
}

export async function getScenarioById(scenarioId: string, modelType?: string) {
  const params = new URLSearchParams();
  if (modelType) params.set("model_type", modelType);
  const query = params.toString() ? `?${params.toString()}` : "";

  const response = await fetch(`${API_URL}/market/scenario/${scenarioId}${query}`, {
    method: "GET",
  });

  if (!response.ok) {
    let errText = "Error obteniendo escenario";
    try {
      const err = await response.json();
      errText = err.detail || errText;
    } catch {}
    throw new Error(errText);
  }

  return response.json();
}

export async function revealScenario(
  scenarioId: string,
  action: "BUY" | "HOLD" | "SELL"
) {
  const response = await fetch(
    `${API_URL}/market/scenario/${scenarioId}/reveal`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    }
  );

  if (!response.ok) {
    let errText = "Error revelando escenario";
    try {
      const err = await response.json();
      errText = err.detail || errText;
    } catch {}
    throw new Error(errText);
  }

  return response.json();
}
