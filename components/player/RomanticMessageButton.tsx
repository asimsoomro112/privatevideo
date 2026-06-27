"use client";

import { useMemo, useState } from "react";
import { Heart, Sparkles } from "lucide-react";
import { getRandomRomanticMessage } from "@/lib/romantic-messages";

export default function RomanticMessageButton() {
  const firstMessage = useMemo(() => getRandomRomanticMessage(), []);
  const [message, setMessage] = useState(firstMessage);
  const [isOpen, setIsOpen] = useState(false);

  const showMessage = () => {
    setMessage(getRandomRomanticMessage());
    setIsOpen(true);
  };

  return (
    <div className="fixed bottom-24 right-4 z-40 flex max-w-[min(88vw,360px)] flex-col items-end gap-3 md:bottom-8 md:right-8">
      {isOpen && (
        <div className="glass-card animate-scale-in p-4 text-sm leading-relaxed text-text-secondary shadow-2xl">
          <div className="mb-2 flex items-center gap-2 text-accent">
            <Sparkles size={15} />
            <span className="text-xs font-semibold uppercase tracking-wide">
              For you
            </span>
          </div>
          <p>{message}</p>
        </div>
      )}

      <button
        type="button"
        onClick={showMessage}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-300/20 bg-accent text-white shadow-[0_12px_36px_rgba(244,63,125,0.35)] transition hover:scale-105"
        aria-label="Show romantic message"
      >
        <Heart size={20} fill="currentColor" />
      </button>
    </div>
  );
}
