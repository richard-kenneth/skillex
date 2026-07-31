import { useThemeContext } from "@/hooks/theme-context";

export function useTheme() {
  const { colors } = useThemeContext();
  return colors;
}
