// ===========================================
// PrivateVideos - Video Row Component
// ===========================================
// Horizontal scrolling row of video cards with
// drag-scroll, arrow navigation, and row title.

"use client";

import { useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import VideoCard from "./VideoCard";
import type { VideoType, WatchHistoryType } from "@/types";

interface VideoRowProps {
  title: string;
  videos: VideoType[];
  emoji?: string;
  watchHistory?: WatchHistoryType[]; // For continue watching row
  showProgress?: boolean;
}

export default function VideoRow({
  title,
  videos,
  emoji,
  watchHistory,
  showProgress = false,
}: VideoRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Scroll by a set amount
  const scroll = useCallback((direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  // Update arrow visibility on scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  if (!videos || videos.length === 0) return null;

  return (
    <section className="mb-8 md:mb-10 group/row">
      {/* Row Title */}
      <div className="container-fluid mb-3">
        <h2 className="text-lg md:text-xl font-bold text-text-primary flex items-center gap-2 group-hover/row:text-white transition-colors">
          {emoji && <span>{emoji}</span>}
          {title}
          <ChevronRight
            size={20}
            className="text-text-muted opacity-0 group-hover/row:opacity-100 transition-all duration-300 -translate-x-2 group-hover/row:translate-x-0"
          />
        </h2>
      </div>

      {/* Scrollable Cards Container */}
      <div className="relative group/scroll">
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          className={cn(
            "absolute left-0 top-0 bottom-4 z-30 w-12 md:w-16",
            "bg-gradient-to-r from-bg-primary/90 to-transparent",
            "flex items-center justify-start pl-2",
            "opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300",
            !showLeftArrow && "hidden"
          )}
          aria-label="Scroll left"
        >
          <ChevronLeft size={32} className="text-white drop-shadow-lg" />
        </button>

        {/* Cards */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="scroll-row container-fluid gap-2 md:gap-3"
        >
          {videos.map((video, index) => {
            const historyEntry = watchHistory?.find(
              (h) => h.videoId === video.id
            );
            return (
              <VideoCard
                key={video.id}
                video={video}
                index={index}
                showProgress={showProgress}
                progress={historyEntry?.progress}
              />
            );
          })}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          className={cn(
            "absolute right-0 top-0 bottom-4 z-30 w-12 md:w-16",
            "bg-gradient-to-l from-bg-primary/90 to-transparent",
            "flex items-center justify-end pr-2",
            "opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300",
            !showRightArrow && "hidden"
          )}
          aria-label="Scroll right"
        >
          <ChevronRight size={32} className="text-white drop-shadow-lg" />
        </button>
      </div>
    </section>
  );
}
