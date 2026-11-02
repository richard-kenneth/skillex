import type { ReactNode } from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { SPACING } from "@/constants/theme";

type HintRowProps = {
  title?: string;
  hint?: ReactNode;
};

export function HintRow({
  title = "Try editing",
  hint = "app/index.tsx",
}: HintRowProps) {
  return (
    <View style={styles.stepRow}>
      <ThemedText type="caption">{title}</ThemedText>
      <ThemedView style={styles.codeSnippet}>
        <ThemedText muted>{hint}</ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  stepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  codeSnippet: {
    borderRadius: SPACING[2],
    paddingVertical: SPACING[0.5],
    paddingHorizontal: SPACING[2],
  },
});
