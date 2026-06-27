// ===========================================
// PrivateVideos - Advanced Video Player
// ===========================================
// Custom HLS video player with adaptive bitrate streaming,
// custom controls, PiP, fullscreen, resume, and progress tracking.
// Mobile-optimized: touch gestures, safe-area insets, 44px tap targets,
// double-tap seek, press-and-hold 2x speed, network-aware buffering.

"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipForward,
  SkipBack,
  PictureInPicture2,
  Settings,
  ArrowLeft,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn, formatPlayerTime } from "@/lib/utils";
import { getRandomRomanticMessage } from "@/lib/romantic-messages";

interface VideoPlayerProps {
  hlsUrl: string;
  fallbackUrl?: string;
  posterUrl: string;
  title: string;
  videoId: string;
  initialProgress?: number;
  onProgressUpdate?: (progress: number) => void;
}

// Tap-target & timing constants tuned for thumb interaction (44px Apple/Google minimum)
const TAP_TARGET = 44;
const DOUBLE_TAP_WINDOW_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 72;
const HOLD_TO_SPEED_DELAY_MS = 250;
const HOLD_SPEED_MULTIPLIER = 2;
const SEEK_JUMP_SECONDS = 10;
const CONTROLS_AUTO_HIDE_MS = 3000;
const PROGRESS_SAVE_INTERVAL_MS = 5000;
const SCROLL_CANCEL_DISTANCE_PX = 14;
const SEEK_FLASH_MS = 450;
const SCRUB_COMMIT_SAVE_MS = 200;
const VOLUME_SWIPE_PIXELS = 180;
const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

interface QualityOption {
  index: number;
  label: string;
}

function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(pointer: coarse)").matches ?? false;
}

function getConnectionSpeedHint(): "slow" | "fast" {
  if (typeof navigator === "undefined") return "fast";
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

export default function VideoPlayer({
  hlsUrl,
  fallbackUrl,
  posterUrl,
  title,
  videoId,
  initialProgress = 0,
  onProgressUpdate,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrubFrameRef = useRef<number | null>(null);
  const volumeHudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressSaveRef = useRef(0);
  const pendingProgressRef = useRef(initialProgress);
  const wasHoldSpeedRef = useRef(false);
  const didStageMoveRef = useRef(false);
  const stagePointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const stageGestureModeRef = useRef<"seek" | "volume" | "move" | null>(null);
  const stageStartVolumeRef = useRef(1);
  const scrubWasPlayingRef = useRef(false);
  const scrubPreviewTimeRef = useRef(0);
  const isScrubbingRef = useRef(false);
  const lastTapRef = useRef<{
    time: number;
    x: number;
    y: number;
    side: "left" | "right";
  } | null>(null);

  const router = useRouter();
  const directPlaybackUrl = fallbackUrl || hlsUrl;

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [momentMessage, setMomentMessage] = useState("");
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isHoldSpeeding, setIsHoldSpeeding] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPreviewTime, setScrubPreviewTime] = useState<number | null>(null);
  const [seekFlash, setSeekFlash] = useState<"left" | "right" | null>(null);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
  const [selectedQuality, setSelectedQuality] = useState(-1);
  const [showVolumeHud, setShowVolumeHud] = useState(false);

  useEffect(() => {
    setIsTouchDevice(isCoarsePointer());
  }, []);

  const safePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return false;

    try {
      await video.play();
      setIsPlaying(true);
      setMomentMessage("");
      return true;
    } catch (error) {
      const name =
        error && typeof error === "object" && "name" in error
          ? String(error.name)
          : "";

      if (name !== "AbortError" && name !== "NotAllowedError") {
        console.warn("Video play failed:", error);
      }
      setIsPlaying(false);
      return false;
    }
  }, []);

  const retryPlayback = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    setReloadKey((value) => value + 1);
  }, []);

  // Initialize HLS.js for adaptive streaming
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: import("hls.js").default | null = null;
    let cancelled = false;

    setIsLoading(true);
    setHasError(false);
    setQualityOptions([]);
    setSelectedQuality(-1);
    hlsRef.current = null;

    const fallbackToDirectPlayback = () => {
      if (cancelled || !video) return;
      hls?.destroy();
      hls = null;
      hlsRef.current = null;
      setQualityOptions([]);
      setSelectedQuality(-1);
      setHasError(false);
      setIsLoading(true);

      if (video.src !== directPlaybackUrl) {
        video.pause();
        video.src = directPlaybackUrl;
        video.load();
      }
    };

    const initPlayer = async () => {
      // Check if the URL is HLS (m3u8)
      if (hlsUrl.includes(".m3u8")) {
        try {
          const Hls = (await import("hls.js")).default;
          if (Hls.isSupported()) {
            const speedHint = getConnectionSpeedHint();
            hls = new Hls({
              maxLoadingDelay: 4,
              maxBufferLength: speedHint === "slow" ? 15 : 30,
              maxBufferSize: speedHint === "slow" ? 30 * 1000 * 1000 : 60 * 1000 * 1000,
              enableWorker: true,
              startLevel: speedHint === "slow" ? 0 : -1, // Auto quality unless connection is slow
            });
            hlsRef.current = hls;
            hls.loadSource(hlsUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setIsLoading(false);
              setQualityOptions(
                hls?.levels.map((level, index) => ({
                  index,
                  label: level.height
                    ? `${level.height}p`
                    : `${Math.round((level.bitrate || 0) / 1000)} kbps`,
                })) || []
              );
              if (initialProgress > 0) {
                video.currentTime = initialProgress;
              }
            });

            hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
              if (hls?.autoLevelEnabled) {
                setSelectedQuality(-1);
              } else {
                setSelectedQuality(data.level);
              }
            });

            hls.on(Hls.Events.ERROR, (_event, data) => {
              if (data.fatal) {
                fallbackToDirectPlayback();
              }
            });
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            // Safari native HLS support
            video.src = hlsUrl;
            video.onerror = fallbackToDirectPlayback;
          }
        } catch {
          fallbackToDirectPlayback();
        }
      } else {
        // Non-HLS URL (direct mp4)
        video.src = hlsUrl;
      }
    };

    initPlayer();

    return () => {
      cancelled = true;
      video.onerror = null;
      hls?.destroy();
      if (hlsRef.current === hls) hlsRef.current = null;
    };
  }, [directPlaybackUrl, hlsUrl, initialProgress, reloadKey]);

  const persistProgress = useCallback(
    (time: number, keepalive = false) => {
      if (!Number.isFinite(time) || time < 0) return;

      const mediaDuration = videoRef.current?.duration || duration || 0;
      onProgressUpdate?.(time);

      fetch(`/api/videos/${videoId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress: time,
          duration: mediaDuration,
        }),
        keepalive,
      }).catch(() => {});
    },
    [duration, onProgressUpdate, videoId]
  );

  const saveProgress = useCallback(
    (
      time: number,
      options: { force?: boolean; keepalive?: boolean } = {}
    ) => {
      pendingProgressRef.current = time;

      const now = Date.now();
      if (
        !options.force &&
        now - lastProgressSaveRef.current < PROGRESS_SAVE_INTERVAL_MS
      ) {
        return;
      }

      lastProgressSaveRef.current = now;
      persistProgress(time, options.keepalive);
    },
    [persistProgress]
  );

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    saveProgress(video.currentTime);

    // Update buffered
    if (
      video.buffered.length > 0 &&
      Number.isFinite(video.duration) &&
      video.duration > 0
    ) {
      const buffered =
        (video.buffered.end(video.buffered.length - 1) / video.duration) * 100;
      setBufferedPercent(Math.min(100, Math.max(0, buffered)));
    }
  }, [saveProgress]);

  useEffect(() => {
    const flushProgress = () => {
      saveProgress(pendingProgressRef.current, {
        force: true,
        keepalive: true,
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushProgress();
    };

    window.addEventListener("pagehide", flushProgress);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flushProgress);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      flushProgress();
    };
  }, [saveProgress]);

  // Controls visibility: works for both mouse-move (desktop) and explicit taps (mobile)
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, CONTROLS_AUTO_HIDE_MS);
  }, [isPlaying]);

  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void safePlay();
    } else {
      video.pause();
      setIsPlaying(false);
      setMomentMessage(getRandomRomanticMessage());
    }
  }, [safePlay]);

  const handleTogglePlayClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      togglePlay();
    },
    [togglePlay]
  );

  useEffect(() => {
    if (isPlaying) {
      showControlsTemporarily();
    } else {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
      setShowControls(true);
    }
  }, [isPlaying, showControlsTemporarily]);

  useEffect(() => {
    if (!showControls) setShowSettings(false);
  }, [showControls]);

  const cycleSpeed = useCallback(() => {
    const nextSpeed =
      SPEED_OPTIONS[
        (SPEED_OPTIONS.indexOf(playbackRate) + 1) % SPEED_OPTIONS.length
      ];
    setPlaybackRate(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  }, [playbackRate]);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, []);

  const selectQuality = useCallback((level: number) => {
    const hls = hlsRef.current;
    if (!hls) return;

    hls.currentLevel = level;
    hls.nextLevel = level;
    setSelectedQuality(level);
  }, []);

  // Volume
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    vibrate(10);
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  }, []);

  const syncVolumeState = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setVolume(video.volume);
    setIsMuted(video.muted || video.volume === 0);
  }, []);

  const setVideoVolume = useCallback((nextVolume: number) => {
    const video = videoRef.current;
    if (!video) return;

    const clampedVolume = Math.max(0, Math.min(1, nextVolume));
    video.volume = clampedVolume;
    video.muted = clampedVolume === 0;
    setVolume(clampedVolume);
    setIsMuted(video.muted);
    setShowVolumeHud(true);

    if (volumeHudTimerRef.current) {
      clearTimeout(volumeHudTimerRef.current);
    }
    volumeHudTimerRef.current = setTimeout(() => {
      setShowVolumeHud(false);
    }, 650);
  }, []);

  // Fullscreen
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setIsFullscreen(true);
        // Lock to landscape on mobile when entering fullscreen, if supported.
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>;
        };
        if (isTouchDevice && orientation?.lock) {
          await orientation.lock("landscape");
        }
      } else {
        const orientation = screen.orientation as ScreenOrientation & {
          unlock?: () => void;
        };
        orientation?.unlock?.();
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen/orientation can be denied by the browser. Keep playback usable.
    }
  }, [isTouchDevice]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isPlayerFullscreen =
        document.fullscreenElement === containerRef.current;
      setIsFullscreen(isPlayerFullscreen);

      if (!document.fullscreenElement) {
        const orientation = screen.orientation as ScreenOrientation & {
          unlock?: () => void;
        };
        orientation?.unlock?.();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Picture-in-Picture
  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    if (!document.pictureInPictureEnabled || video.readyState < 1) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {
      // PiP can be denied by the browser or unavailable before metadata loads.
    }
  }, []);

  const getSeekTimeFromClientX = useCallback(
    (clientX: number, target?: HTMLElement | null) => {
      const video = videoRef.current;
      const bar = target || progressRef.current;
      const mediaDuration = duration || video?.duration || 0;

      if (!video || !bar || mediaDuration <= 0) return null;

      const rect = bar.getBoundingClientRect();
      const percent = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );
      return percent * mediaDuration;
    },
    [duration]
  );

  const previewSeekToClientX = useCallback(
    (clientX: number, target?: HTMLElement | null) => {
      const nextTime = getSeekTimeFromClientX(clientX, target);
      if (nextTime === null) return;

      scrubPreviewTimeRef.current = nextTime;
      if (scrubFrameRef.current !== null) return;

      scrubFrameRef.current = requestAnimationFrame(() => {
        scrubFrameRef.current = null;
        setScrubPreviewTime(scrubPreviewTimeRef.current);
      });
    },
    [getSeekTimeFromClientX]
  );

  const beginScrub = useCallback(() => {
    const video = videoRef.current;
    if (!video) return false;

    scrubWasPlayingRef.current = !video.paused;
    scrubPreviewTimeRef.current = video.currentTime;
    isScrubbingRef.current = true;
    setScrubPreviewTime(video.currentTime);
    setIsScrubbing(true);
    video.pause();
    return true;
  }, []);

  const commitScrub = useCallback(
    (resumeAfterCommit = scrubWasPlayingRef.current) => {
      const video = videoRef.current;
      if (!video) return;

      const nextTime = scrubPreviewTimeRef.current;
      video.currentTime = nextTime;
      setCurrentTime(nextTime);
      setScrubPreviewTime(null);
      isScrubbingRef.current = false;
      setIsScrubbing(false);
      saveProgress(nextTime, { force: true, keepalive: true });

      window.setTimeout(() => {
        if (resumeAfterCommit) void safePlay();
      }, SCRUB_COMMIT_SAVE_MS);
    },
    [safePlay, saveProgress]
  );

  const handleSeekPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      if (beginScrub()) {
        previewSeekToClientX(event.clientX);
      }
    },
    [beginScrub, previewSeekToClientX]
  );

  const handleSeekPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.buttons !== 1) return;
      event.stopPropagation();
      previewSeekToClientX(event.clientX);
    },
    [previewSeekToClientX]
  );

  const handleSeekPointerEnd = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (isScrubbingRef.current) commitScrub();
    },
    [commitScrub]
  );

  const jumpBy = useCallback(
    (deltaSeconds: number) => {
      const video = videoRef.current;
      if (!video) return;
      const mediaDuration = duration || video.duration || 0;
      const nextTime = Math.max(
        0,
        Math.min(mediaDuration, video.currentTime + deltaSeconds)
      );
      video.currentTime = nextTime;
      setCurrentTime(nextTime);
      saveProgress(nextTime);
    },
    [duration, saveProgress]
  );

  // ---- Mobile gesture layer: double-tap left/right to seek, press-hold for 2x ----
  // Desktop keeps its existing click-to-toggle + mousemove-to-reveal behavior;
  // this layer only changes behavior meaningfully on coarse (touch) pointers.
  const handleStageClick = useCallback(
    () => {
      if (isTouchDevice) return; // touch devices handle taps via pointer handlers below
      togglePlay();
    },
    [isTouchDevice, togglePlay]
  );

  const handleStagePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isTouchDevice) return;

      stagePointerStartRef.current = { x: event.clientX, y: event.clientY };
      stageGestureModeRef.current = null;
      stageStartVolumeRef.current = videoRef.current?.volume ?? volume;
      didStageMoveRef.current = false;

      holdTimeoutRef.current = setTimeout(() => {
        const video = videoRef.current;
        if (!video) return;
        wasHoldSpeedRef.current = true;
        video.playbackRate = HOLD_SPEED_MULTIPLIER;
        setIsHoldSpeeding(true);
        vibrate(20);
      }, HOLD_TO_SPEED_DELAY_MS);
    },
    [isTouchDevice, volume]
  );

  const handleStagePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isTouchDevice) return;

      const start = stagePointerStartRef.current;
      if (!start) return;

      const deltaX = Math.abs(event.clientX - start.x);
      const deltaY = Math.abs(event.clientY - start.y);
      const signedDeltaY = event.clientY - start.y;
      if (
        deltaX < SCROLL_CANCEL_DISTANCE_PX &&
        deltaY < SCROLL_CANCEL_DISTANCE_PX
      ) {
        return;
      }

      didStageMoveRef.current = true;
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }

      const container = containerRef.current;
      const rect = container?.getBoundingClientRect();

      if (!stageGestureModeRef.current) {
        const startedOnRightSide =
          rect && start.x - rect.left > rect.width * 0.58;

        if (startedOnRightSide && deltaY > deltaX * 1.1) {
          stageGestureModeRef.current = "volume";
          vibrate(8);
        } else if (deltaX > deltaY * 1.1) {
          stageGestureModeRef.current = "seek";
          beginScrub();
          vibrate(8);
        } else {
          stageGestureModeRef.current = "move";
        }
      }

      if (stageGestureModeRef.current === "volume") {
        const nextVolume =
          stageStartVolumeRef.current - signedDeltaY / VOLUME_SWIPE_PIXELS;
        setVideoVolume(nextVolume);
        showControlsTemporarily();
        return;
      }

      if (stageGestureModeRef.current === "seek") {
        previewSeekToClientX(event.clientX, container);
        showControlsTemporarily();
        return;
      }
    },
    [
      beginScrub,
      isTouchDevice,
      previewSeekToClientX,
      setVideoVolume,
      showControlsTemporarily,
    ]
  );

  const handleStagePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isTouchDevice) return;

      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }

      const video = videoRef.current;
      const gestureMode = stageGestureModeRef.current;

      if (gestureMode === "seek") {
        commitScrub(scrubWasPlayingRef.current);
        didStageMoveRef.current = false;
        stageGestureModeRef.current = null;
        stagePointerStartRef.current = null;
        return;
      }

      if (gestureMode === "volume" || gestureMode === "move") {
        didStageMoveRef.current = false;
        stageGestureModeRef.current = null;
        stagePointerStartRef.current = null;
        return;
      }

      if (didStageMoveRef.current) {
        didStageMoveRef.current = false;
        stageGestureModeRef.current = null;
        stagePointerStartRef.current = null;
        return;
      }

      if (wasHoldSpeedRef.current) {
        // Hold-to-speed gesture, not a tap; restore normal speed and stop here.
        if (video) video.playbackRate = playbackRate;
        wasHoldSpeedRef.current = false;
        setIsHoldSpeeding(false);
        stageGestureModeRef.current = null;
        stagePointerStartRef.current = null;
        return;
      }

      const container = containerRef.current;
      const rect = container?.getBoundingClientRect();
      const side: "left" | "right" =
        rect && event.clientX - rect.left < rect.width / 2 ? "left" : "right";
      const tapX = rect ? event.clientX - rect.left : event.clientX;
      const tapY = rect ? event.clientY - rect.top : event.clientY;

      const now = Date.now();
      const lastTap = lastTapRef.current;
      const isCloseDoubleTap =
        lastTap &&
        lastTap.side === side &&
        now - lastTap.time < DOUBLE_TAP_WINDOW_MS &&
        Math.abs(lastTap.x - tapX) < DOUBLE_TAP_DISTANCE_PX &&
        Math.abs(lastTap.y - tapY) < DOUBLE_TAP_DISTANCE_PX;

      if (isCloseDoubleTap) {
        vibrate(15);
        jumpBy(side === "left" ? -SEEK_JUMP_SECONDS : SEEK_JUMP_SECONDS);
        setSeekFlash(side);
        if (seekFlashTimerRef.current) {
          clearTimeout(seekFlashTimerRef.current);
        }
        seekFlashTimerRef.current = setTimeout(
          () => setSeekFlash(null),
          SEEK_FLASH_MS
        );
        lastTapRef.current = null;
        stagePointerStartRef.current = null;
        if (singleTapTimeoutRef.current) {
          clearTimeout(singleTapTimeoutRef.current);
          singleTapTimeoutRef.current = null;
        }
        showControlsTemporarily();
        return;
      }

      lastTapRef.current = { time: now, x: tapX, y: tapY, side };

      // Single tap: wait briefly for a possible second tap, otherwise reveal/toggle.
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
      }
      singleTapTimeoutRef.current = setTimeout(() => {
        const stillSingleTap = lastTapRef.current && lastTapRef.current.time === now;
        if (stillSingleTap) {
          if (!showControls) {
            showControlsTemporarily();
          } else {
            togglePlay();
          }
          lastTapRef.current = null;
        }
        singleTapTimeoutRef.current = null;
      }, DOUBLE_TAP_WINDOW_MS);
      stageGestureModeRef.current = null;
      stagePointerStartRef.current = null;
    },
    [
      commitScrub,
      isTouchDevice,
      jumpBy,
      playbackRate,
      showControls,
      showControlsTemporarily,
      togglePlay,
    ]
  );

  const handleStagePointerCancel = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (wasHoldSpeedRef.current && videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
    wasHoldSpeedRef.current = false;
    didStageMoveRef.current = false;
    stageGestureModeRef.current = null;
    stagePointerStartRef.current = null;
    isScrubbingRef.current = false;
    setIsScrubbing(false);
    setScrubPreviewTime(null);
    setIsHoldSpeeding(false);
  }, [playbackRate]);

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
      if (seekFlashTimerRef.current) clearTimeout(seekFlashTimerRef.current);
      if (volumeHudTimerRef.current) clearTimeout(volumeHudTimerRef.current);
      if (scrubFrameRef.current !== null) cancelAnimationFrame(scrubFrameRef.current);
    };
  }, []);

  // Keyboard shortcuts (desktop only; no-op on touch-only devices, harmless either way)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFullscreen();
          break;
        case "ArrowRight":
          jumpBy(SEEK_JUMP_SECONDS);
          break;
        case "ArrowLeft":
          jumpBy(-SEEK_JUMP_SECONDS);
          break;
        case "ArrowUp":
          if (videoRef.current) {
            const nextVolume = Math.min(1, videoRef.current.volume + 0.1);
            setVideoVolume(nextVolume);
          }
          break;
        case "ArrowDown":
          if (videoRef.current) {
            const nextVolume = Math.max(0, videoRef.current.volume - 0.1);
            setVideoVolume(nextVolume);
          }
          break;
        case "Escape":
          if (isFullscreen) toggleFullscreen();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    togglePlay,
    toggleMute,
    toggleFullscreen,
    isFullscreen,
    jumpBy,
    setVideoVolume,
  ]);

  const displayTime =
    isScrubbing && scrubPreviewTime !== null ? scrubPreviewTime : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;
  const bufferedScale = Math.min(1, Math.max(0, bufferedPercent / 100));
  const progressScale = Math.min(1, Math.max(0, progressPercent / 100));

  const posterSrc = useMemo(() => posterUrl, [posterUrl]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full bg-black group select-none",
        !isTouchDevice && "cursor-pointer",
        isTheaterMode && "fixed inset-0 z-[90]"
      )}
      onMouseMove={!isTouchDevice ? showControlsTemporarily : undefined}
      style={{ touchAction: "manipulation" }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        poster={posterSrc}
        playsInline
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setHasError(false);
            if (initialProgress > 0) {
              videoRef.current.currentTime = initialProgress;
            }
          }
        }}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => {
          setIsLoading(false);
          setHasError(false);
        }}
        onVolumeChange={syncVolumeState}
        onError={() => setHasError(true)}
        onPause={() => {
          const video = videoRef.current;
          setIsPlaying(false);
          if (video) {
            saveProgress(video.currentTime, { force: true, keepalive: true });
          }
          if (!videoRef.current?.ended && !isScrubbingRef.current) {
            setMomentMessage(getRandomRomanticMessage());
          }
        }}
        onPlay={() => {
          setIsPlaying(true);
          setMomentMessage("");
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (videoRef.current) {
            saveProgress(videoRef.current.currentTime, {
              force: true,
              keepalive: true,
            });
          }
          setMomentMessage(getRandomRomanticMessage());
        }}
      />

      <div
        className="absolute inset-0 z-10 touch-manipulation"
        onClick={handleStageClick}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={handleStagePointerCancel}
        onPointerLeave={handleStagePointerCancel}
        aria-hidden="true"
      />

      {/* Loading Spinner */}
      {isLoading && !hasError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-12 h-12 border-3 border-white/20 border-t-accent rounded-full animate-spin" />
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 px-8 text-center">
          <div className="max-w-xs">
            <p className="mb-4 text-sm text-white/75">
              This video couldn&apos;t load right now. Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                retryPlayback();
              }}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition active:scale-95 hover:bg-accent-hover"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Double-tap seek flash (left/right) */}
      {seekFlash && (
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 z-[15] flex w-1/2 items-center justify-center",
            seekFlash === "left" ? "left-0" : "right-0"
          )}
        >
          <div className="flex flex-col items-center gap-1 rounded-full bg-black/45 px-5 py-4 text-white backdrop-blur-md [animation:player-seek-flash_450ms_ease-out_forwards]">
            {seekFlash === "left" ? <SkipBack size={26} /> : <SkipForward size={26} />}
            <span className="text-xs font-semibold tabular-nums">{SEEK_JUMP_SECONDS}s</span>
          </div>
        </div>
      )}

      {isScrubbing && scrubPreviewTime !== null && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 z-[16] -translate-x-1/2 rounded-full bg-black/65 px-4 py-2 text-sm font-semibold tabular-nums text-white backdrop-blur-md">
          {formatPlayerTime(scrubPreviewTime)}
        </div>
      )}

      {/* Press-and-hold 2x speed indicator */}
      {isHoldSpeeding && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-[15] -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center gap-1.5 rounded-full bg-black/55 px-4 py-2 text-white backdrop-blur-md">
            <Zap size={16} fill="white" />
            <span className="text-sm font-semibold tabular-nums">{HOLD_SPEED_MULTIPLIER}x</span>
          </div>
        </div>
      )}

      {showVolumeHud && (
        <div className="pointer-events-none absolute top-1/2 right-5 z-[16] -translate-y-1/2 rounded-full bg-black/55 px-3 py-4 text-white backdrop-blur-md">
          <div className="flex h-32 w-8 flex-col items-center justify-end rounded-full bg-white/15 p-1">
            <div
              className="w-full rounded-full bg-accent transition-transform"
              style={{
                height: "100%",
                transform: `scaleY(${volume})`,
                transformOrigin: "bottom",
              }}
            />
          </div>
          <div className="mt-2 text-center text-xs font-semibold tabular-nums">
            {Math.round(volume * 100)}
          </div>
        </div>
      )}

      {momentMessage && !isLoading && (
        <div
          className="pointer-events-none absolute left-1/2 z-20 w-[min(88vw,520px)] -translate-x-1/2 rounded-xl border border-rose-300/20 bg-black/55 px-4 py-3 text-center text-sm text-text-secondary backdrop-blur-md md:text-base"
          style={{ top: "calc(22% + env(safe-area-inset-top, 0px))" }}
        >
          {momentMessage}
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          showControls
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar: Back + Title */}
        <div
          className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent p-3 md:gap-4 md:p-6"
          style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            className="flex flex-shrink-0 items-center justify-center rounded-full bg-black/40 transition-colors hover:bg-black/60"
            style={{ minWidth: TAP_TARGET, minHeight: TAP_TARGET }}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="truncate text-sm font-semibold md:text-lg">{title}</h2>
        </div>

        {/* Center play/pause */}
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <button
            type="button"
            onClick={handleTogglePlayClick}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-all hover:bg-black/60 hover:scale-110 active:scale-95 md:h-20 md:w-20"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={32} fill="white" />
            ) : (
              <Play size={32} fill="white" className="ml-1" />
            )}
          </button>
        </div>

        {showSettings && (
          <div
            className="absolute right-3 z-40 w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-white/15 bg-black/80 p-3 text-white shadow-2xl shadow-black/60 backdrop-blur-xl md:right-6"
            style={{
              bottom: "calc(5.75rem + env(safe-area-inset-bottom, 0px))",
            }}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div className="mb-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/55">
                Speed
              </p>
              <div className="grid grid-cols-5 gap-1">
                {SPEED_OPTIONS.map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setPlaybackSpeed(speed)}
                    className={cn(
                      "rounded-md px-2 py-2 text-xs font-semibold transition",
                      playbackRate === speed
                        ? "bg-accent text-white"
                        : "bg-white/10 text-white/75 hover:bg-white/15"
                    )}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/55">
                Quality
              </p>
              <div className="grid max-h-44 grid-cols-2 gap-1 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => selectQuality(-1)}
                  disabled={!hlsRef.current}
                  className={cn(
                    "rounded-md px-2 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
                    selectedQuality === -1
                      ? "bg-accent text-white"
                      : "bg-white/10 text-white/75 hover:bg-white/15"
                  )}
                >
                  Auto
                </button>
                {qualityOptions.map((quality) => (
                  <button
                    key={quality.index}
                    type="button"
                    onClick={() => selectQuality(quality.index)}
                    className={cn(
                      "rounded-md px-2 py-2 text-xs font-semibold transition",
                      selectedQuality === quality.index
                        ? "bg-accent text-white"
                        : "bg-white/10 text-white/75 hover:bg-white/15"
                    )}
                  >
                    {quality.label}
                  </button>
                ))}
                {qualityOptions.length === 0 && (
                  <span className="col-span-2 rounded-md bg-white/10 px-2 py-2 text-xs text-white/55">
                    Quality levels unavailable for this source.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Controls */}
        <div
          className="player-controls absolute bottom-0 left-0 right-0 z-30 px-3 pt-12 md:px-6 md:pt-16"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {/* Progress Bar */}
          <div
            ref={progressRef}
            className="group/progress relative mb-3 flex h-9 cursor-pointer touch-none items-center"
            onPointerDown={handleSeekPointerDown}
            onPointerMove={handleSeekPointerMove}
            onPointerUp={handleSeekPointerEnd}
            onPointerCancel={handleSeekPointerEnd}
            onClick={(event) => event.stopPropagation()}
            aria-label="Seek video"
            role="slider"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
          >
            <div className="relative h-1.5 w-full rounded-full bg-white/20 transition-all group-hover/progress:h-2.5">
              {/* Buffered */}
              <div
                className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-white/30 will-change-transform"
                style={{ transform: `scaleX(${bufferedScale})` }}
              />
              {/* Progress */}
              <div
                className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-accent will-change-transform"
                style={{ transform: `scaleX(${progressScale})` }}
              />
              {/* Scrubber handle: always visible on touch since there is no hover state */}
              <div
                className={cn(
                  "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-accent shadow-lg shadow-accent/40 transition-opacity",
                  isTouchDevice ? "opacity-100" : "opacity-0 group-hover/progress:opacity-100"
                )}
                style={{
                  left: `${progressPercent}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between gap-2 md:gap-3">
            <div className="flex min-w-0 items-center gap-1 md:gap-3">
              {/* Play/Pause */}
              <button
                type="button"
                onClick={handleTogglePlayClick}
                className="flex items-center justify-center transition-transform active:scale-90 hover:scale-110"
                style={{ minWidth: TAP_TARGET, minHeight: TAP_TARGET }}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={22} /> : <Play size={22} fill="white" className="ml-0.5" />}
              </button>

              {/* Skip Back (touch-friendly explicit control, mirrors double-tap-left) */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  jumpBy(-SEEK_JUMP_SECONDS);
                }}
                className="flex items-center justify-center transition-transform active:scale-90 hover:scale-110"
                style={{ minWidth: TAP_TARGET, minHeight: TAP_TARGET }}
                aria-label={`Back ${SEEK_JUMP_SECONDS}s`}
              >
                <SkipBack size={20} />
              </button>

              {/* Skip Forward */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  jumpBy(SEEK_JUMP_SECONDS);
                }}
                className="flex items-center justify-center transition-transform active:scale-90 hover:scale-110"
                style={{ minWidth: TAP_TARGET, minHeight: TAP_TARGET }}
                aria-label={`Forward ${SEEK_JUMP_SECONDS}s`}
              >
                <SkipForward size={20} />
              </button>

              {/* Volume: hover slider on desktop, tap-only mute on touch */}
              <div className="flex items-center gap-2 group/volume">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleMute();
                  }}
                  className="flex items-center justify-center transition-transform active:scale-90 hover:scale-110"
                  style={{ minWidth: TAP_TARGET, minHeight: TAP_TARGET }}
                  aria-label="Mute"
                >
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                {!isTouchDevice && (
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVideoVolume(v);
                    }}
                    className="hidden w-0 opacity-0 transition-all duration-200 group-hover/volume:w-20 group-hover/volume:opacity-100 sm:block"
                  />
                )}
              </div>

              {/* Time */}
              <span className="min-w-0 truncate text-[11px] font-medium tabular-nums text-text-secondary md:text-xs">
                {formatPlayerTime(displayTime)} / {formatPlayerTime(duration)}
              </span>
            </div>

            <div className="flex flex-shrink-0 items-center gap-1 md:gap-3">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  cycleSpeed();
                }}
                className="hidden items-center justify-center rounded border border-white/20 px-2 text-xs font-semibold hover:border-white/40 sm:flex"
                style={{ minWidth: TAP_TARGET, minHeight: TAP_TARGET }}
                aria-label="Playback speed"
              >
                {playbackRate}x
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowSettings((value) => !value);
                  showControlsTemporarily();
                }}
                className={cn(
                  "flex items-center justify-center transition-transform hover:scale-110",
                  showSettings ? "text-accent" : "opacity-70 hover:opacity-100"
                )}
                style={{ minWidth: TAP_TARGET, minHeight: TAP_TARGET }}
                aria-label="Settings"
                aria-expanded={showSettings}
              >
                <Settings size={20} />
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsTheaterMode((value) => !value);
                }}
                className="hidden items-center justify-center rounded border border-white/20 px-2 text-xs font-semibold hover:border-white/40 sm:flex"
                style={{ minWidth: TAP_TARGET, minHeight: TAP_TARGET }}
                aria-label="Theater mode"
              >
                Theater
              </button>

              {/* PiP: desktop/tablet only, hidden on small touch screens where it is rarely usable */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  togglePiP();
                }}
                className="hidden items-center justify-center transition-transform hover:scale-110 md:flex"
                style={{ minWidth: TAP_TARGET, minHeight: TAP_TARGET }}
                aria-label="Picture in Picture"
              >
                <PictureInPicture2 size={20} />
              </button>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFullscreen();
                }}
                className="flex items-center justify-center transition-transform active:scale-90 hover:scale-110"
                style={{ minWidth: TAP_TARGET, minHeight: TAP_TARGET }}
                aria-label="Fullscreen"
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes player-seek-flash {
          0% {
            opacity: 0;
            transform: scale(0.85);
          }
          30% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
