/**
 * Lightweight toast (snackbar) system — a context provider + useToast() hook.
 * Mirrors the web's Sonner API shape (toast({ title, description, … })).
 */
import { ThemedText } from "@/components/themed-text";
import {
  FONT_SIZE,
  MAX_CONTENT_WIDTH,
  RADIUS,
  SPACING,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/style-utils";
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
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

export interface ToastOptions {
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms
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
      const duration = opts.duration ?? 3800;
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
  const theme = useTheme();
  return (
    <Modal
      visible={items.length > 0}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <StatusBar backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
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
        </KeyboardAvoidingView>
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
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(-10)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
    return () => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -8,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    };
  }, [opacity, translateY]);

  const palette = getToastPalette(item.variant);

  const Icon = {
    default: Info,
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  }[item.variant];

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}
    >
      <Pressable
        onPress={() => onDismiss(item.id)}
        style={cn(
          {
            borderRadius: RADIUS.lg,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: theme.card,
            padding: SPACING[3],
            paddingRight: SPACING[10],
            gap: SPACING[1],
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          },
          styles.toastCard,
        )}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: SPACING[3],
          }}
        >
          <View style={{ marginTop: 2 }}>
            <Icon size={20} color={palette.icon} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText
              type="smallBold"
              style={{
                fontSize: FONT_SIZE.md,
                color: theme.foreground,
              }}
            >
              {item.title}
            </ThemedText>
            {item.description ? (
              <ThemedText
                type="small"
                style={{
                  color: theme.mutedForeground,
                  fontSize: FONT_SIZE.sm,
                  lineHeight: 18,
                }}
              >
                {item.description}
              </ThemedText>
            ) : null}
          </View>
          <Pressable
            onPress={() => onDismiss(item.id)}
            style={{ padding: 4, marginTop: -4 }}
          >
            <X size={16} color={theme.mutedForeground} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function getToastPalette(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return { border: "#22c55e33", icon: "#22c55e" };
    case "error":
      return { border: "#ef444433", icon: "#ef4444" };
    case "warning":
      return { border: "#f59e0b33", icon: "#f59e0b" };
    case "info":
      return { border: "#3b82f633", icon: "#3b82f6" };
    default:
      return { border: "#71717a33", icon: "#a1a1aa" };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  toastCard: {
    maxWidth: "100%",
  },
});
