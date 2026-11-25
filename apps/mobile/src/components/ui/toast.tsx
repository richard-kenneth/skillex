/**
 * Toast system — context provider + useToast() hook.
 */
import { ThemedText } from "@/components/themed-text";
import {
  FONT_SIZE,
  MAX_CONTENT_WIDTH,
  RADIUS,
  SPACING,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react-native";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

export interface ToastOptions {
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: { label: string; onPress: () => void };
}

export interface ToastItem extends Required<
  Pick<ToastOptions, "id" | "variant" | "duration">
> {
  title: string;
  description?: string;
  action?: ToastOptions["action"];
  createdAt: number;
}

interface ToastCtx {
  toast: (opts: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const toast = useCallback(
    (opts: ToastOptions): string => {
      const id = opts.id ?? Math.random().toString(36).slice(2);
      const duration = opts.duration ?? 3500;
      const item: ToastItem = {
        id,
        title: opts.title,
        description: opts.description,
        variant: opts.variant ?? "default",
        duration,
        action: opts.action,
        createdAt: Date.now(),
      };
      setItems((prev) => [...prev, item]);
      if (duration > 0) {
        timers.current[id] = setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastStack({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <Modal
      visible={items.length > 0}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View
          style={{
            position: "absolute",
            top: Platform.OS === "android" ? 8 : 52,
            left: 0,
            right: 0,
            alignItems: "center",
            paddingHorizontal: SPACING[3],
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: MAX_CONTENT_WIDTH,
              gap: SPACING[2],
            }}
          >
            {items.map((t) => (
              <ToastCard key={t.id} item={t} onDismiss={onDismiss} />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const theme = useTheme();
  const palette = getToastPalette(item.variant, theme);

  const Icon = {
    default: Info,
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  }[item.variant];

  return (
    <Animated.View
      entering={FadeInUp.duration(250).springify()}
      exiting={FadeOutUp.duration(200)}
    >
      <Pressable
        onPress={() => onDismiss(item.id)}
        style={{
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: theme.card,
          padding: SPACING[3],
          paddingRight: SPACING[10],
          gap: SPACING[1],
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: SPACING[3],
          }}
        >
          <View style={{ marginTop: 1 }}>
            <Icon size={18} color={palette.icon} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText type="label" style={{ fontSize: FONT_SIZE.md }}>
              {item.title}
            </ThemedText>
            {item.description ? (
              <ThemedText type="caption" muted>
                {item.description}
              </ThemedText>
            ) : null}
          </View>
          <Pressable
            onPress={() => onDismiss(item.id)}
            style={{ padding: 4, marginTop: -4 }}
          >
            <X size={14} color={theme.mutedForeground} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function getToastPalette(variant: ToastVariant, theme: any) {
  switch (variant) {
    case "success":
      return { border: "rgba(34,197,94,0.20)", icon: "#22c55e" };
    case "error":
      return { border: "rgba(239,68,68,0.20)", icon: "#ef4444" };
    case "warning":
      return { border: "rgba(245,158,11,0.20)", icon: "#f59e0b" };
    case "info":
      return { border: "rgba(59,130,246,0.20)", icon: "#3b82f6" };
    default:
      return { border: theme.border, icon: theme.mutedForeground };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
