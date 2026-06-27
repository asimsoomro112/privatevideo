// ===========================================
// StreamVault - TypeScript Type Definitions
// ===========================================

// -------------------------------------------
// Database model types (mirrors Prisma schema)
// -------------------------------------------
export interface VideoType {
  id: string;
  title: string;
  description: string;
  slug: string;
  cloudinaryId: string;
  cloudinaryUrl: string;
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

export interface UserType {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  avatar: string | null;
  createdAt: Date;
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

export interface MyListType {
  id: string;
  userId: string;
  videoId: string;
  addedAt: Date;
  video?: VideoType;
}

// -------------------------------------------
// API response types
// -------------------------------------------
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// -------------------------------------------
// Video row types for homepage
// -------------------------------------------
export interface VideoRowData {
  title: string;
  slug: string;
  videos: VideoType[];
  type?: "default" | "continue-watching" | "featured";
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

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  duration: number;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  eager?: Array<{
    secure_url: string;
    url: string;
    transformation: string;
  }>;
}

// -------------------------------------------
// Search types
// -------------------------------------------
export interface SearchResult {
  videos: VideoType[];
  query: string;
  total: number;
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

// -------------------------------------------
// Player types
// -------------------------------------------
export interface PlayerState {
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  isPiP: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  quality: string;
  isLoading: boolean;
}

// -------------------------------------------
// Auth types
// -------------------------------------------
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      role: "USER" | "ADMIN";
    };
  }

  interface User {
    id: string;
    role?: "USER" | "ADMIN";
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: "USER" | "ADMIN";
  }
}
