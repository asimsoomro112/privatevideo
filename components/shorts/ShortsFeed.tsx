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
import { formatDuration, formatPlayerTime, getErrorMessage } from "@/lib/utils";
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
  const seekBarRef = useRef<HTMLDivElement>(null);
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

  const seekToClientX = useCallback(
    (clientX: number) => {
      const videoElement = videoRef.current;
      const seekBar = seekBarRef.current;
      const mediaDuration = duration || videoElement?.duration || 0;

      if (!videoElement || !seekBar || mediaDuration <= 0) return;

      const rect = seekBar.getBoundingClientRect();
      const percent = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );
      const nextTime = percent * mediaDuration;

      videoElement.currentTime = nextTime;
      setCurrentTime(nextTime);
    },
    [duration]
  );

  const handleSeekPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      seekToClientX(event.clientX);
    },
    [seekToClientX]
  );

  const handleSeekPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.buttons !== 1) return;
      event.stopPropagation();
      seekToClientX(event.clientX);
    },
    [seekToClientX]
  );

  const handleSeekPointerEnd = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    []
  );

  const progressPercent =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      className="group relative h-full w-full cursor-pointer touch-manipulation overflow-hidden bg-black"
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        poster={video.posterUrl || video.thumbnailUrl}
        muted={isMuted}
        playsInline
        preload={index <= 1 ? "auto" : "metadata"}
        className="h-full w-full bg-black object-contain"
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

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

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

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pr-16 pb-11 text-white md:px-5 md:pr-20 md:pb-12">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-white/70">
          <MatchBadge score={video.matchScore || 85} size="sm" />
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatDuration(video.duration)}
          </span>
          <span className="tabular-nums">
            {formatPlayerTime(currentTime)} / {formatPlayerTime(duration)}
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

      <div className="absolute right-3 top-3 z-20 flex flex-col items-center gap-2 md:right-4 md:top-4">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleMute();
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition hover:bg-black/60"
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
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition hover:bg-black/60"
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
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition hover:bg-black/60 disabled:opacity-60"
          aria-label={isInMyList ? "Remove from My List" : "Add to My List"}
        >
          {isInMyList ? <Check size={20} /> : <Plus size={20} />}
        </button>

        <Link
          href={`/watch/${video.id}`}
          onClick={(event) => event.stopPropagation()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition hover:bg-accent-hover"
          aria-label={`Open ${video.title}`}
        >
          <Maximize2 size={19} />
        </Link>
      </div>

      <div
        ref={seekBarRef}
        className="absolute inset-x-3 bottom-2 z-30 flex h-7 cursor-pointer touch-none items-center"
        onPointerDown={handleSeekPointerDown}
        onPointerMove={handleSeekPointerMove}
        onPointerUp={handleSeekPointerEnd}
        onPointerCancel={handleSeekPointerEnd}
        onClick={(event) => event.stopPropagation()}
        aria-label="Seek short video"
      >
        <div className="relative h-1.5 w-full rounded-full bg-white/20">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width]"
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-accent shadow-lg shadow-accent/40"
            style={{ left: `${progressPercent}%`, transform: "translate(-50%, -50%)" }}
          />
        </div>
      </div>
    </div>
  );
}
