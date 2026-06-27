// ===========================================
// PrivateVideos - Admin Layout
// ===========================================
// Protected admin pages for local PrivateVideos management.

import Link from "next/link";
import {
  LayoutDashboard,
  Upload,
  Film,
  ArrowLeft,
  Shield,
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-bg-secondary border-r border-glass-border">
        {/* Logo */}
        <div className="p-6 border-b border-glass-border">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-accent" />
            <span className="text-lg font-bold text-text-primary">
              Admin Panel
            </span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-4 space-y-1">
          <AdminNavLink
            href="/admin"
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
          />
          <AdminNavLink
            href="/admin/upload"
            icon={<Upload size={18} />}
            label="Upload"
          />
          <AdminNavLink
            href="/admin/videos"
            icon={<Film size={18} />}
            label="Videos"
          />
        </nav>

        {/* Back to site */}
        <div className="p-4 border-t border-glass-border">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Cinema
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile admin header */}
        <div className="md:hidden flex items-center gap-4 p-4 bg-bg-secondary border-b border-glass-border">
          <Link href="/" className="text-text-muted">
            <ArrowLeft size={20} />
          </Link>
          <span className="font-bold text-text-primary flex items-center gap-2">
            <Shield size={16} className="text-accent" />
            Admin
          </span>
        </div>
        <nav className="md:hidden grid grid-cols-3 gap-2 border-b border-glass-border bg-bg-secondary/80 px-4 py-3">
          <AdminNavLink
            href="/admin"
            icon={<LayoutDashboard size={16} />}
            label="Dashboard"
          />
          <AdminNavLink
            href="/admin/upload"
            icon={<Upload size={16} />}
            label="Upload"
          />
          <AdminNavLink
            href="/admin/videos"
            icon={<Film size={16} />}
            label="Videos"
          />
        </nav>

        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}

// Sidebar navigation link
function AdminNavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
    >
      {icon}
      {label}
    </Link>
  );
}
