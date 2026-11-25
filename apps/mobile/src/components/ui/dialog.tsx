import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/hooks/use-theme";
import {
  RADIUS,
  SPACING,
  FONT_SIZE,
  MAX_CONTENT_WIDTH,
  TYPOGRAPHY,
} from "@/constants/theme";
import { Button } from "./button";
import { X } from "lucide-react-native";
import { useT } from "lib/i18n";

// ─── Dialog ─────────────────────────────────────────────────────────────────

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  dismissable?: boolean;
}

export function Dialog({
  open,
  onOpenChange,
  children,
  dismissable = true,
}: DialogProps) {
  const theme = useTheme();
  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (dismissable) onOpenChange(false);
      }}
    >
      <Pressable
        style={styles.overlay}
        onPress={() => dismissable && onOpenChange(false)}
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={StyleSheet.absoluteFill}
        >
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: theme.overlay },
            ]}
          />
        </Animated.View>
      </Pressable>
      <View style={styles.centeredContent}>
        <Animated.View
          entering={FadeIn.duration(200).delay(50)}
          exiting={FadeOut.duration(150)}
          style={styles.cardWrap}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function DialogHeader({
  children,
  style,
  onClose,
}: {
  children?: React.ReactNode;
  style?: any;
  onClose?: () => void;
}) {
  const theme = useTheme();
  const t = useT("common");

  return (
    <View
      style={[
        {
          padding: SPACING[5],
          gap: SPACING[1],
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border,
        },
        style,
      ]}
    >
      {onClose ? (
        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={{
            position: "absolute",
            right: SPACING[4],
            top: SPACING[4],
            padding: SPACING[2],
            zIndex: 5,
          }}
          accessibilityLabel={t("close")}
        >
          <X size={16} color={theme.mutedForeground} />
        </Pressable>
      ) : null}
      {children}
    </View>
  );
}

export function DialogTitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return (
    <ThemedText type="sectionTitle" style={style}>
      {children}
    </ThemedText>
  );
}

export function DialogDescription({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return (
    <ThemedText
      type="bodySmall"
      muted
      style={[{ marginTop: SPACING[1] }, style]}
    >
      {children}
    </ThemedText>
  );
}

export function DialogContent({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return (
    <ScrollView
      style={[{ paddingHorizontal: SPACING[5], paddingTop: SPACING[4] }, style]}
    >
      {children}
    </ScrollView>
  );
}

export function DialogFooter({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          padding: SPACING[5],
          flexDirection: "row",
          gap: SPACING[2],
          justifyContent: "flex-end",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── Alert Banner ───────────────────────────────────────────────────────────

type AlertVariant = "default" | "destructive" | "success" | "warning" | "info";

export function Alert({
  variant = "default",
  title,
  description,
  style,
  icon,
}: {
  variant?: AlertVariant;
  title: string;
  description?: React.ReactNode;
  style?: any;
  icon?: React.ReactNode;
}) {
  const theme = useTheme();
  const palette = (() => {
    switch (variant) {
      case "destructive":
      case "warning":
        return {
          bg: "rgba(239,68,68,0.08)",
          border: "rgba(239,68,68,0.20)",
          fg: "#ef4444",
        };
      case "success":
        return {
          bg: "rgba(34,197,94,0.08)",
          border: "rgba(34,197,94,0.20)",
          fg: "#22c55e",
        };
      case "info":
        return {
          bg: "rgba(59,130,246,0.08)",
          border: "rgba(59,130,246,0.20)",
          fg: "#3b82f6",
        };
      default:
        return {
          bg: theme.secondary,
          border: theme.border,
          fg: theme.mutedForeground,
        };
    }
  })();

  return (
    <View
      style={[
        {
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.bg,
          padding: SPACING[3],
          gap: SPACING[2],
          flexDirection: "row",
        },
        style,
      ]}
    >
      {icon ? (
        <View style={{ marginRight: SPACING[1], marginTop: 1 }}>{icon}</View>
      ) : null}
      <View style={{ flex: 1, gap: SPACING[0.5] }}>
        <ThemedText type="label" style={{ color: palette.fg }}>
          {title}
        </ThemedText>
        {description ? (
          typeof description === "string" ? (
            <ThemedText type="caption" muted>
              {description}
            </ThemedText>
          ) : (
            description
          )
        ) : null}
      </View>
    </View>
  );
}

// ─── AlertDialog ────────────────────────────────────────────────────────────

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  destructive,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" size="sm" onPress={() => onOpenChange(false)}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? "destructive" : "default"}
          size="sm"
          onPress={() => {
            onOpenChange(false);
            onConfirm();
          }}
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  centeredContent: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING[5],
  },
  cardWrap: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
  },
  card: {
    borderRadius: RADIUS["2xl"],
    borderWidth: 1,
    overflow: "hidden",
  },
});
