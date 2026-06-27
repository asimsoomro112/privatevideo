// ===========================================
// StreamVault - Utility Functions
// ===========================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes intelligently (handles conflicts)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Safely extract a message from unknown thrown values.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "Unexpected error"
): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }
  return fallback;
}

/**
 * Format duration in seconds to "1h 23m" or "23:45" format
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format duration for player display "01:23:45"
 */
export function formatPlayerTime(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Generate a URL-safe slug from a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

/**
 * Clean filename for use as a video title
 */
export function cleanFilename(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, "") // Remove extension
    .replace(/[-_]/g, " ") // Replace dashes/underscores with spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()) // Title case
    .trim();
}

/**
 * Calculate watch progress percentage
 */
export function getProgressPercentage(
  current: number,
  total: number
): number {
  if (!total || total <= 0) return 0;
  return Math.min(Math.round((current / total) * 100), 100);
}

/**
 * Format view count with K/M suffixes
 */
export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return views.toString();
}

/**
 * Generate a random match score (for demo/seed purposes)
 */
export function randomMatchScore(): number {
  return Math.floor(Math.random() * 30) + 70; // 70-100
}

/**
 * Delay helper for animations
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
