// ===========================================
// StreamVault - Continue Watching Card
// ===========================================
// Special card variant for "Continue Watching" row
// with prominent progress bar and resume button.

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { formatDuration, getProgressPercentage } from "@/lib/utils";
import ThumbnailFallback from "@/components/shared/ThumbnailFallback";
import type { VideoType } from "@/types";

interface ContinueWatchingCardProps {
  video: VideoType;
  progress: number;
  index?: number;
}

export default function ContinueWatchingCard({
  video,
  progress,
  index = 0,
}: ContinueWatchingCardProps) {
  const [imageError, setImageError] = useState(false);
  const percent = getProgressPercentage(progress, video.duration);
  const remaining = video.duration - progress;

  return (
    <div
      className="video-card flex-shrink-0 w-[200px] sm:w-[240px] md:w-[300px] group"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <Link href={`/watch/${video.id}?t=${Math.floor(progress)}`} className="block">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-secondary">
          {/* Thumbnail */}
          {imageError ? (
            <ThumbnailFallback title={video.title} seed={video.id} />
          ) : (
            <Image
              src={video.thumbnailUrl}
              alt={video.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 200px, (max-width: 768px) 240px, 300px"
              onError={() => setImageError(true)}
            />
          )}

          {/* Hover overlay with resume play */}
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <Play size={24} fill="black" className="text-black ml-1" />
            </div>
          </div>

          {/* Time remaining */}
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-xs font-medium">
            {formatDuration(remaining)} left
          </div>

          {/* Progress bar */}
          <div className="progress-bar h-[4px]">
            <div
              className="progress-bar-fill"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Title */}
        <p className="mt-2 text-sm font-medium text-text-secondary group-hover:text-text-primary truncate transition-colors">
          {video.title}
        </p>
      </Link>
    </div>
  );
}
