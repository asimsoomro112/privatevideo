// ===========================================
// PrivateVideos - Mobile Bottom Navigation
// ===========================================
// Beautiful glassmorphism bottom nav bar for mobile devices.
// Shows on screens < md breakpoint.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookmarkPlus, Clapperboard, Home, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/shorts", label: "Shorts", icon: Clapperboard },
    { href: "/search", label: "Search", icon: Search },
    { href: "/my-list", label: "My List", icon: BookmarkPlus },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 mobile-nav">
      {/* Glassmorphism background */}
      <div className="mx-3 mb-2 rounded-2xl bg-bg-secondary/95 backdrop-blur-2xl border border-glass-border shadow-2xl shadow-black/50">
        <div className="grid grid-cols-4 items-center py-2 px-1">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-200",
                  isActive
                    ? "text-accent"
                    : "text-text-muted hover:text-text-secondary"
                )}
              >
                <Icon
                  size={22}
                  className={cn(
                    "transition-transform duration-200",
                    isActive && "scale-110"
                  )}
                />
                <span className="text-[10px] font-medium">{link.label}</span>

                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute -bottom-0.5 w-1 h-1 bg-accent rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
