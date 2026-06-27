// ===========================================
// PrivateVideos - Main Layout
// ===========================================
// Public layout for homepage, search, watch, and library pages.

import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import SmoothScroll from "@/components/layout/SmoothScroll";
import MyListHydrator from "@/components/layout/MyListHydrator";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SmoothScroll>
      <div className="min-h-screen bg-bg-primary">
        {/* Top Navigation */}
        <Navbar />
        <MyListHydrator />

        {/* Page Content */}
        <main className="pb-20 md:pb-0">{children}</main>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>
    </SmoothScroll>
  );
}
