import { Clapperboard } from "lucide-react";
import type { Metadata } from "next";
import ShortsFeed from "@/components/shorts/ShortsFeed";
import { prisma } from "@/lib/prisma";
import { toClientVideo } from "@/lib/video-serializer";
import { SHORT_VIDEO_MAX_SECONDS } from "@/lib/video-duration";

export const metadata: Metadata = {
  title: "Shorts",
};

export const dynamic = "force-dynamic";

export default async function ShortsPage() {
  const videoRecords = await prisma.video.findMany({
    where: {
      published: true,
      duration: {
        gt: 0,
        lt: SHORT_VIDEO_MAX_SECONDS,
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
  });

  const videos = videoRecords.map(toClientVideo);

  if (videos.length === 0) {
    return (
      <div className="container-fluid flex min-h-[calc(100svh-3.5rem-5rem)] items-center justify-center py-16 text-center md:min-h-[calc(100svh-68px)]">
        <div className="max-w-sm">
          <Clapperboard
            size={54}
            className="mx-auto mb-4 text-text-muted opacity-50"
          />
          <h1 className="mb-2 text-2xl font-bold text-text-primary">
            No shorts yet
          </h1>
          <p className="text-sm leading-relaxed text-text-secondary">
            Videos under 2 minutes will appear here in a vertical mobile-first
            feed after you upload them from the admin panel.
          </p>
        </div>
      </div>
    );
  }

  return <ShortsFeed videos={videos} />;
}
