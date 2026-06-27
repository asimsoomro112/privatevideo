// ===========================================
// PrivateVideos - Hero Banner Component
// ===========================================
// Full-width cinematic hero with auto-playing muted video,
// gradient overlays, GSAP animations, and call-to-action buttons.

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Info, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import MatchBadge from "@/components/shared/MatchBadge";
import ThumbnailFallback from "@/components/shared/ThumbnailFallback";
import type { VideoType } from "@/types";

interface HeroBannerProps {
  video: VideoType;
}

export default function HeroBanner({ video }: HeroBannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // GSAP animation on mount
  useEffect(() => {
    const loadGsap = async () => {
      try {
        const { gsap } = await import("gsap");
        if (contentRef.current) {
          const elements = contentRef.current.children;
          gsap.fromTo(
            elements,
            { opacity: 0, y: 40 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              stagger: 0.15,
              ease: "power3.out",
              delay: 0.5,
            }
          );
        }
      } catch {
        // GSAP not available, graceful fallback
      }
    };
    loadGsap();
  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <section className="relative w-full h-[68svh] min-h-[420px] md:h-[90vh] overflow-hidden">
      {/* Background Video / Poster Fallback */}
      <div className="absolute inset-0">
        {/* Poster image (always shown as fallback) */}
        {imageError ? (
          <ThumbnailFallback
            title={video.title}
            seed={video.id}
            className={cn(
              "transition-opacity duration-1000",
              isVideoLoaded ? "opacity-0" : "opacity-100"
            )}
          />
        ) : (
          <Image
            src={video.posterUrl || video.thumbnailUrl}
            alt={video.title}
            fill
            priority
            className={cn(
              "object-cover transition-opacity duration-1000",
              isVideoLoaded ? "opacity-0" : "opacity-100"
            )}
            sizes="100vw"
            onError={() => setImageError(true)}
          />
        )}

        {/* Auto-playing trailer video */}
        {(video.trailerUrl || video.hlsUrl) && (
          <video
            ref={videoRef}
            src={video.trailerUrl || video.streamUrl}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onLoadedData={() => setIsVideoLoaded(true)}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000",
              isVideoLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        )}
      </div>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 hero-gradient-bottom" />
      <div className="absolute inset-0 hero-gradient-left" />

      {/* Content */}
      <div
        ref={contentRef}
        className="absolute bottom-[12%] md:bottom-[15%] left-0 container-fluid z-10 max-w-2xl"
      >
        {/* Match Score */}
        <div className="opacity-0">
          <MatchBadge score={video.matchScore || 95} size="lg" />
        </div>

        {/* Title */}
        <h1 className="opacity-0 text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-3 tracking-tight drop-shadow-2xl">
          {video.title}
        </h1>

        {/* Description */}
        <p className="opacity-0 text-sm md:text-base text-text-secondary max-w-lg mb-5 md:mb-6 line-clamp-2 md:line-clamp-3 drop-shadow-lg">
          {video.description || "An exclusive premium experience awaits. Dive into this curated content crafted for your pleasure."}
        </p>

        {/* Action Buttons */}
        <div className="opacity-0 grid grid-cols-2 items-center gap-3 xs:flex xs:flex-wrap">
          <Link
            href={`/watch/${video.id}`}
            className="btn-primary text-sm md:text-lg px-4 md:px-8 py-3"
            id="hero-play-btn"
          >
            <Play size={22} fill="white" />
            Play
          </Link>

          <Link
            href={`/watch/${video.id}`}
            className="btn-secondary text-sm md:text-lg px-4 md:px-8 py-3"
            id="hero-info-btn"
          >
            <Info size={22} />
            More Info
          </Link>
        </div>
      </div>

      {/* Mute toggle */}
      <button
        onClick={toggleMute}
        className="absolute bottom-[12%] right-4 md:right-8 z-10 w-10 h-10 rounded-full border border-glass-border bg-glass flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
        aria-label={isMuted ? "Unmute" : "Mute"}
        id="hero-mute-btn"
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </section>
  );
}
