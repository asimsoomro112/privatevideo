// ===========================================
// HerPrivateCinema - Root Layout
// ===========================================

import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HerPrivateCinema - Premium Private Streaming",
    template: "%s | HerPrivateCinema",
  },
  description:
    "A private premium cinematic video streaming platform with adaptive Cloudinary playback.",
  keywords: ["streaming", "video", "private", "premium", "cinema"],
  authors: [{ name: "HerPrivateCinema" }],
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg-primary text-text-primary antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#17111C",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#fff",
              fontSize: "0.875rem",
            },
          }}
        />
      </body>
    </html>
  );
}
