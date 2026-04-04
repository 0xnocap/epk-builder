"use client";

import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";

interface SignInGateProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignInGate({ isOpen, onClose }: SignInGateProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[61] flex items-center justify-center px-6"
          >
            <div
              className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center gap-6"
              style={{
                background: "rgba(20,20,22,0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(20px)",
              }}
            >
              {/* EPK mark */}
              <div
                className="text-xs font-bold tracking-[0.3em] uppercase"
                style={{ color: "#049BD8" }}
              >
                EPK
              </div>

              <div className="text-center">
                <h3 className="text-lg font-bold">Save your press kit</h3>
                <p
                  className="text-sm mt-2"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Sign in to save, share, and edit your EPK.
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full">
                {/* Google */}
                <button
                  onClick={() => signIn("google", { callbackUrl: "/epk" })}
                  className="card-glass w-full py-3.5 flex items-center justify-center gap-2.5 text-sm font-medium transition-all hover:opacity-80"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </button>

                {/* Instagram */}
                <button
                  onClick={() => signIn("instagram", { callbackUrl: "/epk" })}
                  className="card-glass w-full py-3.5 flex items-center justify-center gap-2.5 text-sm font-medium transition-all hover:opacity-80"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="url(#ig-gate)">
                    <defs>
                      <linearGradient id="ig-gate" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#feda75" />
                        <stop offset="50%" stopColor="#d62976" />
                        <stop offset="100%" stopColor="#4f5bd5" />
                      </linearGradient>
                    </defs>
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                  </svg>
                  Continue with Instagram
                </button>

                {/* TikTok - coming soon */}
                <button
                  disabled
                  className="card-glass w-full py-3.5 flex items-center justify-center gap-2.5 text-sm font-medium opacity-35 cursor-not-allowed"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.63a8.26 8.26 0 0 0 4.84 1.56v-3.5a4.84 4.84 0 0 1-1.08 0z" />
                  </svg>
                  TikTok - coming soon
                </button>
              </div>

              <button
                onClick={onClose}
                className="text-xs transition-all hover:opacity-70"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
