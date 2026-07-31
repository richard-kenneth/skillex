import { ThemedText } from "@/components/themed-text";
import { FONT_SIZE, RADIUS, SPACING } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/style-utils";
import { Check, ChevronDown } from "lucide-react-native";
import React from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";

// Skeleton shimmer

export function Skeleton({
  width = "100%",
  height = 16,
  style,
  rounded,
}: {
  width?: number | string;
  height?: number;
  style?: any;
  rounded?: boolean;
}) {
  const theme = useTheme();
  const pulse = React.useRef(new Animated.Value(0.35)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
      { iterations: -1 },
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={cn(
        {
          width,
          height,
          backgroundColor: theme.muted,
          borderRadius: rounded ? RADIUS.pill : RADIUS.sm,
          opacity: pulse as any,
        },
        style,
      )}
    />
  );
}

export function SkeletonCard({ style }: { style?: any }) {
  return (
    <View style={cn({ padding: SPACING[5], gap: SPACING[3] }, style)}>
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: SPACING[3] }}
      >
        <Skeleton width={40} height={40} rounded />
        <View style={{ flex: 1, gap: SPACING[1.5] }}>
          <Skeleton width="60%" height={FONT_SIZE.lg} rounded />
          <Skeleton width="40%" height={FONT_SIZE.sm} rounded />
        </View>
      </View>
      <Skeleton width="90%" height={14} rounded />
      <Skeleton width="100%" height={80} />
    </View>
  );
}

export function SkeletonText({
  lines = 3,
  style,
}: {
  lines?: number;
  style?: any;
}) {
  return (
    <View style={cn({ gap: SPACING[2] }, style)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? "60%" : "100%"}
          height={FONT_SIZE.base}
          rounded
        />
      ))}
    </View>
  );
}

// Segmented Tabs

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  style,
  variant = "pills",
}: {
  value: T;
  onChange: (v: T) => void;
  items: TabItem<T>[];
  style?: any;
  variant?: "pills" | "underline" | "scroll";
}) {
  const theme = useTheme();
  const baseWrap =
    variant === "pills"
      ? {
          flexDirection: "row" as const,
          gap: SPACING[1],
          padding: SPACING[1],
          backgroundColor: theme.backgroundElement,
          borderRadius: RADIUS.xl,
        }
      : variant === "underline"
        ? { flexDirection: "row" as const, gap: SPACING[4] }
        : { flexDirection: "row" as const, gap: SPACING[2] };

  return (
    <View style={cn(baseWrap, style)}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <Pressable
            key={it.value}
            onPress={() => onChange(it.value)}
            android_ripple={{ color: `${theme.primary}33`, borderless: false }}
            style={{
              flex: variant === "pills" ? 1 : undefined,
            }}
          >
            {variant === "underline" ? (
              <View
                style={{
                  borderBottomWidth: 2,
                  borderBottomColor: active ? theme.primary : "transparent",
                }}
              >
                <TabLabel it={it} active={active} variant={variant} />
              </View>
            ) : variant === "scroll" ? (
              <View
                style={[
                  {
                    paddingHorizontal: SPACING[3],
                    paddingVertical: SPACING[2],
                    borderRadius: RADIUS.pill,
                    backgroundColor: active ? theme.primary : "transparent",
                    borderWidth: 1,
                    borderColor: active ? theme.primary : theme.border,
                    alignItems: "center",
                    flexDirection: "row",
                    gap: SPACING[1.5],
                  },
                ]}
              >
                <TabText it={it} active={active} variant={variant} />
              </View>
            ) : (
              <View
                style={{
                  paddingHorizontal: SPACING[3],
                  paddingVertical: SPACING[2],
                  borderRadius: RADIUS.lg,
                  backgroundColor: active ? theme.primary : "transparent",
                  alignItems: "center",
                  flexDirection: "row",
                  gap: SPACING[1.5],
                  justifyContent: "center",
                }}
              >
                <TabText it={it} active={active} variant={variant} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function TabLabel<T extends string>({
  it,
  active,
}: {
  it: TabItem<T>;
  active: boolean;
  variant: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        paddingVertical: SPACING[2.5],
        alignItems: "center",
        flexDirection: "row",
        gap: SPACING[1.5],
      }}
    >
      {it.icon}
      <ThemedText
        type="smallBold"
        style={{
          color: active ? theme.foreground : theme.mutedForeground,
          fontSize: FONT_SIZE.sm,
          fontWeight: active ? "700" : "500",
        }}
      >
        {it.label}
      </ThemedText>
      {it.badge != null && (
        <View
          style={{
            minWidth: 18,
            height: 18,
            paddingHorizontal: 5,
            borderRadius: 9999,
            backgroundColor: active ? theme.primary : theme.muted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ThemedText
            type="smallBold"
            style={{
              color: active ? theme.primaryForeground : theme.mutedForeground,
              fontSize: 10,
            }}
          >
            {it.badge}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function TabText<T extends string>({
  it,
  active,
  variant,
}: {
  it: TabItem<T>;
  active: boolean;
  variant: string;
}) {
  const theme = useTheme();
  const isPill = variant === "scroll";
  return (
    <>
      {it.icon}
      <ThemedText
        type="smallBold"
        style={{
          color: active
            ? isPill
              ? theme.primaryForeground
              : theme.primaryForeground
            : isPill
              ? theme.foreground
              : theme.mutedForeground,
          fontSize: FONT_SIZE.sm,
          fontWeight: active ? "700" : "500",
        }}
      >
        {it.label}
      </ThemedText>
      {it.badge != null && (
        <View
          style={{
            minWidth: 18,
            height: 18,
            paddingHorizontal: 5,
            borderRadius: 9999,
            backgroundColor: active
              ? "rgba(255,255,255,0.25)"
              : theme.destructive,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ThemedText
            type="smallBold"
            style={{
              color: "#fff",
              fontSize: 10,
            }}
          >
            {it.badge}
          </ThemedText>
        </View>
      )}
    </>
  );
}

// ActionSheet

export type ActionSheetOption = {
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  subtitle?: string;
};

export function ActionSheet({
  open,
  onClose,
  title,
  description,
  options,
  cancelLabel = "Cancel",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  options: ActionSheetOption[];
  cancelLabel?: string;
}) {
  const theme = useTheme();
  if (!open) return null;
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}}>
            <View
              style={{
                backgroundColor: theme.card,
                borderTopLeftRadius: RADIUS.xl,
                borderTopRightRadius: RADIUS.xl,
                padding: SPACING[3],
                gap: SPACING[2],
                paddingBottom: SPACING[8],
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.border,
                elevation: 24,
                shadowColor: "#000",
                shadowOpacity: 0.25,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: -6 },
              }}
            >
              <View
                style={{
                  alignSelf: "center",
                  width: 36,
                  height: 4,
                  borderRadius: 9999,
                  backgroundColor: theme.border,
                  marginBottom: SPACING[1],
                }}
              />
              {title ? (
                <View
                  style={{
                    padding: SPACING[2],
                    alignItems: "center",
                    gap: SPACING[1],
                  }}
                >
                  <ThemedText
                    type="default"
                    style={{ fontSize: FONT_SIZE.md, fontWeight: "700" }}
                  >
                    {title}
                  </ThemedText>
                  {description ? (
                    <ThemedText
                      type="small"
                      style={{
                        color: theme.mutedForeground,
                        fontSize: FONT_SIZE.sm,
                        textAlign: "center",
                      }}
                    >
                      {description}
                    </ThemedText>
                  ) : null}
                </View>
              ) : null}
              <View style={{ gap: SPACING[1.5] }}>
                {options.map((o, i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      onClose();
                      o.onPress();
                    }}
                    disabled={o.disabled}
                    style={{
                      padding: SPACING[4],
                      backgroundColor: theme.backgroundElement,
                      borderRadius: RADIUS.lg,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: SPACING[3],
                    }}
                  >
                    {o.icon ? (
                      <View style={{ opacity: o.disabled ? 0.4 : 1 }}>
                        {o.icon}
                      </View>
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        type="default"
                        style={{
                          fontSize: FONT_SIZE.md,
                          color: o.destructive
                            ? "#ef4444"
                            : o.disabled
                              ? theme.mutedForeground
                              : theme.foreground,
                          fontWeight: "500",
                        }}
                      >
                        {o.label}
                      </ThemedText>
                      {o.subtitle ? (
                        <ThemedText
                          type="small"
                          style={{
                            color: theme.mutedForeground,
                            fontSize: FONT_SIZE.sm,
                            marginTop: 2,
                          }}
                        >
                          {o.subtitle}
                        </ThemedText>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={onClose}
                style={{
                  marginTop: SPACING[2],
                  padding: SPACING[4],
                  backgroundColor: theme.backgroundElement,
                  borderRadius: RADIUS.lg,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <ThemedText
                  type="default"
                  style={{ fontSize: FONT_SIZE.md, fontWeight: "600" }}
                >
                  {cancelLabel}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

// Dropdown / Select (inline dropdown — works inside Dialogs/Modals)

export type SelectOption<T extends string> = {
  label: string;
  value: T;
  icon?: React.ReactNode;
};
export function SelectField<T extends string>({
  label,
  placeholder = "Select…",
  value,
  onChange,
  options,
  error,
  style,
}: {
  label?: string;
  placeholder?: string;
  value?: T;
  onChange: (v: T) => void;
  options: SelectOption<T>[];
  error?: string | null;
  style?: any;
}) {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View style={{ gap: SPACING[2] }}>
      {label ? (
        <ThemedText
          type="smallBold"
          style={{
            fontSize: FONT_SIZE.sm,
            color: theme.foreground,
            marginLeft: SPACING[0.5],
          }}
        >
          {label}
        </ThemedText>
      ) : null}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[
          {
            borderRadius: RADIUS.md,
            borderWidth: 1,
            borderColor: error ? "#ef4444" : open ? theme.primary : theme.input,
            backgroundColor: theme.background,
            paddingHorizontal: SPACING[3],
            minHeight: 44,
            alignItems: "center",
            flexDirection: "row",
            gap: SPACING[2],
          },
          style,
        ]}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: SPACING[2],
          }}
        >
          {selected?.icon}
          <ThemedText
            type="default"
            style={{
              fontSize: FONT_SIZE.md,
              color: selected ? theme.foreground : theme.mutedForeground,
            }}
          >
            {selected ? selected.label : placeholder}
          </ThemedText>
        </View>
        <ChevronDown
          size={16}
          color={theme.mutedForeground}
          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        />
      </Pressable>
      {error ? (
        <ThemedText
          type="small"
          style={{
            color: "#f87171",
            fontSize: FONT_SIZE.sm,
            marginLeft: SPACING[0.5],
          }}
        >
          {error}
        </ThemedText>
      ) : null}
      {open && (
        <View
          style={{
            borderRadius: RADIUS.md,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
            overflow: "hidden",
            elevation: 8,
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            maxHeight: 240,
          }}
        >
          <ScrollView
            nestedScrollEnabled
            style={{ maxHeight: 240 }}
            contentContainerStyle={{ gap: 0 }}
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <Pressable
                  key={i}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={{
                    padding: SPACING[3],
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING[2],
                    backgroundColor: isSelected
                      ? theme.backgroundElement
                      : "transparent",
                    borderBottomWidth:
                      i < options.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: theme.border,
                  }}
                >
                  {o.icon}
                  <ThemedText
                    type="default"
                    style={{
                      fontSize: FONT_SIZE.md,
                      color: isSelected ? theme.primary : theme.foreground,
                      fontWeight: isSelected ? "600" : "400",
                      flex: 1,
                    }}
                  >
                    {o.label}
                  </ThemedText>
                  {isSelected && <Check size={16} color={theme.primary} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
