// ===========================================
// PrivateVideos - Search Results Page
// ===========================================
// Full-text search with grid results display.

import { prisma } from "@/lib/prisma";
import { toClientVideo } from "@/lib/video-serializer";
import VideoCard from "@/components/home/VideoCard";
import { Search } from "lucide-react";
import type { Metadata } from "next";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  return {
    title: params.q ? `Search: ${params.q}` : "Search",
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = (params.q || "").trim();
  const normalizedQuery = query.toLowerCase();

  // Search videos by title, description, tags, and categories.
  const videoRecords = query
    ? await prisma.video.findMany({
        where: {
          published: true,
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
            { tagsRaw: { contains: normalizedQuery } },
            { categoriesRaw: { contains: normalizedQuery } },
          ],
        },
        orderBy: { views: "desc" },
        take: 50,
      })
    : [];
  const videos = videoRecords.map(toClientVideo);

  return (
    <div className="container-fluid min-h-screen pt-6 pb-12 md:pt-8">
      {/* Search Header */}
      <div className="mb-8">
        {query ? (
          <>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-1">
              Results for &ldquo;{query}&rdquo;
            </h1>
            <p className="text-text-secondary text-sm">
              {videos.length} {videos.length === 1 ? "result" : "results"} found
            </p>
          </>
        ) : (
          <div className="text-center py-16">
            <Search
              size={48}
              className="text-text-muted mx-auto mb-4 opacity-50"
            />
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Search PrivateVideos
            </h1>
            <p className="text-text-secondary">
              Search by title, tags, or description
            </p>
          </div>
        )}
      </div>

      {/* Results Grid */}
      {videos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {videos.map((video, i) => (
            <VideoCard key={video.id} video={video} index={i} />
          ))}
        </div>
      ) : query ? (
        <div className="text-center py-16">
          <p className="text-text-muted text-lg">
            No videos found for &ldquo;{query}&rdquo;
          </p>
          <p className="text-text-muted text-sm mt-1">
            Try different keywords or browse categories
          </p>
        </div>
      ) : null}
    </div>
  );
}
