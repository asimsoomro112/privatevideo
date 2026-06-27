import type { VideoType, WatchHistoryType } from "@/types";

type VideoRecord = Omit<VideoType, "categories" | "tags"> & {
  categoriesRaw?: string;
  tagsRaw?: string;
  categories?: string[];
  tags?: string[];
};

type WatchHistoryRecord = Omit<WatchHistoryType, "video"> & {
  video: VideoRecord;
};

const SYSTEM_UPLOAD_DESCRIPTION_PREFIX =
  "Uploaded from admin panel. Original filename:";

function splitRawList(value?: string): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function getPublicDescription(description?: string): string {
  const trimmed = description?.trim() || "";
  if (trimmed.startsWith(SYSTEM_UPLOAD_DESCRIPTION_PREFIX)) return "";
  return trimmed;
}

export function toClientVideo(video: VideoRecord): VideoType {
  return {
    id: video.id,
    title: video.title,
    description: getPublicDescription(video.description),
    slug: video.slug,
    cloudinaryId: video.cloudinaryId,
    cloudinaryUrl: video.cloudinaryUrl,
    hlsUrl: video.hlsUrl,
    thumbnailUrl: video.thumbnailUrl,
    posterUrl: video.posterUrl,
    trailerUrl: video.trailerUrl,
    duration: video.duration,
    categories: Array.isArray(video.categories)
      ? [...video.categories]
      : splitRawList(video.categoriesRaw),
    tags: Array.isArray(video.tags) ? [...video.tags] : splitRawList(video.tagsRaw),
    matchScore: video.matchScore,
    views: video.views,
    featured: video.featured,
    published: video.published,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  };
}

export function toClientWatchHistory(
  history: WatchHistoryRecord
): WatchHistoryType {
  return {
    id: history.id,
    userId: history.userId,
    videoId: history.videoId,
    progress: history.progress,
    duration: history.duration,
    completed: history.completed,
    lastWatched: history.lastWatched,
    video: toClientVideo(history.video),
  };
}
