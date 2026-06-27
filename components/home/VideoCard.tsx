// ===========================================
// PrivateVideos - Video Card Component
// ===========================================
// Netflix-style video card with thumbnail, hover controls, list toggle,
// match score, duration, and optional progress bar.

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Clock, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDuration, getProgressPercentage } from "@/lib/utils";
import MatchBadge from "@/components/shared/MatchBadge";
import ThumbnailFallback from "@/components/shared/ThumbnailFallback";
import { useAppStore } from "@/store/useStore";
import type { VideoType } from "@/types";

interface VideoCardProps {
  video: VideoType;
  progress?: number;
  showProgress?: boolean;
  index?: number;
  variant?: "row" | "grid";
}

export default function VideoCard({
  video,
  progress,
  showProgress = false,
  index = 0,
  variant = "row",
}: VideoCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isUpdatingList, setIsUpdatingList] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const addToMyList = useAppStore((state) => state.addToMyList);
  const removeFromMyList = useAppStore((state) => state.removeFromMyList);
  const isInMyList = useAppStore((state) => state.myList.includes(video.id));

  const progressPercent = showProgress
    ? getProgressPercentage(progress ?? 0, video.duration)
    : 0;

  const handleToggleMyList = async () => {
    if (isUpdatingList) return;

    setIsUpdatingList(true);
    try {
      if (isInMyList) {
        await removeFromMyList(video.id);
        toast.success("Removed from My List");
      } else {
        await addToMyList(video.id);
        toast.success("Added to My List");
      }
    } catch {
      toast.error("Could not update My List");
    } finally {
      setIsUpdatingList(false);
    }
  };

  return (
    <div
      className={cn(
        "video-card group",
        variant === "grid"
          ? "w-full"
          : "flex-shrink-0 w-[46vw] max-w-[190px] sm:w-[200px] sm:max-w-none md:w-[240px] lg:w-[280px]"
      )}
      style={{ animationDelay: `${index * 0.05}s` }}
      onMouseEnter={() => setIsPreviewing(true)}
      onMouseLeave={() => setIsPreviewing(false)}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-secondary">
        <Link
          href={`/watch/${video.id}`}
          className="absolute inset-0"
          aria-label={`Watch ${video.title}`}
        >
          {imageError ? (
            <ThumbnailFallback
              title={video.title}
              seed={video.id}
              className="transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <Image
              src={video.thumbnailUrl}
              alt={video.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 640px) 46vw, (max-width: 768px) 200px, (max-width: 1024px) 240px, 280px"
              onError={() => setImageError(true)}
            />
          )}
        </Link>

        {video.trailerUrl && (
          <video
            src={video.trailerUrl}
            muted
            loop
            playsInline
            autoPlay={isPreviewing}
            className={cn(
              "absolute inset-0 hidden h-full w-full object-cover transition-opacity duration-300 md:block",
              isPreviewing ? "opacity-100" : "opacity-0"
            )}
          />
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleToggleMyList();
          }}
          disabled={isUpdatingList}
          className={cn(
            "absolute right-1.5 top-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/70",
            isInMyList && "border-white/70 bg-white text-black",
            isUpdatingList && "cursor-wait opacity-60"
          )}
          aria-label={isInMyList ? "Remove from My List" : "Add to My List"}
        >
          {isInMyList ? <Check size={13} /> : <Plus size={13} />}
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-end bg-gradient-to-t from-black/70 via-black/5 to-transparent p-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <span className="flex items-center gap-1 text-[11px] text-text-secondary">
            <Clock size={12} />
            {formatDuration(video.duration)}
          </span>
        </div>

        {/* Progress Bar (for Continue Watching) */}
        {showProgress && progressPercent > 0 && (
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Card Info */}
      <Link href={`/watch/${video.id}`} className="block mt-2 px-0.5">
        <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-white transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center gap-2 mt-0.5">
          <MatchBadge score={video.matchScore || 85} size="sm" />
          {video.categories?.[0] && (
            <span className="text-xs text-text-muted">
              {video.categories[0]}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
