// ===========================================
// PrivateVideos - Admin Dashboard
// ===========================================
// Overview page with stats and recent uploads.

import { prisma } from "@/lib/prisma";
import { Film, Users, Eye, HardDrive } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  // Fetch stats
  const [videoCount, userCount, totalViews] = await Promise.all([
    prisma.video.count(),
    prisma.user.count(),
    prisma.video.aggregate({ _sum: { views: true } }),
  ]);

  // Recent videos
  const recentVideos = await prisma.video.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const stats = [
    {
      label: "Total Videos",
      value: videoCount,
      icon: Film,
      color: "text-accent",
    },
    {
      label: "Total Users",
      value: userCount,
      icon: Users,
      color: "text-blue-400",
    },
    {
      label: "Total Views",
      value: totalViews._sum.views || 0,
      icon: Eye,
      color: "text-green-400",
    },
    {
      label: "Storage",
      value: `${videoCount} files`,
      icon: HardDrive,
      color: "text-purple-400",
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-muted text-sm">
            Manage your streaming platform
          </p>
        </div>
        <Link href="/admin/upload" className="btn-primary">
          Upload Videos
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center ${stat.color}`}
              >
                <stat.icon size={20} />
              </div>
            </div>
            <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
            <p className="text-xs text-text-muted mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Videos Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-glass-border">
          <h2 className="text-lg font-semibold text-text-primary">
            Recent Uploads
          </h2>
        </div>

        {recentVideos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-glass-border text-left">
                  <th className="px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                    Title
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
                    Added
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {recentVideos.map((video) => (
                  <tr
                    key={video.id}
                    className="hover:bg-bg-tertiary/50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-text-primary truncate max-w-[200px]">
                        {video.title}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1 flex-wrap">
                        {video.categories.slice(0, 2).map((cat) => (
                          <span
                            key={cat}
                            className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">
                      {video.views}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs font-medium ${video.published ? "text-success" : "text-warning"}`}
                      >
                        {video.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-muted">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-text-muted">
            <Film size={40} className="mx-auto mb-3 opacity-40" />
            <p>No videos uploaded yet</p>
            <Link
              href="/admin/upload"
              className="btn-primary mt-4 inline-flex"
            >
              Upload First Video
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
