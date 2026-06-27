type BunnyVideoResponse = {
  guid: string;
  title: string;
  length?: number;
  status?: number;
};

type BunnyCreateVideoOptions = {
  title: string;
  thumbnailTimeSeconds?: number;
};

type BunnyUrls = {
  hlsUrl: string;
  directUrl: string;
  thumbnailUrl: string;
  posterUrl: string;
  trailerUrl: string | null;
};

class BunnyStreamError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BunnyStreamError";
    this.status = status;
  }
}

function getBunnyConfig() {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const accessKey = process.env.BUNNY_STREAM_ACCESS_KEY;
  const hostname = process.env.BUNNY_STREAM_HOSTNAME;

  if (!libraryId || !accessKey || !hostname) {
    throw new Error(
      "Bunny Stream is not configured. Add BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_ACCESS_KEY, and BUNNY_STREAM_HOSTNAME."
    );
  }

  return {
    libraryId,
    accessKey,
    hostname: hostname.replace(/^https?:\/\//, "").replace(/\/+$/, ""),
  };
}

async function readBunnyError(response: Response): Promise<string> {
  const body = await response.text();
  if (!body.trim()) return response.statusText || "Bunny Stream request failed";

  try {
    const parsed = JSON.parse(body) as { Message?: string; message?: string };
    return parsed.Message || parsed.message || body;
  } catch {
    return body;
  }
}

async function bunnyRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const { libraryId, accessKey } = getBunnyConfig();
  const response = await fetch(
    `https://video.bunnycdn.com/library/${libraryId}${path}`,
    {
      ...init,
      headers: {
        AccessKey: accessKey,
        ...(init.headers || {}),
      },
    }
  );

  if (!response.ok) {
    throw new BunnyStreamError(await readBunnyError(response), response.status);
  }

  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

export function isBunnyVideoId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function getBunnyVideoUrls(videoId: string): BunnyUrls {
  const { hostname } = getBunnyConfig();
  const baseUrl = `https://${hostname}/${videoId}`;

  return {
    hlsUrl: `${baseUrl}/playlist.m3u8`,
    directUrl: `${baseUrl}/play_720p.mp4`,
    thumbnailUrl: `${baseUrl}/thumbnail.jpg`,
    posterUrl: `${baseUrl}/thumbnail.jpg`,
    trailerUrl: null,
  };
}

export async function createBunnyVideo({
  title,
  thumbnailTimeSeconds,
}: BunnyCreateVideoOptions): Promise<BunnyVideoResponse> {
  const body: Record<string, string | number> = { title };

  if (
    typeof thumbnailTimeSeconds === "number" &&
    Number.isFinite(thumbnailTimeSeconds) &&
    thumbnailTimeSeconds >= 0
  ) {
    body.thumbnailTime = Math.round(thumbnailTimeSeconds * 1000);
  }

  return bunnyRequest<BunnyVideoResponse>("/videos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function uploadBunnyVideo(
  videoId: string,
  buffer: Buffer,
  contentType = "application/octet-stream"
): Promise<void> {
  const body = new Uint8Array(buffer);

  await bunnyRequest<unknown>(`/videos/${videoId}`, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body,
  });
}

export async function getBunnyVideo(
  videoId: string
): Promise<BunnyVideoResponse> {
  return bunnyRequest<BunnyVideoResponse>(`/videos/${videoId}`);
}

export async function setBunnyThumbnailFromUrl(
  videoId: string,
  thumbnailUrl: string
): Promise<void> {
  await bunnyRequest<unknown>(
    `/videos/${videoId}/thumbnail?thumbnailUrl=${encodeURIComponent(
      thumbnailUrl
    )}`,
    { method: "POST" }
  );
}

export async function deleteBunnyVideo(videoId: string): Promise<void> {
  await bunnyRequest<unknown>(`/videos/${videoId}`, {
    method: "DELETE",
  });
}
