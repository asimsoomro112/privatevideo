// HerPrivateCinema - Bunny Stream bulk local video uploader.
// Usage: npm run bulk-upload -- "C:\Users\muham\Downloads\VIdeos"

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import {
  createBunnyVideo,
  getBunnyVideo,
  getBunnyVideoUrls,
  uploadBunnyVideo,
} from "../lib/bunny";

type VideoKind = "short" | "video";

type VideoFile = {
  path: string;
  name: string;
  ext: string;
  size: number;
  duration: number;
  kind: VideoKind;
  title: string;
};

type UploadReportItem = {
  title: string;
  path: string;
  status: "uploaded" | "skipped" | "failed";
  duration: number;
  providerId?: string;
  error?: string;
};

type UploadError = {
  message?: unknown;
  error?: unknown;
  status?: unknown;
};

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm"]);
const SHORT_LIMIT_SECONDS = 120;
const prisma = new PrismaClient();

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const envConfig = fs.readFileSync(envPath, "utf-8");
  for (const line of envConfig.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const [key, ...rest] = trimmed.split("=");
    if (!key || rest.length === 0) continue;

    let value = rest.join("=").trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key.trim()] = value;
  }
}

function findVideoFiles(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      findVideoFiles(fullPath, files);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (entry.isFile() && VIDEO_EXTENSIONS.has(ext)) {
      files.push(fullPath);
    }
  }

  return files;
}

function getDurationMapWithPowerShell(files: string[]): Map<string, number> {
  if (files.length === 0) return new Map();

  const script = String.raw`
$ErrorActionPreference = "Stop"
$paths = [Console]::In.ReadToEnd() | ConvertFrom-Json
$shell = New-Object -ComObject Shell.Application
$result = foreach ($path in $paths) {
  $file = Get-Item -LiteralPath $path
  $folder = $shell.Namespace($file.DirectoryName)
  $item = $folder.ParseName($file.Name)
  $duration = $null
  if ($item -ne $null) {
    $duration = $item.ExtendedProperty("System.Media.Duration")
  }
  if ($duration -is [array]) {
    $duration = $duration[0]
  }
  $seconds = 0
  if ($duration) {
    $seconds = [double]$duration / 10000000
  }
  [pscustomobject]@{
    Path = $path
    Duration = $seconds
  }
}
$result | ConvertTo-Json -Depth 3 -Compress
`;

  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
    {
      input: JSON.stringify(files),
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 20,
    }
  );

  if (result.status !== 0) {
    const error = result.stderr.trim() || "PowerShell duration scan failed";
    console.warn(`Duration scan warning: ${error}`);
    return new Map();
  }

  try {
    const parsed = JSON.parse(result.stdout || "[]") as
      | Array<{ Path: string; Duration: number }>
      | { Path: string; Duration: number };
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return new Map(
      rows.map((row) => [path.resolve(row.Path), Number(row.Duration) || 0])
    );
  } catch {
    console.warn("Duration scan warning: could not parse PowerShell output.");
    return new Map();
  }
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "unknown";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

function randomMatchScore(): number {
  return Math.floor(Math.random() * 20) + 80;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;

  if (error && typeof error === "object") {
    const uploadError = error as UploadError;
    if (typeof uploadError.message === "string") return uploadError.message;
    if (typeof uploadError.error === "string") return uploadError.error;

    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown object error";
    }
  }

  return "Unknown error";
}

async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha1");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function buildFiles(sourceDir: string): VideoFile[] {
  const paths = findVideoFiles(sourceDir)
    .map((filePath) => path.resolve(filePath))
    .sort((a, b) => a.localeCompare(b));
  const durationMap = getDurationMapWithPowerShell(paths);

  const rawFiles = paths.map((filePath) => {
    const stats = fs.statSync(filePath);
    const duration = durationMap.get(filePath) || 0;
    const kind: VideoKind =
      duration > 0 && duration < SHORT_LIMIT_SECONDS ? "short" : "video";

    return {
      path: filePath,
      name: path.basename(filePath),
      ext: path.extname(filePath).toLowerCase(),
      size: stats.size,
      duration,
      kind,
    };
  });

  const shorts = rawFiles
    .filter((file) => file.kind === "short")
    .sort((a, b) => a.duration - b.duration || a.name.localeCompare(b.name));
  const videos = rawFiles
    .filter((file) => file.kind === "video")
    .sort((a, b) => a.name.localeCompare(b.name));

  return [
    ...shorts.map((file, index) => ({
      ...file,
      title: `Short ${String(index + 1).padStart(3, "0")}`,
    })),
    ...videos.map((file, index) => ({
      ...file,
      title: `Video ${String(index + 1).padStart(3, "0")}`,
    })),
  ];
}

async function findExistingVideo(file: VideoFile, hash: string) {
  const byHash = await prisma.video.findFirst({
    where: {
      tagsRaw: {
        contains: hash,
      },
    },
    select: { id: true, title: true },
  });
  if (byHash) return byHash;

  return prisma.video.findFirst({
    where: {
      title: file.title,
    },
    select: { id: true, title: true },
  });
}

async function uploadOne(
  file: VideoFile,
  position: number,
  total: number
): Promise<UploadReportItem> {
  const hash = await hashFile(file.path);
  const hashTag = `file:${hash}`;

  console.log(
    `[${position}/${total}] ${file.title} | ${file.kind} | ${formatDuration(
      file.duration
    )} | ${formatSize(file.size)}`
  );

  const existing = await findExistingVideo(file, hash);
  if (existing) {
    console.log(`  skipped: already in database`);
    return {
      title: file.title,
      path: file.path,
      status: "skipped",
      duration: file.duration,
    };
  }

  try {
    const createdVideo = await createBunnyVideo({
      title: file.title,
    });
    const buffer = fs.readFileSync(file.path);
    await uploadBunnyVideo(createdVideo.guid, buffer, "application/octet-stream");

    const details = await getBunnyVideo(createdVideo.guid).catch(
      () => createdVideo
    );
    const urls = getBunnyVideoUrls(createdVideo.guid);
    const categories = file.kind === "short" ? ["short", "new"] : ["new"];
    const slug = `${slugify(file.title)}-${hash.slice(0, 8)}`;
    const duration = details.length || file.duration || 0;

    const video = await prisma.video.create({
      data: {
        title: file.title,
        description: "",
        slug,
        cloudinaryId: createdVideo.guid,
        cloudinaryUrl: urls.directUrl,
        hlsUrl: urls.hlsUrl,
        thumbnailUrl: urls.thumbnailUrl,
        posterUrl: urls.posterUrl,
        trailerUrl: urls.trailerUrl,
        duration,
        categoriesRaw: categories.join(","),
        tagsRaw: ["uploaded", "bulk-upload", "bunny", hashTag, ...categories].join(
          ","
        ),
        matchScore: randomMatchScore(),
        featured: false,
        published: true,
      },
    });

    console.log(`  uploaded: ${video.title}`);
    return {
      title: file.title,
      path: file.path,
      status: "uploaded",
      duration: video.duration,
      providerId: createdVideo.guid,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    console.log(`  failed: ${message}`);
    return {
      title: file.title,
      path: file.path,
      status: "failed",
      duration: file.duration,
      error: message,
    };
  }
}

async function run() {
  loadEnv();

  const dryRun = process.argv.includes("--dry-run");
  const sourceArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const limitArg = process.argv
    .find((arg) => arg.startsWith("--limit="))
    ?.split("=")[1];
  const limit = limitArg ? Number.parseInt(limitArg, 10) : 0;

  if (!sourceArg) {
    throw new Error("Folder path missing. Example: npm run bulk-upload -- C:\\Videos");
  }

  const sourceDir = path.resolve(sourceArg);
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Folder does not exist: ${sourceDir}`);
  }

  const allFiles = buildFiles(sourceDir);
  const files =
    limit > 0 && Number.isFinite(limit) ? allFiles.slice(0, limit) : allFiles;
  const shorts = files.filter((file) => file.kind === "short").length;
  const videos = files.length - shorts;

  console.log(`Found ${files.length} supported videos.`);
  console.log(`Upload order: ${shorts} shorts first, then ${videos} long videos.`);

  if (dryRun) {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    console.log(`Dry run only. Total size: ${formatSize(totalSize)}.`);
    return;
  }

  const report: UploadReportItem[] = [];
  let consecutiveFailures = 0;

  for (let index = 0; index < files.length; index += 1) {
    const result = await uploadOne(files[index], index + 1, files.length);
    report.push(result);

    if (result.status === "failed") {
      consecutiveFailures += 1;
    } else {
      consecutiveFailures = 0;
    }

    if (consecutiveFailures >= 5) {
      console.log("Stopping early after 5 consecutive failures.");
      break;
    }
  }

  const reportPath = path.resolve(process.cwd(), "bulk-upload-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const uploaded = report.filter((item) => item.status === "uploaded").length;
  const skipped = report.filter((item) => item.status === "skipped").length;
  const failed = report.filter((item) => item.status === "failed").length;

  console.log("Bulk upload finished.");
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Report: ${reportPath}`);
}

run()
  .catch((error) => {
    console.error(`Fatal: ${getErrorMessage(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
