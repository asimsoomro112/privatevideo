"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  Edit3,
  Eye,
  EyeOff,
  Film,
  Loader2,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES } from "@/lib/categories";
import { cn, formatDuration, getErrorMessage } from "@/lib/utils";
import ThumbnailFallback from "@/components/shared/ThumbnailFallback";

export type AdminVideo = {
  id: string;
  title: string;
  description: string;
  cloudinaryId: string;
  thumbnailUrl: string;
  duration: number;
  categories: string[];
  tags: string[];
  matchScore: number;
  views: number;
  featured: boolean;
  published: boolean;
  createdAt: string;
};

type EditForm = {
  title: string;
  description: string;
  categories: string[];
  tags: string;
  matchScore: string;
  published: boolean;
  featured: boolean;
};

function splitRawList(value?: string): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function normalizeApiVideo(video: AdminVideo & {
  categoriesRaw?: string;
  tagsRaw?: string;
}): AdminVideo {
  return {
    ...video,
    createdAt: String(video.createdAt),
    categories: Array.isArray(video.categories)
      ? video.categories
      : splitRawList(video.categoriesRaw),
    tags: Array.isArray(video.tags) ? video.tags : splitRawList(video.tagsRaw),
  };
}

function toEditForm(video: AdminVideo): EditForm {
  return {
    title: video.title,
    description: video.description,
    categories: video.categories,
    tags: video.tags.join(", "),
    matchScore: String(video.matchScore),
    published: video.published,
    featured: video.featured,
  };
}

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string; message?: string };
    return body.error || body.message || response.statusText;
  } catch {
    return response.statusText;
  }
}

function AdminThumbnail({ video }: { video: AdminVideo }) {
  const [imageError, setImageError] = useState(false);

  return imageError ? (
    <ThumbnailFallback
      title={video.title}
      seed={video.id}
      compact
      className="h-full w-full"
    />
  ) : (
    <Image
      src={video.thumbnailUrl}
      alt={`${video.title} thumbnail`}
      width={64}
      height={36}
      className="h-full w-full object-cover"
      onError={() => setImageError(true)}
    />
  );
}

export default function AdminVideosClient({
  initialVideos,
}: {
  initialVideos: AdminVideo[];
}) {
  const [videos, setVideos] = useState(initialVideos);
  const [editingVideo, setEditingVideo] = useState<AdminVideo | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const categoryLookup = useMemo(
    () => new Map(CATEGORIES.map((category) => [category.slug, category.name])),
    []
  );

  const updateVideo = async (
    video: AdminVideo,
    payload: Partial<EditForm> & {
      categories?: string[];
      tags?: string;
    }
  ) => {
    setBusyId(video.id);
    try {
      const response = await fetch(`/api/videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
          categories: payload.categories,
          tags:
            typeof payload.tags === "string"
              ? payload.tags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean)
              : undefined,
          matchScore: payload.matchScore,
          published: payload.published,
          featured: payload.featured,
        }),
      });

      if (!response.ok) throw new Error(await readApiError(response));

      const result = (await response.json()) as { data: AdminVideo };
      const updated = normalizeApiVideo(result.data);

      setVideos((current) =>
        current.map((item) => {
          if (item.id === updated.id) return updated;
          if (updated.featured) return { ...item, featured: false };
          return item;
        })
      );

      return updated;
    } finally {
      setBusyId(null);
    }
  };

  const handleQuickUpdate = async (
    video: AdminVideo,
    payload: Partial<EditForm>
  ) => {
    try {
      await updateVideo(video, payload);
      toast.success("Video updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Update failed"));
    }
  };

  const handleDelete = async (video: AdminVideo) => {
    const confirmed = window.confirm(
      `Delete "${video.title}" from the database and Cloudinary?`
    );
    if (!confirmed) return;

    setBusyId(video.id);
    try {
      const response = await fetch(`/api/videos/${video.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error(await readApiError(response));

      setVideos((current) => current.filter((item) => item.id !== video.id));
      toast.success("Video deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Delete failed"));
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (video: AdminVideo) => {
    setEditingVideo(video);
    setForm(toEditForm(video));
  };

  const closeEdit = () => {
    setEditingVideo(null);
    setForm(null);
  };

  const handleSaveEdit = async () => {
    if (!editingVideo || !form) return;

    setIsSaving(true);
    try {
      await updateVideo(editingVideo, form);
      toast.success("Metadata saved");
      closeEdit();
    } catch (error) {
      toast.error(getErrorMessage(error, "Save failed"));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (slug: string) => {
    if (!form) return;
    setForm((current) => {
      if (!current) return current;
      const exists = current.categories.includes(slug);
      return {
        ...current,
        categories: exists
          ? current.categories.filter((category) => category !== slug)
          : [...current.categories, slug],
      };
    });
  };

  if (videos.length === 0) {
    return (
      <div className="glass-card p-10 text-center md:p-16">
        <Film size={48} className="text-text-muted mx-auto mb-4 opacity-40" />
        <p className="text-text-secondary mb-4">No videos yet</p>
        <Link href="/admin/upload" className="btn-primary inline-flex">
          Upload Videos
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-glass-border text-left">
                <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                  Video
                </th>
                <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                  Categories
                </th>
                <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                  Views
                </th>
                <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                  Date
                </th>
                <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {videos.map((video) => {
                const isBusy = busyId === video.id;

                return (
                  <tr
                    key={video.id}
                    className="hover:bg-bg-tertiary/50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-9 rounded bg-bg-tertiary overflow-hidden flex-shrink-0">
                          <AdminThumbnail video={video} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate max-w-[220px]">
                            {video.title}
                          </p>
                          {video.description && (
                            <p className="text-xs text-text-muted truncate max-w-[220px]">
                              {video.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">
                      {formatDuration(video.duration)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1 flex-wrap">
                        {video.categories.slice(0, 3).map((cat) => (
                          <span
                            key={cat}
                            className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted"
                          >
                            {categoryLookup.get(cat) || cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">
                      {video.views}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {video.published ? (
                          <>
                            <Eye size={14} className="text-success" />
                            <span className="text-xs text-success">Live</span>
                          </>
                        ) : (
                          <>
                            <EyeOff size={14} className="text-warning" />
                            <span className="text-xs text-warning">Draft</span>
                          </>
                        )}
                        {video.featured && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent ml-1">
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-text-muted">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/watch/${video.id}`}
                          className="p-1.5 rounded hover:bg-bg-tertiary transition-colors text-text-muted hover:text-text-primary"
                          title="View"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          onClick={() => openEdit(video)}
                          className="p-1.5 rounded hover:bg-bg-tertiary transition-colors text-text-muted hover:text-text-primary"
                          title="Edit metadata"
                          disabled={isBusy}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() =>
                            handleQuickUpdate(video, {
                              published: !video.published,
                            })
                          }
                          className="p-1.5 rounded hover:bg-bg-tertiary transition-colors text-text-muted hover:text-success"
                          title={video.published ? "Move to draft" : "Publish"}
                          disabled={isBusy}
                        >
                          {video.published ? (
                            <EyeOff size={16} />
                          ) : (
                            <Check size={16} />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            handleQuickUpdate(video, {
                              featured: !video.featured,
                            })
                          }
                          className={cn(
                            "p-1.5 rounded hover:bg-bg-tertiary transition-colors",
                            video.featured
                              ? "text-accent"
                              : "text-text-muted hover:text-accent"
                          )}
                          title={video.featured ? "Remove featured" : "Feature"}
                          disabled={isBusy}
                        >
                          <Star
                            size={16}
                            fill={video.featured ? "currentColor" : "none"}
                          />
                        </button>
                        <button
                          onClick={() => handleDelete(video)}
                          className="p-1.5 rounded hover:bg-bg-tertiary transition-colors text-text-muted hover:text-accent disabled:opacity-50"
                          title="Delete"
                          disabled={isBusy}
                        >
                          {isBusy ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingVideo && form && (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/70 p-3 backdrop-blur-sm md:items-center md:justify-center">
          <div className="glass-card max-h-[92svh] w-full max-w-2xl overflow-y-auto p-5 shadow-2xl md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  Edit Video
                </h2>
                <p className="text-sm text-text-muted">
                  Update metadata, visibility, and homepage feature status.
                </p>
              </div>
              <button
                onClick={closeEdit}
                className="rounded-lg p-2 text-text-muted transition hover:bg-bg-tertiary hover:text-text-primary"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-text-secondary">
                  Title
                </span>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  className="h-11 w-full rounded-lg border border-glass-border bg-bg-tertiary px-3 text-sm text-text-primary outline-none transition focus:border-accent"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-text-secondary">
                  Description
                </span>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  rows={4}
                  className="w-full resize-y rounded-lg border border-glass-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent"
                />
              </label>

              <div>
                <span className="mb-2 block text-sm font-medium text-text-secondary">
                  Categories
                </span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => {
                    const selected = form.categories.includes(category.slug);
                    return (
                      <button
                        key={category.slug}
                        type="button"
                        onClick={() => toggleCategory(category.slug)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition",
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
                  value={form.tags}
                  onChange={(event) =>
                    setForm({ ...form, tags: event.target.value })
                  }
                  placeholder="comma, separated, tags"
                  className="h-11 w-full rounded-lg border border-glass-border bg-bg-tertiary px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-text-secondary">
                    Match Score
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.matchScore}
                    onChange={(event) =>
                      setForm({ ...form, matchScore: event.target.value })
                    }
                    className="h-11 w-full rounded-lg border border-glass-border bg-bg-tertiary px-3 text-sm text-text-primary outline-none transition focus:border-accent"
                  />
                </label>

                <label className="flex min-h-11 items-center gap-2 rounded-lg border border-glass-border bg-bg-tertiary px-3 text-sm text-text-secondary sm:mt-7">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(event) =>
                      setForm({ ...form, published: event.target.checked })
                    }
                    className="h-4 w-4 accent-accent"
                  />
                  Published
                </label>

                <label className="flex min-h-11 items-center gap-2 rounded-lg border border-glass-border bg-bg-tertiary px-3 text-sm text-text-secondary sm:mt-7">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(event) =>
                      setForm({ ...form, featured: event.target.checked })
                    }
                    className="h-4 w-4 accent-accent"
                  />
                  Featured
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeEdit}
                className="btn-secondary"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="btn-primary"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
