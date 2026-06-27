"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Clock,
  Loader2,
  Maximize2,
  Pause,
  Play,
  Plus,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import MatchBadge from "@/components/shared/MatchBadge";
import { useAppStore } from "@/store/useStore";
import { formatDuration, getErrorMessage } from "@/lib/utils";
import type { VideoType } from "@/types";

interface ShortsFeedProps {
  videos: VideoType[];
}

export default function ShortsFeed({ videos }: ShortsFeedProps) {
  const [activeVideoId, setActiveVideoId] = useState(videos[0]?.id ?? "");
  const itemRefs = useRef(new Map<string, HTMLElement>());

  const setItemRef = useCallback((id: string, node: HTMLElement | null) => {
    if (node) {
      itemRefs.current.set(id, node);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        const videoId = visible?.target.getAttribute("data-video-id");
        if (videoId) setActiveVideoId(videoId);
      },
      { threshold: [0.6, 0.75, 0.9] }
    );

    const nodes = Array.from(itemRefs.current.values());
    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [videos]);

  const scrollToNext = useCallback(
    (id: string) => {
      const currentIndex = videos.findIndex((video) => video.id === id);
      const nextVideo = videos[currentIndex + 1];
      if (!nextVideo) return;

      itemRefs.current.get(nextVideo.id)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    },
    [videos]
  );

  return (
    <div className="h-[calc(100svh-3.5rem-5rem)] overflow-y-auto snap-y snap-mandatory bg-black md:h-[calc(100svh-68px)]">
      {videos.map((video, index) => (
        <section
          key={video.id}
          ref={(node) => setItemRef(video.id, node)}
          data-video-id={video.id}
          className="relative mx-auto h-full w-full snap-start snap-always overflow-hidden bg-black md:max-w-[460px] md:border-x md:border-glass-border"
        >
          <ShortVideoItem
            video={video}
            active={activeVideoId === video.id}
            index={index}
            onEnded={() => scrollToNext(video.id)}
          />
        </section>
      ))}
    </div>
  );
}

function ShortVideoItem({
  video,
  active,
  index,
  onEnded,
}: {
  video: VideoType;
  active: boolean;
  index: number;
  onEnded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSaveRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [isUpdatingList, setIsUpdatingList] = useState(false);

  const addToMyList = useAppStore((state) => state.addToMyList);
  const removeFromMyList = useAppStore((state) => state.removeFromMyList);
  const isInMyList = useAppStore((state) => state.myList.includes(video.id));

  const sourceUrl = video.hlsUrl || video.cloudinaryUrl;

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    let hls: import("hls.js").default | null = null;
    let cancelled = false;

    setIsLoading(true);

    const initialize = async () => {
      if (sourceUrl.includes(".m3u8")) {
        try {
          const Hls = (await import("hls.js")).default;
          if (cancelled) return;

          if (Hls.isSupported()) {
            hls = new Hls({
              enableWorker: true,
              maxBufferLength: 20,
              startLevel: -1,
            });
            hls.loadSource(sourceUrl);
            hls.attachMedia(videoElement);
            hls.on(Hls.Events.MANIFEST_PARSED, () => setIsLoading(false));
            hls.on(Hls.Events.ERROR, (_event, data) => {
              if (data.fatal) {
                videoElement.src = video.cloudinaryUrl;
              }
            });
          } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
            videoElement.src = sourceUrl;
          } else {
            videoElement.src = video.cloudinaryUrl;
          }
        } catch {
          videoElement.src = video.cloudinaryUrl;
        }
      } else {
        videoElement.src = sourceUrl;
      }
    };

    initialize();

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [sourceUrl, video.cloudinaryUrl]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.muted = isMuted;

    if (!active) {
      videoElement.pause();
      setIsPlaying(false);
      return;
    }

    const play = async () => {
      try {
        await videoElement.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    };

    play();
  }, [active, isMuted]);

  const togglePlay = useCallback(async () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (videoElement.paused) {
      try {
        await videoElement.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      videoElement.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((value) => {
      const nextValue = !value;
      if (videoRef.current) videoRef.current.muted = nextValue;
      return nextValue;
    });
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    setCurrentTime(videoElement.currentTime);

    const now = Date.now();
    if (now - lastSaveRef.current < 5000) return;
    lastSaveRef.current = now;

    fetch(`/api/videos/${video.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        progress: videoElement.currentTime,
        duration: videoElement.duration || duration,
      }),
    }).catch(() => {});
  }, [duration, video.id]);

  const handleToggleMyList = async (event: React.MouseEvent) => {
    event.stopPropagation();
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
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update My List"));
    } finally {
      setIsUpdatingList(false);
    }
  };

  const progressPercent =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      className="group relative h-full w-full cursor-pointer overflow-hidden bg-black"
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        poster={video.posterUrl || video.thumbnailUrl}
        muted={isMuted}
        playsInline
        preload={index <= 1 ? "auto" : "metadata"}
        className="h-full w-full object-cover"
        onLoadedMetadata={() => {
          const videoElement = videoRef.current;
          if (videoElement?.duration) setDuration(videoElement.duration);
        }}
        onCanPlay={() => setIsLoading(false)}
        onWaiting={() => setIsLoading(true)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={onEnded}
        onTimeUpdate={handleTimeUpdate}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/25" />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={30} className="animate-spin text-white/80" />
        </div>
      )}

      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
            <Play size={34} fill="white" className="ml-1 text-white" />
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pr-20 pb-5 text-white md:px-5 md:pr-24 md:pb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-white/75">
          <MatchBadge score={video.matchScore || 85} size="sm" />
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatDuration(video.duration)}
          </span>
        </div>
        <h1 className="line-clamp-2 text-lg font-bold leading-tight md:text-xl">
          {video.title}
        </h1>
        {video.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/75">
            {video.description}
          </p>
        )}
      </div>

      <div className="absolute bottom-5 right-3 z-20 flex flex-col items-center gap-3 md:right-4 md:bottom-6">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleMute();
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            togglePlay();
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause size={20} fill="white" />
          ) : (
            <Play size={20} fill="white" className="ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={handleToggleMyList}
          disabled={isUpdatingList}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65 disabled:opacity-60"
          aria-label={isInMyList ? "Remove from My List" : "Add to My List"}
        >
          {isInMyList ? <Check size={20} /> : <Plus size={20} />}
        </button>

        <Link
          href={`/watch/${video.id}`}
          onClick={(event) => event.stopPropagation()}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition hover:bg-accent-hover"
          aria-label={`Open ${video.title}`}
        >
          <Maximize2 size={19} />
        </Link>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 h-1 bg-white/15">
        <div
          className="h-full bg-accent transition-[width]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
