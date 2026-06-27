"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  Check,
  Clock,
  Heart,
  Loader2,
  Maximize2,
  Pause,
  Play,
  Plus,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import MatchBadge from "@/components/shared/MatchBadge";
import { useAppStore } from "@/store/useStore";
import { formatDuration, formatPlayerTime, getErrorMessage } from "@/lib/utils";
import type { VideoType } from "@/types";

interface ShortsFeedProps {
  videos: VideoType[];
}

// Tap-target & timing constants tuned for thumb interaction (44px Apple/Google minimum)
const TAP_TARGET = 44;
const DOUBLE_TAP_WINDOW_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 56;
const HOLD_TO_SPEED_DELAY_MS = 250;
const HOLD_SPEED_MULTIPLIER = 2;
const PROGRESS_SAVE_INTERVAL_MS = 5000;
const SCROLL_CANCEL_DISTANCE_PX = 14;

function getConnectionSpeedHint(): "slow" | "fast" {
  if (typeof navigator === "undefined") return "fast";
  // navigator.connection is not in the official TS DOM lib yet
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean };
  };
  const conn = nav.connection;
  if (!conn) return "fast";
  if (conn.saveData) return "slow";
  if (conn.effectiveType === "2g" || conn.effectiveType === "slow-2g" || conn.effectiveType === "3g") {
    return "slow";
  }
  return "fast";
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // no-op: vibration not supported/allowed
    }
  }
}

export default function ShortsFeed({ videos }: ShortsFeedProps) {
  const [activeVideoId, setActiveVideoId] = useState(videos[0]?.id ?? "");
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const activeIndex = Math.max(
    0,
    videos.findIndex((video) => video.id === activeVideoId)
  );

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

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 h-[100dvh] overflow-y-auto snap-y snap-mandatory bg-black [-webkit-overflow-scrolling:touch] [--shorts-nav-offset:5.5rem] [scrollbar-width:none] md:static md:h-[calc(100dvh-68px)] md:[--shorts-nav-offset:0rem]"
      style={{ overscrollBehaviorY: "contain" }}
    >
      {videos.map((video, index) => (
        <section
          key={video.id}
          ref={(node) => setItemRef(video.id, node)}
          data-video-id={video.id}
          className="relative mx-auto h-full w-full snap-start snap-always overflow-hidden bg-black md:max-w-[460px] md:border-x md:border-glass-border"
          style={{
            contentVisibility: "auto",
            containIntrinsicSize: "100dvh",
          }}
        >
          <ShortVideoItem
            video={video}
            active={activeVideoId === video.id}
            shouldLoad={Math.abs(index - activeIndex) <= 1}
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
  shouldLoad,
  onEnded,
}: {
  video: VideoType;
  active: boolean;
  shouldLoad: boolean;
  onEnded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const lastSaveRef = useRef(0);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(
    null
  );
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const wasHoldSpeedRef = useRef(false);
  const didMoveRef = useRef(false);
  const tapPositionRef = useRef<{ x: number; y: number } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [isUpdatingList, setIsUpdatingList] = useState(false);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [isHoldSpeeding, setIsHoldSpeeding] = useState(false);
  const [heartBurst, setHeartBurst] = useState<{ x: number; y: number; key: number } | null>(
    null
  );
  const [hasError, setHasError] = useState(false);

  const addToMyList = useAppStore((state) => state.addToMyList);
  const removeFromMyList = useAppStore((state) => state.removeFromMyList);
  const isInMyList = useAppStore((state) => state.myList.includes(video.id));

  const sourceUrl = video.hlsUrl || video.streamUrl;

  // ---- HLS / source setup (unchanged streaming logic, network-aware buffering) ----
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    let hls: import("hls.js").default | null = null;
    let cancelled = false;

    if (!shouldLoad) {
      videoElement.pause();
      videoElement.removeAttribute("src");
      videoElement.load();
      setIsPlaying(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(videoElement.readyState < 3);
    setHasError(false);

    const initialize = async () => {
      if (sourceUrl.includes(".m3u8")) {
        try {
          const Hls = (await import("hls.js")).default;
          if (cancelled) return;

          if (Hls.isSupported()) {
            const speedHint = getConnectionSpeedHint();
            hls = new Hls({
              enableWorker: true,
              maxBufferLength: speedHint === "slow" ? 6 : 10,
              backBufferLength: 5,
              startLevel: speedHint === "slow" ? 0 : -1,
            });
            hls.loadSource(sourceUrl);
            hls.attachMedia(videoElement);
            hls.on(Hls.Events.MANIFEST_PARSED, () => setIsLoading(false));
            hls.on(Hls.Events.ERROR, (_event, data) => {
              if (data.fatal) {
                videoElement.src = video.streamUrl;
                setHasError(false);
              }
            });
          } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
            videoElement.src = sourceUrl;
          } else {
            videoElement.src = video.streamUrl;
          }
        } catch {
          videoElement.src = video.streamUrl;
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
  }, [shouldLoad, sourceUrl, video.streamUrl]);

  // ---- Active / mute sync ----
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !shouldLoad) return;

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
  }, [active, isMuted, shouldLoad]);

  // Reset transient UI state whenever the item becomes inactive (avoids stuck overlays on fast scroll)
  useEffect(() => {
    if (!active) {
      setChromeHidden(false);
      setIsHoldSpeeding(false);
      wasHoldSpeedRef.current = false;
      didMoveRef.current = false;
      lastTapRef.current = null;
      if (videoRef.current) videoRef.current.playbackRate = 1;
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
    }
  }, [active]);

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
    vibrate(10);
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
    if (now - lastSaveRef.current < PROGRESS_SAVE_INTERVAL_MS) return;
    lastSaveRef.current = now;

    fetch(`/api/videos/${video.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        progress: videoElement.currentTime,
        duration: videoElement.duration || duration,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [duration, video.id]);

  const handleToggleMyList = useCallback(
    async (event?: React.MouseEvent) => {
      event?.stopPropagation();
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
    },
    [addToMyList, isInMyList, isUpdatingList, removeFromMyList, video.id]
  );

  // ---- Seek bar (unchanged logic, kept as pointer-based scrubbing) ----
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

  // ---- Double-tap-to-like + press-and-hold-to-2x-speed + single-tap play/pause ----
  // These three gestures share the same pointer area, so they're coordinated together
  // to avoid conflicting triggers (e.g. a hold shouldn't also register as a tap).
  const triggerLike = useCallback(
    (x: number, y: number) => {
      vibrate(15);
      setHeartBurst({ x, y, key: Date.now() });
      if (!isInMyList) {
        handleToggleMyList();
      }
    },
    [handleToggleMyList, isInMyList]
  );

  const handlePointerDownOnVideo = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      tapPositionRef.current = { x: event.clientX, y: event.clientY };
      didMoveRef.current = false;

      holdTimeoutRef.current = setTimeout(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;
        wasHoldSpeedRef.current = true;
        videoElement.playbackRate = HOLD_SPEED_MULTIPLIER;
        setIsHoldSpeeding(true);
        vibrate(20);
      }, HOLD_TO_SPEED_DELAY_MS);
    },
    []
  );

  const handlePointerMoveOnVideo = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const tapPosition = tapPositionRef.current;
      if (!tapPosition) return;

      const deltaX = Math.abs(event.clientX - tapPosition.x);
      const deltaY = Math.abs(event.clientY - tapPosition.y);

      if (
        deltaX < SCROLL_CANCEL_DISTANCE_PX &&
        deltaY < SCROLL_CANCEL_DISTANCE_PX
      ) {
        return;
      }

      didMoveRef.current = true;
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
    },
    []
  );

  const handlePointerUpOnVideo = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }

      const videoElement = videoRef.current;

      if (didMoveRef.current) {
        didMoveRef.current = false;
        tapPositionRef.current = null;
        return;
      }

      if (wasHoldSpeedRef.current) {
        // This was a hold-to-speed gesture, not a tap; restore normal speed.
        if (videoElement) videoElement.playbackRate = 1;
        wasHoldSpeedRef.current = false;
        setIsHoldSpeeding(false);
        tapPositionRef.current = null;
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const tapX = event.clientX - rect.left;
      const tapY = event.clientY - rect.top;
      const now = Date.now();
      const lastTap = lastTapRef.current;
      const isCloseDoubleTap =
        lastTap &&
        now - lastTap.time < DOUBLE_TAP_WINDOW_MS &&
        Math.abs(lastTap.x - tapX) < DOUBLE_TAP_DISTANCE_PX &&
        Math.abs(lastTap.y - tapY) < DOUBLE_TAP_DISTANCE_PX;

      if (isCloseDoubleTap) {
        triggerLike(tapX, tapY);
        lastTapRef.current = null;
        tapPositionRef.current = null;
        return;
      }

      lastTapRef.current = { time: now, x: tapX, y: tapY };

      // Single tap: wait briefly in case a second tap follows; otherwise toggle play
      // and, if chrome is hidden, reveal it first (so the first tap after hiding never
      // accidentally pauses without feedback).
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
      }
      singleTapTimeoutRef.current = setTimeout(() => {
        const stillSingleTap =
          lastTapRef.current && lastTapRef.current.time === now;
        if (stillSingleTap) {
          if (chromeHidden) {
            setChromeHidden(false);
          } else {
            togglePlay();
          }
          lastTapRef.current = null;
        }
        singleTapTimeoutRef.current = null;
      }, DOUBLE_TAP_WINDOW_MS);
      tapPositionRef.current = null;
    },
    [chromeHidden, togglePlay, triggerLike]
  );

  const handlePointerCancelOnVideo = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (wasHoldSpeedRef.current && videoRef.current) {
      videoRef.current.playbackRate = 1;
    }
    wasHoldSpeedRef.current = false;
    didMoveRef.current = false;
    tapPositionRef.current = null;
    setIsHoldSpeeding(false);
  }, []);

  const toggleChromeHidden = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setChromeHidden((value) => !value);
  }, []);

  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    };
  }, []);

  const progressPercent =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const showBuffering = active && isLoading && !hasError;
  const showPausedOverlay = !isPlaying && !isLoading && !chromeHidden && !isHoldSpeeding;

  const posterSrc = useMemo(
    () => video.posterUrl || video.thumbnailUrl,
    [video.posterUrl, video.thumbnailUrl]
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        poster={posterSrc}
        muted={isMuted}
        playsInline
        preload={active ? "auto" : shouldLoad ? "metadata" : "none"}
        className="absolute inset-x-0 top-0 h-[calc(100%-var(--shorts-nav-offset))] w-full bg-black object-contain md:inset-0 md:h-full"
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
        onError={() => setHasError(true)}
      />

      {/* Gesture capture layer: tap / double-tap / press-hold, sits above video, below UI chrome */}
      <div
        className="absolute inset-0 z-[5] touch-manipulation select-none"
        onPointerDown={handlePointerDownOnVideo}
        onPointerMove={handlePointerMoveOnVideo}
        onPointerUp={handlePointerUpOnVideo}
        onPointerCancel={handlePointerCancelOnVideo}
        onPointerLeave={handlePointerCancelOnVideo}
        role="button"
        aria-label={isPlaying ? "Pause video" : "Play video"}
      />

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/75 via-black/20 to-transparent transition-opacity duration-200 ${
          chromeHidden ? "opacity-0" : "opacity-100"
        }`}
      />

      {showBuffering && (
        <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center">
          <Loader2 size={30} className="animate-spin text-white/80" />
        </div>
      )}

      {hasError && active && (
        <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center px-8 text-center">
          <p className="text-sm text-white/70">
            This video couldn&apos;t load. Swipe to continue.
          </p>
        </div>
      )}

      {showPausedOverlay && !hasError && (
        <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
            <Play size={34} fill="white" className="ml-1 text-white" />
          </div>
        </div>
      )}

      {isHoldSpeeding && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-[6] -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center gap-1.5 rounded-full bg-black/55 px-4 py-2 text-white backdrop-blur-md">
            <Zap size={16} fill="white" />
            <span className="text-sm font-semibold tabular-nums">2x</span>
          </div>
        </div>
      )}

      {heartBurst && (
        <HeartBurst
          key={heartBurst.key}
          x={heartBurst.x}
          y={heartBurst.y}
          onDone={() => setHeartBurst(null)}
        />
      )}

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pr-16 text-white transition-all duration-200 md:px-5 md:pr-20 ${
          chromeHidden ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"
        }`}
        style={{
          paddingBottom:
            "calc(var(--shorts-nav-offset) + 2.75rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
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

      <div
        className={`absolute right-3 top-3 z-20 flex flex-col items-center gap-2.5 transition-all duration-200 md:right-4 md:top-4 ${
          chromeHidden
            ? "pointer-events-none translate-x-4 opacity-0"
            : "pointer-events-auto translate-x-0 opacity-100"
        }`}
        style={{ top: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
      >
        <ChromeButton
          onClick={(event) => {
            event.stopPropagation();
            toggleMute();
          }}
          ariaLabel={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </ChromeButton>

        <ChromeButton
          onClick={(event) => {
            event.stopPropagation();
            togglePlay();
          }}
          ariaLabel={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause size={20} fill="white" />
          ) : (
            <Play size={20} fill="white" className="ml-0.5" />
          )}
        </ChromeButton>

        <ChromeButton
          onClick={handleToggleMyList}
          disabled={isUpdatingList}
          ariaLabel={isInMyList ? "Remove from My List" : "Add to My List"}
        >
          {isInMyList ? <Check size={20} /> : <Plus size={20} />}
        </ChromeButton>

        <ChromeButton
          onClick={toggleChromeHidden}
          ariaLabel={chromeHidden ? "Show overlay" : "Hide overlay"}
        >
          <Heart
            size={20}
            fill={isInMyList ? "currentColor" : "none"}
            className={isInMyList ? "text-accent" : ""}
          />
        </ChromeButton>

        <Link
          href={`/watch/${video.id}`}
          onClick={(event) => event.stopPropagation()}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition active:scale-90 hover:bg-accent-hover"
          style={{ minWidth: TAP_TARGET, minHeight: TAP_TARGET }}
          aria-label={`Open ${video.title}`}
        >
          <Maximize2 size={19} />
        </Link>
      </div>

      <div
        ref={seekBarRef}
        className={`absolute inset-x-3 z-30 flex h-9 cursor-pointer touch-none items-center transition-opacity duration-200 ${
          chromeHidden
            ? "pointer-events-none opacity-0"
            : "pointer-events-auto opacity-100"
        }`}
        style={{
          bottom:
            "calc(var(--shorts-nav-offset) + 0.5rem + env(safe-area-inset-bottom, 0px))",
        }}
        onPointerDown={handleSeekPointerDown}
        onPointerMove={handleSeekPointerMove}
        onPointerUp={handleSeekPointerEnd}
        onPointerCancel={handleSeekPointerEnd}
        onClick={(event) => event.stopPropagation()}
        aria-label="Seek short video"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
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

/** Shared 44x44 tap-target wrapper for the right-rail icon buttons. */
function ChromeButton({
  children,
  onClick,
  ariaLabel,
  disabled,
}: {
  children: React.ReactNode;
  onClick: (event: React.MouseEvent) => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{ minWidth: TAP_TARGET, minHeight: TAP_TARGET }}
      className="flex items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition active:scale-90 hover:bg-black/60 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

/** Brief heart-burst animation rendered at the double-tap point, then self-removes. */
function HeartBurst({
  x,
  y,
  onDone,
}: {
  x: number;
  y: number;
  onDone: () => void;
}) {
  useEffect(() => {
    const timeout = setTimeout(onDone, 700);
    return () => clearTimeout(timeout);
  }, [onDone]);

  return (
    <div
      className="pointer-events-none absolute z-[7]"
      style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
    >
      <Heart
        size={84}
        fill="white"
        className="text-white drop-shadow-lg [animation:shorts-heart-burst_700ms_ease-out_forwards]"
      />
      <style jsx>{`
        @keyframes shorts-heart-burst {
          0% {
            transform: scale(0.4);
            opacity: 0;
          }
          25% {
            transform: scale(1.15);
            opacity: 1;
          }
          45% {
            transform: scale(0.95);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
