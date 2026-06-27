// ===========================================
// StreamVault - Loading Skeleton Components
// ===========================================
// Shimmer-animated skeleton loaders for premium loading states.

import { cn } from "@/lib/utils";

// Skeleton for a single video card
export function VideoCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[160px] sm:w-[200px] md:w-[240px] lg:w-[280px]">
      <div className="skeleton aspect-video rounded-lg mb-2" />
      <div className="skeleton h-4 w-3/4 rounded mb-1" />
      <div className="skeleton h-3 w-1/2 rounded" />
    </div>
  );
}

// Skeleton for a video row
export function VideoRowSkeleton() {
  return (
    <div className="mb-10">
      <div className="container-fluid">
        <div className="skeleton h-6 w-48 rounded mb-4" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Skeleton for the hero banner
export function HeroSkeleton() {
  return (
    <div className="relative w-full h-[70vh] md:h-[85vh]">
      <div className="skeleton absolute inset-0" />
      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
        <div className="skeleton h-10 w-96 rounded mb-4" />
        <div className="skeleton h-4 w-[500px] rounded mb-2" />
        <div className="skeleton h-4 w-[400px] rounded mb-6" />
        <div className="flex gap-3">
          <div className="skeleton h-12 w-32 rounded-lg" />
          <div className="skeleton h-12 w-40 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for the full homepage
export function HomeSkeleton() {
  return (
    <div className="animate-fade-in">
      <HeroSkeleton />
      <div className="space-y-2 -mt-16 relative z-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <VideoRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// Generic skeleton block
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} {...props} />;
}
