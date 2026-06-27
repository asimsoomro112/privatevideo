"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Film,
  Loader2,
  Settings2,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES } from "@/lib/categories";
import { cn, getErrorMessage } from "@/lib/utils";
import type { UploadProgress } from "@/types";

type UploadResponse = {
  success: boolean;
  data?: { id: string };
  error?: string;
  message?: string;
};

type ThumbnailMode = "auto" | "time" | "custom";

const THUMBNAIL_MODES: Array<{ value: ThumbnailMode; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "time", label: "Time" },
];

async function readUploadResponse(xhr: XMLHttpRequest): Promise<UploadResponse> {
  try {
    return JSON.parse(xhr.responseText) as UploadResponse;
  } catch {
    return {
      success: false,
      error: xhr.statusText || "Upload failed",
    };
  }
}

export default function UploadPage() {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "new",
  ]);
  const [matchScore, setMatchScore] = useState("95");
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [thumbnailMode, setThumbnailMode] = useState<ThumbnailMode>("auto");
  const [thumbnailTime, setThumbnailTime] = useState("3");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [thumbnailFile]);

  const updateUpload = useCallback(
    (index: number, patch: Partial<UploadProgress>) => {
      setUploads((current) =>
        current.map((upload, uploadIndex) =>
          uploadIndex === index ? { ...upload, ...patch } : upload
        )
      );
    },
    []
  );

  const uploadFile = useCallback(
    (file: File, index: number) =>
      new Promise<UploadResponse>((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);

        if (title.trim()) {
          formData.append("title", title.trim());
        }
        if (description.trim()) formData.append("description", description.trim());
        if (tags.trim()) formData.append("tags", tags.trim());

        formData.append("categories", JSON.stringify(selectedCategories));
        formData.append("matchScore", matchScore);
        formData.append("published", String(published));
        formData.append("featured", String(featured && index === 0));
        formData.append("thumbnailMode", thumbnailMode);

        if (thumbnailMode === "time") {
          formData.append("thumbnailTime", thumbnailTime);
        }

        if (thumbnailMode === "custom" && thumbnailFile) {
          formData.append("thumbnail", thumbnailFile);
        }

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const progress = Math.min(
            85,
            Math.max(1, Math.round((event.loaded / event.total) * 85))
          );
          updateUpload(index, {
            progress,
            status: "uploading",
          });
        };

        xhr.upload.onload = () => {
          updateUpload(index, {
            progress: 90,
            status: "processing",
          });
        };

        xhr.onload = async () => {
          const result = await readUploadResponse(xhr);

          if (xhr.status >= 200 && xhr.status < 300 && result.success) {
            resolve(result);
            return;
          }

          reject(new Error(result.error || result.message || xhr.statusText));
        };

        xhr.onerror = () => reject(new Error("Network upload failed"));
        xhr.onabort = () => reject(new Error("Upload cancelled"));
        xhr.send(formData);
      }),
    [
      description,
      featured,
      matchScore,
      published,
      selectedCategories,
      tags,
      thumbnailFile,
      thumbnailMode,
      thumbnailTime,
      title,
      updateUpload,
    ]
  );

  const handleFiles = useCallback(
    (files: FileList) => {
      if (isUploading) return;

      const videoFiles = Array.from(files).filter(
        (file) =>
          file.type.startsWith("video/") ||
          /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name)
      );

      if (videoFiles.length === 0) {
        toast.error("Please select video files: MP4, MOV, WebM, MKV, AVI, M4V");
        return;
      }

      setSelectedFiles(videoFiles);
      setUploads(
        videoFiles.map((file) => ({
          file: file.name,
          progress: 0,
          status: "pending" as const,
        }))
      );
      toast.success(
        `${videoFiles.length} video${videoFiles.length === 1 ? "" : "s"} selected`
      );
    },
    [isUploading]
  );

  const startUpload = useCallback(async () => {
    if (isUploading) return;

    if (selectedFiles.length === 0) {
      toast.error("Select video files first");
      return;
    }

    if (!title.trim()) {
      toast.error("Add a title before upload");
      return;
    }

    if (thumbnailMode === "time") {
      const seconds = Number.parseFloat(thumbnailTime);
      if (!Number.isFinite(seconds) || seconds < 0) {
        toast.error("Enter a valid thumbnail second");
        return;
      }
    }

    if (thumbnailMode === "custom" && !thumbnailFile) {
      toast.error("Choose a thumbnail image first");
      return;
    }

    if (featured && selectedFiles.length > 1) {
      toast.info("Featured will be applied to the first uploaded video only.");
    }

    setIsUploading(true);
    setUploads(
      selectedFiles.map((file) => ({
        file: file.name,
        progress: 0,
        status: "pending" as const,
      }))
    );

    for (let index = 0; index < selectedFiles.length; index += 1) {
      const file = selectedFiles[index];

      updateUpload(index, {
        status: "uploading",
        progress: 1,
      });

      try {
        const result = await uploadFile(file, index);

        updateUpload(index, {
          status: "complete",
          progress: 100,
          videoId: result.data?.id,
        });
        toast.success(`Uploaded: ${file.name}`);
      } catch (error) {
        updateUpload(index, {
          status: "error",
          error: getErrorMessage(error, "Upload failed"),
        });
        toast.error(`Failed: ${file.name}`);
      }
    }

    setIsUploading(false);
    setSelectedFiles([]);
  }, [
    featured,
    isUploading,
    selectedFiles,
    thumbnailFile,
    thumbnailMode,
    thumbnailTime,
    title,
    updateUpload,
    uploadFile,
  ]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      if (event.dataTransfer.files) {
        handleFiles(event.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const toggleCategory = (slug: string) => {
    setSelectedCategories((current) =>
      current.includes(slug)
        ? current.filter((category) => category !== slug)
        : [...current, slug]
    );
  };

  const selectedFileCount = selectedFiles.length;
  const hasUploadResults = uploads.some(
    (upload) => upload.status === "complete" || upload.status === "error"
  );
  const hasCompletedUploads = uploads.some(
    (upload) => upload.status === "complete"
  );

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Upload Videos</h1>
        <p className="text-text-muted text-sm mt-1">
          Upload real video files to Cloudinary with HLS playback, thumbnails,
          and database metadata.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 md:p-14",
              isDragging
                ? "border-accent bg-accent/5 scale-[1.01]"
                : "border-glass-border bg-bg-secondary/50 hover:border-text-muted",
              isUploading && "pointer-events-none opacity-60"
            )}
          >
            <input
              type="file"
              accept="video/*,.mkv,.avi,.m4v"
              multiple
              onChange={(event) => {
                if (event.target.files) handleFiles(event.target.files);
                event.currentTarget.value = "";
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              disabled={isUploading}
              id="upload-input"
            />

            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-tertiary">
                <Upload
                  size={28}
                  className={cn(
                    "transition-colors",
                    isDragging ? "text-accent" : "text-text-muted"
                  )}
                />
              </div>

              <div>
                <p className="mb-1 text-lg font-semibold text-text-primary">
                  {isDragging
                    ? "Drop videos here"
                    : selectedFileCount > 0
                      ? `${selectedFileCount} video${selectedFileCount === 1 ? "" : "s"} selected`
                      : "Drag & drop videos"}
                </p>
                <p className="text-sm text-text-muted">
                  {selectedFileCount > 0
                    ? "Add a title, then click Finish Upload"
                    : "or click to browse. MP4, MOV, WebM, MKV, AVI, M4V"}
                </p>
              </div>
            </div>
          </div>

          {uploads.length > 0 && (
            <div className="mt-6 space-y-3">
              <h2 className="text-lg font-semibold text-text-primary">
                {isUploading
                  ? "Uploading..."
                  : selectedFileCount > 0
                    ? "Selected Files"
                    : "Upload Results"}
              </h2>

              {uploads.map((upload, index) => (
                <div key={`${upload.file}-${index}`} className="glass-card p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {upload.status === "complete" ? (
                        <CheckCircle size={22} className="text-success" />
                      ) : upload.status === "error" ? (
                        <XCircle size={22} className="text-accent" />
                      ) : upload.status === "uploading" ||
                        upload.status === "processing" ? (
                        <Loader2 size={22} className="text-accent animate-spin" />
                      ) : (
                        <Film size={22} className="text-text-muted" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {upload.file}
                      </p>
                      {upload.error && (
                        <p className="mt-0.5 text-xs text-accent">
                          {upload.error}
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <p
                        className={cn(
                          "text-xs font-medium",
                          upload.status === "complete"
                            ? "text-success"
                            : upload.status === "error"
                              ? "text-accent"
                              : "text-text-secondary"
                        )}
                      >
                        {upload.status === "processing"
                          ? "Cloudinary processing..."
                          : upload.status === "uploading"
                            ? `${upload.progress}%`
                            : upload.status === "complete"
                              ? "Complete"
                              : upload.status === "error"
                                ? "Failed"
                                : "Ready"}
                      </p>
                      {upload.videoId && (
                        <Link
                          href={`/watch/${upload.videoId}`}
                          className="mt-1 inline-block text-xs text-accent hover:text-accent-hover"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        upload.status === "error" ? "bg-accent-dark" : "bg-accent"
                      )}
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="glass-card h-fit p-5">
          <div className="mb-5 flex items-center gap-2">
            <Settings2 size={18} className="text-accent" />
            <h2 className="font-semibold text-text-primary">Upload Metadata</h2>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-secondary">
                Title shown everywhere
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Enter the video title"
                className="h-11 w-full rounded-lg border border-glass-border bg-bg-tertiary px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent"
                disabled={isUploading}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-secondary">
                Description
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Optional description"
                className="w-full resize-y rounded-lg border border-glass-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent"
                disabled={isUploading}
              />
            </label>

            <div>
              <span className="mb-2 block text-sm font-medium text-text-secondary">
                Categories
              </span>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => {
                  const selected = selectedCategories.includes(category.slug);
                  return (
                    <button
                      key={category.slug}
                      type="button"
                      onClick={() => toggleCategory(category.slug)}
                      disabled={isUploading}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60",
                        selected
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-glass-border bg-bg-tertiary text-text-muted hover:text-text-primary"
                      )}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-secondary">
                Tags
              </span>
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="comma, separated, tags"
                className="h-11 w-full rounded-lg border border-glass-border bg-bg-tertiary px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent"
                disabled={isUploading}
              />
            </label>

            <div className="rounded-lg border border-glass-border bg-bg-tertiary/70 p-3">
              <span className="mb-2 block text-sm font-medium text-text-secondary">
                Thumbnail
              </span>

              <div className="grid grid-cols-2 gap-2">
                {THUMBNAIL_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setThumbnailMode(mode.value)}
                    disabled={isUploading}
                    className={cn(
                      "h-10 rounded-lg border text-xs font-semibold transition disabled:opacity-60",
                      thumbnailMode === mode.value
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-glass-border bg-bg-secondary text-text-muted hover:text-text-primary"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {thumbnailMode === "time" && (
                <label className="mt-3 block">
                  <span className="mb-2 block text-xs font-medium text-text-muted">
                    Pick frame at second
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={thumbnailTime}
                    onChange={(event) => setThumbnailTime(event.target.value)}
                    className="h-10 w-full rounded-lg border border-glass-border bg-bg-secondary px-3 text-sm text-text-primary outline-none transition focus:border-accent"
                    disabled={isUploading}
                  />
                </label>
              )}

              {thumbnailMode === "custom" && (
                <div className="mt-3">
                  <input
                    ref={thumbnailInputRef}
                    id="thumbnail-image-input"
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png,.webp,.avif"
                    className="sr-only"
                    disabled={isUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;

                      const isImage =
                        file.type.startsWith("image/") ||
                        /\.(jpe?g|png|webp|avif)$/i.test(file.name);

                      if (!isImage) {
                        toast.error("Choose a JPG, PNG, WebP, or AVIF image");
                        event.currentTarget.value = "";
                        return;
                      }

                      setThumbnailFile(file);
                    }}
                  />

                  <div className="flex gap-2">
                    <label
                      htmlFor="thumbnail-image-input"
                      className={cn(
                        "flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-lg border border-glass-border bg-bg-secondary px-3 text-xs font-semibold text-text-secondary transition hover:text-text-primary",
                        isUploading && "pointer-events-none opacity-60"
                      )}
                    >
                      {thumbnailFile ? "Change Image" : "Choose Image"}
                    </label>

                    {thumbnailFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setThumbnailFile(null);
                          if (thumbnailInputRef.current) {
                            thumbnailInputRef.current.value = "";
                          }
                        }}
                        disabled={isUploading}
                        className="rounded-lg border border-glass-border bg-bg-secondary px-3 text-xs font-semibold text-text-muted transition hover:text-text-primary disabled:opacity-60"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {thumbnailFile && (
                    <p className="mt-2 truncate text-xs text-text-muted">
                      {thumbnailFile.name}
                    </p>
                  )}

                  {thumbnailPreview && (
                    <div
                      className="mt-3 aspect-video rounded-lg border border-glass-border bg-cover bg-center"
                      style={{ backgroundImage: `url(${thumbnailPreview})` }}
                      aria-label="Selected thumbnail preview"
                    />
                  )}
                </div>
              )}

              <p className="mt-3 text-xs leading-relaxed text-text-muted">
                Auto lets Bunny pick the poster frame. Time uses the selected
                second. Custom image thumbnails need Bunny Storage or a public
                thumbnail URL.
              </p>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-secondary">
                Match Score
              </span>
              <input
                type="number"
                min="0"
                max="100"
                value={matchScore}
                onChange={(event) => setMatchScore(event.target.value)}
                className="h-11 w-full rounded-lg border border-glass-border bg-bg-tertiary px-3 text-sm text-text-primary outline-none transition focus:border-accent"
                disabled={isUploading}
              />
            </label>

            <div className="grid gap-2">
              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-glass-border bg-bg-tertiary px-3 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(event) => setPublished(event.target.checked)}
                  className="h-4 w-4 accent-accent"
                  disabled={isUploading}
                />
                Publish after upload
              </label>

              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-glass-border bg-bg-tertiary px-3 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(event) => setFeatured(event.target.checked)}
                  className="h-4 w-4 accent-accent"
                  disabled={isUploading}
                />
                Feature on homepage
              </label>
            </div>

            <button
              type="button"
              onClick={startUpload}
              disabled={isUploading || selectedFileCount === 0}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Finish Upload
                </>
              )}
            </button>

            {selectedFileCount > 0 && !isUploading && (
              <p className="text-xs leading-relaxed text-text-muted">
                The title above is what appears on the homepage, watch page,
                shorts page, and admin lists.
              </p>
            )}

            {hasUploadResults && !isUploading && (
              <div className="grid gap-2">
                {hasCompletedUploads && (
                  <Link href="/admin/videos" className="btn-secondary w-full">
                    Done - Manage Videos
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setUploads([])}
                  className="rounded-lg border border-glass-border bg-bg-tertiary px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:text-text-primary"
                >
                  Upload More
                </button>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-lg border border-glass-border bg-bg-tertiary/60 p-3 text-xs leading-relaxed text-text-muted">
            Uploads are saved to your configured Cloudinary folder, then stored
            in SQLite with HLS, poster, thumbnail, preview, tags, and categories.
          </div>
        </aside>
      </div>
    </div>
  );
}
