// ===========================================
// PrivateVideos - TypeScript Type Definitions
// ===========================================

// -------------------------------------------
// Database model types (mirrors Prisma schema)
// -------------------------------------------
export interface VideoType {
  id: string;
  title: string;
  description: string;
  slug: string;
  streamId: string;
  streamUrl: string;
  hlsUrl: string;
  thumbnailUrl: string;
  posterUrl: string;
  trailerUrl: string | null;
  duration: number;
  categories: string[];
  tags: string[];
  matchScore: number;
  views: number;
  featured: boolean;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WatchHistoryType {
  id: string;
  userId: string;
  videoId: string;
  progress: number;
  duration: number;
  completed: boolean;
  lastWatched: Date;
  video?: VideoType;
}

// -------------------------------------------
// Upload types
// -------------------------------------------
export interface UploadProgress {
  file: string;
  progress: number;
  status: "pending" | "uploading" | "processing" | "complete" | "error";
  error?: string;
  videoId?: string;
}

// -------------------------------------------
// Category type
// -------------------------------------------
export interface CategoryType {
  name: string;
  slug: string;
  description: string;
  keywords: string[];
  emoji: string;
}
