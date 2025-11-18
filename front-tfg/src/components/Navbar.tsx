"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/about", label: "Sobre el proyecto" },
  { href: "/login", label: "Entrar" },
  { href: "/register", label: "Crear cuenta" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 rounded-2xl bg-gray-100 p-1">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 text-sm rounded-xl transition
              ${active ? "bg-white shadow font-medium" : "hover:bg-white/60"}
            `}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
