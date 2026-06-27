// ===========================================
// PrivateVideos - 404 Not Found Page
// ===========================================

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center animate-fade-in">
        {/* Large 404 */}
        <h1 className="text-[8rem] font-black text-accent leading-none mb-4">
          404
        </h1>

        {/* Message */}
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Lost in the void
        </h2>
        <p className="text-text-secondary mb-8 max-w-md mx-auto">
          The content you&apos;re looking for doesn&apos;t exist or has been
          moved. Let&apos;s get you back on track.
        </p>

        {/* Back button */}
        <Link href="/" className="btn-primary text-lg px-8 py-3">
          Back to Cinema
        </Link>
      </div>
    </div>
  );
}
