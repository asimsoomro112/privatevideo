// ===========================================
// PrivateVideos - Homepage
// ===========================================
// Netflix-style homepage with hero banner, continue watching,
// and multiple categorized video rows.

import { prisma } from "@/lib/prisma";
import { getPublicUser } from "@/lib/public-user";
import { CATEGORIES } from "@/lib/categories";
import { toClientVideo, toClientWatchHistory } from "@/lib/video-serializer";
import { isLongFormVideo } from "@/lib/video-duration";
import { cn } from "@/lib/utils";
import HeroBanner from "@/components/home/HeroBanner";
import MoodSelector from "@/components/home/MoodSelector";
import VideoRow from "@/components/home/VideoRow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const publicUser = await getPublicUser();

  // Fetch featured video for hero banner
  const featuredVideoRecord = await prisma.video.findFirst({
    where: { featured: true, published: true },
    orderBy: { createdAt: "desc" },
  });

  // Fetch all published videos
  const allVideoRecords = await prisma.video.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const featuredVideo = featuredVideoRecord
    ? toClientVideo(featuredVideoRecord)
    : null;
  const allVideos = allVideoRecords.map(toClientVideo);
  const longVideos = allVideos.filter(isLongFormVideo);

  // Fetch continue watching for the shared public profile
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
  const longWatchHistory = watchHistory.filter(
    (history) => history.video && isLongFormVideo(history.video)
  );
  const continueWatchingVideos = longWatchHistory.flatMap((history) =>
    history.video ? [history.video] : []
  );

  // Build category rows from available videos
  const categoryRows = CATEGORIES.map((category) => {
    const categoryVideos = longVideos.filter((video) =>
      video.categories.includes(category.slug)
    );
    return {
      title: category.name,
      emoji: category.emoji,
      slug: category.slug,
      videos: categoryVideos,
    };
  }).filter((row) => row.videos.length > 0);

  // Trending: top viewed videos
  const trendingVideos = [...longVideos]
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  // Recently added
  const recentVideos = longVideos.slice(0, 20);

  // Use first video if no featured video set
  const heroVideo =
    featuredVideo && isLongFormVideo(featuredVideo)
      ? featuredVideo
      : longVideos[0];

  return (
    <div className="animate-fade-in">
      {/* Hero Banner */}
      {heroVideo && <HeroBanner video={heroVideo} />}

      {/* Video Rows - overlap hero slightly */}
      <div
        className={cn(
          "relative z-10 space-y-2",
          heroVideo && "-mt-16 md:-mt-24"
        )}
      >
        <MoodSelector />

        {/* Continue Watching */}
        {longWatchHistory.length > 0 && (
          <VideoRow
            title="Continue Watching"
            emoji="▶️"
            videos={continueWatchingVideos}
            watchHistory={longWatchHistory}
            showProgress
          />
        )}

        {/* Trending Now */}
        {trendingVideos.length > 0 && (
          <VideoRow
            title="Trending Now"
            emoji="🔥"
            videos={trendingVideos}
          />
        )}

        {/* Recently Added */}
        {recentVideos.length > 0 && (
          <VideoRow
            title="Recently Added"
            emoji="✨"
            videos={recentVideos}
          />
        )}

        {/* Category Rows */}
        {categoryRows.map((row) => (
          <VideoRow
            key={row.slug}
            title={row.title}
            emoji={row.emoji}
            videos={row.videos}
          />
        ))}

        {/* Empty state */}
        {longVideos.length === 0 && (
          <div className="container-fluid py-32 text-center">
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              No long videos yet
            </h2>
            <p className="text-text-secondary">
              Videos 2 minutes or longer will appear here. Short clips live on
              the Shorts page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
