// ===========================================
// PrivateVideos - Watch Page
// ===========================================
// Full-screen video player page with video details.

import { prisma } from "@/lib/prisma";
import { getPublicUser } from "@/lib/public-user";
import { toClientVideo } from "@/lib/video-serializer";
import { notFound } from "next/navigation";
import VideoPlayer from "@/components/player/VideoPlayer";
import RomanticMessageButton from "@/components/player/RomanticMessageButton";
import MatchBadge from "@/components/shared/MatchBadge";
import CategoryPill from "@/components/shared/CategoryPill";
import VideoRow from "@/components/home/VideoRow";
import { formatDuration, formatViews } from "@/lib/utils";
import { Eye, Clock, Calendar } from "lucide-react";
import type { Metadata } from "next";

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

  // Fetch the video
  const videoRecord = await prisma.video.findUnique({ where: { id } });
  if (!videoRecord) return notFound();
  const video = toClientVideo(videoRecord);

  // Increment view count
  await prisma.video.update({
    where: { id },
    data: { views: { increment: 1 } },
  });

  // Get watch progress for resume
  let progress = parseInt(search.t || "0") || 0;
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

  // Fetch related videos (same categories)
  const relatedVideoRecords = await prisma.video.findMany({
    where: {
      published: true,
      id: { not: id },
      OR: categoryFilters.length > 0 ? categoryFilters : undefined,
    },
    take: 15,
    orderBy: { views: "desc" },
  });
  const relatedVideos = relatedVideoRecords.map(toClientVideo);

  return (
    <div className="bg-bg-primary min-h-screen">
      {/* Video Player - full width */}
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

      {/* Video Details */}
      <div className="container-fluid py-5 md:py-8">
        <div className="max-w-4xl">
          {/* Title & Match */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-text-primary mb-2">
                {video.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <MatchBadge score={video.matchScore || 85} />
                <span className="text-text-muted flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(video.createdAt).getFullYear()}
                </span>
                <span className="text-text-muted flex items-center gap-1">
                  <Clock size={14} />
                  {formatDuration(video.duration)}
                </span>
                <span className="text-text-muted flex items-center gap-1">
                  <Eye size={14} />
                  {formatViews(video.views)} views
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {video.description && (
            <p className="text-text-secondary text-sm md:text-base leading-relaxed mb-4">
              {video.description}
            </p>
          )}

          {/* Categories & Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
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

      {/* Related Videos */}
      {relatedVideos.length > 0 && (
        <div className="pb-12">
          <VideoRow
            title="More Like This"
            emoji="🎬"
            videos={relatedVideos}
          />
        </div>
      )}

      <RomanticMessageButton />
    </div>
  );
}
