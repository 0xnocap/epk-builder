"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Step {
  label: string;
  status: "pending" | "loading" | "done" | "skipped";
}

export function AutoPullProgress({ steps }: { steps: Step[] }) {
  return (
    <div className="flex flex-col gap-5 w-full max-w-xs mx-auto">
      <AnimatePresence mode="popLayout">
        {steps.map((step, i) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className="flex items-center gap-4"
          >
            {/* Status icon - fixed 20px container */}
            <div className="w-5 h-5 shrink-0 flex items-center justify-center">
              {step.status === "loading" && (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#049BD8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="animate-spin"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              )}
              {step.status === "done" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "#049BD8" }}
                >
                  <span className="text-[10px] font-bold text-black">&#10003;</span>
                </motion.div>
              )}
              {step.status === "skipped" && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                    -
                  </span>
                </div>
              )}
              {step.status === "pending" && (
                <div
                  className="w-5 h-5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                />
              )}
            </div>

            {/* Label */}
            <span
              className="text-sm leading-none"
              style={{
                color:
                  step.status === "loading"
                    ? "#049BD8"
                    : step.status === "done"
                    ? "rgba(255,255,255,0.6)"
                    : step.status === "skipped"
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(255,255,255,0.25)",
              }}
            >
              {step.label}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
