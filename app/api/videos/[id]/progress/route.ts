// ===========================================
// PrivateVideos - Playback Progress API Route
// ===========================================
// POST /api/videos/[id]/progress - updates progress tracking in watch history.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicUser } from "@/lib/public-user";
import { getErrorMessage } from "@/lib/utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const publicUser = await getPublicUser();
    const userId = publicUser.id;
    const { progress, duration } = (await request.json()) as {
      progress?: number;
      duration?: number;
    };

    if (progress === undefined || duration === undefined) {
      return NextResponse.json(
        { error: "Progress and duration are required" },
        { status: 400 }
      );
    }

    // Determine completion status (e.g., if user has watched > 90%)
    const percentWatched = duration > 0 ? (progress / duration) * 100 : 0;
    const completed = percentWatched > 90;

    // Create or update progress entry
    const history = await prisma.watchHistory.upsert({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
      update: {
        progress,
        duration,
        completed,
        lastWatched: new Date(),
      },
      create: {
        userId,
        videoId,
        progress,
        duration,
        completed,
        lastWatched: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: history });
  } catch (error: unknown) {
    console.error("❌ Progress saving error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
