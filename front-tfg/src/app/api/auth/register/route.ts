// src/app/api/auth/register/route.ts
// Endpoint POST que valida datos, hashea la contraseña y crea un nuevo usuario.
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

type RegisterBody = {
  nombre?: string;
  password?: string;
  rol?: "alumno" | "profesor";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;
    const nombre = body?.nombre?.trim();
    const password = body?.password ?? "";
    const rol = body?.rol;

    if (!nombre) {
      return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    if (rol !== "alumno" && rol !== "profesor") {
      return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { nombre } });
    if (existing) {
      return NextResponse.json({ error: "Ese nombre ya está registrado." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        nombre,
        password: hashedPassword,
        rol,
      },
      select: {
        id: true,
        nombre: true,
        rol: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Error registrando usuario", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
