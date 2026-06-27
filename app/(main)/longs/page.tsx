import { Film } from "lucide-react";
import type { Metadata } from "next";
import VideoGrid from "@/components/home/VideoGrid";
import { prisma } from "@/lib/prisma";
import { shuffleItems } from "@/lib/randomize";
import { toClientVideo } from "@/lib/video-serializer";
import { SHORT_VIDEO_MAX_SECONDS } from "@/lib/video-duration";

export const metadata: Metadata = {
  title: "Long Videos",
};

export const dynamic = "force-dynamic";

export default async function LongsPage() {
  const videoRecords = await prisma.video.findMany({
    where: {
      published: true,
      duration: {
        gte: SHORT_VIDEO_MAX_SECONDS,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const videos = shuffleItems(videoRecords.map(toClientVideo));

  if (videos.length === 0) {
    return (
      <div className="container-fluid flex min-h-[calc(100svh-3.5rem-5rem)] items-center justify-center py-16 text-center md:min-h-[calc(100svh-68px)]">
        <div className="max-w-sm">
          <Film size={54} className="mx-auto mb-4 text-text-muted opacity-50" />
          <h1 className="mb-2 text-2xl font-bold text-text-primary">
            No long videos yet
          </h1>
          <p className="text-sm leading-relaxed text-text-secondary">
            Videos 2 minutes or longer will appear here after upload.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-6 md:pt-8">
      <VideoGrid
        title="Long Videos"
        description="All long videos, shuffled every visit."
        videos={videos}
      />
    </div>
  );
}
