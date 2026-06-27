// ===========================================
// StreamVault - Zustand Global Client Store
// ===========================================
// Manages global UI states, user watchlists, active profile details,
// and smooth client updates without layout shifting.

import { create } from "zustand";
import type { VideoType } from "@/types";

interface AppState {
  // Watchlist state
  myList: string[]; // Array of video IDs in user's list
  setMyList: (ids: string[]) => void;
  addToMyList: (videoId: string) => Promise<void>;
  removeFromMyList: (videoId: string) => Promise<void>;
  isInList: (videoId: string) => boolean;

  // Active Profile (Multi-profile ready)
  activeProfile: {
    name: string;
    avatar: string;
  } | null;
  setActiveProfile: (profile: { name: string; avatar: string } | null) => void;

  // UI States
  heroMuted: boolean;
  setHeroMuted: (muted: boolean) => void;
  infoModalVideo: VideoType | null;
  setInfoModalVideo: (video: VideoType | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Watchlist
  myList: [],
  setMyList: (ids) => set({ myList: ids }),
  
  addToMyList: async (videoId) => {
    if (get().myList.includes(videoId)) return;

    // Optimistic UI update
    set((state) => ({ myList: [...state.myList, videoId] }));
    
    try {
      const response = await fetch("/api/my-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to add to list");
      }
    } catch (error) {
      // Revert on error
      set((state) => ({ myList: state.myList.filter((id) => id !== videoId) }));
      throw error;
    }
  },
  
  removeFromMyList: async (videoId) => {
    if (!get().myList.includes(videoId)) return;

    // Optimistic UI update
    set((state) => ({ myList: state.myList.filter((id) => id !== videoId) }));
    
    try {
      const response = await fetch("/api/my-list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to remove from list");
      }
    } catch (error) {
      // Revert on error
      set((state) => ({ myList: [...state.myList, videoId] }));
      throw error;
    }
  },
  
  isInList: (videoId) => {
    return get().myList.includes(videoId);
  },

  // Profile Management
  activeProfile: null,
  setActiveProfile: (profile) => set({ activeProfile: profile }),

  // UI state persists
  heroMuted: true,
  setHeroMuted: (muted) => set({ heroMuted: muted }),
  infoModalVideo: null,
  setInfoModalVideo: (video) => set({ infoModalVideo: video }),
}));
