"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEPK } from "@/context/EPKContext";
import { EPKEditor } from "@/components/EPKEditor";

function getSpotifyEmbedUrl(url: string): string | null {
  const match = url.match(/spotify\.com\/(artist|album|track|playlist)\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
}

function getSoundCloudEmbedUrl(url: string): string {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23c8ff00&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&show_teaser=true`;
}

type ThemeMode = "dark" | "light";

export default function EPKPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { data, updateData } = useEPK();
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [editorOpen, setEditorOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Save EPK for user on mount
  useEffect(() => {
    if (session?.user?.email && !data.savedByUserId) {
      updateData({
        savedByUserId: session.user.email,
        savedAt: new Date().toISOString(),
      });
    }
  }, [session, data.savedByUserId, updateData]);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const secondary = data.secondaryColor || "#c8ff00";
  const accent = data.accentColor || "#7c3aed";

  const t =
    theme === "dark"
      ? {
          bg: "#09090b",
          surface: "#111113",
          text: "#ffffff",
          muted: "rgba(255,255,255,0.5)",
          border: "rgba(255,255,255,0.07)",
          glass: "rgba(255,255,255,0.04)",
          highlight: secondary,
        }
      : {
          bg: "#f5f5f0",
          surface: "#ffffff",
          text: "#09090b",
          muted: "rgba(0,0,0,0.45)",
          border: "rgba(0,0,0,0.07)",
          glass: "rgba(0,0,0,0.02)",
          highlight: accent,
        };

  const artistName = data.artistName || "ARTIST NAME";
  const bio = data.bio || "Your bio will appear here.";
  const heroImage = data.imagePreviews[0] || null;

  const spotifyUrl = data.musicLinks?.spotify || "";
  const spotifyEmbed = spotifyUrl ? getSpotifyEmbedUrl(spotifyUrl) : null;
  const soundcloudUrl = data.musicLinks?.soundcloud || "";
  const soundcloudEmbed = soundcloudUrl ? getSoundCloudEmbedUrl(soundcloudUrl) : null;

  // Events
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

  const handleSave = () => {
    updateData({ savedAt: new Date().toISOString() });
    setEditorOpen(false);
  };

  if (status === "loading") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#09090b", color: "rgba(255,255,255,0.3)" }}
      >
        Loading...
      </div>
    );
  }

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
        transition={{ delay: 0.3, duration: 0.4 }}
        style={{ marginLeft: editorOpen ? "400px" : 0, transition: "margin 0.3s ease" }}
      >
        <button
          onClick={() => setEditorOpen(!editorOpen)}
          className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
          style={{
            background: editorOpen ? "#c8ff00" : "rgba(0,0,0,0.65)",
            backdropFilter: "blur(12px)",
            border: editorOpen ? "none" : "1px solid rgba(255,255,255,0.1)",
            color: editorOpen ? "#09090b" : "rgba(255,255,255,0.7)",
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
          style={{ background: secondary, color: "#09090b" }}
          onClick={() => navigator.clipboard.writeText(window.location.href)}
        >
          Share
        </button>
      </motion.div>

      {/* EPK Editor sidebar */}
      <EPKEditor isOpen={editorOpen} onClose={() => setEditorOpen(false)} onSave={handleSave} />

      {/* Main content - shifts right when editor is open */}
      <div
        style={{
          marginLeft: editorOpen ? "400px" : 0,
          transition: "margin 0.3s ease",
        }}
      >
        {/* Hero */}
        <section ref={heroRef} className="relative h-screen overflow-hidden flex items-end">
          <motion.div className="absolute inset-0" style={{ y: heroY }}>
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImage}
                alt="Hero"
                className="w-full h-full object-cover"
                style={{ filter: "brightness(0.35) saturate(1.2)" }}
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: `linear-gradient(135deg, ${data.primaryColor} 0%, #1a0a2e 40%, #0a140a 100%)`,
                }}
              />
            )}
          </motion.div>

          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to top, ${t.bg} 0%, rgba(0,0,0,0.2) 60%, transparent 100%)`,
            }}
          />

          <motion.div
            className="relative z-10 w-full px-8 md:px-16 pb-20"
            style={{ opacity: heroOpacity }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15 }}
            >
              <div
                className="text-xs font-bold tracking-[0.3em] uppercase mb-5"
                style={{ color: secondary }}
              >
                Electronic Press Kit
              </div>
              <h1
                className="font-bold leading-none tracking-tight"
                style={{
                  fontSize: "clamp(3.5rem, 12vw, 9rem)",
                  textShadow: `0 0 80px ${secondary}25`,
                }}
              >
                {artistName}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-5">
                {data.genre && (
                  <span
                    className="text-sm font-semibold px-3 py-1 rounded-full"
                    style={{
                      background: `${secondary}18`,
                      color: secondary,
                      border: `1px solid ${secondary}30`,
                    }}
                  >
                    {data.genre}
                  </span>
                )}
                {data.location && (
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {data.location}
                  </span>
                )}
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Bio */}
        <section className="py-24 px-8 md:px-16 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
          >
            <SectionLabel label="About" color={secondary} />
            <div className="mt-10 grid md:grid-cols-[2fr_1fr] gap-12">
              <p className="text-lg leading-loose" style={{ color: t.muted }}>
                {bio}
              </p>
              <div className="flex flex-col gap-5">
                {data.genre && (
                  <div>
                    <div className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: t.muted }}>Genre</div>
                    <div className="font-semibold text-sm">{data.genre}</div>
                  </div>
                )}
                {data.location && (
                  <div>
                    <div className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: t.muted }}>Based In</div>
                    <div className="font-semibold text-sm">{data.location}</div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Music embed */}
        {(spotifyEmbed || soundcloudEmbed) && (
          <section
            className="py-20 px-8 md:px-16"
            style={{ background: t.surface, borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}` }}
          >
            <div className="max-w-5xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <SectionLabel label="Listen" color={secondary} />
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
              </motion.div>
            </div>
          </section>
        )}

        {/* Gallery */}
        {data.imagePreviews.length > 1 && (
          <section className="py-24 px-8 md:px-16">
            <div className="max-w-5xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <SectionLabel label="Gallery" color={secondary} />
                <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {data.imagePreviews.slice(1).map((src, i) => (
                    <motion.div
                      key={i}
                      className="relative rounded-2xl overflow-hidden group"
                      style={{ aspectRatio: i === 0 ? "16/9" : "1", gridColumn: i === 0 ? "span 2" : "span 1" }}
                      initial={{ opacity: 0, scale: 0.97 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.07 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover object-top transition-all duration-500 group-hover:brightness-75 group-hover:scale-105" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* Shows */}
        {events.length > 0 && (
          <section className="py-24 px-8 md:px-16">
            <div className="max-w-5xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <SectionLabel label="Shows" color={secondary} />
                <div className="mt-8 flex flex-col gap-3">
                  {events.map((event, i) => {
                    const d = new Date(event.date);
                    const month = d.toLocaleString("en", { month: "short" }).toUpperCase();
                    const day = d.getDate();
                    return (
                      <motion.div
                        key={i}
                        className="flex items-center gap-5 p-5 rounded-2xl"
                        style={{ background: t.glass, border: `1px solid ${t.border}` }}
                        initial={{ opacity: 0, x: -12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.06 }}
                      >
                        <div className="text-center shrink-0" style={{ minWidth: 48 }}>
                          <div className="text-[10px] font-bold tracking-widest" style={{ color: secondary }}>{month}</div>
                          <div className="text-2xl font-bold leading-none mt-0.5">{day}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{event.venue}</div>
                          <div className="text-xs mt-0.5" style={{ color: t.muted }}>{[event.city, event.region, event.country].filter(Boolean).join(", ")}</div>
                        </div>
                        {event.ticketUrl && (
                          <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80" style={{ background: `${secondary}15`, color: secondary, border: `1px solid ${secondary}30` }}>
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
          <section className="py-24 px-8 md:px-16" style={{ background: t.surface, borderTop: `1px solid ${t.border}` }}>
            <div className="max-w-5xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <SectionLabel label="Contact" color={secondary} />
                <div className="mt-8 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {data.email && <ContactBlock label="General" value={data.email} href={`mailto:${data.email}`} color={secondary} t={t} />}
                  {data.bookingContact && <ContactBlock label="Booking" value={data.bookingContact} href={data.bookingEmail ? `mailto:${data.bookingEmail}` : "#"} color={accent} t={t} />}
                  {data.bookingEmail && data.bookingEmail !== data.email && <ContactBlock label="Booking Email" value={data.bookingEmail} href={`mailto:${data.bookingEmail}`} color={accent} t={t} />}
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="py-10 px-8 text-center" style={{ borderTop: `1px solid ${t.border}` }}>
          <div className="text-sm font-semibold" style={{ color: secondary }}>{artistName}</div>
          <div className="text-xs mt-1" style={{ color: t.muted }}>Electronic Press Kit</div>
        </footer>
      </div>
    </div>
  );
}

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-5">
      <div className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color }}>{label}</div>
      <div className="flex-1 h-px" style={{ background: `${color}20` }} />
    </div>
  );
}

function ContactBlock({
  label, value, href, color, t,
}: {
  label: string; value: string; href: string; color: string;
  t: { glass: string; border: string; muted: string };
}) {
  return (
    <motion.a
      href={href}
      className="p-5 rounded-2xl flex flex-col gap-1 transition-all"
      style={{ background: t.glass, border: `1px solid ${t.border}`, textDecoration: "none", color: "inherit" }}
      whileHover={{ background: `${color}08`, borderColor: `${color}30`, scale: 1.02 }}
    >
      <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: t.muted }}>{label}</div>
      <div className="text-sm font-semibold break-all">{value}</div>
    </motion.a>
  );
}
