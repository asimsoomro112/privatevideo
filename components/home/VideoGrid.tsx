import VideoCard from "@/components/home/VideoCard";
import type { VideoType } from "@/types";

type VideoGridProps = {
  title: string;
  videos: VideoType[];
  description?: string;
};

export default function VideoGrid({ title, videos, description }: VideoGridProps) {
  if (videos.length === 0) return null;

  return (
    <section className="container-fluid pb-10 pt-2 md:pb-14">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-text-primary md:text-2xl">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-text-muted">{description}</p>
          )}
        </div>
        <span className="shrink-0 text-xs font-semibold text-text-muted">
          {videos.length} videos
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-3 md:grid-cols-4 md:gap-x-3 lg:grid-cols-5 xl:grid-cols-6">
        {videos.map((video, index) => (
          <div key={video.id} className="min-w-0">
            <VideoCard video={video} index={index} variant="grid" />
          </div>
        ))}
      </div>
    </section>
  );
}
