"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useStore";

export default function MyListHydrator() {
  const setMyList = useAppStore((state) => state.setMyList);

  useEffect(() => {
    let isMounted = true;

    const loadMyList = async () => {
      try {
        const response = await fetch("/api/my-list");
        if (!response.ok) return;
        const result = (await response.json()) as {
          success: boolean;
          data?: string[];
        };

        if (isMounted && result.success && Array.isArray(result.data)) {
          setMyList(result.data);
        }
      } catch {
        // My List is optional; the UI can still run without it.
      }
    };

    loadMyList();

    return () => {
      isMounted = false;
    };
  }, [setMyList]);

  return null;
}
