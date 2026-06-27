import type { VideoType } from "@/types";

export const SHORT_VIDEO_MAX_SECONDS = 120;

export function isShortVideo(video: Pick<VideoType, "duration">): boolean {
  return video.duration > 0 && video.duration < SHORT_VIDEO_MAX_SECONDS;
}

export function isLongFormVideo(video: Pick<VideoType, "duration">): boolean {
  return !isShortVideo(video);
}
