// ===========================================
// PrivateVideos - Category Definitions
// ===========================================
// Customizable categories used by search, rows, and auto-categorization.

import type { CategoryType } from "@/types";

export const CATEGORIES: CategoryType[] = [
  {
    name: "Trending",
    slug: "trending",
    description: "Most watched right now",
    keywords: ["trending", "popular", "hot", "viral", "top"],
    emoji: "HOT",
  },
  {
    name: "New Additions",
    slug: "new",
    description: "Freshly added videos",
    keywords: ["new", "latest", "recent", "fresh", "premiere"],
    emoji: "NEW",
  },
  {
    name: "Romantic",
    slug: "romantic",
    description: "Soft, sweet, and intimate picks",
    keywords: ["romantic", "romance", "love", "soft", "sweet", "intimate"],
    emoji: "LOVE",
  },
  {
    name: "Passionate",
    slug: "passionate",
    description: "More intense mood-driven picks",
    keywords: ["passionate", "passion", "sensual", "chemistry", "desire"],
    emoji: "MOOD",
  },
  {
    name: "Intense",
    slug: "intense",
    description: "High energy and bold content",
    keywords: ["intense", "thrill", "extreme", "powerful", "raw"],
    emoji: "BOLD",
  },
  {
    name: "Playful",
    slug: "playful",
    description: "Fun, teasing, and lighthearted picks",
    keywords: ["playful", "fun", "tease", "flirty", "cute"],
    emoji: "FUN",
  },
  {
    name: "Tonight's Special",
    slug: "tonight",
    description: "Curated for a cozy night in",
    keywords: ["tonight", "special", "date", "night", "cozy"],
    emoji: "NITE",
  },
  {
    name: "Favorites",
    slug: "favorites",
    description: "Favorite-worthy private cinema picks",
    keywords: ["favorite", "favorites", "best", "saved", "classic"],
    emoji: "STAR",
  },
  {
    name: "Short & Sweet",
    slug: "short",
    description: "Quick videos under 10 minutes",
    keywords: ["short", "quick", "mini", "brief", "clip"],
    emoji: "FAST",
  },
  {
    name: "Behind the Scenes",
    slug: "bts",
    description: "Behind the scenes and extras",
    keywords: ["bts", "behind", "scenes", "making", "extra"],
    emoji: "BTS",
  },
];

export function detectCategories(filename: string, tags: string[] = []): string[] {
  const searchText = [filename, ...tags].join(" ").toLowerCase();
  const matched = CATEGORIES.filter((category) =>
    category.keywords.some((keyword) => searchText.includes(keyword))
  ).map((category) => category.slug);

  return matched.length > 0 ? matched : ["new"];
}

export function getCategoryBySlug(slug: string): CategoryType | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}

export function getCategoryName(slug: string): string {
  return getCategoryBySlug(slug)?.name ?? slug;
}
