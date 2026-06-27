// ===========================================
// PrivateVideos - My List API Route
// ===========================================
// POST /api/my-list - adds video to user's saved list.
// DELETE /api/my-list - removes video from user's saved list.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicUser } from "@/lib/public-user";
import { getErrorMessage } from "@/lib/utils";

// 1. GET - Fetch watchlist
export async function GET() {
  try {
    const publicUser = await getPublicUser();

    const list = await prisma.myList.findMany({
      where: { userId: publicUser.id },
      select: { videoId: true },
    });

    const videoIds = list.map((item) => item.videoId);
    return NextResponse.json({ success: true, data: videoIds });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

// 2. POST - Add video to list
export async function POST(request: Request) {
  try {
    const publicUser = await getPublicUser();
    const userId = publicUser.id;
    const { videoId } = (await request.json()) as { videoId?: string };

    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    // Add entry
    const entry = await prisma.myList.upsert({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
      update: {}, // No-op if already exists
      create: {
        userId,
        videoId,
      },
    });

    return NextResponse.json({ success: true, data: entry });
  } catch (error: unknown) {
    console.error("❌ Add to watchlist error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

// 3. DELETE - Remove video from list
export async function DELETE(request: Request) {
  try {
    const publicUser = await getPublicUser();
    const userId = publicUser.id;
    const { videoId } = (await request.json()) as { videoId?: string };

    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    // Delete entry if present
    await prisma.myList.deleteMany({
      where: {
        userId,
        videoId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Video removed from watchlist successfully",
    });
  } catch (error: unknown) {
    console.error("❌ Remove from watchlist error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
