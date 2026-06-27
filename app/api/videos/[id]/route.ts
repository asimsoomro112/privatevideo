// ===========================================
// StreamVault - Single Video API Route
// ===========================================
// GET /api/videos/[id] - fetch video details
// PATCH /api/videos/[id] - update metadata
// DELETE /api/videos/[id] - delete video from DB and provider storage

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteBunnyVideo, isBunnyVideoId } from "@/lib/bunny";
import { deleteVideoFromCloudinary } from "@/lib/cloudinary";
import { getErrorMessage } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

function normalizeList(value?: string[] | string): string | undefined {
  if (value === undefined) return undefined;

  const items = Array.isArray(value)
    ? value
    : value.split(",").map((item) => item.trim());

  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).join(",");
}

function normalizeScore(value?: number | string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) return undefined;
  return Math.max(0, Math.min(100, parsed));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const video = await prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: video });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const {
      title,
      description,
      categories,
      tags,
      featured,
      published,
      matchScore,
    } = (await request.json()) as {
      title?: string;
      description?: string;
      categories?: string[] | string;
      tags?: string[] | string;
      featured?: boolean;
      published?: boolean;
      matchScore?: number | string;
    };

    const dataToUpdate: Prisma.VideoUpdateInput = {};

    if (typeof title === "string") {
      const cleanTitle = title.trim();
      if (!cleanTitle) {
        return NextResponse.json(
          { success: false, error: "Title cannot be empty" },
          { status: 400 }
        );
      }
      dataToUpdate.title = cleanTitle;
    }

    if (typeof description === "string") {
      dataToUpdate.description = description.trim();
    }

    if (typeof featured === "boolean") dataToUpdate.featured = featured;
    if (typeof published === "boolean") dataToUpdate.published = published;

    const normalizedScore = normalizeScore(matchScore);
    if (normalizedScore !== undefined) dataToUpdate.matchScore = normalizedScore;

    const categoriesRaw = normalizeList(categories);
    if (categoriesRaw !== undefined) dataToUpdate.categoriesRaw = categoriesRaw;

    const tagsRaw = normalizeList(tags);
    if (tagsRaw !== undefined) dataToUpdate.tagsRaw = tagsRaw;

    const videoExists = await prisma.video.findUnique({ where: { id } });
    if (!videoExists) {
      return NextResponse.json(
        { success: false, error: "Video not found" },
        { status: 404 }
      );
    }

    const updatedVideo = await prisma.$transaction(async (tx) => {
      if (featured === true) {
        await tx.video.updateMany({
          where: { id: { not: id } },
          data: { featured: false },
        });
      }

      return tx.video.update({
        where: { id },
        data: dataToUpdate,
      });
    });

    return NextResponse.json({ success: true, data: updatedVideo });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const video = await prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    try {
      if (video.cloudinaryId) {
        if (isBunnyVideoId(video.cloudinaryId)) {
          await deleteBunnyVideo(video.cloudinaryId);
        } else {
          await deleteVideoFromCloudinary(video.cloudinaryId);
        }
      }
    } catch (storageError) {
      console.warn("Failed to delete asset from provider storage:", storageError);
    }

    await prisma.video.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Video deleted successfully from database and provider storage",
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
