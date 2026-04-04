export interface Palette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}

export const PALETTES: Palette[] = [
  {
    id: "omt-blue",
    name: "OMT Blue",
    primary: "#1a1a1a",
    secondary: "#049BD8",
    accent: "#7c3aed",
  },
  {
    id: "neon-noir",
    name: "Neon Noir",
    primary: "#0a0a0a",
    secondary: "#c8ff00",
    accent: "#7c3aed",
  },
  {
    id: "blush",
    name: "Blush",
    primary: "#0a0a0a",
    secondary: "#ff6b9d",
    accent: "#ffd93d",
  },
  {
    id: "arctic",
    name: "Arctic",
    primary: "#0a0e14",
    secondary: "#64ffda",
    accent: "#1de9b6",
  },
  {
    id: "crimson",
    name: "Crimson",
    primary: "#0a0a0a",
    secondary: "#ff3333",
    accent: "#ff8533",
  },
  {
    id: "violet-hour",
    name: "Violet Hour",
    primary: "#0d0820",
    secondary: "#a855f7",
    accent: "#ec4899",
  },
  {
    id: "sahara",
    name: "Sahara",
    primary: "#0f0d0a",
    secondary: "#d4a574",
    accent: "#8b6914",
  },
  {
    id: "monochrome",
    name: "Monochrome",
    primary: "#0a0a0a",
    secondary: "#ffffff",
    accent: "#666666",
  },
  {
    id: "electric-blue",
    name: "Electric Blue",
    primary: "#060a14",
    secondary: "#3b82f6",
    accent: "#06b6d4",
  },
];

export const DEFAULT_PALETTE = PALETTES[0];
