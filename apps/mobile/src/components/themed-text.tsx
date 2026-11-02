import { StyleSheet, Text, type TextProps } from "react-native";
import { TYPOGRAPHY } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type TextVariant =
  | "body"
  | "bodySmall"
  | "caption"
  | "label"
  | "cardTitle"
  | "sectionTitle"
  | "screenTitle"
  | "display"
  | "overline"
  | "button"
  | "buttonSm"
  | "badge"
  // Legacy compat
  | "default"
  | "title"
  | "small"
  | "smallBold"
  | "subtitle"
  | "link"
  | "linkPrimary"
  | "code";

export type ThemedTextProps = TextProps & {
  type?: TextVariant;
  themeColor?: string;
  muted?: boolean;
};

export function ThemedText({
  style,
  type = "body",
  themeColor,
  muted,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  const color = themeColor
    ? ((theme as any)[themeColor] ?? theme.foreground)
    : muted
      ? theme.mutedForeground
      : theme.foreground;

  return (
    <Text
      style={[{ color }, variantStyles[type] ?? variantStyles.body, style]}
      {...rest}
    />
  );
}

const variantStyles = StyleSheet.create({
  // New semantic variants
  body: TYPOGRAPHY.body,
  bodySmall: TYPOGRAPHY.bodySmall,
  caption: TYPOGRAPHY.caption,
  label: TYPOGRAPHY.label,
  cardTitle: TYPOGRAPHY.cardTitle,
  sectionTitle: TYPOGRAPHY.sectionTitle,
  screenTitle: TYPOGRAPHY.screenTitle,
  display: TYPOGRAPHY.display,
  overline: TYPOGRAPHY.overline,
  button: TYPOGRAPHY.button,
  buttonSm: TYPOGRAPHY.buttonSm,
  badge: TYPOGRAPHY.badge,
  // Legacy compat
  default: TYPOGRAPHY.body,
  title: TYPOGRAPHY.display,
  small: TYPOGRAPHY.caption,
  smallBold: {
    ...TYPOGRAPHY.caption,
    fontWeight: "600",
  },
  subtitle: TYPOGRAPHY.sectionTitle,
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  },
  linkPrimary: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  code: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "500",
  },
});
