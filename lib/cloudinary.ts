// ===========================================
// StreamVault - Cloudinary Configuration
// ===========================================
// Handles all Cloudinary SDK setup and helper functions
// for video upload, HLS transformation, and thumbnail generation.

import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export default cloudinary;

export function getCloudinaryUploadFolder(): string {
  return process.env.CLOUDINARY_UPLOAD_FOLDER || "herprivatecinema/videos";
}

export function getCloudinaryStreamingProfile(): string {
  return process.env.CLOUDINARY_STREAMING_PROFILE || "full_hd";
}

// -------------------------------------------
// Helper: Upload video with eager HLS transformation
// -------------------------------------------
export async function uploadVideoToCloudinary(
  filePath: string,
  options: {
    publicId?: string;
    folder?: string;
    tags?: string[];
  } = {}
) {
  const { publicId, folder = getCloudinaryUploadFolder(), tags = [] } = options;

  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: "video",
    public_id: publicId,
    folder,
    tags,
    // Eager transformation: generate HLS adaptive bitrate
    eager: [
      {
        streaming_profile: getCloudinaryStreamingProfile(),
        format: "m3u8",
      },
    ],
    // Process asynchronously (required for large videos)
    eager_async: true,
    // Notification webhook when eager transformation completes
    eager_notification_url: process.env.CLOUDINARY_NOTIFICATION_URL,
  });

  return result;
}

// -------------------------------------------
// Helper: Generate video thumbnail URL
// -------------------------------------------
export function getVideoThumbnail(
  cloudinaryId: string,
  options: {
    width?: number;
    height?: number;
    startOffset?: string;
    crop?: string;
  } = {}
): string {
  const {
    width = 640,
    height = 360,
    startOffset = "auto",
    crop = "fill",
  } = options;

  return cloudinary.url(cloudinaryId, {
    resource_type: "video",
    transformation: [
      {
        width,
        height,
        crop,
        gravity: "auto",
        start_offset: startOffset,
        format: "jpg",
        quality: "auto:best",
      },
    ],
  });
}

// -------------------------------------------
// Helper: Generate video poster URL (larger)
// -------------------------------------------
export function getVideoPoster(
  cloudinaryId: string,
  options: {
    startOffset?: string;
  } = {}
): string {
  const { startOffset = "auto" } = options;

  return cloudinary.url(cloudinaryId, {
    resource_type: "video",
    transformation: [
      {
        width: 1280,
        height: 720,
        crop: "fill",
        gravity: "auto",
        start_offset: startOffset,
        format: "jpg",
        quality: "auto:best",
      },
    ],
  });
}

// -------------------------------------------
// Helper: Generate image thumbnail/poster URLs
// -------------------------------------------
export function getImageThumbnail(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
  } = {}
): string {
  const { width = 640, height = 360, crop = "fill" } = options;

  return cloudinary.url(publicId, {
    resource_type: "image",
    transformation: [
      {
        width,
        height,
        crop,
        gravity: "auto",
        format: "jpg",
        quality: "auto:best",
      },
    ],
  });
}

export function getImagePoster(publicId: string): string {
  return getImageThumbnail(publicId, {
    width: 1280,
    height: 720,
  });
}

// -------------------------------------------
// Helper: Get HLS streaming URL
// -------------------------------------------
export function getHlsUrl(cloudinaryId: string): string {
  return cloudinary.url(cloudinaryId, {
    resource_type: "video",
    streaming_profile: getCloudinaryStreamingProfile(),
    format: "m3u8",
  });
}

// -------------------------------------------
// Helper: Get short hover preview clip URL
// -------------------------------------------
export function getVideoPreviewClip(cloudinaryId: string): string {
  return cloudinary.url(cloudinaryId, {
    resource_type: "video",
    transformation: [
      {
        start_offset: "0",
        duration: "6",
        width: 640,
        height: 360,
        crop: "fill",
        gravity: "auto",
        quality: "auto:good",
      },
    ],
    format: "mp4",
  });
}

// -------------------------------------------
// Helper: Delete video from Cloudinary
// -------------------------------------------
export async function deleteVideoFromCloudinary(
  cloudinaryId: string
): Promise<void> {
  await cloudinary.uploader.destroy(cloudinaryId, {
    resource_type: "video",
    invalidate: true,
  });
}

// -------------------------------------------
// Helper: Get video details from Cloudinary
// -------------------------------------------
export async function getVideoDetails(cloudinaryId: string) {
  return cloudinary.api.resource(cloudinaryId, {
    resource_type: "video",
    image_metadata: true,
  });
}
