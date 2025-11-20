// src/lib/api.ts
export async function registerUser(username: string, email: string, password: string) {
  const response = await fetch("http://localhost:8000/users", {
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
    } catch {
      // ignoramos si no es JSON
    }
    throw new Error(errText);
  }

  return response.json();
}

export async function loginUser(email: string, password: string) {
  const response = await fetch("http://localhost:8000/login", {
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
    } catch {
      // ignoramos si no es JSON
    }
    throw new Error(errText);
  }

  return response.json(); // devuelve el usuario
}
