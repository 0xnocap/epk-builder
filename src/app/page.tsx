"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LandingPage() {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = link.trim();
    if (!trimmed) {
      router.push("/build");
      return;
    }
    setLoading(true);
    router.push(`/build?url=${encodeURIComponent(trimmed)}`);
  };

  const isActive = !!(link.trim()) || focused;

  return (
    <main
      className="flex flex-col relative px-6 overflow-hidden noise"
      style={{ background: "#191919", color: "#ffffff", minHeight: "100vh" }}
    >
      {/* Layered ambient glows */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(900px, 120vw)",
          height: "700px",
          background: "radial-gradient(ellipse at center, rgba(4,155,216,0.07) 0%, rgba(4,155,216,0.02) 45%, transparent 70%)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-15%",
          right: "-15%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(4,155,216,0.04) 0%, transparent 55%)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "-10%",
          left: "-10%",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(124,58,237,0.03) 0%, transparent 55%)",
        }}
      />

      {/* Grid texture overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
        }}
      />

      {/* Logo */}
      <header className="relative z-10 py-5 px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/omt-assets/OMT-Stacked- BLUE.png"
          alt="One More Time"
          style={{ height: 36 }}
        />
      </header>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 flex items-center justify-center relative z-10"
      >
        <div className="w-full max-w-xl flex flex-col items-center text-center">
          {/* Title */}
          <h1
            className="font-display font-bold leading-none mb-5 whitespace-nowrap"
            style={{
              fontSize: "clamp(2.2rem, 6vw, 4rem)",
              letterSpacing: "-0.02em",
              textShadow: "0 0 60px rgba(4,155,216,0.15), 0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            One More EPK
          </h1>

          {/* Tagline */}
          <p
            className="text-base mb-10 max-w-sm"
            style={{ color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}
          >
            Create a professional industry-ready EPK in seconds.
          </p>

          {/* Input group */}
          <form onSubmit={handleSubmit} className="w-full relative group">
            {/* Glow ring behind input */}
            <div
              className="absolute -inset-[1px] rounded-2xl transition-opacity duration-300"
              style={{
                opacity: isActive ? 1 : 0,
                background: "linear-gradient(135deg, rgba(4,155,216,0.2), rgba(124,58,237,0.1), rgba(4,155,216,0.15))",
                filter: "blur(1px)",
              }}
            />
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={loading ? "Loading..." : "Paste your Instagram, TikTok, or Spotify link"}
              disabled={loading}
              autoFocus
              className="relative w-full pl-6 pr-14 py-5 rounded-2xl text-base transition-all duration-200"
              style={{
                background: isActive ? "rgba(4,155,216,0.04)" : "rgba(255,255,255,0.03)",
                border: "1px solid transparent",
                color: "#ffffff",
                fontSize: "1rem",
                backdropFilter: "blur(12px)",
                opacity: loading ? 0.6 : 1,
                outline: "none",
              }}
            />
            <motion.button
              type="submit"
              disabled={loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: link.trim() && !loading ? "#049BD8" : "rgba(255,255,255,0.06)",
                color: link.trim() && !loading ? "#ffffff" : "rgba(255,255,255,0.3)",
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </motion.button>
          </form>

          {/* Platform pills */}
          <div className="flex items-center gap-3 mt-6">
            {[
              { name: "Instagram", icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" },
              { name: "TikTok", icon: "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.63a8.26 8.26 0 0 0 4.84 1.56v-3.5a4.84 4.84 0 0 1-1.08 0z" },
              { name: "Spotify", icon: "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" },
            ].map(({ name, icon }) => (
              <motion.span
                key={name}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full cursor-default"
                style={{
                  color: "rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
                whileHover={{
                  borderColor: "rgba(4,155,216,0.25)",
                  color: "rgba(255,255,255,0.5)",
                  background: "rgba(4,155,216,0.04)",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6 }}>
                  <path d={icon} />
                </svg>
                {name}
              </motion.span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="relative z-10 py-6 flex items-center justify-center gap-2">
        <div className="w-1 h-1 rounded-full" style={{ background: "rgba(4,155,216,0.3)" }} />
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          Free to start. No signup needed.
        </p>
        <div className="w-1 h-1 rounded-full" style={{ background: "rgba(4,155,216,0.3)" }} />
      </div>
    </main>
  );
}
