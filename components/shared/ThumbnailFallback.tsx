import type { CSSProperties } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

type ThumbnailFallbackProps = {
  title: string;
  seed?: string;
  className?: string;
  compact?: boolean;
};

function hashSeed(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function buildStyle(seed: string): CSSProperties {
  const hash = hashSeed(seed || "video");
  const hue = hash % 360;
  const secondHue = (hue + 48) % 360;

  return {
    background: [
      `linear-gradient(135deg, hsl(${hue} 52% 9%), hsl(${secondHue} 54% 14%))`,
      `linear-gradient(35deg, hsl(${hue} 88% 48% / 0.22), transparent 46%)`,
      `linear-gradient(160deg, transparent 52%, hsl(${secondHue} 86% 56% / 0.18))`,
    ].join(", "),
  };
}

export default function ThumbnailFallback({
  title,
  seed,
  className,
  compact = false,
}: ThumbnailFallbackProps) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full overflow-hidden bg-bg-secondary text-white",
        compact ? "items-center justify-center p-1" : "items-end p-3",
        className
      )}
      style={buildStyle(seed || title)}
      aria-label={`${title} thumbnail`}
      role="img"
    >
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12)_0,rgba(255,255,255,0)_34%,rgba(255,255,255,0.08)_72%,rgba(255,255,255,0)_100%)] opacity-45" />

      <div
        className={cn(
          "relative z-10 min-w-0",
          compact ? "flex items-center justify-center" : "w-full"
        )}
      >
        <div
          className={cn(
            "mb-2 flex items-center justify-center rounded-full bg-white/14 backdrop-blur-sm",
            compact ? "mb-0 h-7 w-7" : "h-9 w-9"
          )}
        >
          <Play
            size={compact ? 14 : 18}
            fill="white"
            className="ml-0.5 text-white"
          />
        </div>

        {!compact && (
          <p className="line-clamp-2 text-sm font-semibold leading-tight drop-shadow">
            {title}
          </p>
        )}
      </div>
    </div>
  );
}
