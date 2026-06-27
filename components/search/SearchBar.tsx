// ===========================================
// PrivateVideos - Search Bar Component
// ===========================================
// Expandable search input with instant results and suggestions.

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onClose?: () => void;
}

export default function SearchBar({ onClose }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Navigate to search results on submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose?.();
    }
  };

  // Navigate on input change (instant search with debounce)
  useEffect(() => {
    if (!query.trim()) return;

    const timer = setTimeout(() => {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }, 400);

    return () => clearTimeout(timer);
  }, [query, router]);

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md",
        "bg-bg-secondary/80 border border-glass-border",
        "animate-scale-in origin-right",
        "w-[min(76vw,280px)] md:w-[280px] md:focus-within:w-[340px]",
        "transition-all duration-300"
      )}
    >
      <Search size={16} className="text-text-muted flex-shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search titles, tags..."
        className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full"
        id="search-input"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <X size={14} />
        </button>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-text-muted hover:text-text-primary transition-colors ml-1"
          aria-label="Close search"
        >
          <X size={16} />
        </button>
      )}
    </form>
  );
}
