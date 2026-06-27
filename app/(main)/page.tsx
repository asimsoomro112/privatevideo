// ===========================================
// PrivateVideos - Homepage
// ===========================================
// Hero, quick filters, focused rows, and the full library grid.

import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getPublicUser } from "@/lib/public-user";
import { toClientVideo, toClientWatchHistory } from "@/lib/video-serializer";
import { isLongFormVideo, isShortVideo } from "@/lib/video-duration";
import { cn } from "@/lib/utils";
import HeroBanner from "@/components/home/HeroBanner";
import MoodSelector from "@/components/home/MoodSelector";
import VideoGrid from "@/components/home/VideoGrid";
import VideoRow from "@/components/home/VideoRow";

export const metadata: Metadata = {
  title: "Home",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const publicUser = await getPublicUser();

  const featuredVideoRecord = await prisma.video.findFirst({
    where: { featured: true, published: true },
    orderBy: { createdAt: "desc" },
  });

  const allVideoRecords = await prisma.video.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
  });

  const featuredVideo = featuredVideoRecord
    ? toClientVideo(featuredVideoRecord)
    : null;
  const allVideos = allVideoRecords.map(toClientVideo);
  const longVideos = allVideos.filter(isLongFormVideo);
  const shortVideos = allVideos.filter(isShortVideo);

  const watchHistoryRecords = await prisma.watchHistory.findMany({
    where: {
      userId: publicUser.id,
      completed: false,
      progress: { gt: 0 },
    },
    include: { video: true },
    orderBy: { lastWatched: "desc" },
    take: 20,
  });
  const watchHistory = watchHistoryRecords.map(toClientWatchHistory);
  const continueWatchingVideos = watchHistory.flatMap((history) =>
    history.video ? [history.video] : []
  );

  const latestLongVideos = longVideos.slice(0, 24);
  const latestShortVideos = shortVideos.slice(0, 24);
  const recentlyAddedVideos = allVideos.slice(0, 24);
  const heroVideo =
    featuredVideo && isLongFormVideo(featuredVideo)
      ? featuredVideo
      : longVideos[0] || allVideos[0];

  return (
    <div className="animate-fade-in">
      {heroVideo && <HeroBanner video={heroVideo} />}

      <div
        className={cn(
          "relative z-10 space-y-2",
          heroVideo && "-mt-16 md:-mt-24"
        )}
      >
        <MoodSelector />

        <div className="container-fluid mb-6 grid grid-cols-2 gap-3 md:flex md:flex-wrap">
          <Link
            href="/longs"
            className="rounded-lg border border-glass-border bg-bg-secondary/80 px-4 py-3 text-center text-sm font-semibold text-text-primary transition hover:border-accent hover:text-white"
          >
            Long Videos
            <span className="ml-2 text-text-muted">{longVideos.length}</span>
          </Link>
          <Link
            href="/shorts"
            className="rounded-lg border border-glass-border bg-bg-secondary/80 px-4 py-3 text-center text-sm font-semibold text-text-primary transition hover:border-accent hover:text-white"
          >
            Shorts
            <span className="ml-2 text-text-muted">{shortVideos.length}</span>
          </Link>
        </div>

        {watchHistory.length > 0 && (
          <VideoRow
            title="Continue Watching"
            videos={continueWatchingVideos}
            watchHistory={watchHistory}
            showProgress
          />
        )}

        {recentlyAddedVideos.length > 0 && (
          <VideoRow title="Recently Added" videos={recentlyAddedVideos} />
        )}

        {latestLongVideos.length > 0 && (
          <VideoRow title="Long Videos" videos={latestLongVideos} />
        )}

        {latestShortVideos.length > 0 && (
          <VideoRow title="Shorts" videos={latestShortVideos} />
        )}

        <VideoGrid
          title="All Videos"
          description="Long videos and shorts together, newest first."
          videos={allVideos}
        />

        {allVideos.length === 0 && (
          <div className="container-fluid py-32 text-center">
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              No videos yet
            </h2>
            <p className="text-text-secondary">
              Upload videos from the admin panel and they will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
