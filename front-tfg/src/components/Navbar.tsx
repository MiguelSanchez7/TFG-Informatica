"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/about", label: "Sobre el proyecto" },
  { href: "/login", label: "Acceso" },
  { href: "/register", label: "Crear cuenta" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-transparent flex items-center gap-1 rounded-2xl p-1">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            data-active={active ? "true" : "false"}
            className="nav-pill px-3 py-1.5 text-sm rounded-xl transition-colors"
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
