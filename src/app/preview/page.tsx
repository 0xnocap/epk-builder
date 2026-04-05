"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEPK } from "@/context/EPKContext";
import { useSession } from "next-auth/react";
import { SignInGate } from "@/components/SignInGate";
import { EPKEditor } from "@/components/EPKEditor";

function getSpotifyEmbedUrl(url: string): string | null {
  const match = url.match(/spotify\.com\/(artist|album|track|playlist)\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
}

function getSoundCloudEmbedUrl(url: string): string {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23c8ff00&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&show_teaser=true`;
}

function guessLinkType(url: string): "spotify" | "instagram" | "soundcloud" | "other" {
  if (url.includes("spotify")) return "spotify";
  if (url.includes("instagram")) return "instagram";
  if (url.includes("soundcloud")) return "soundcloud";
  return "other";
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toString();
}

const SOCIAL_ICONS: Record<string, string> = {
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
  tiktok: "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.63a8.26 8.26 0 0 0 4.84 1.56v-3.5a4.84 4.84 0 0 1-1.08 0z",
  twitter: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  youtube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
};

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  twitter: "X / Twitter",
  youtube: "YouTube",
  facebook: "Facebook",
};

type ThemeMode = "dark" | "light";

export default function PreviewPage() {
  const { data } = useEPK();
  const { data: session } = useSession();
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [showGate, setShowGate] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const primary = data.primaryColor || "#0a0a0a";
  const secondary = data.secondaryColor || "#c8ff00";
  const accent = data.accentColor || "#7c3aed";

  const t =
    theme === "dark"
      ? {
          bg: "#0f0f11",
          surface: "#181818",
          text: "#ffffff",
          muted: "rgba(255,255,255,0.7)",
          border: "rgba(255,255,255,0.12)",
          glass: "rgba(255,255,255,0.06)",
          highlight: secondary,
        }
      : {
          bg: "#f5f5f0",
          surface: "#ffffff",
          text: "#09090b",
          muted: "rgba(0,0,0,0.45)",
          border: "rgba(0,0,0,0.07)",
          glass: "rgba(0,0,0,0.02)",
          highlight: primary === "#0a0a0a" || primary === "#09090b" ? accent : primary,
        };

  const template = data.selectedTemplate || "bold";
  const artistName = data.artistName || "ARTIST NAME";
  const bio = data.appleMusicBio || data.bio || "Your bio will appear here.";
  const genre = data.genre;
  const location = data.location;
  const heroImage = data.imagePreviews[0] || null;

  const linkType = guessLinkType(data.socialLink);
  // Try musicLinks.spotify first, then fall back to socialLink
  const spotifyUrl = data.musicLinks?.spotify || (linkType === "spotify" ? data.socialLink : "");
  const spotifyEmbed = spotifyUrl ? getSpotifyEmbedUrl(spotifyUrl) : null;
  const soundcloudUrl = data.musicLinks?.soundcloud || (linkType === "soundcloud" ? data.socialLink : "");
  const soundcloudEmbed = soundcloudUrl ? getSoundCloudEmbedUrl(soundcloudUrl) : null;

  // Fetch show dates from Bandsintown
  interface EventData {
    date: string;
    venue: string;
    city: string;
    region: string;
    country: string;
    ticketUrl: string;
  }
  const [events, setEvents] = useState<EventData[]>([]);

  useEffect(() => {
    if (!data.artistName) return;
    fetch(`/api/events?artist=${encodeURIComponent(data.artistName)}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.events?.length) setEvents(d.events);
      })
      .catch(() => {});
  }, [data.artistName]);

  return (
    <div
      style={{
        background: t.bg,
        color: t.text,
        minHeight: "100vh",
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      {/* Floating toolbar */}
      <motion.div
        className="fixed top-4 left-0 right-0 z-30 flex items-center justify-between px-4 md:px-8"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        style={{ marginLeft: editorOpen ? "400px" : 0, transition: "margin 0.3s ease" }}
      >
        <button
          onClick={() => setEditorOpen(!editorOpen)}
          className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
          style={{
            background: editorOpen ? "#049BD8" : "rgba(0,0,0,0.65)",
            backdropFilter: "blur(12px)",
            border: editorOpen ? "none" : "1px solid rgba(255,255,255,0.1)",
            color: editorOpen ? "#fff" : "rgba(255,255,255,0.7)",
          }}
        >
          {editorOpen ? "Close" : "Edit"}
        </button>

        <div
          className="flex items-center gap-1 p-1 rounded-xl"
          style={{
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {(["dark", "light"] as ThemeMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setTheme(m)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{
                background: theme === m ? "rgba(255,255,255,0.15)" : "transparent",
                color: theme === m ? "#fff" : "rgba(255,255,255,0.4)",
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
          style={{
            background: secondary,
            color: "#09090b",
          }}
          onClick={() => {
            if (session) {
              navigator.clipboard.writeText(window.location.href);
            } else {
              setShowGate(true);
            }
          }}
        >
          {session ? "Share" : "Save"}
        </button>
      </motion.div>

      {/* Editor sidebar */}
      <EPKEditor isOpen={editorOpen} onClose={() => setEditorOpen(false)} onSave={() => setEditorOpen(false)} />

      {/* Main content - shifts when editor is open */}
      <div style={{ marginLeft: editorOpen ? "400px" : 0, transition: "margin 0.3s ease" }}>

      {/* Hero - Template Aware */}
      {template === "bold" && (
        <section ref={heroRef} className="relative h-screen overflow-hidden flex items-end">
          <motion.div className="absolute inset-0" style={{ y: heroY }}>
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImage} alt="Hero" className="w-full h-full object-cover" style={{ filter: "brightness(0.35) saturate(1.2)" }} />
            ) : (
              <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${primary} 0%, #1a0a2e 40%, #0a140a 100%)` }} />
            )}
          </motion.div>
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${t.bg} 0%, rgba(0,0,0,0.2) 60%, transparent 100%)` }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 55% 50% at 75% 40%, ${secondary}12 0%, transparent 70%)` }} />
          <motion.div className="relative z-10 w-full px-8 md:px-16 pb-20" style={{ opacity: heroOpacity }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.15 }}>
              <div className="text-xs font-bold tracking-[0.3em] uppercase mb-5" style={{ color: secondary }}>Electronic Press Kit</div>
              <h1 className="font-bold leading-none tracking-tight" style={{ fontSize: "clamp(3.5rem, 12vw, 9rem)", textShadow: `0 0 80px ${secondary}25` }}>{artistName}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-5">
                {genre && <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: `${secondary}18`, color: secondary, border: `1px solid ${secondary}30` }}>{genre}</span>}
                {location && <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{location}</span>}
              </div>
            </motion.div>
          </motion.div>
          {/* Scroll cue removed - stats bar directly follows hero */}
        </section>
      )}

      {template === "clean" && (
        <section ref={heroRef} className="relative min-h-[70vh] overflow-hidden">
          <div className="grid md:grid-cols-2 min-h-[70vh]">
            {/* Left: Image */}
            <motion.div className="relative h-[40vh] md:h-auto" style={{ y: heroY }}>
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImage} alt="Hero" className="w-full h-full object-cover object-top" style={{ filter: "saturate(1.1)" }} />
              ) : (
                <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${primary} 0%, #1a0a2e 100%)` }} />
              )}
              <div className="absolute inset-0 md:hidden" style={{ background: `linear-gradient(to bottom, transparent 60%, ${t.bg} 100%)` }} />
            </motion.div>
            {/* Right: Info */}
            <div className="flex flex-col justify-center px-8 md:px-16 py-12 relative">
              <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
                <div className="text-xs font-bold tracking-[0.3em] uppercase mb-5" style={{ color: secondary }}>Electronic Press Kit</div>
                <h1 className="font-bold leading-none tracking-tight mb-5" style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}>{artistName}</h1>
                <div className="flex flex-wrap items-center gap-3">
                  {genre && <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: `${secondary}18`, color: secondary, border: `1px solid ${secondary}30` }}>{genre}</span>}
                  {location && <span className="text-sm" style={{ color: t.muted }}>{location}</span>}
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {template === "editorial" && (
        <section ref={heroRef} className="relative min-h-[80vh] flex items-end overflow-hidden">
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${t.bg} 0%, ${primary} 100%)` }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 50% at 50% 60%, ${secondary}08 0%, transparent 70%)` }} />
          <motion.div className="relative z-10 w-full px-8 md:px-16 pb-16 pt-20 max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.1 }}>
              <div className="text-xs font-bold tracking-[0.3em] uppercase mb-6" style={{ color: secondary }}>Electronic Press Kit</div>
              <h1 className="font-bold leading-[0.9] tracking-tight mb-6" style={{ fontSize: "clamp(3rem, 10vw, 7rem)" }}>{artistName}</h1>
              <div className="flex flex-wrap items-center gap-4">
                {genre && <span className="text-sm font-semibold px-4 py-1.5 rounded-full" style={{ background: `${secondary}15`, color: secondary, border: `1px solid ${secondary}25` }}>{genre}</span>}
                {location && <span className="text-sm" style={{ color: t.muted }}>{location}</span>}
              </div>
            </motion.div>
          </motion.div>
        </section>
      )}

      {/* Stats + Platforms Section */}
      <section className="py-10 px-8 md:px-16" style={{ background: t.surface, borderBottom: `1px solid ${t.border}` }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-8"
          >
            {/* Big stat numbers */}
            {(data.spotifyMonthlyListeners || data.igFollowerCount || data.tiktokFollowerCount) && (
              <div className="flex justify-center gap-4">
                {data.spotifyMonthlyListeners && (
                  <a href={data.musicLinks?.spotify || "#"} target="_blank" rel="noopener noreferrer"
                    className="p-5 rounded-2xl text-center transition-all hover:scale-[1.02] flex-1 min-w-[150px]"
                    style={{ background: t.glass, border: `1px solid ${t.border}`, textDecoration: "none", color: "inherit" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1db954" className="mx-auto mb-2">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    <div className="font-display font-bold text-2xl">{formatNumber(data.spotifyMonthlyListeners)}</div>
                    <div className="text-[10px] font-bold tracking-widest uppercase mt-1" style={{ color: t.muted }}>Monthly Listeners</div>
                  </a>
                )}
                {data.igFollowerCount && (
                  <a href={data.socialLinks?.instagram || "#"} target="_blank" rel="noopener noreferrer"
                    className="p-5 rounded-2xl text-center transition-all hover:scale-[1.02] flex-1 min-w-[150px]"
                    style={{ background: t.glass, border: `1px solid ${t.border}`, textDecoration: "none", color: "inherit" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={t.muted} className="mx-auto mb-2">
                      <path d={SOCIAL_ICONS.instagram} />
                    </svg>
                    <div className="font-display font-bold text-2xl">{formatNumber(data.igFollowerCount)}</div>
                    <div className="text-[10px] font-bold tracking-widest uppercase mt-1" style={{ color: t.muted }}>Followers</div>
                  </a>
                )}
                {data.tiktokFollowerCount && (
                  <a href={data.socialLinks?.tiktok || "#"} target="_blank" rel="noopener noreferrer"
                    className="p-5 rounded-2xl text-center transition-all hover:scale-[1.02] flex-1 min-w-[150px]"
                    style={{ background: t.glass, border: `1px solid ${t.border}`, textDecoration: "none", color: "inherit" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={t.muted} className="mx-auto mb-2">
                      <path d={SOCIAL_ICONS.tiktok} />
                    </svg>
                    <div className="font-display font-bold text-2xl">{formatNumber(data.tiktokFollowerCount)}</div>
                    <div className="text-[10px] font-bold tracking-widest uppercase mt-1" style={{ color: t.muted }}>Followers</div>
                  </a>
                )}
                {(data.genres?.length > 0 || genre) && (
                  <div className="p-5 rounded-2xl flex flex-col items-center justify-center gap-2 flex-1 min-w-[150px]"
                    style={{ background: t.glass, border: `1px solid ${t.border}` }}>
                    <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: t.muted }}>Genre</div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {(data.genres?.length > 0 ? data.genres : [genre]).filter(Boolean).map((g, i) => (
                        <span key={i} className="text-xs font-semibold px-3 py-1 rounded-full"
                          style={{ background: `${secondary}15`, color: secondary, border: `1px solid ${secondary}25` }}>
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Additional platform links (only ones NOT already shown as stat cards) */}
            {(() => {
              const shownInCards = new Set<string>();
              if (data.spotifyMonthlyListeners) shownInCards.add("spotify");
              if (data.igFollowerCount) shownInCards.add("instagram");
              if (data.tiktokFollowerCount) shownInCards.add("tiktok");

              const extraSocials = Object.entries(data.socialLinks || {}).filter(([p, url]) => url && SOCIAL_ICONS[p] && !shownInCards.has(p));
              const extraMusic = [
                !shownInCards.has("spotify") && data.musicLinks?.spotify ? { key: "spotify", url: data.musicLinks.spotify, label: "Spotify", color: "#1db954" } : null,
                data.musicLinks?.appleMusic ? { key: "appleMusic", url: data.musicLinks.appleMusic, label: "Apple Music", color: "#fc3c44" } : null,
                data.musicLinks?.youtubeMusic ? { key: "youtube", url: data.musicLinks.youtubeMusic, label: "YouTube", color: "#ff0000" } : null,
              ].filter(Boolean);

              if (extraSocials.length === 0 && extraMusic.length === 0) return null;

              return (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {extraSocials.map(([platform, url]) => (
                    <motion.a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all"
                      style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.muted, textDecoration: "none" }}
                      whileHover={{ borderColor: `${secondary}40`, color: t.text, scale: 1.03 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d={SOCIAL_ICONS[platform]} /></svg>
                      {SOCIAL_LABELS[platform] || platform}
                    </motion.a>
                  ))}
                  {extraMusic.map((item: any) => (
                    <motion.a key={item.key} href={item.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all"
                      style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.muted, textDecoration: "none" }}
                      whileHover={{ borderColor: `${item.color}40`, color: item.color, scale: 1.03 }}
                    >
                      {item.label}
                    </motion.a>
                  ))}
                </div>
              );
            })()}
          </motion.div>
        </div>
      </section>

      {/* About */}
      <section className="py-16 px-8 md:px-16">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <SectionLabel label="About" color={secondary} />
            <div className="mt-10 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8 md:gap-16">
              <p className="text-base leading-relaxed" style={{ color: t.muted }} dangerouslySetInnerHTML={{ __html: bio.replace(/<(?!\/?(i|em|b|strong)\b)[^>]*>/gi, '') }} />
              <div className="flex flex-col gap-5 md:text-right md:items-end">
                {(data.genres?.length > 0 || genre) && (
                  <div>
                    <div className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: t.muted }}>Genre</div>
                    <div className="font-semibold text-sm">{(data.genres?.length > 0 ? data.genres : [genre]).filter(Boolean).join(", ")}</div>
                  </div>
                )}
                {location && (
                  <div>
                    <div className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: t.muted }}>Based In</div>
                    <div className="font-semibold text-sm">{location}</div>
                  </div>
                )}
                {(data.igFollowerCount || data.tiktokFollowerCount || data.spotifyMonthlyListeners) && (
                  <div>
                    <div className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: t.muted }}>Reach</div>
                    <div className="flex flex-col gap-1">
                      {data.spotifyMonthlyListeners && <div className="font-semibold text-sm">{formatNumber(data.spotifyMonthlyListeners)} Spotify listeners</div>}
                      {data.igFollowerCount && <div className="font-semibold text-sm">{formatNumber(data.igFollowerCount)} Instagram followers</div>}
                      {data.tiktokFollowerCount && <div className="font-semibold text-sm">{formatNumber(data.tiktokFollowerCount)} TikTok followers</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Music - Combined: Embed + Top Tracks + Streaming Links */}
      {(spotifyEmbed || soundcloudEmbed || data.topTracks?.length > 0 || (data.musicLinks && Object.values(data.musicLinks).some(Boolean))) && (
        <section
          className="py-20 px-8 md:px-16"
          style={{ background: t.surface, borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}` }}
        >
          <div className="max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <SectionLabel label="Music" color={secondary} />

              {/* Spotify / SoundCloud embed */}
              <div className="mt-8 space-y-5">
                {spotifyEmbed && (
                  <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
                    <iframe src={spotifyEmbed} width="100%" height="352" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
                  </div>
                )}
                {soundcloudEmbed && (
                  <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
                    <iframe width="100%" height="166" scrolling="no" frameBorder="no" allow="autoplay" src={soundcloudEmbed} />
                  </div>
                )}
              </div>

              {/* Top Songs - from Apple Music or Spotify */}
              {(data.appleMusicTopSongs?.length > 0 || data.topTracks?.length > 0) && (
                <div className="mt-8">
                  <div className="text-[10px] font-bold tracking-widest uppercase mb-4" style={{ color: t.muted }}>Top Songs</div>
                  <div className="flex flex-col gap-2">
                    {(data.appleMusicTopSongs?.length > 0 ? data.appleMusicTopSongs : data.topTracks).slice(0, 5).map((track: any, i: number) => (
                      <motion.a
                        key={i}
                        href={track.url || track.spotifyUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-3 rounded-xl transition-all"
                        style={{ background: t.glass, border: `1px solid ${t.border}`, textDecoration: "none", color: "inherit" }}
                        whileHover={{ borderColor: `${secondary}30`, background: `${secondary}06`, scale: 1.01 }}
                      >
                        {(track.artworkUrl || track.albumArt) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={track.artworkUrl || track.albumArt} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{track.name}</div>
                          <div className="text-xs truncate" style={{ color: t.muted }}>{track.albumName || track.album}</div>
                        </div>
                        <span className="text-xs shrink-0" style={{ color: t.muted }}>{i + 1}</span>
                      </motion.a>
                    ))}
                  </div>
                </div>
              )}

              {/* (Streaming links are in the platforms bar above) */}
            </motion.div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {data.imagePreviews.length > 1 && (
        <section className="py-24 px-8 md:px-16">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <SectionLabel label="Gallery" color={secondary} />
              <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3">
                {data.imagePreviews.slice(1).map((src, i) => (
                  <motion.div
                    key={i}
                    className="relative rounded-2xl overflow-hidden group"
                    style={{
                      aspectRatio: i === 0 ? "16/9" : "1",
                      gridColumn: i === 0 ? "span 2" : "span 1",
                    }}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.07 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Gallery ${i + 1}`}
                      className="w-full h-full object-cover object-top transition-all duration-500 group-hover:brightness-75 group-hover:scale-105"
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Press & Achievements */}
      {(data.pressQuotes?.length > 0 || data.achievements?.length > 0) && (
        <section className="py-24 px-8 md:px-16" style={{ background: t.surface, borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}` }}>
          <div className="max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <SectionLabel label="Press" color={secondary} />
              {data.pressQuotes?.length > 0 && (
                <div className="mt-8 grid md:grid-cols-2 gap-4">
                  {data.pressQuotes.map((pq, i) => (
                    <motion.blockquote
                      key={i}
                      className="p-6 rounded-2xl"
                      style={{ background: t.glass, border: `1px solid ${t.border}` }}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <p className="text-sm leading-relaxed italic" style={{ color: t.muted }}>"{pq.quote}"</p>
                      {pq.source && <cite className="block mt-3 text-xs font-semibold not-italic" style={{ color: secondary }}>{pq.source}</cite>}
                    </motion.blockquote>
                  ))}
                </div>
              )}
              {data.achievements?.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-3">
                  {data.achievements.map((a, i) => (
                    <span key={i} className="text-xs font-semibold px-4 py-2 rounded-full" style={{ background: `${secondary}10`, color: secondary, border: `1px solid ${secondary}20` }}>
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* Shows */}
      {events.length > 0 && (
        <section className="py-24 px-8 md:px-16">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <SectionLabel label="Shows" color={secondary} />
              <div className="mt-8 flex flex-col gap-3">
                {events.map((event, i) => {
                  const d = new Date(event.date);
                  const month = d.toLocaleString("en", { month: "short" }).toUpperCase();
                  const day = d.getDate();
                  return (
                    <motion.div
                      key={i}
                      className="flex items-center gap-5 p-5 rounded-2xl transition-all"
                      style={{
                        background: t.glass,
                        border: `1px solid ${t.border}`,
                      }}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      whileHover={{
                        borderColor: `${secondary}30`,
                        background: `${secondary}06`,
                      }}
                    >
                      <div className="text-center shrink-0" style={{ minWidth: 48 }}>
                        <div
                          className="text-[10px] font-bold tracking-widest"
                          style={{ color: secondary }}
                        >
                          {month}
                        </div>
                        <div className="text-2xl font-bold leading-none mt-0.5">{day}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{event.venue}</div>
                        <div className="text-xs mt-0.5" style={{ color: t.muted }}>
                          {[event.city, event.region, event.country].filter(Boolean).join(", ")}
                        </div>
                      </div>
                      {event.ticketUrl && (
                        <a
                          href={event.ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                          style={{
                            background: `${secondary}15`,
                            color: secondary,
                            border: `1px solid ${secondary}30`,
                          }}
                        >
                          Tickets
                        </a>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Contact */}
      {(data.email || data.bookingContact || data.bookingEmail) && (
        <section
          className="py-24 px-8 md:px-16"
          style={{
            background: t.surface,
            borderTop: `1px solid ${t.border}`,
          }}
        >
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <SectionLabel label="Contact" color={secondary} />
              <div className="mt-8 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {data.email && (
                  <ContactBlock label="General" value={data.email} href={`mailto:${data.email}`} color={secondary} t={t} />
                )}
                {data.bookingContact && (
                  <ContactBlock label="Booking" value={data.bookingContact} href={data.bookingEmail ? `mailto:${data.bookingEmail}` : "#"} color={accent} t={t} />
                )}
                {data.bookingEmail && data.bookingEmail !== data.email && (
                  <ContactBlock label="Booking Email" value={data.bookingEmail} href={`mailto:${data.bookingEmail}`} color={accent} t={t} />
                )}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* (Social links are in the platforms bar under the hero) */}

      {/* Footer with platform links */}
      <footer className="py-12 px-8" style={{ borderTop: `1px solid ${t.border}` }}>
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-5">
          <div className="text-sm font-display font-bold" style={{ color: secondary }}>
            {artistName}
          </div>
          {/* Repeat platform links in footer */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {Object.entries({ ...data.socialLinks, ...(data.musicLinks || {}) }).map(([key, url]) => {
              if (!url) return null;
              const icon = SOCIAL_ICONS[key];
              return icon ? (
                <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="transition-all hover:opacity-70">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={t.muted}><path d={icon} /></svg>
                </a>
              ) : null;
            })}
          </div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: t.muted }}>
            Electronic Press Kit
          </div>
        </div>
      </footer>

      </div>{/* end content shift wrapper */}

      {/* Sign-in gate */}
      <SignInGate isOpen={showGate} onClose={() => setShowGate(false)} />
    </div>
  );
}

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-5">
      <div
        className="text-[10px] font-bold tracking-[0.25em] uppercase"
        style={{ color }}
      >
        {label}
      </div>
      <div className="flex-1 h-px" style={{ background: `${color}20` }} />
    </div>
  );
}

function ContactBlock({
  label,
  value,
  href,
  color,
  t,
}: {
  label: string;
  value: string;
  href: string;
  color: string;
  t: { glass: string; border: string; muted: string };
}) {
  return (
    <motion.a
      href={href}
      className="p-5 rounded-2xl flex flex-col gap-1 transition-all"
      style={{
        background: t.glass,
        border: `1px solid ${t.border}`,
        textDecoration: "none",
        color: "inherit",
      }}
      whileHover={{
        background: `${color}08`,
        borderColor: `${color}30`,
        scale: 1.02,
      }}
    >
      <div
        className="text-[10px] font-bold tracking-widest uppercase"
        style={{ color: t.muted }}
      >
        {label}
      </div>
      <div className="text-sm font-semibold break-all">{value}</div>
    </motion.a>
  );
}
