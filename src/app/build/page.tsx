"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useEPK } from "@/context/EPKContext";
import { PalettePicker } from "@/components/PalettePicker";
import { PALETTES, type Palette } from "@/lib/palettes";

// ─── Template definitions ────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: "bold" as const,
    name: "Bold",
    desc: "Full-screen hero, large name overlay",
    preview: (accent: string) => (
      <div className="w-full aspect-[4/5] rounded-xl overflow-hidden relative" style={{ background: "#111" }}>
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%)`, opacity: 0.7 }} />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="h-1 w-8 rounded-full mb-2" style={{ background: accent }} />
          <div className="h-3 w-3/4 rounded-full mb-1.5" style={{ background: "#fff" }} />
          <div className="h-1.5 w-1/3 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }} />
        </div>
      </div>
    ),
  },
  {
    id: "clean" as const,
    name: "Clean",
    desc: "Split layout, balanced and professional",
    preview: (accent: string) => (
      <div className="w-full aspect-[4/5] rounded-xl overflow-hidden flex" style={{ background: "#111" }}>
        <div className="w-1/2 h-full" style={{ background: "#1a1a1a" }} />
        <div className="flex-1 p-3 flex flex-col justify-center gap-2">
          <div className="h-1 w-6 rounded-full" style={{ background: accent }} />
          <div className="h-2.5 rounded-full w-3/4" style={{ background: "#fff" }} />
          <div className="h-1.5 rounded-full w-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          <div className="h-1.5 rounded-full w-2/3" style={{ background: "rgba(255,255,255,0.1)" }} />
        </div>
      </div>
    ),
  },
  {
    id: "editorial" as const,
    name: "Editorial",
    desc: "Typography-forward, minimal imagery",
    preview: (accent: string) => (
      <div className="w-full aspect-[4/5] rounded-xl overflow-hidden p-4 flex flex-col justify-between" style={{ background: "#111" }}>
        <div className="flex flex-col gap-2">
          <div className="h-1 w-8 rounded-full" style={{ background: accent }} />
          <div className="h-4 rounded-full w-2/3" style={{ background: "#fff" }} />
          <div className="h-1.5 rounded-full w-1/3" style={{ background: "rgba(255,255,255,0.3)" }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="h-1 rounded-full w-full" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="h-1 rounded-full w-5/6" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="mt-2 flex gap-2">
            <div className="h-5 w-5 rounded-full" style={{ background: `${accent}30` }} />
            <div className="h-5 w-5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
        </div>
      </div>
    ),
  },
];

// ─── Animation config ────────────────────────────────────────────────────────

const pageTransition = {
  initial: { opacity: 0, y: 30, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -20, filter: "blur(4px)" },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toString();
}

// ─── Thinking dots ───────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <span className="inline-flex gap-1 ml-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: "#049BD8" }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1, 0.8] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

// ─── Main build page ─────────────────────────────────────────────────────────

function BuildPageInner() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") || "";
  const router = useRouter();
  const { data, updateData } = useEPK();

  // Flow state
  const [phase, setPhase] = useState<"loading" | "steps">(url ? "loading" : "steps");
  const [step, setStep] = useState(0);
  const [resolvedData, setResolvedData] = useState<any>(null);
  const [selectedPalette, setSelectedPalette] = useState(PALETTES[0]);
  const [selectedTemplate, setSelectedTemplate] = useState<"bold" | "clean" | "editorial">("bold");

  // Manual fields (init from context in case of re-entry)
  const [manualName, setManualName] = useState(data.artistName || "");
  const [manualGenre, setManualGenre] = useState(data.genre || "");
  const [manualLocation, setManualLocation] = useState(data.location || "");

  // Loading reveal state
  const [loadingText, setLoadingText] = useState("Researching your artist");
  const [revealedName, setRevealedName] = useState("");
  const [revealedGenre, setRevealedGenre] = useState("");
  const [revealedImage, setRevealedImage] = useState("");
  const [revealedSpotify, setRevealedSpotify] = useState(false);
  const [revealedImageCount, setRevealedImageCount] = useState(0);
  const [loadingDone, setLoadingDone] = useState(false);

  // ─── Auto-pull with intentional pacing ──────────────────────────────────

  useEffect(() => {
    if (!url || phase !== "loading") return;

    async function resolve() {
      setLoadingText("Researching your artist");

      // Let the initial state breathe
      await delay(800);

      try {
        const res = await fetch("/api/scrape/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const d = await res.json();
        setResolvedData(d);

        // Stream results with deliberate pacing

        // 1. Artist name reveal
        if (d.artistName) {
          setLoadingText("Found your profile");
          await delay(600);
          setRevealedName(d.artistName);
          await delay(800);
        }

        // 2. Genre
        if (d.genres?.[0]) {
          setRevealedGenre(d.genres.slice(0, 3).join(" / "));
          await delay(600);
        }

        // 3. Profile image
        const heroImg = d.images?.find((img: string) => img.includes("scdn.co")) || d.images?.[0];
        if (heroImg) {
          setLoadingText("Pulling your visuals");
          await delay(400);
          setRevealedImage(heroImg);
          await delay(800);
        }

        // 4. Spotify
        if (d.spotify?.found) {
          setLoadingText("Connecting your music");
          await delay(500);
          setRevealedSpotify(true);
          await delay(600);
        }

        // 5. Image count
        if (d.images?.length > 0) {
          setRevealedImageCount(d.images.length);
          await delay(400);
        }

        // Populate context
        updateData({
          sourceUrl: url,
          sourcePlatform: d.source || "manual",
          artistName: d.artistName || "",
          genre: d.genres?.[0] || "",
          bio: d.bio || "",
          imagePreviews: d.images || [],
          musicLinks: {
            spotify: d.spotify?.url || d.musicLinks?.spotify,
            appleMusic: d.musicLinks?.appleMusic,
            soundcloud: d.musicLinks?.soundcloud,
            youtubeMusic: d.musicLinks?.youtubeMusic || d.musicLinks?.youtube,
          },
          spotifyArtistId: d.spotify?.artistId || "",
          topTracks: d.spotify?.topTracks || [],
          socialLinks: d.socialLinks || {},
          igFollowerCount: d.igFollowerCount || null,
          tiktokFollowerCount: d.tiktokFollowerCount || null,
          spotifyMonthlyListeners: d.spotifyMonthlyListeners || null,
          genres: d.genres || [],
          appleMusicBio: d.appleMusic?.bio || "",
          appleMusicTopSongs: d.appleMusic?.topSongs || [],
          appleMusicUrl: d.appleMusic?.url || "",
          autoData: d.artistName
            ? { artistName: d.artistName, bio: d.bio || "", images: d.images || [], genres: d.genres || [] }
            : null,
        });

        // Use Apple Music bio if available and IG bio is short
        if (d.appleMusic?.bio && (!d.bio || d.bio.length < 50)) {
          updateData({ bio: d.appleMusic.bio });
        }

        // AI enrichment - only if we still need bio or genre after Apple Music
        const currentBio = d.appleMusic?.bio || d.bio || "";
        const needsBio = currentBio.length < 50;
        const needsGenre = !d.genres || d.genres.length === 0;

        if (needsBio || needsGenre) {
          setLoadingText("Writing your story");
          await delay(400);

          try {
            const genRes = await fetch("/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "bio",
                context: {
                  artistName: d.artistName,
                  genre: d.genres?.[0] || "",
                  location: "",
                  additionalInfo: d.bio ? `Their social bio says: "${d.bio}". Instagram followers: ${d.igFollowerCount ? formatNumber(d.igFollowerCount) : "unknown"}. ${d.spotify?.found ? "They are on Spotify." : ""} Write a compelling 3-4 sentence professional EPK bio.` : "",
                },
              }),
            });
            const genData = await genRes.json();
            if (genData.text && needsBio) {
              updateData({ bio: genData.text });
              setRevealedName(d.artistName); // refresh card
            }
          } catch {
            // AI failed, keep whatever bio we have
          }

          if (needsGenre && d.artistName) {
            try {
              const genreRes = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "bio",
                  context: {
                    artistName: d.artistName,
                    genre: "",
                    location: "",
                    additionalInfo: `What genre(s) is ${d.artistName}? Reply with ONLY 1-3 genre tags separated by commas, nothing else. Example: "pop soul, R&B, indie pop"`,
                  },
                }),
              });
              const genreData = await genreRes.json();
              if (genreData.text) {
                const inferredGenres = genreData.text.split(",").map((g: string) => g.trim()).filter(Boolean).slice(0, 3);
                if (inferredGenres.length > 0) {
                  updateData({ genres: inferredGenres, genre: inferredGenres[0] });
                  setRevealedGenre(inferredGenres.join(" / "));
                }
              }
            } catch {
              // AI failed, no genres
            }
          }

          await delay(500);
        }

        // Show "ready" state - user decides when to continue
        setLoadingText("All set");
        await delay(300);
        setLoadingDone(true);
      } catch {
        setLoadingText("Couldn't reach your profile");
        await delay(1000);
        setPhase("steps");
      }
    }
    resolve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const handleContinueFromLoading = () => {
    setPhase("steps");
    setStep(0);
  };

  // ─── Step navigation ─────────────────────────────────────────────────────

  const goNext = () => setStep((s) => s + 1);
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && step > 0 && phase === "steps") goBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, phase]);

  const handleGenerate = () => {
    updateData({
      primaryColor: selectedPalette.primary,
      secondaryColor: selectedPalette.secondary,
      accentColor: selectedPalette.accent,
      selectedTemplate,
    });
    if (!url) {
      updateData({
        artistName: manualName,
        genre: manualGenre,
        location: manualLocation,
        sourcePlatform: "manual",
      });
    }
    router.push("/preview");
  };

  // ─── Step definitions ─────────────────────────────────────────────────────

  const paletteStep = (
    <StepShell key="palette" title="Brand color palette." subtitle="Choose colors that represent your brand.">
      <PalettePicker selected={selectedPalette.id} onSelect={(p) => setSelectedPalette(p)} />
      <motion.button
        onClick={goNext}
        className="btn-primary w-full py-4 text-sm font-bold rounded-2xl mt-6"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
      >
        Continue
      </motion.button>
    </StepShell>
  );

  const layoutStep = (
    <StepShell key="layout" title="Choose a layout.">
      <div className="grid grid-cols-3 gap-4">
        {TEMPLATES.map((t) => {
          const isSelected = selectedTemplate === t.id;
          return (
            <motion.button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id)}
              className="flex flex-col gap-3"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <div
                className="rounded-xl overflow-hidden transition-all duration-300"
                style={{
                  border: isSelected ? `2px solid ${selectedPalette.secondary}` : "2px solid rgba(255,255,255,0.06)",
                  boxShadow: isSelected ? `0 0 20px ${selectedPalette.secondary}15` : "none",
                }}
              >
                {t.preview(selectedPalette.secondary)}
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold transition-colors duration-200" style={{ color: isSelected ? selectedPalette.secondary : "rgba(255,255,255,0.5)" }}>
                  {t.name}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{t.desc}</div>
              </div>
            </motion.button>
          );
        })}
      </div>
      <motion.button
        onClick={handleGenerate}
        className="btn-primary w-full py-4 text-sm font-bold rounded-2xl mt-6"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
      >
        Generate EPK
      </motion.button>
    </StepShell>
  );

  const autoSteps = [paletteStep, layoutStep];

  const manualSteps = [
    <StepShell key="info" title="What's your artist name?">
      <div className="flex flex-col gap-3">
        <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Artist name" className="input-glass px-5 py-4 text-base" autoFocus />
        <div className="flex gap-3">
          <input type="text" value={manualGenre} onChange={(e) => setManualGenre(e.target.value)} placeholder="Genre" className="input-glass flex-1 px-5 py-4 text-base" />
          <input type="text" value={manualLocation} onChange={(e) => setManualLocation(e.target.value)} placeholder="Location" className="input-glass flex-1 px-5 py-4 text-base" />
        </div>
      </div>
      <motion.button
        onClick={goNext}
        disabled={!manualName}
        className="btn-primary w-full py-4 text-sm font-bold rounded-2xl mt-6 disabled:opacity-30"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
      >
        Continue
      </motion.button>
    </StepShell>,
    paletteStep,
    layoutStep,
  ];

  const currentSteps = url ? autoSteps : manualSteps;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#191919", color: "#ffffff" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 shrink-0 relative z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/omt-assets/OMT-Stacked- BLUE.png" alt="One More Time" style={{ height: 32 }} />
        {phase === "steps" && step > 0 && (
          <motion.button
            onClick={goBack}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            whileHover={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)" }}
          >
            &#8592; Back
          </motion.button>
        )}
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-xl">

          {/* ─── Loading phase ─────────────────────────────────────────── */}
          {phase === "loading" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-8"
            >
              {/* Status text with thinking dots */}
              <div className="text-center">
                <motion.h2
                  key={loadingText}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="font-bold text-xl"
                >
                  {loadingText}
                  {!loadingDone && <ThinkingDots />}
                </motion.h2>
              </div>

              {/* Artist card - builds up piece by piece */}
              <motion.div
                className="w-full max-w-xs rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                layout
              >
                {/* Image */}
                <AnimatePresence>
                  {revealedImage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={revealedImage} alt="" className="w-full aspect-square object-cover" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="p-5 flex flex-col gap-3">
                  {/* Name */}
                  <AnimatePresence mode="wait">
                    {revealedName ? (
                      <motion.div
                        key="name"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="font-display font-bold text-xl"
                      >
                        {revealedName}
                      </motion.div>
                    ) : (
                      <motion.div key="name-skeleton" className="flex items-center gap-2">
                        <div className="h-5 w-36 rounded-full animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Genre */}
                  <AnimatePresence>
                    {revealedGenre && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className="text-xs px-3 py-1 rounded-full self-start"
                        style={{ background: "rgba(4,155,216,0.1)", color: "#049BD8", border: "1px solid rgba(4,155,216,0.2)" }}
                      >
                        {revealedGenre}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Spotify */}
                  <AnimatePresence>
                    {revealedSpotify && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="flex items-center gap-2 text-xs"
                        style={{ color: "#1db954" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                        </svg>
                        Spotify connected
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Image count */}
                  <AnimatePresence>
                    {revealedImageCount > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="text-xs"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        {revealedImageCount} images found
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Continue button - only appears when loading is done */}
              <AnimatePresence>
                {loadingDone && (
                  <motion.button
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    onClick={handleContinueFromLoading}
                    className="btn-primary px-10 py-4 text-sm font-bold rounded-2xl"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Continue
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ─── Step flow ────────────────────────────────────────────── */}
          {phase === "steps" && (
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={pageTransition.initial}
                animate={pageTransition.animate}
                exit={pageTransition.exit}
                transition={pageTransition.transition}
              >
                {currentSteps[step]}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Progress dots */}
      {phase === "steps" && (
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-2 py-6 shrink-0"
        >
          {currentSteps.map((_, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              animate={{
                width: i === step ? 24 : 6,
                background: i === step ? "#049BD8" : i < step ? "rgba(4,155,216,0.4)" : "rgba(255,255,255,0.08)",
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ height: 6 }}
            />
          ))}
        </motion.footer>
      )}
    </div>
  );
}

// ─── Step shell ──────────────────────────────────────────────────────────────

function StepShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h2 className="font-display font-bold leading-tight" style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", letterSpacing: "-0.02em" }}>
          {title}
        </h2>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mt-2.5 text-sm"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            {subtitle}
          </motion.p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Export with Suspense ────────────────────────────────────────────────────

export default function BuildPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: "#191919", color: "rgba(255,255,255,0.3)" }}>Loading...</div>}>
      <BuildPageInner />
    </Suspense>
  );
}
