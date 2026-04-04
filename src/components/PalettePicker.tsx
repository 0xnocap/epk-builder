"use client";

import { PALETTES, type Palette } from "@/lib/palettes";

interface PalettePickerProps {
  selected: string;
  onSelect: (palette: Palette) => void;
}

export function PalettePicker({ selected, onSelect }: PalettePickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {PALETTES.map((palette) => {
        const isSelected = selected === palette.id;
        return (
          <button
            key={palette.id}
            onClick={() => onSelect(palette)}
            className="group relative rounded-2xl overflow-hidden transition-all"
            style={{
              border: isSelected
                ? `2px solid ${palette.secondary}`
                : "2px solid rgba(255,255,255,0.06)",
              background: palette.primary,
            }}
          >
            {/* Mini EPK preview */}
            <div className="aspect-[3/4] p-3 flex flex-col justify-between">
              {/* Fake hero area */}
              <div
                className="rounded-lg flex-1 mb-2 relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${palette.primary} 0%, ${palette.accent}40 100%)`,
                }}
              >
                <div
                  className="absolute bottom-2 left-2 text-[8px] font-bold tracking-wider uppercase"
                  style={{ color: palette.secondary }}
                >
                  ARTIST
                </div>
              </div>

              {/* Fake content lines */}
              <div className="flex flex-col gap-1.5">
                <div
                  className="h-1 rounded-full w-3/4"
                  style={{ background: `${palette.secondary}40` }}
                />
                <div
                  className="h-1 rounded-full w-1/2"
                  style={{ background: `${palette.accent}30` }}
                />
                <div
                  className="h-1 rounded-full w-2/3"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                />
              </div>
            </div>

            {/* Label */}
            <div
              className="px-3 pb-2.5 text-xs font-semibold text-left"
              style={{
                color: isSelected ? palette.secondary : "rgba(255,255,255,0.4)",
              }}
            >
              {palette.name}
            </div>

            {/* Selection indicator */}
            {isSelected && (
              <div
                className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: palette.secondary }}
              >
                <span className="text-[8px] font-bold" style={{ color: palette.primary }}>
                  &#10003;
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
