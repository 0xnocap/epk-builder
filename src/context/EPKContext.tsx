"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { saveImage, loadImage, clearAllImages } from "@/lib/storage";

export interface EPKData {
  socialLink: string;
  images: File[];
  imagePreviews: string[];
  artistName: string;
  genre: string;
  location: string;
  bio: string;
  useGeneratedBio: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  email: string;
  bookingContact: string;
  bookingEmail: string;
  selectedTemplate: "bold" | "clean" | "editorial";
  currentStep: number;
  musicLinks: {
    spotify?: string;
    appleMusic?: string;
    soundcloud?: string;
    youtubeMusic?: string;
  };
  // Source tracking
  sourceUrl: string;
  sourcePlatform: "instagram" | "tiktok" | "spotify" | "manual";
  // Spotify enrichment
  spotifyArtistId: string;
  topTracks: { name: string; album: string; albumArt: string; spotifyUrl: string; previewUrl?: string }[];
  // Social links found
  socialLinks: Record<string, string>;
  // What auto-pull found (reference copy)
  autoData: {
    artistName: string;
    bio: string;
    images: string[];
    genres: string[];
  } | null;
  // Apple Music
  appleMusicBio: string;
  appleMusicTopSongs: { name: string; albumName: string; artworkUrl: string | null; url: string }[];
  appleMusicUrl: string;
  // Press & achievements
  pressQuotes: { quote: string; source: string }[];
  achievements: string[];
  // Stats
  igFollowerCount: number | null;
  tiktokFollowerCount: number | null;
  spotifyMonthlyListeners: number | null;
  genres: string[];
  // User save tracking
  savedByUserId: string | null;
  savedAt: string | null;
}

const defaultData: EPKData = {
  socialLink: "",
  images: [],
  imagePreviews: [],
  artistName: "",
  genre: "",
  location: "",
  bio: "",
  useGeneratedBio: false,
  primaryColor: "#1a1a1a",
  secondaryColor: "#049BD8",
  accentColor: "#7c3aed",
  email: "",
  bookingContact: "",
  bookingEmail: "",
  selectedTemplate: "bold",
  currentStep: 0,
  musicLinks: {},
  sourceUrl: "",
  sourcePlatform: "manual",
  spotifyArtistId: "",
  topTracks: [],
  socialLinks: {},
  autoData: null,
  appleMusicBio: "",
  appleMusicTopSongs: [],
  appleMusicUrl: "",
  pressQuotes: [],
  achievements: [],
  igFollowerCount: null,
  tiktokFollowerCount: null,
  spotifyMonthlyListeners: null,
  genres: [],
  savedByUserId: null,
  savedAt: null,
};

// What gets serialized to localStorage (no File objects or blob URLs)
interface SerializedDraft {
  socialLink: string;
  artistName: string;
  genre: string;
  location: string;
  bio: string;
  useGeneratedBio: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  email: string;
  bookingContact: string;
  bookingEmail: string;
  selectedTemplate: "bold" | "clean" | "editorial";
  currentStep: number;
  musicLinks: EPKData["musicLinks"];
  imageRefs: ({ type: "idb"; key: string } | { type: "url"; url: string })[];
  sourceUrl?: string;
  sourcePlatform?: EPKData["sourcePlatform"];
  spotifyArtistId?: string;
  topTracks?: EPKData["topTracks"];
  socialLinks?: Record<string, string>;
  autoData?: EPKData["autoData"];
  savedByUserId?: string | null;
  savedAt?: string | null;
  pressQuotes?: EPKData["pressQuotes"];
  achievements?: string[];
  igFollowerCount?: number | null;
  genres?: string[];
}

const STORAGE_KEY = "epk-draft";

function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

interface EPKContextType {
  data: EPKData;
  updateData: (updates: Partial<EPKData>) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  totalSteps: number;
  clearDraft: () => void;
  isHydrated: boolean;
}

const EPKContext = createContext<EPKContextType | null>(null);

export function EPKProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<EPKData>(defaultData);
  const [currentStep, setCurrentStep] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const totalSteps = 4;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rehydrate from localStorage + IndexedDB on mount
  useEffect(() => {
    async function rehydrate() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setIsHydrated(true);
          return;
        }
        const draft: SerializedDraft = JSON.parse(raw);

        // Rebuild images from refs
        const images: File[] = [];
        const previews: string[] = [];

        if (draft.imageRefs) {
          for (const ref of draft.imageRefs) {
            if (ref.type === "url") {
              // External URL (Spotify etc.) - just restore the preview
              previews.push(ref.url);
            } else if (ref.type === "idb") {
              const stored = await loadImage(ref.key);
              if (stored) {
                const file = new File([stored.blob], stored.name, { type: stored.type });
                images.push(file);
                previews.push(URL.createObjectURL(file));
              }
            }
          }
        }

        setData({
          ...defaultData,
          socialLink: draft.socialLink ?? "",
          artistName: draft.artistName ?? "",
          genre: draft.genre ?? "",
          location: draft.location ?? "",
          bio: draft.bio ?? "",
          useGeneratedBio: draft.useGeneratedBio ?? false,
          primaryColor: draft.primaryColor ?? defaultData.primaryColor,
          secondaryColor: draft.secondaryColor ?? defaultData.secondaryColor,
          accentColor: draft.accentColor ?? defaultData.accentColor,
          email: draft.email ?? "",
          bookingContact: draft.bookingContact ?? "",
          bookingEmail: draft.bookingEmail ?? "",
          selectedTemplate: draft.selectedTemplate ?? "bold",
          currentStep: draft.currentStep ?? 0,
          musicLinks: draft.musicLinks ?? {},
          images,
          imagePreviews: previews,
          sourceUrl: draft.sourceUrl ?? "",
          sourcePlatform: draft.sourcePlatform ?? "manual",
          spotifyArtistId: draft.spotifyArtistId ?? "",
          topTracks: draft.topTracks ?? [],
          socialLinks: draft.socialLinks ?? {},
          autoData: draft.autoData ?? null,
          savedByUserId: draft.savedByUserId ?? null,
          savedAt: draft.savedAt ?? null,
          pressQuotes: draft.pressQuotes ?? [],
          achievements: draft.achievements ?? [],
          igFollowerCount: draft.igFollowerCount ?? null,
          genres: draft.genres ?? [],
        });
        setCurrentStep(draft.currentStep ?? 0);
      } catch (e) {
        console.warn("Failed to rehydrate EPK draft:", e);
      }
      setIsHydrated(true);
    }
    rehydrate();
  }, []);

  // Persist to localStorage + IndexedDB on data changes (debounced)
  const persistData = useCallback(async (d: EPKData) => {
    try {
      // Build image refs
      const imageRefs: SerializedDraft["imageRefs"] = [];

      for (let i = 0; i < d.imagePreviews.length; i++) {
        const preview = d.imagePreviews[i];
        if (isExternalUrl(preview)) {
          imageRefs.push({ type: "url", url: preview });
        } else if (d.images[i]) {
          const key = `img-${i}-${d.images[i].name}`;
          await saveImage(key, d.images[i], {
            name: d.images[i].name,
            type: d.images[i].type,
          });
          imageRefs.push({ type: "idb", key });
        }
      }

      const draft: SerializedDraft = {
        socialLink: d.socialLink,
        artistName: d.artistName,
        genre: d.genre,
        location: d.location,
        bio: d.bio,
        useGeneratedBio: d.useGeneratedBio,
        primaryColor: d.primaryColor,
        secondaryColor: d.secondaryColor,
        accentColor: d.accentColor,
        email: d.email,
        bookingContact: d.bookingContact,
        bookingEmail: d.bookingEmail,
        selectedTemplate: d.selectedTemplate,
        currentStep: d.currentStep,
        musicLinks: d.musicLinks,
        imageRefs,
        sourceUrl: d.sourceUrl,
        sourcePlatform: d.sourcePlatform,
        spotifyArtistId: d.spotifyArtistId,
        topTracks: d.topTracks,
        socialLinks: d.socialLinks,
        autoData: d.autoData,
        savedByUserId: d.savedByUserId,
        savedAt: d.savedAt,
        pressQuotes: d.pressQuotes,
        achievements: d.achievements,
        igFollowerCount: d.igFollowerCount,
        genres: d.genres,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn("Failed to persist EPK draft:", e);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistData(data), 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, isHydrated, persistData]);

  const updateData = (updates: Partial<EPKData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    clearAllImages();
    setData(defaultData);
    setCurrentStep(0);
  }, []);

  return (
    <EPKContext.Provider
      value={{ data, updateData, currentStep, setCurrentStep, totalSteps, clearDraft, isHydrated }}
    >
      {children}
    </EPKContext.Provider>
  );
}

export function useEPK() {
  const ctx = useContext(EPKContext);
  if (!ctx) throw new Error("useEPK must be used within EPKProvider");
  return ctx;
}
