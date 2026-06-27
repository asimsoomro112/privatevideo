// ===========================================
// StreamVault - File Upload API Route
// ===========================================
// POST /api/upload - handles multipart video uploads from admin dashboard.
// New uploads are stored in Bunny Stream.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createBunnyVideo,
  getBunnyVideo,
  getBunnyVideoUrls,
  uploadBunnyVideo,
} from "@/lib/bunny";
import { getErrorMessage, randomMatchScore, slugify } from "@/lib/utils";
import { detectCategories } from "@/lib/categories";

type ThumbnailMode = "auto" | "time" | "custom";

const DEFAULT_VIDEO_TITLE = "Untitled Video";

export const maxDuration = 60;
export const config = {
  api: {
    bodyParser: false,
  },
};

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseBoolean(value: FormDataEntryValue | null, fallback: boolean) {
  if (typeof value !== "string") return fallback;
  if (["true", "1", "yes", "on"].includes(value.toLowerCase())) return true;
  if (["false", "0", "no", "off"].includes(value.toLowerCase())) return false;
  return fallback;
}

function parseList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Fall back to comma-separated input.
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMatchScore(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return randomMatchScore();
  return Math.max(0, Math.min(100, parsed));
}

function parseThumbnailMode(value: string): ThumbnailMode {
  if (value === "time" || value === "custom") return value;
  return "auto";
}

function parseThumbnailTime(value: string): number | null {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function isFormFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value &&
    "size" in value
  );
}

function isImageUpload(file: File | null): file is File {
  if (!file || file.size === 0) return false;

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return (
    file.type.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp", "avif"].includes(extension)
  );
}

function uniqueList(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getUploadErrorStatus(error: unknown): number {
  if (
    error &&
    typeof error === "object" &&
    "http_code" in error &&
    typeof error.http_code === "number" &&
    error.http_code >= 400 &&
    error.http_code < 600
  ) {
    return error.http_code;
  }

  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 600
  ) {
    return error.status;
  }

  return 500;
}

export async function POST(request: Request) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error("Failed to parse upload form data:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not read the upload. Restart the dev server and try again; if it still fails, the file may be too large or the request was interrupted.",
        },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { success: false, error: "No video file provided" },
        { status: 400 }
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const isVideo =
      file.type.startsWith("video/") ||
      ["mp4", "mov", "webm", "mkv", "avi", "m4v"].includes(extension);

    if (!isVideo) {
      return NextResponse.json(
        { success: false, error: "Only video files are allowed" },
        { status: 400 }
      );
    }

    const filename = file.name;
    const titleInput = getFormString(formData, "title");
    const descriptionInput = getFormString(formData, "description");
    const tagsInput = parseList(formData.get("tags"));
    const manualCategories = parseList(formData.get("categories"));
    const published = parseBoolean(formData.get("published"), true);
    const featured = parseBoolean(formData.get("featured"), false);
    const matchScore = parseMatchScore(getFormString(formData, "matchScore"));
    const thumbnailMode = parseThumbnailMode(
      getFormString(formData, "thumbnailMode")
    );
    const thumbnailTime =
      thumbnailMode === "time"
        ? parseThumbnailTime(getFormString(formData, "thumbnailTime"))
        : null;
    const thumbnailEntry = formData.get("thumbnail");
    const thumbnailFile = isFormFile(thumbnailEntry) ? thumbnailEntry : null;
    const cleanTitle = titleInput || DEFAULT_VIDEO_TITLE;
    const videoSlugBase = slugify(cleanTitle) || "video";
    const videoSlug = `${videoSlugBase}-${Date.now().toString().slice(-4)}`;

    if (thumbnailMode === "time" && thumbnailTime === null) {
      return NextResponse.json(
        { success: false, error: "Enter a valid thumbnail time in seconds" },
        { status: 400 }
      );
    }

    if (thumbnailMode === "custom" && !isImageUpload(thumbnailFile)) {
      return NextResponse.json(
        {
          success: false,
          error: "Choose a valid thumbnail image: JPG, PNG, WebP, or AVIF",
        },
        { status: 400 }
      );
    }

    if (thumbnailMode === "custom") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Custom local thumbnail images need Bunny Storage or a public thumbnail URL. Use Auto or Time for Bunny Stream uploads.",
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log(`Uploading file to Bunny Stream: ${filename}`);
    const createdVideo = await createBunnyVideo({
      title: cleanTitle,
      thumbnailTimeSeconds: thumbnailTime ?? undefined,
    });

    await uploadBunnyVideo(
      createdVideo.guid,
      buffer,
      file.type || "application/octet-stream"
    );

    const videoDetails = await getBunnyVideo(createdVideo.guid).catch(
      () => createdVideo
    );
    const urls = getBunnyVideoUrls(createdVideo.guid);

    const categories = uniqueList(
      manualCategories.length > 0
        ? manualCategories
        : detectCategories(filename, tagsInput)
    );
    const tags = uniqueList([
      extension || "video",
      "uploaded",
      "bunny",
      ...tagsInput,
      ...categories,
    ]);

    const newVideo = await prisma.$transaction(async (tx) => {
      if (featured) {
        await tx.video.updateMany({ data: { featured: false } });
      }

      return tx.video.create({
        data: {
          title: cleanTitle,
          description: descriptionInput,
          slug: videoSlug,
          cloudinaryId: createdVideo.guid,
          cloudinaryUrl: urls.directUrl,
          hlsUrl: urls.hlsUrl,
          thumbnailUrl: urls.thumbnailUrl,
          posterUrl: urls.posterUrl,
          trailerUrl: urls.trailerUrl,
          duration: videoDetails.length || 0,
          categoriesRaw: categories.join(","),
          tagsRaw: tags.join(","),
          matchScore,
          featured,
          published,
        },
      });
    });

    console.log(`Saved new video to DB: ${newVideo.title}`);

    return NextResponse.json({
      success: true,
      message: "Video uploaded and registered successfully",
      data: newVideo,
    });
  } catch (error: unknown) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error, "Upload process failed") },
      { status: getUploadErrorStatus(error) }
    );
  }
}
