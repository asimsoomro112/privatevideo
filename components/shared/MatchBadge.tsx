// ===========================================
// StreamVault - Match Score Badge
// ===========================================
// Displays a green match percentage badge (Netflix-style).

import { cn } from "@/lib/utils";

interface MatchBadgeProps {
  score: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function MatchBadge({
  score,
  className,
  size = "md",
}: MatchBadgeProps) {
  // Determine color based on score
  const color =
    score >= 75
      ? "text-success" // Green for high match
      : score >= 50
        ? "text-warning" // Yellow for medium
        : "text-text-muted"; // Gray for low

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <span
      className={cn(
        "match-badge font-bold",
        color,
        sizeClasses[size],
        className
      )}
    >
      {score}% Match
    </span>
  );
}
