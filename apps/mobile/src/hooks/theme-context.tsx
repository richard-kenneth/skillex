import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { createContext, useContext, useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedTheme: "light" | "dark";
  colors: Record<string, any>;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  setMode: () => {},
  resolvedTheme: "dark",
  colors: Colors.dark,
});

function getStorage(): any {
  try {
    const g = globalThis as any;
    if (g.localStorage) return g.localStorage;
    return null;
  } catch {
    return null;
  }
}

function getStoredTheme(): ThemeMode | null {
  try {
    const storage = getStorage();
    if (storage) {
      const stored = storage.getItem("skil-ex-theme-mode");
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
    }
  } catch {
    // storage not available
  }
  return null;
}

function setStoredTheme(mode: ThemeMode) {
  try {
    const storage = getStorage();
    if (storage) {
      storage.setItem("skil-ex-theme-mode", mode);
    }
  } catch {
    // ignore
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>("system");

  // Load persisted theme on mount
  useEffect(() => {
    const stored = getStoredTheme();
    if (stored) {
      setMode(stored);
    }
  }, []);

  // Persist theme changes
  const handleSetMode = React.useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    setStoredTheme(newMode);
  }, []);

  const resolvedTheme: "light" | "dark" =
    mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;

  const colors = Colors[resolvedTheme];

  return (
    <ThemeContext.Provider
      value={{ mode, setMode: handleSetMode, resolvedTheme, colors }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
