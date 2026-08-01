import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/input';
import { FONT_SIZE, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Check, ChevronDown } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// ─── Skeleton ───────────────────────────────────────────────────────────────

export function Skeleton({
  width = '100%',
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
  const opacity = useSharedValue(0.4);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.4, { duration: 800 }),
      ),
      -1,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: theme.secondary,
          borderRadius: rounded ? RADIUS.pill : RADIUS.sm,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: any }) {
  return (
    <View style={[{ padding: SPACING[4], gap: SPACING[3] }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[3] }}>
        <Skeleton width={40} height={40} rounded />
        <View style={{ flex: 1, gap: SPACING[1.5] }}>
          <Skeleton width="55%" height={14} rounded />
          <Skeleton width="35%" height={12} rounded />
        </View>
      </View>
      <Skeleton width="85%" height={12} rounded />
      <Skeleton width="100%" height={60} />
    </View>
  );
}

export function SkeletonText({ lines = 3, style }: { lines?: number; style?: any }) {
  return (
    <View style={[{ gap: SPACING[2] }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '55%' : '100%'} height={12} rounded />
      ))}
    </View>
  );
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

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
  variant = 'pills',
}: {
  value: T;
  onChange: (v: T) => void;
  items: TabItem<T>[];
  style?: any;
  variant?: 'pills' | 'underline' | 'scroll';
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: variant === 'pills' ? SPACING[0.5] : SPACING[3],
          padding: variant === 'pills' ? SPACING[0.5] : 0,
          backgroundColor: variant === 'pills' ? theme.secondary : 'transparent',
          borderRadius: variant === 'pills' ? RADIUS.lg : 0,
        },
        style,
      ]}
    >
      {items.map((it) => {
        const active = it.value === value;
        return (
          <Pressable
            key={it.value}
            onPress={() => onChange(it.value)}
            style={{ flex: variant === 'pills' ? 1 : undefined }}
          >
            {variant === 'underline' ? (
              <View
                style={{
                  paddingVertical: SPACING[2.5],
                  borderBottomWidth: 2,
                  borderBottomColor: active ? theme.foreground : 'transparent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SPACING[1.5],
                }}
              >
                {it.icon}
                <ThemedText
                  type="label"
                  style={{
                    color: active ? theme.foreground : theme.mutedForeground,
                    fontWeight: active ? '600' : '400',
                  }}
                >
                  {it.label}
                </ThemedText>
                {it.badge != null && <TabBadge active={active}>{it.badge}</TabBadge>}
              </View>
            ) : variant === 'scroll' ? (
              <View
                style={{
                  paddingHorizontal: SPACING[3],
                  paddingVertical: SPACING[2],
                  borderRadius: RADIUS.md,
                  backgroundColor: active ? theme.primary : 'transparent',
                  borderWidth: active ? 0 : 1,
                  borderColor: theme.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SPACING[1.5],
                }}
              >
                {it.icon}
                <ThemedText
                  type="label"
                  style={{
                    color: active ? theme.primaryForeground : theme.foreground,
                    fontWeight: active ? '600' : '400',
                  }}
                >
                  {it.label}
                </ThemedText>
                {it.badge != null && <TabBadge active={active}>{it.badge}</TabBadge>}
              </View>
            ) : (
              /* pills */
              <View
                style={{
                  paddingHorizontal: SPACING[3],
                  paddingVertical: SPACING[2],
                  borderRadius: RADIUS.md,
                  backgroundColor: active ? theme.background : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: SPACING[1.5],
                }}
              >
                {it.icon}
                <ThemedText
                  type="label"
                  style={{
                    color: active ? theme.foreground : theme.mutedForeground,
                    fontWeight: active ? '600' : '400',
                  }}
                >
                  {it.label}
                </ThemedText>
                {it.badge != null && <TabBadge active={active}>{it.badge}</TabBadge>}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function TabBadge({ active, children }: { active: boolean; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        minWidth: 18,
        height: 18,
        paddingHorizontal: 5,
        borderRadius: 9,
        backgroundColor: active ? theme.foreground : theme.muted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ThemedText
        type="badge"
        style={{
          color: active ? theme.background : theme.mutedForeground,
          fontSize: 10,
          fontWeight: '600',
        }}
      >
        {children}
      </ThemedText>
    </View>
  );
}

// ─── ActionSheet ────────────────────────────────────────────────────────────

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
  cancelLabel = 'Cancel',
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
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar backgroundColor="transparent" barStyle="light-content" />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View entering={FadeIn.duration(200)} style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} />
      </Pressable>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View entering={SlideInDown.duration(300).springify()} exiting={SlideOutDown.duration(200)}>
          <Pressable onPress={() => {}}>
            <View
              style={{
                backgroundColor: theme.card,
                borderTopLeftRadius: RADIUS['3xl'],
                borderTopRightRadius: RADIUS['3xl'],
                padding: SPACING[4],
                gap: SPACING[2],
                paddingBottom: SPACING[10],
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.border,
              }}
            >
              <View
                style={{
                  alignSelf: 'center',
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.border,
                  marginBottom: SPACING[1],
                }}
              />
              {title ? (
                <View style={{ padding: SPACING[2], alignItems: 'center', gap: SPACING[0.5] }}>
                  <ThemedText type="cardTitle">{title}</ThemedText>
                  {description ? (
                    <ThemedText type="caption" muted style={{ textAlign: 'center' }}>
                      {description}
                    </ThemedText>
                  ) : null}
                </View>
              ) : null}
              <View style={{ gap: SPACING[1] }}>
                {options.map((o, i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      onClose();
                      o.onPress();
                    }}
                    disabled={o.disabled}
                    style={({ pressed }) => ({
                      padding: SPACING[3.5],
                      backgroundColor: pressed ? theme.secondary : theme.background,
                      borderRadius: RADIUS.lg,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: SPACING[3],
                      opacity: o.disabled ? 0.4 : 1,
                    })}
                  >
                    {o.icon ? <View>{o.icon}</View> : null}
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        type="body"
                        style={{
                          color: o.destructive ? theme.destructive : theme.foreground,
                        }}
                      >
                        {o.label}
                      </ThemedText>
                      {o.subtitle ? (
                        <ThemedText type="caption" muted style={{ marginTop: 2 }}>
                          {o.subtitle}
                        </ThemedText>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => ({
                  marginTop: SPACING[2],
                  padding: SPACING[3.5],
                  backgroundColor: pressed ? theme.secondary : theme.background,
                  borderRadius: RADIUS.lg,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.border,
                })}
              >
                <ThemedText type="label">{cancelLabel}</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── SelectField ────────────────────────────────────────────────────────────

export type SelectOption<T extends string> = {
  label: string;
  value: T;
  icon?: React.ReactNode;
};

export function SelectField<T extends string>({
  label,
  placeholder = 'Select…',
  value,
  onChange,
  options,
  error,
  style,
  searchable = false,
}: {
  label?: string;
  placeholder?: string;
  value?: T;
  onChange: (v: T) => void;
  options: SelectOption<T>[];
  error?: string | null;
  style?: any;
  searchable?: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const selected = options.find((o) => o.value === value);

  const filteredOptions = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  return (
    <View style={{ gap: SPACING[1.5] }}>
      {label ? (
        <ThemedText type="label" style={{ marginLeft: SPACING[0.5] }}>
          {label}
        </ThemedText>
      ) : null}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[
          {
            borderRadius: RADIUS.lg,
            borderWidth: 1,
            borderColor: error ? theme.destructive : open ? theme.foreground : theme.border,
            backgroundColor: theme.background,
            paddingHorizontal: SPACING[3],
            minHeight: 44,
            alignItems: 'center',
            flexDirection: 'row',
            gap: SPACING[2],
          },
          style,
        ]}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
          {selected?.icon}
          <ThemedText
            type="body"
            style={{ color: selected ? theme.foreground : theme.mutedForeground }}
          >
            {selected ? selected.label : placeholder}
          </ThemedText>
        </View>
        <ChevronDown
          size={14}
          color={theme.mutedForeground}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {error ? (
        <ThemedText type="caption" style={{ color: theme.destructive, marginLeft: SPACING[0.5] }}>
          {error}
        </ThemedText>
      ) : null}
      {open && (
        <View
          style={{
            borderRadius: RADIUS.lg,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
            overflow: 'hidden',
            maxHeight: 300,
          }}
        >
          {searchable && (
            <View style={{ padding: SPACING[2], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
              <Input
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search…"
                autoFocus
                inputWrapperStyle={{ borderWidth: 0, backgroundColor: theme.secondary }}
              />
            </View>
          )}
          <ScrollView nestedScrollEnabled style={{ maxHeight: searchable ? 220 : 260 }}>
            {filteredOptions.length === 0 ? (
              <View style={{ padding: SPACING[4], alignItems: 'center' }}>
                <ThemedText type="caption" muted>No results found</ThemedText>
              </View>
            ) : (
              filteredOptions.map((o, i) => {
                const isSelected = o.value === value;
                return (
                  <Pressable
                    key={i}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                      setSearchQuery('');
                    }}
                    style={({ pressed }) => ({
                      padding: SPACING[3],
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: SPACING[2],
                      backgroundColor: pressed || isSelected ? theme.secondary : 'transparent',
                      borderBottomWidth: i < filteredOptions.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: theme.border,
                    })}
                  >
                    {o.icon}
                    <ThemedText
                      type="body"
                      style={{
                        color: isSelected ? theme.foreground : theme.foreground,
                        fontWeight: isSelected ? '600' : '400',
                        flex: 1,
                      }}
                    >
                      {o.label}
                    </ThemedText>
                    {isSelected && <Check size={14} color={theme.foreground} />}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
