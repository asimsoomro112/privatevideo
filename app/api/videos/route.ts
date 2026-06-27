// ===========================================
// StreamVault - API route for listing videos
// ===========================================
// GET /api/videos - returns all published videos or filtered by categories.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getErrorMessage } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "20");
    const featuredOnly = searchParams.get("featured") === "true";

    // 1. Query builder
    const whereClause: Prisma.VideoWhereInput = { published: true };
    if (category) {
      whereClause.categoriesRaw = { contains: category };
    }
    if (featuredOnly) {
      whereClause.featured = true;
    }

    // 2. Fetch videos
    const videos = await prisma.video.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, data: videos });
  } catch (error: unknown) {
    console.error("❌ GET /api/videos error:", error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error, "Failed to fetch videos") },
      { status: 500 }
    );
  }
}
