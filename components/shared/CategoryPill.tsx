// ===========================================
// PrivateVideos - Category Pill
// ===========================================
// Small pill-shaped category tag.

import { cn } from "@/lib/utils";
import { getCategoryBySlug } from "@/lib/categories";

interface CategoryPillProps {
  slug: string;
  className?: string;
  showEmoji?: boolean;
}

export default function CategoryPill({
  slug,
  className,
  showEmoji = false,
}: CategoryPillProps) {
  const category = getCategoryBySlug(slug);
  const name = category?.name ?? slug;
  const emoji = category?.emoji;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
        "bg-glass-light border border-glass-border text-text-secondary",
        "transition-colors hover:text-text-primary hover:border-accent/30",
        className
      )}
    >
      {showEmoji && emoji && <span>{emoji}</span>}
      {name}
    </span>
  );
}
