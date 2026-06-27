// ===========================================
// PrivateVideos - Lenis Smooth Scroll Provider
// ===========================================
// Wraps the app with Lenis for buttery smooth scrolling.

"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const lenisRef = useRef<Lenis | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    const isMobileWidth = window.matchMedia("(max-width: 767px)").matches;

    if (prefersReducedMotion || isTouchDevice || isMobileWidth) {
      return;
    }

    const lenis = new Lenis({
      duration: 0.75,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      smoothWheel: true,
    });

    lenisRef.current = lenis;

    // RAF loop
    function raf(time: number) {
      lenis.raf(time);
      animationFrameRef.current = requestAnimationFrame(raf);
    }
    animationFrameRef.current = requestAnimationFrame(raf);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
