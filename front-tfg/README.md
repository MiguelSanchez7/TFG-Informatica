# TFG - Plataforma Next.js para inversión con IA

Aplicación creada con Next.js + TypeScript para experimentar con ayudas de IA generativa en contextos de inversión. Esta iteración se centra en dotar al proyecto de una base sólida de autenticación real mediante PostgreSQL y Prisma.

## 1. Dependencias clave
Instala el stack necesario (además de las dependencias ya existentes del proyecto):

```bash
npm install @prisma/client bcryptjs
npm install -D prisma
```

> En este entorno no se pudo descargar desde npm (red restringida), así que tendrás que ejecutar los comandos anteriores en tu máquina local.

## 2. Configurar Prisma y PostgreSQL
1. Crea un archivo `.env` copiando el contenido base:
   ```bash
   cp .env.example .env
   ```
2. Edita `DATABASE_URL` para que apunte a tu instancia local de PostgreSQL, por ejemplo:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tfg?schema=public"
   ```
3. Inicializa Prisma (si aún no existe la carpeta `prisma/`):
   ```bash
   npx prisma init --datasource-provider postgresql
   ```
4. El esquema esperado (`prisma/schema.prisma`) ya define:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }

   generator client {
     provider = "prisma-client-js"
   }

   enum Role {
     alumno
     profesor
   }

   model User {
     id        Int      @id @default(autoincrement())
     nombre    String   @unique
     password  String
     rol       Role
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   }
   ```
5. Ejecuta la primera migración y genera el cliente:
   ```bash
   npx prisma migrate dev --name init-auth
   npx prisma generate
   ```

## 3. Cliente de Prisma reutilizable
El archivo `src/lib/prisma.ts` expone una instancia única de `PrismaClient`, siguiendo el patrón recomendado para Next.js (evitar múltiples instancias en hot reload durante el desarrollo).

## 4. Endpoints de autenticación
- `POST /api/auth/register`: valida los datos, comprueba duplicados, hashea la contraseña con `bcryptjs` y devuelve `{ id, nombre, rol }`.
- `POST /api/auth/login`: comprueba credenciales y devuelve los datos públicos del usuario si la contraseña es correcta.

Ambos endpoints están implementados con el App Router (archivos `src/app/api/auth/.../route.ts`).

## 5. Contexto de autenticación en el frontend
`src/context/AuthContext.tsx` mantiene en memoria (y en `localStorage`) el usuario autenticado. Expone `register`, `login` y `logout`, todos ellos delegando en las APIs anteriores. El `AuthProvider` se monta en `src/app/layout.tsx` para que todo el árbol de componentes tenga acceso al estado.

## 6. Páginas de registro e inicio de sesión
- `/register`: formulario con nombre, contraseña y selector de rol. Usa `register()` del contexto.
- `/login`: formulario de nombre + contraseña que llama a `login()`.

Ambas páginas reemplazan la antigua lógica mock basada en `localStorage` y ahora funcionan end-to-end contra la base de datos real.

## 7. Ejecutar la aplicación
Una vez configurada la base de datos y aplicadas las migraciones, levanta el entorno de desarrollo:

```bash
npm run dev
```

Visita `http://localhost:3000/register` para crear un usuario y luego `http://localhost:3000/login` (o directamente la home) para iniciar sesión. El estado se mantendrá gracias al contexto y a la persistencia en `localStorage`.
