// src/app/api/auth/login/route.ts
// Endpoint POST que comprueba las credenciales y devuelve los datos públicos del usuario.
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

type LoginBody = {
  nombre?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const nombre = body?.nombre?.trim();
    const password = body?.password ?? "";

    if (!nombre || !password) {
      return NextResponse.json({ error: "Credenciales incompletas." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { nombre } });
    if (!user) {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    const { password: _password, ...safeUser } = user;
    void _password;
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error("Error iniciando sesión", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
