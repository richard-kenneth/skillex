/**
 * App-wide design tokens — zinc/neutral theme matching the Next.js web app.
 *
 * Primary follows the web convention: inverted neutrals.
 *   Dark mode:  primary = near-white, foreground on primary = dark
 *   Light mode: primary = near-black, foreground on primary = white
 *
 * Glassmorphic surface tokens added for elevated floating docks, cards, top bar.
 */

import { Platform } from "react-native";

// ─── Spacing ────────────────────────────────────────────────────────────────

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

// ─── Radii ──────────────────────────────────────────────────────────────────

export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  "2xl": 16,
  "3xl": 20,
  pill: 9999,
} as const;

// ─── Typography ─────────────────────────────────────────────────────────────

export const FONT_SIZE = {
  "2xs": 10,
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 15,
  xl: 17,
  "2xl": 20,
  "3xl": 24,
  "4xl": 28,
  "5xl": 34,
} as const;

export const FONT_WEIGHT = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

export const LINE_HEIGHT = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.7,
};

/**
 * Pre-composed text styles — use these for consistent hierarchy.
 * Colors are NOT included — apply via theme.
 */
export const TYPOGRAPHY = {
  /** Oversized display numbers (balance, hero stat) */
  display: {
    fontSize: FONT_SIZE["4xl"],
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  /** Screen titles */
  screenTitle: {
    fontSize: FONT_SIZE["2xl"],
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  /** Section titles within a screen */
  sectionTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  /** Card titles, list item headings */
  cardTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: -0.15,
    lineHeight: 20,
  },
  /** Default body text */
  body: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: 20,
  },
  /** Secondary/descriptive body text */
  bodySmall: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: 18,
  },
  /** Labels, form field labels */
  label: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: 16,
  },
  /** Small captions, timestamps, metadata */
  caption: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: 16,
  },
  /** Tiny caps text (overlines, dividers) */
  overline: {
    fontSize: FONT_SIZE["2xs"],
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 0.8,
    lineHeight: 14,
    textTransform: "uppercase" as const,
  },
  /** Button text */
  button: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  /** Small button text */
  buttonSm: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    letterSpacing: -0.05,
    lineHeight: 16,
  },
  /** Badge text */
  badge: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: 14,
  },
} as const;

// ─── Icon Sizes ─────────────────────────────────────────────────────────────

export const ICON_SIZE = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 24,
  "2xl": 28,
} as const;

// ─── Animation ──────────────────────────────────────────────────────────────

export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: { damping: 15, stiffness: 150 },
  springGentle: { damping: 20, stiffness: 120 },
} as const;

// ─── Accent Color Palette ───────────────────────────────────────────────────

export const PALETTE = {
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
    main: "#71717a",
    bg: "rgba(113,113,122,0.10)",
    border: "rgba(113,113,122,0.20)",
  },
  indigo: {
    400: "#818cf8",
    500: "#6366f1",
    600: "#4f46e5",
    main: "#6366f1",
    bg: "rgba(99,102,241,0.10)",
    border: "rgba(99,102,241,0.20)",
  },
  purple: {
    main: "#a855f7",
    bg: "rgba(168,85,247,0.10)",
    border: "rgba(168,85,247,0.20)",
  },
  green: {
    main: "#22c55e",
    bg: "rgba(34,197,94,0.10)",
    border: "rgba(34,197,94,0.20)",
  },
  emerald: {
    main: "#10b981",
    bg: "rgba(16,185,129,0.10)",
    border: "rgba(16,185,129,0.20)",
  },
  red: {
    main: "#ef4444",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.20)",
  },
  blue: {
    main: "#3b82f6",
    bg: "rgba(59,130,246,0.10)",
    border: "rgba(59,130,246,0.20)",
  },
  amber: {
    main: "#f59e0b",
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.20)",
  },
  yellow: {
    main: "#eab308",
    bg: "rgba(234,179,8,0.10)",
    border: "rgba(234,179,8,0.20)",
  },
  violet: {
    main: "#8b5cf6",
    bg: "rgba(139,92,246,0.10)",
    border: "rgba(139,92,246,0.20)",
  },
  orange: {
    main: "#f97316",
    bg: "rgba(249,115,22,0.10)",
    border: "rgba(249,115,22,0.20)",
  },
  pink: {
    main: "#ec4899",
    bg: "rgba(236,72,153,0.10)",
    border: "rgba(236,72,153,0.20)",
  },
  crimson: {
    main: "#dc2626",
    bg: "rgba(220,38,38,0.10)",
    border: "rgba(220,38,38,0.20)",
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

// ─── Light Theme ────────────────────────────────────────────────────────────

const light = {
  name: "light" as const,
  // Surfaces
  background: "#ffffff",
  foreground: "#0a0a0a",
  card: "#ffffff",
  cardForeground: "#0a0a0a",
  popover: "#ffffff",
  popoverForeground: "#0a0a0a",
  // Primary — inverted neutral (dark button on light bg)
  primary: "#171717",
  primaryForeground: "#fafafa",
  // Secondary
  secondary: "#f5f5f5",
  secondaryForeground: "#171717",
  // Muted
  muted: "#f5f5f5",
  mutedForeground: "#737373",
  // Accent
  accent: "#f5f5f5",
  accentForeground: "#171717",
  // Destructive
  destructive: "#ef4444",
  destructiveForeground: "#fafafa",
  // Borders & inputs
  border: "#e5e5e5",
  input: "#e5e5e5",
  ring: "#a3a3a3",
  // Glassmorphic tokens
  glassBackground: "rgba(255, 255, 255, 0.85)",
  glassBorder: "rgba(0, 0, 0, 0.08)",
  tabBarBackground: "rgba(255, 255, 255, 0.90)",
  tabBarBorder: "rgba(0, 0, 0, 0.08)",
  tabBarActivePill: "#171717",
  tabBarActivePillForeground: "#ffffff",
  // Surfaces
  surfaceRaised: "#f9f9f9",
  overlay: "rgba(0, 0, 0, 0.5)",
  // Backward compat
  backgroundElement: "#f5f5f5",
  backgroundSelected: "#e5e5e5",
  textSecondary: "#737373",
  text: "#0a0a0a",
};

// ─── Dark Theme ─────────────────────────────────────────────────────────────

const dark = {
  name: "dark" as const,
  // Surfaces
  background: "#09090b",
  foreground: "#fafafa",
  card: "#141416",
  cardForeground: "#fafafa",
  popover: "#141416",
  popoverForeground: "#fafafa",
  // Primary — inverted neutral (light button on dark bg)
  primary: "#e5e5e5",
  primaryForeground: "#171717",
  // Secondary
  secondary: "#1c1c1f",
  secondaryForeground: "#fafafa",
  // Muted
  muted: "#1c1c1f",
  mutedForeground: "#a1a1aa",
  // Accent
  accent: "#1c1c1f",
  accentForeground: "#fafafa",
  // Destructive
  destructive: "#dc2626",
  destructiveForeground: "#fafafa",
  // Borders & inputs
  border: "rgba(255, 255, 255, 0.08)",
  input: "rgba(255, 255, 255, 0.12)",
  ring: "#52525b",
  // Glassmorphic tokens
  glassBackground: "rgba(20, 20, 24, 0.82)",
  glassBorder: "rgba(255, 255, 255, 0.12)",
  tabBarBackground: "rgba(18, 18, 22, 0.88)",
  tabBarBorder: "rgba(255, 255, 255, 0.10)",
  tabBarActivePill: "#fafafa",
  tabBarActivePillForeground: "#09090b",
  // Surfaces
  surfaceRaised: "#1c1c1f",
  overlay: "rgba(0, 0, 0, 0.7)",
  // Backward compat
  backgroundElement: "#1c1c1f",
  backgroundSelected: "#27272a",
  textSecondary: "#a1a1aa",
  text: "#fafafa",
};

export const Colors = { light, dark } as const;

export type ThemeColors = typeof Colors.light | typeof Colors.dark;

export type ThemeColor = keyof typeof Colors.light | keyof typeof Colors.dark;

// ─── Fonts ──────────────────────────────────────────────────────────────────

export const Fonts = Platform.select({
  ios: {
    sans: "Inter",
    sansSystem: "system-ui",
    serif: "ui-serif",
    mono: "ui-monospace",
  },
  default: {
    sans: "Inter",
    sansSystem: "normal",
    serif: "serif",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    sansSystem: "system-ui",
    serif: "var(--font-serif)",
    mono: "var(--font-mono)",
  },
});

// ─── Layout ─────────────────────────────────────────────────────────────────

export const MAX_CONTENT_WIDTH = 560;
export const MaxContentWidth = 800;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const Spacing = SPACING;

// ─── Elevation ──────────────────────────────────────────────────────────────

export const SHADOWS = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;
