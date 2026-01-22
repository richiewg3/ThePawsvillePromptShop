"use client";

import { useState } from "react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-canvas-200/50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">🐾</span>
            <span className="font-display text-lg sm:text-xl font-bold text-canvas-800 hidden xs:block">
              Pawsville <span className="text-paw-500 hidden sm:inline">Prompt Shop</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link flex items-center gap-1.5 ${isActive ? "active" : ""}`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-canvas-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-3 border-t border-canvas-200/50">
            <div className="grid grid-cols-3 gap-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl text-center transition-colors ${
                      isActive 
                        ? "bg-paw-100 text-paw-700" 
                        : "hover:bg-canvas-100 text-canvas-600"
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
