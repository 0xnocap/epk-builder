"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEPK } from "@/context/EPKContext";
import { PalettePicker } from "@/components/PalettePicker";
import { PALETTES, type Palette } from "@/lib/palettes";

interface EPKEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function EPKEditor({ isOpen, onClose, onSave }: EPKEditorProps) {
  const { data, updateData } = useEPK();
  const [generatingBio, setGeneratingBio] = useState(false);

  const currentPalette =
    PALETTES.find(
      (p) =>
        p.primary === data.primaryColor &&
        p.secondary === data.secondaryColor
    )?.id || "neon-noir";

  const handlePaletteSelect = (palette: Palette) => {
    updateData({
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      accentColor: palette.accent,
    });
  };

  const handleGenerateBio = async () => {
    if (!data.artistName) return;
    setGeneratingBio(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "bio",
          context: {
            artistName: data.artistName,
            genre: data.genre,
            location: data.location,
          },
        }),
      });
      const result = await res.json();
      if (result.text) updateData({ bio: result.text });
    } catch {
      // silently fail
    }
    setGeneratingBio(false);
  };

  const handleRefineBio = async () => {
    if (!data.bio) return;
    setGeneratingBio(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "refine", context: { bio: data.bio } }),
      });
      const result = await res.json();
      if (result.text) updateData({ bio: result.text });
    } catch {
      // silently fail
    }
    setGeneratingBio(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-full md:w-[400px] overflow-y-auto"
            style={{
              background: "rgba(14,14,16,0.97)",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4" style={{ background: "rgba(14,14,16,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-sm font-bold">Edit EPK</span>
              <button
                onClick={onClose}
                className="text-xs transition-all hover:opacity-70"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Done
              </button>
            </div>

            <div className="p-6 flex flex-col gap-8">
              {/* Artist Info */}
              <Section title="Artist Info">
                <input
                  type="text"
                  value={data.artistName}
                  onChange={(e) => updateData({ artistName: e.target.value })}
                  placeholder="Artist name"
                  className="input-glass w-full px-4 py-2.5 text-sm"
                />
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={data.genre}
                    onChange={(e) => updateData({ genre: e.target.value })}
                    placeholder="Genre"
                    className="input-glass flex-1 px-4 py-2.5 text-sm"
                  />
                  <input
                    type="text"
                    value={data.location}
                    onChange={(e) => updateData({ location: e.target.value })}
                    placeholder="Location"
                    className="input-glass flex-1 px-4 py-2.5 text-sm"
                  />
                </div>
              </Section>

              {/* Bio */}
              <Section title="Bio">
                <textarea
                  value={data.bio}
                  onChange={(e) => updateData({ bio: e.target.value })}
                  placeholder="Write your bio..."
                  rows={4}
                  className="input-glass w-full px-4 py-2.5 text-sm resize-none"
                  disabled={generatingBio}
                  style={{ opacity: generatingBio ? 0.5 : 1 }}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleGenerateBio}
                    disabled={generatingBio || !data.artistName}
                    className="text-xs font-medium transition-all hover:opacity-70 disabled:opacity-30"
                    style={{ color: "#049BD8" }}
                  >
                    {generatingBio ? "Writing..." : "Generate with AI"}
                  </button>
                  {data.bio && (
                    <button
                      onClick={handleRefineBio}
                      disabled={generatingBio}
                      className="text-xs font-medium transition-all hover:opacity-70 disabled:opacity-30"
                      style={{ color: "rgba(200,255,0,0.5)" }}
                    >
                      Refine
                    </button>
                  )}
                </div>
              </Section>

              {/* Music Links */}
              <Section title="Music">
                <input
                  type="url"
                  value={data.musicLinks?.spotify || ""}
                  onChange={(e) =>
                    updateData({
                      musicLinks: { ...data.musicLinks, spotify: e.target.value },
                    })
                  }
                  placeholder="Spotify artist URL"
                  className="input-glass w-full px-4 py-2.5 text-sm"
                />
                <input
                  type="url"
                  value={data.musicLinks?.appleMusic || ""}
                  onChange={(e) =>
                    updateData({
                      musicLinks: { ...data.musicLinks, appleMusic: e.target.value },
                    })
                  }
                  placeholder="Apple Music URL"
                  className="input-glass w-full px-4 py-2.5 text-sm"
                />
                <input
                  type="url"
                  value={data.musicLinks?.soundcloud || ""}
                  onChange={(e) =>
                    updateData({
                      musicLinks: { ...data.musicLinks, soundcloud: e.target.value },
                    })
                  }
                  placeholder="SoundCloud URL"
                  className="input-glass w-full px-4 py-2.5 text-sm"
                />
              </Section>

              {/* Colors & Layout */}
              <Section title="Colors">
                <PalettePicker
                  selected={currentPalette}
                  onSelect={handlePaletteSelect}
                />
              </Section>

              <Section title="Layout">
                <div className="flex gap-3">
                  {(["bold", "clean", "editorial"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => updateData({ selectedTemplate: t })}
                      className={`card-glass flex-1 px-3 py-2.5 text-xs font-semibold capitalize transition-all${
                        data.selectedTemplate === t ? " selected" : ""
                      }`}
                      style={{
                        color:
                          data.selectedTemplate === t
                            ? "#049BD8"
                            : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Section>

              {/* Press Quotes */}
              <Section title="Press Quotes">
                {(data.pressQuotes || []).map((pq, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <input
                        type="text"
                        value={pq.quote}
                        onChange={(e) => {
                          const updated = [...(data.pressQuotes || [])];
                          updated[i] = { ...updated[i], quote: e.target.value };
                          updateData({ pressQuotes: updated });
                        }}
                        placeholder="Quote text"
                        className="input-glass w-full px-3 py-2 text-xs"
                      />
                      <input
                        type="text"
                        value={pq.source}
                        onChange={(e) => {
                          const updated = [...(data.pressQuotes || [])];
                          updated[i] = { ...updated[i], source: e.target.value };
                          updateData({ pressQuotes: updated });
                        }}
                        placeholder="Source (e.g. Rolling Stone)"
                        className="input-glass w-full px-3 py-2 text-xs"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const updated = (data.pressQuotes || []).filter((_, idx) => idx !== i);
                        updateData({ pressQuotes: updated });
                      }}
                      className="shrink-0 text-xs self-start mt-2"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      x
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => updateData({ pressQuotes: [...(data.pressQuotes || []), { quote: "", source: "" }] })}
                  className="text-xs font-medium transition-all hover:opacity-70"
                  style={{ color: "#049BD8" }}
                >
                  + Add quote
                </button>
              </Section>

              {/* Achievements */}
              <Section title="Achievements">
                {(data.achievements || []).map((a, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={a}
                      onChange={(e) => {
                        const updated = [...(data.achievements || [])];
                        updated[i] = e.target.value;
                        updateData({ achievements: updated });
                      }}
                      placeholder="e.g. 1M+ Spotify streams"
                      className="input-glass flex-1 px-3 py-2 text-xs"
                    />
                    <button
                      onClick={() => {
                        const updated = (data.achievements || []).filter((_, idx) => idx !== i);
                        updateData({ achievements: updated });
                      }}
                      className="shrink-0 text-xs"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      x
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => updateData({ achievements: [...(data.achievements || []), ""] })}
                  className="text-xs font-medium transition-all hover:opacity-70"
                  style={{ color: "#049BD8" }}
                >
                  + Add achievement
                </button>
              </Section>

              {/* Contact */}
              <Section title="Contact">
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => updateData({ email: e.target.value })}
                  placeholder="Email"
                  className="input-glass w-full px-4 py-2.5 text-sm"
                />
                <input
                  type="text"
                  value={data.bookingContact}
                  onChange={(e) => updateData({ bookingContact: e.target.value })}
                  placeholder="Booking contact name"
                  className="input-glass w-full px-4 py-2.5 text-sm"
                />
                <input
                  type="email"
                  value={data.bookingEmail}
                  onChange={(e) => updateData({ bookingEmail: e.target.value })}
                  placeholder="Booking email"
                  className="input-glass w-full px-4 py-2.5 text-sm"
                />
              </Section>

              {/* Save */}
              <button
                onClick={onSave}
                className="btn-primary w-full py-3.5 text-sm font-bold rounded-2xl transition-all hover:opacity-90"
              >
                Save EPK
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h4
        className="text-[10px] font-bold tracking-[0.2em] uppercase"
        style={{ color: "rgba(255,255,255,0.3)" }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}
