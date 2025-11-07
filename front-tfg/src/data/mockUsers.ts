export type MockUser = {
  username: string;
  password: string;
  name: string;
  role: "principiante" | "intermedio" | "avanzado";
};

export const users: MockUser[] = [
  {
    username: "ana_inversion",
    password: "finanzas123",
    name: "Ana López",
    role: "principiante",
  },
  {
    username: "carlos_quant",
    password: "quantum$$$",
    name: "Carlos Méndez",
    role: "intermedio",
  },
  {
    username: "sofia_xai",
    password: "explainableAI",
    name: "Sofía Herrera",
    role: "avanzado",
  },
];
