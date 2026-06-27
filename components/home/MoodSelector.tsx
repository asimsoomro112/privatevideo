"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const moods = [
  { label: "Romantic", query: "romantic" },
  { label: "Passionate", query: "passionate" },
  { label: "Playful", query: "playful" },
  { label: "Intense", query: "intense" },
  { label: "Tonight", query: "tonight" },
];

export default function MoodSelector() {
  const router = useRouter();

  return (
    <section className="container-fluid mb-6 md:mb-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary md:text-xl">
            Choose the mood
          </h2>
          <p className="text-xs text-text-muted md:text-sm">
            Quick picks for the kind of night you want.
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {moods.map((mood, index) => (
          <motion.button
            key={mood.query}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            onClick={() => router.push(`/search?q=${encodeURIComponent(mood.query)}`)}
            className="min-h-11 flex-shrink-0 rounded-full border border-glass-border bg-glass-light px-4 text-sm font-medium text-text-secondary transition hover:border-accent/60 hover:text-text-primary"
          >
            {mood.label}
          </motion.button>
        ))}
      </div>
    </section>
  );
}
