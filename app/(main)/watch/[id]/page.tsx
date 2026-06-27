// ===========================================
// PrivateVideos - Watch Page
// ===========================================
// Full-screen video player page with video details.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Calendar, Clock, Eye } from "lucide-react";
import VideoPlayer from "@/components/player/VideoPlayer";
import MatchBadge from "@/components/shared/MatchBadge";
import CategoryPill from "@/components/shared/CategoryPill";
import VideoGrid from "@/components/home/VideoGrid";
import { prisma } from "@/lib/prisma";
import { getPublicUser } from "@/lib/public-user";
import { toClientVideo } from "@/lib/video-serializer";
import { formatDuration, formatViews } from "@/lib/utils";

interface WatchPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}

export async function generateMetadata({
  params,
}: WatchPageProps): Promise<Metadata> {
  const { id } = await params;
  const video = await prisma.video.findUnique({ where: { id } });
  return {
    title: video?.title || "Watch",
  };
}

export default async function WatchPage({
  params,
  searchParams,
}: WatchPageProps) {
  const { id } = await params;
  const search = await searchParams;
  const publicUser = await getPublicUser();

  const videoRecord = await prisma.video.findUnique({ where: { id } });
  if (!videoRecord) return notFound();
  const video = toClientVideo(videoRecord);

  await prisma.video.update({
    where: { id },
    data: { views: { increment: 1 } },
  });

  let progress = parseInt(search.t || "0", 10) || 0;
  if (!progress) {
    const history = await prisma.watchHistory.findUnique({
      where: {
        userId_videoId: {
          userId: publicUser.id,
          videoId: id,
        },
      },
    });
    if (history && !history.completed) {
      progress = history.progress;
    }
  }

  const categoryFilters = video.categories.map((category) => ({
    categoriesRaw: { contains: category },
  }));

  const relatedVideoRecords = await prisma.video.findMany({
    where: {
      published: true,
      id: { not: id },
      OR: categoryFilters.length > 0 ? categoryFilters : undefined,
    },
    take: 48,
    orderBy: { views: "desc" },
  });
  const relatedVideos = relatedVideoRecords.map(toClientVideo);

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="w-full aspect-video min-h-[220px] max-h-[calc(100svh-3.5rem)] bg-black md:max-h-[calc(100svh-68px)]">
        <VideoPlayer
          hlsUrl={video.hlsUrl || video.cloudinaryUrl}
          fallbackUrl={video.cloudinaryUrl}
          posterUrl={video.posterUrl || video.thumbnailUrl}
          title={video.title}
          videoId={video.id}
          initialProgress={progress}
        />
      </div>

      <div className="container-fluid py-5 md:py-8">
        <div className="max-w-4xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="mb-2 text-xl font-bold text-text-primary md:text-3xl">
                {video.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <MatchBadge score={video.matchScore || 85} />
                <span className="flex items-center gap-1 text-text-muted">
                  <Calendar size={14} />
                  {new Date(video.createdAt).getFullYear()}
                </span>
                <span className="flex items-center gap-1 text-text-muted">
                  <Clock size={14} />
                  {formatDuration(video.duration)}
                </span>
                <span className="flex items-center gap-1 text-text-muted">
                  <Eye size={14} />
                  {formatViews(video.views)} views
                </span>
              </div>
            </div>
          </div>

          {video.description && (
            <p className="mb-4 text-sm leading-relaxed text-text-secondary md:text-base">
              {video.description}
            </p>
          )}

          <div className="mb-6 flex flex-wrap gap-2">
            {video.categories.map((cat) => (
              <CategoryPill key={cat} slug={cat} showEmoji />
            ))}
          </div>

          {video.tags.length > 0 && (
            <div className="text-xs text-text-muted">
              <span className="font-medium text-text-secondary">Tags: </span>
              {video.tags.join(", ")}
            </div>
          )}
        </div>
      </div>

      {relatedVideos.length > 0 && (
        <div className="pb-12">
          <VideoGrid
            title="More Like This"
            description="Related videos in a full vertical grid."
            videos={relatedVideos}
          />
        </div>
      )}
    </div>
  );
}
