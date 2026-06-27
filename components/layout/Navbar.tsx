// ===========================================
// PrivateVideos - Navbar Component
// ===========================================
// Premium cinematic top navigation bar with glassmorphism,
// search, and user menu.

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/site";
import SearchBar from "@/components/search/SearchBar";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  // Detect scroll to change navbar background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/shorts", label: "Shorts" },
    { href: "/search", label: "Search" },
    { href: "/my-list", label: "My List" },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-500 ease-out",
        isHome && !isScrolled
          ? "bg-bg-primary/80 backdrop-blur-md"
          : "border-b border-glass-border bg-bg-primary/95 backdrop-blur-xl shadow-2xl shadow-black/50"
      )}
    >
      {/* Top gradient fade for cinematic feel */}
      {isHome && !isScrolled && (
        <div className="absolute inset-0 hero-gradient-top pointer-events-none" />
      )}

      <nav className="container-fluid relative flex items-center justify-between h-14 md:h-[68px]">
        {/* Left: Logo + Links */}
        <div className={cn("flex items-center gap-8", showSearch && "max-md:hidden")}>
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group"
            id="nav-logo"
          >
            <span className="text-accent font-black text-xl md:text-2xl tracking-tighter transition-all group-hover:drop-shadow-[0_0_12px_rgba(229,9,20,0.5)]">
              {SITE_NAME}
            </span>
          </Link>

          {/* Navigation Links (desktop) */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors duration-200",
                  pathname === link.href
                    ? "text-text-primary"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Search */}
        <div className="flex min-w-0 items-center gap-2">
          {/* Search */}
          {showSearch ? (
            <SearchBar onClose={() => setShowSearch(false)} />
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Search"
              id="nav-search-btn"
            >
              <Search size={20} />
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
