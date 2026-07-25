/**
 * App-wide design tokens matching the Next.js web app's shadcn/zinc theme.
 * Dark mode is the default (matches the web app aesthetic).
 *
 * Palette references (web shadcn):
 *   background:   #09090b  (zinc-950)
 *   foreground:   #fafafa   (zinc-50)
 *   card:         #09090b / #18181b
 *   border:       #27272a   (zinc-800)
 *   muted:        #27272a / #71717a
 *   primary:      #6366f1   (indigo-500)
 *   primary-fg:   #ffffff
 *   secondary:    #27272a
 *   accent:       #27272a
 *   destructive:  #ef4444   (red-500)
 */

import { Platform } from "react-native";

export const RADIUS = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  xxl: 16,
  pill: 9999,
} as const;

export const SPACING = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const MAX_CONTENT_WIDTH = 560;

export const FONT_SIZE = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
  "2xl": 20,
  "3xl": 24,
  "4xl": 30,
  "5xl": 36,
  "6xl": 48,
} as const;

export const FONT_WEIGHT = {
  thin: "100" as const,
  extralight: "200" as const,
  light: "300" as const,
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
  black: "900" as const,
};

export const LINE_HEIGHT = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.75,
};

// Semantic color token sets — two themes.
// NOTE: The shared package business helpers reference color names (purple, green,
// red, etc). Those semantic accent names are defined below as well.

export const PALETTE = {
  // Neutrals (Zinc scale)
  zinc: {
    50: "#fafafa",
    100: "#f4f4f5",
    200: "#e4e4e7",
    300: "#d4d4d8",
    400: "#a1a1aa",
    500: "#71717a",
    600: "#52525b",
    700: "#3f3f46",
    800: "#27272a",
    900: "#18181b",
    950: "#09090b",
  },
  // Brand — Indigo
  indigo: {
    400: "#818cf8",
    500: "#6366f1",
    600: "#4f46e5",
  },
  // Semantic accent colors (shared package `colorClass` uses these names)
  purple: {
    main: "#a855f7",
    bg: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.25)",
  },
  green: {
    main: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.25)",
  },
  emerald: {
    main: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.25)",
  },
  red: {
    main: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.25)",
  },
  blue: {
    main: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.25)",
  },
  amber: {
    main: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.25)",
  },
  yellow: {
    main: "#eab308",
    bg: "rgba(234,179,8,0.12)",
    border: "rgba(234,179,8,0.25)",
  },
  zinc: {
    main: "#71717a",
    bg: "rgba(113,113,122,0.12)",
    border: "rgba(113,113,122,0.25)",
  },
  violet: {
    main: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.25)",
  },
  orange: {
    main: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.25)",
  },
  pink: {
    main: "#ec4899",
    bg: "rgba(236,72,153,0.12)",
    border: "rgba(236,72,153,0.25)",
  },
  indigo: {
    main: "#6366f1",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.25)",
  },
  crimson: {
    main: "#dc2626",
    bg: "rgba(220,38,38,0.12)",
    border: "rgba(220,38,38,0.25)",
  },
};

export type AccentColorName = keyof typeof PALETTE &
  (
    | "purple"
    | "green"
    | "emerald"
    | "red"
    | "blue"
    | "amber"
    | "yellow"
    | "zinc"
    | "violet"
    | "orange"
    | "pink"
    | "indigo"
    | "crimson"
  );

export function getAccent(name: string) {
  const n = name as AccentColorName;
  return PALETTE[n] ?? PALETTE.zinc;
}

// ─── Light Theme ───────────────────────────────────────────────────────────
const light = {
  name: "light" as const,
  background: "#ffffff",
  foreground: "#09090b",
  card: "#ffffff",
  cardForeground: "#09090b",
  popover: "#ffffff",
  popoverForeground: "#09090b",
  primary: PALETTE.indigo[600],
  primaryForeground: "#ffffff",
  secondary: "#f4f4f5",
  secondaryForeground: "#18181b",
  muted: "#f4f4f5",
  mutedForeground: "#71717a",
  accent: "#f4f4f5",
  accentForeground: "#18181b",
  destructive: PALETTE.red.main,
  destructiveForeground: "#fafafa",
  border: "#e4e4e7",
  input: "#e4e4e7",
  ring: PALETTE.indigo[500],
  // Element / selected (from legacy API, kept for compat)
  backgroundElement: "#f4f4f5",
  backgroundSelected: "#e4e4e7",
  textSecondary: "#71717a",
  text: "#09090b",
};

// ─── Dark Theme (DEFAULT — matches web app) ────────────────────────────────
const dark = {
  name: "dark" as const,
  background: PALETTE.zinc[950],
  foreground: PALETTE.zinc[50],
  card: "rgba(24, 24, 27, 0.5)", // zinc-900/50 backdrop-blur style
  cardForeground: PALETTE.zinc[50],
  popover: PALETTE.zinc[900],
  popoverForeground: PALETTE.zinc[50],
  primary: PALETTE.indigo[500],
  primaryForeground: "#ffffff",
  secondary: PALETTE.zinc[800],
  secondaryForeground: PALETTE.zinc[50],
  muted: PALETTE.zinc[800],
  mutedForeground: PALETTE.zinc[400],
  accent: PALETTE.zinc[800],
  accentForeground: PALETTE.zinc[50],
  destructive: PALETTE.red.main,
  destructiveForeground: "#fafafa",
  border: "rgba(39, 39, 42, 0.6)", // zinc-800/60
  input: PALETTE.zinc[800],
  ring: PALETTE.indigo[500],
  // Legacy API compatibility
  backgroundElement: PALETTE.zinc[900],
  backgroundSelected: PALETTE.zinc[800],
  textSecondary: PALETTE.zinc[400],
  text: PALETTE.zinc[50],
};

export const Colors = { light, dark } as const;

export type ThemeColor = keyof typeof Colors.light | keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = SPACING;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// Elevation / shadows
export const SHADOWS = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  primary: {
    shadowColor: PALETTE.indigo[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
} as const;
