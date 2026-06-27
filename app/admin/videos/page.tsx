// ===========================================
// HerPrivateCinema - Admin Videos Management
// ===========================================
// Table of all videos with real edit/delete/publish actions.

import { prisma } from "@/lib/prisma";
import { toClientVideo } from "@/lib/video-serializer";
import AdminVideosClient, {
  type AdminVideo,
} from "@/components/admin/AdminVideosClient";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Videos",
};

export const dynamic = "force-dynamic";

export default async function AdminVideosPage() {
  const videoRecords = await prisma.video.findMany({
    orderBy: { createdAt: "desc" },
  });

  const videos: AdminVideo[] = videoRecords.map((record) => {
    const video = toClientVideo(record);

    return {
      id: video.id,
      title: video.title,
      description: video.description,
      cloudinaryId: video.cloudinaryId,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      categories: video.categories,
      tags: video.tags,
      matchScore: video.matchScore,
      views: video.views,
      featured: video.featured,
      published: video.published,
      createdAt: video.createdAt.toISOString(),
    };
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            All Videos ({videos.length})
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Manage, edit, publish, feature, and delete your real Cloudinary
            content.
          </p>
        </div>
        <Link href="/admin/upload" className="btn-primary">
          Upload New
        </Link>
      </div>

      <AdminVideosClient initialVideos={videos} />
    </div>
  );
}
