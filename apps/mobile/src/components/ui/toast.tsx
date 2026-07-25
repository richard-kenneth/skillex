/**
 * Lightweight toast (snackbar) system — a context provider + useToast() hook.
 * Mirrors the web's Sonner API shape (toast({ title, description, … })).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { FONT_SIZE, RADIUS, SPACING, getAccent, MAX_CONTENT_WIDTH } from '@/constants/theme';
import { cn } from '@/lib/style-utils';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react-native';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms
  action?: { label: string; onPress: () => void };
}

export interface ToastItem extends Required<Pick<ToastOptions, 'id' | 'variant' | 'duration'>> {
  title: string;
  description?: string;
  action?: ToastOptions['action'];
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
        variant: opts.variant ?? 'default',
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
    [dismiss]
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
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
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
    <View
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          position: 'absolute',
          top: Platform.OS === 'android' ? 8 : 52,
          left: 0,
          right: 0,
          alignItems: 'center',
          paddingHorizontal: SPACING[3],
          pointerEvents: 'box-none',
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: MAX_CONTENT_WIDTH,
            gap: SPACING[2],
          }}
          pointerEvents="box-none"
        >
          {items.map((t) => (
            <ToastCard key={t.id} item={t} onDismiss={onDismiss} />
          ))}
        </View>
      </KeyboardAvoidingView>
    </View>
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
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
    return () => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -8, duration: 180, useNativeDriver: true }),
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
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          },
          { flexDirection: 'row', alignItems: 'flex-start' }
        )}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: RADIUS.pill,
            backgroundColor: palette.bg,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: SPACING[3],
          }}
        >
          <Icon size={16} color={palette.fg} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ThemedText
            type="smallBold"
            style={{ color: theme.foreground, fontSize: FONT_SIZE.md, lineHeight: 20 }}
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
                marginTop: 2,
              }}
            >
              {item.description}
            </ThemedText>
          ) : null}
          {item.action ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                item.action!.onPress();
                onDismiss(item.id);
              }}
              style={{
                alignSelf: 'flex-start',
                marginTop: SPACING[2],
                paddingHorizontal: SPACING[3],
                paddingVertical: SPACING[1],
                backgroundColor: palette.bg,
                borderRadius: RADIUS.md,
              }}
            >
              <ThemedText type="smallBold" style={{ color: palette.fg, fontSize: FONT_SIZE.sm }}>
                {item.action.label}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          hitSlop={10}
          style={{ position: 'absolute', right: SPACING[2], top: SPACING[2], padding: SPACING[2] }}
          onPress={(e) => {
            e.stopPropagation();
            onDismiss(item.id);
          }}
        >
          <X size={16} color={theme.mutedForeground} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

function getToastPalette(variant: ToastVariant) {
  if (variant === 'success') return { fg: getAccent('green').main, bg: getAccent('green').bg, border: getAccent('green').border };
  if (variant === 'error') return { fg: getAccent('red').main, bg: getAccent('red').bg, border: getAccent('red').border };
  if (variant === 'warning') return { fg: getAccent('amber').main, bg: getAccent('amber').bg, border: getAccent('amber').border };
  if (variant === 'info') return { fg: getAccent('blue').main, bg: getAccent('blue').bg, border: getAccent('blue').border };
  return { fg: getAccent('indigo').main, bg: getAccent('indigo').bg, border: getAccent('indigo').border };
}
