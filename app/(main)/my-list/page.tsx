// ===========================================
// PrivateVideos - My List Page
// ===========================================
// User's saved/bookmarked videos displayed in a grid.

import { prisma } from "@/lib/prisma";
import { getPublicUser } from "@/lib/public-user";
import { toClientVideo } from "@/lib/video-serializer";
import VideoCard from "@/components/home/VideoCard";
import { BookmarkPlus } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My List",
};

export const dynamic = "force-dynamic";

export default async function MyListPage() {
  const publicUser = await getPublicUser();

  const myList = await prisma.myList.findMany({
    where: { userId: publicUser.id },
    include: { video: true },
    orderBy: { addedAt: "desc" },
  });
  const myListVideos = myList.map((item) => ({
    id: item.id,
    video: toClientVideo(item.video),
  }));

  return (
    <div className="container-fluid min-h-screen pt-6 pb-12 md:pt-8">
      <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-6">
        My List
      </h1>

      {myList.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {myListVideos.map((item, i) => (
            <VideoCard key={item.id} video={item.video} index={i} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24">
          <BookmarkPlus
            size={56}
            className="text-text-muted mx-auto mb-4 opacity-40"
          />
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Your list is empty
          </h2>
          <p className="text-text-secondary mb-6">
            Browse videos and click + to add them to your list
          </p>
          <Link href="/" className="btn-primary">
            Browse Videos
          </Link>
        </div>
      )}
    </div>
  );
}
