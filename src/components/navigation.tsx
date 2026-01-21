"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Prompt Composer", icon: "✨" },
  { href: "/characters", label: "Characters", icon: "🦊" },
  { href: "/wardrobes", label: "Wardrobes", icon: "👔" },
  { href: "/looks", label: "Looks", icon: "🎨" },
  { href: "/lenses", label: "Lenses", icon: "📷" },
  { href: "/micro-packs", label: "Micro Packs", icon: "🔬" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-canvas-200/50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">🐾</span>
            <span className="font-display text-xl font-bold text-canvas-800 hidden sm:block">
              Pawsville <span className="text-paw-500">Prompt Shop</span>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link flex items-center gap-1.5 ${isActive ? "active" : ""}`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
