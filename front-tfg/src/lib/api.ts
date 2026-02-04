// front-tfg/src/lib/api.ts

// URL base del backend
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ===============================
// Registro de usuario
// ===============================
export async function registerUser(
  username: string,
  email: string,
  password: string
) {
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
}

// ===============================
// Login de usuario
// ===============================
export async function loginUser(email: string, password: string) {
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
}

// ===============================
// Market Engine
// ===============================
export async function getRandomScenario() {
  const response = await fetch(`${API_URL}/market/scenario/random`, {
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

export async function getScenarioById(scenarioId: string) {
  const response = await fetch(`${API_URL}/market/scenario/${scenarioId}`, {
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
