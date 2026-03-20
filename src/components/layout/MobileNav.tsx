"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, Receipt } from "lucide-react";
import { clsx } from "clsx";

const items = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Devis", href: "/devis", icon: FileText },
  { label: "Factures", href: "/factures", icon: Receipt },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-background-secondary border-t border-surface-border safe-area-inset-bottom">
      <div className="flex items-stretch h-16">
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
                active ? "text-primary" : "text-text-muted"
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{label}</span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
