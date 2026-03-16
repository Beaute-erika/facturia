"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { clsx } from "clsx";

const LINKS = [
  { href: "/#fonctionnalites", label: "Fonctionnalités" },
  { href: "/pricing", label: "Tarifs" },
  { href: "/#faq", label: "FAQ" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-text-primary">
          <span className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-background text-sm font-black">F</span>
          Facturia
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                pathname === l.href
                  ? "text-text-primary bg-surface-active"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-active"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-background hover:bg-primary-400 transition-all hover:shadow-glow"
          >
            Essai gratuit
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-surface-border bg-background px-6 py-4 space-y-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 rounded-xl text-sm text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-3 flex flex-col gap-2 border-t border-surface-border mt-3">
            <Link href="/login" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-xl text-sm text-center text-text-muted border border-surface-border hover:border-surface-active transition-colors">
              Se connecter
            </Link>
            <Link href="/signup" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-center bg-primary text-background hover:bg-primary-400 transition-colors">
              Essai gratuit
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
