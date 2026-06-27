// ===========================================
// PrivateVideos - Advanced Video Player
// ===========================================
// Custom HLS video player with adaptive bitrate streaming,
// custom controls, PiP, fullscreen, resume, and progress tracking.

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipForward,
  PictureInPicture2,
  Settings,
  ArrowLeft,
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
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

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

  // Initialize HLS.js for adaptive streaming
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: import("hls.js").default | null = null;
    let cancelled = false;

    setIsLoading(true);

    const fallbackToDirectPlayback = () => {
      if (cancelled || !video) return;
      hls?.destroy();
      hls = null;

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
            hls = new Hls({
              maxLoadingDelay: 4,
              maxBufferLength: 30,
              maxBufferSize: 60 * 1000 * 1000,
              enableWorker: true,
              startLevel: -1, // Auto quality
            });
            hls.loadSource(hlsUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setIsLoading(false);
              if (initialProgress > 0) {
                video.currentTime = initialProgress;
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
    };
  }, [directPlaybackUrl, hlsUrl, initialProgress]);

  // Save progress every 10 seconds
  const saveProgress = useCallback(
    (time: number) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        onProgressUpdate?.(time);
        // API call to save progress
        fetch(`/api/videos/${videoId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            progress: time,
            duration: videoRef.current?.duration || 0,
          }),
        }).catch(() => {});
      }, 2000);
    },
    [videoId, onProgressUpdate]
  );

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    saveProgress(video.currentTime);

    // Update buffered
    if (video.buffered.length > 0) {
      const buffered =
        (video.buffered.end(video.buffered.length - 1) / video.duration) * 100;
      setBufferedPercent(buffered);
    }
  }, [saveProgress]);

  // Controls visibility
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
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
    if (!isPlaying) setShowControls(true);
  }, [isPlaying]);

  const cycleSpeed = useCallback(() => {
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
    setPlaybackRate(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  }, [playbackRate]);

  // Volume
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Fullscreen
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      await container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
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

  const seekToClientX = useCallback(
    (clientX: number) => {
      const video = videoRef.current;
      const bar = progressRef.current;
      const mediaDuration = duration || video?.duration || 0;

      if (!video || !bar || mediaDuration <= 0) return;

      const rect = bar.getBoundingClientRect();
      const percent = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );
      const nextTime = percent * mediaDuration;

      video.currentTime = nextTime;
      setCurrentTime(nextTime);
      saveProgress(nextTime);
    },
    [duration, saveProgress]
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
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
          if (videoRef.current)
            videoRef.current.currentTime += 10;
          break;
        case "ArrowLeft":
          if (videoRef.current)
            videoRef.current.currentTime -= 10;
          break;
        case "ArrowUp":
          if (videoRef.current) {
            videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1);
            setVolume(videoRef.current.volume);
          }
          break;
        case "ArrowDown":
          if (videoRef.current) {
            videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1);
            setVolume(videoRef.current.volume);
          }
          break;
        case "Escape":
          if (isFullscreen) toggleFullscreen();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [togglePlay, toggleMute, toggleFullscreen, isFullscreen]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full bg-black group cursor-pointer",
        isTheaterMode && "fixed inset-0 z-[90]"
      )}
      onMouseMove={showControlsTemporarily}
      onClick={togglePlay}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        poster={posterUrl}
        playsInline
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
            if (initialProgress > 0) {
              videoRef.current.currentTime = initialProgress;
            }
          }
        }}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onPause={() => {
          if (!videoRef.current?.ended) {
            setMomentMessage(getRandomRomanticMessage());
          }
        }}
        onPlay={() => setMomentMessage("")}
        onEnded={() => {
          setIsPlaying(false);
          setMomentMessage(getRandomRomanticMessage());
        }}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-12 h-12 border-3 border-white/20 border-t-accent rounded-full animate-spin" />
        </div>
      )}

      {momentMessage && !isLoading && (
        <div className="pointer-events-none absolute left-1/2 top-[22%] z-20 w-[min(88vw,520px)] -translate-x-1/2 rounded-xl border border-rose-300/20 bg-black/55 px-4 py-3 text-center text-sm text-text-secondary backdrop-blur-md md:text-base">
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
        <div className="absolute top-0 left-0 right-0 z-30 p-3 md:p-6 flex items-center gap-3 md:gap-4 bg-gradient-to-b from-black/70 to-transparent">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 flex-shrink-0 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-sm md:text-lg font-semibold truncate">{title}</h2>
        </div>

        {/* Center play/pause */}
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <button
            type="button"
            onClick={handleTogglePlayClick}
            className="pointer-events-auto w-14 h-14 md:w-20 md:h-20 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 hover:scale-110 transition-all"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={32} fill="white" />
            ) : (
              <Play size={32} fill="white" className="ml-1" />
            )}
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="player-controls absolute bottom-0 left-0 right-0 z-30 px-3 md:px-6 pb-3 md:pb-4 pt-12 md:pt-16">
          {/* Progress Bar */}
          <div
            ref={progressRef}
            className="group/progress relative mb-3 flex h-8 cursor-pointer touch-none items-center"
            onPointerDown={handleSeekPointerDown}
            onPointerMove={handleSeekPointerMove}
            onPointerUp={handleSeekPointerEnd}
            onPointerCancel={handleSeekPointerEnd}
            onClick={(event) => event.stopPropagation()}
            aria-label="Seek video"
          >
            <div className="relative h-1.5 w-full rounded-full bg-white/20 transition-all group-hover/progress:h-2.5">
              {/* Buffered */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white/30"
                style={{ width: `${bufferedPercent}%` }}
              />
              {/* Progress */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-accent"
                style={{ width: `${progressPercent}%` }}
              />
              {/* Scrubber handle */}
              <div
                className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-accent opacity-100 shadow-lg shadow-accent/40 transition-opacity md:opacity-0 md:group-hover/progress:opacity-100"
                style={{
                  left: `${progressPercent}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 md:gap-3">
              {/* Play/Pause */}
              <button type="button" onClick={handleTogglePlayClick} className="hover:scale-110 transition-transform" aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <Pause size={22} /> : <Play size={22} fill="white" className="ml-0.5" />}
              </button>

              {/* Skip Forward */}
              <button
                type="button"
                onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }}
                className="hover:scale-110 transition-transform"
                aria-label="Skip 10s"
              >
                <SkipForward size={20} />
              </button>

              {/* Volume */}
              <div className="hidden sm:flex items-center gap-2 group/volume">
                <button type="button" onClick={toggleMute} className="hover:scale-110 transition-transform" aria-label="Mute">
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (videoRef.current) {
                      videoRef.current.volume = v;
                      videoRef.current.muted = v === 0;
                      setIsMuted(v === 0);
                    }
                  }}
                  className="w-0 group-hover/volume:w-20 transition-all duration-200 opacity-0 group-hover/volume:opacity-100"
                />
              </div>

              {/* Time */}
              <span className="min-w-0 truncate text-[11px] md:text-xs text-text-secondary font-medium tabular-nums">
                {formatPlayerTime(currentTime)} / {formatPlayerTime(duration)}
              </span>
            </div>

            <div className="flex flex-shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={cycleSpeed}
                className="rounded border border-white/20 px-2 py-1 text-xs font-semibold hover:border-white/40"
                aria-label="Playback speed"
              >
                {playbackRate}x
              </button>

              {/* Settings placeholder */}
              <button type="button" className="hidden sm:block hover:scale-110 transition-transform opacity-60 hover:opacity-100" aria-label="Settings">
                <Settings size={20} />
              </button>

              <button
                type="button"
                onClick={() => setIsTheaterMode((value) => !value)}
                className="hidden sm:block rounded border border-white/20 px-2 py-1 text-xs font-semibold hover:border-white/40"
                aria-label="Theater mode"
              >
                Theater
              </button>

              {/* PiP */}
              <button type="button" onClick={togglePiP} className="hover:scale-110 transition-transform hidden md:block" aria-label="Picture in Picture">
                <PictureInPicture2 size={20} />
              </button>

              {/* Fullscreen */}
              <button type="button" onClick={toggleFullscreen} className="hover:scale-110 transition-transform" aria-label="Fullscreen">
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
