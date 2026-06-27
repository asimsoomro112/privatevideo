// ===========================================
// StreamVault - Video Card Component
// ===========================================
// Netflix-style video card with thumbnail, hover controls, list toggle,
// match score, duration, and optional progress bar.

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Clock, Play, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDuration, getProgressPercentage } from "@/lib/utils";
import MatchBadge from "@/components/shared/MatchBadge";
import { useAppStore } from "@/store/useStore";
import type { VideoType } from "@/types";

const FALLBACK_THUMBNAIL =
  "https://res.cloudinary.com/demo/image/upload/c_fill,h_360,w_640/sample.jpg";

interface VideoCardProps {
  video: VideoType;
  progress?: number;
  showProgress?: boolean;
  index?: number;
}

export default function VideoCard({
  video,
  progress,
  showProgress = false,
  index = 0,
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
      className="video-card flex-shrink-0 w-[46vw] max-w-[190px] sm:w-[200px] sm:max-w-none md:w-[240px] lg:w-[280px] group"
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
          <Image
            src={imageError ? FALLBACK_THUMBNAIL : video.thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 46vw, (max-width: 768px) 200px, (max-width: 1024px) 240px, 280px"
            onError={() => setImageError(true)}
          />
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

        {/* Hover Overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent",
            "flex items-end justify-between p-3 pointer-events-none",
            "transition-opacity duration-300",
            "opacity-100 md:opacity-0 md:group-hover:opacity-100"
          )}
        >
          <div className="flex items-center gap-2 pointer-events-auto">
            <Link
              href={`/watch/${video.id}`}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-110 transition-transform"
              aria-label={`Play ${video.title}`}
            >
              <Play size={16} fill="black" className="text-black ml-0.5" />
            </Link>
            <button
              type="button"
              onClick={handleToggleMyList}
              disabled={isUpdatingList}
              className={cn(
                "w-9 h-9 rounded-full border-2 flex items-center justify-center transition-colors",
                isInMyList
                  ? "border-white bg-white text-black"
                  : "border-gray-400 hover:border-white text-white",
                isUpdatingList && "opacity-60 cursor-wait"
              )}
              aria-label={isInMyList ? "Remove from My List" : "Add to My List"}
            >
              {isInMyList ? <Check size={16} /> : <Plus size={16} />}
            </button>
          </div>

          <span className="text-xs text-text-secondary flex items-center gap-1">
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
