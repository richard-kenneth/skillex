import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronDown } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, SHADOWS, ICON_SIZE, ANIMATION } from '@/constants/theme';
import { Input } from './input';

// ─── Skeleton ───────────────────────────────────────────────────────────────

export function Skeleton({
  width,
  height,
  rounded = false,
  style,
}: {
  width?: number | string;
  height?: number | string;
  rounded?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius: rounded ? RADIUS.pill : RADIUS.md,
          backgroundColor: theme.secondary,
          opacity: 0.6,
        },
        style,
      ]}
    />
  );
}

export function SkeletonText({ lines = 3, style }: { lines?: number; style?: ViewStyle }) {
  return (
    <View style={[{ gap: SPACING[2] }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </View>
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          padding: SPACING[4],
          borderRadius: RADIUS['2xl'],
          gap: SPACING[3],
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[3] }}>
        <Skeleton width={44} height={44} rounded />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="50%" height={16} />
          <Skeleton width="30%" height={12} />
        </View>
      </View>
      <SkeletonText lines={2} />
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

function TabPressable({
  onPress,
  children,
  style,
}: {
  onPress: () => void;
  children: React.ReactNode;
  style?: any;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.95, { damping: 15, stiffness: 250 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 200 }); }}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
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
  const isScrollable = items.length > 3 || variant === 'scroll';

  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: variant === 'pills' ? SPACING[1.5] : SPACING[3],
          padding: variant === 'pills' ? SPACING[1] : 0,
          backgroundColor: variant === 'pills' ? theme.secondary : 'transparent',
          borderRadius: variant === 'pills' ? RADIUS.xl : 0,
        },
        style,
      ]}
    >
      {items.map((it) => {
        const active = it.value === value;
        return (
          <TabPressable
            key={it.value}
            onPress={() => onChange(it.value)}
          >
            {variant === 'underline' ? (
              <View
                style={{
                  paddingVertical: SPACING[2.5],
                  paddingHorizontal: SPACING[1],
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
            ) : (
              /* Pills or Scroll */
              <View
                style={{
                  paddingHorizontal: SPACING[3.5],
                  paddingVertical: SPACING[2],
                  borderRadius: RADIUS.lg,
                  backgroundColor: active ? theme.background : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: SPACING[1.5],
                  borderWidth: active ? 1 : 0,
                  borderColor: active ? theme.border : 'transparent',
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
          </TabPressable>
        );
      })}
    </View>
  );

  if (isScrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: SPACING[2] }}
      >
        {content}
      </ScrollView>
    );
  }

  return content;
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
        backgroundColor: active ? theme.primary : theme.secondary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ThemedText
        style={{
          fontSize: 10,
          fontWeight: '600',
          color: active ? theme.primaryForeground : theme.mutedForeground,
        }}
      >
        {children}
      </ThemedText>
    </View>
  );
}

// ─── ActionSheet ────────────────────────────────────────────────────────────

export interface ActionSheetOption<T extends string = string> {
  value?: T;
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onPress?: () => void;
}

export function ActionSheet<T extends string = string>({
  open,
  onOpenChange,
  onClose,
  title,
  description,
  options,
  onSelect,
}: {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  title?: string;
  description?: string;
  options: ActionSheetOption<T>[];
  onSelect?: (v: T) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  if (!open) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.overlay },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <View style={styles.sheetContainer} pointerEvents="box-none">
          <Animated.View
            entering={SlideInDown.duration(250)}
            exiting={SlideOutDown.duration(250)}
            style={[
              styles.sheetCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                paddingBottom: Math.max(insets.bottom, SPACING[4]),
              },
            ]}
          >
            <View style={styles.handleBar}>
              <View style={[styles.handle, { backgroundColor: theme.border }]} />
            </View>

            {title || description ? (
              <View style={{ paddingHorizontal: SPACING[4], paddingBottom: SPACING[2], gap: 2 }}>
                {title && <ThemedText type="cardTitle">{title}</ThemedText>}
                {description && <ThemedText type="caption" muted>{description}</ThemedText>}
              </View>
            ) : null}

            <View style={{ paddingHorizontal: SPACING[2], gap: SPACING[1] }}>
              {options.map((opt, i) => (
                <Pressable
                  key={opt.value || String(i)}
                  onPress={() => {
                    if (opt.onPress) opt.onPress();
                    if (opt.value && onSelect) onSelect(opt.value);
                    handleClose();
                  }}
                  style={({ pressed }) => [
                    styles.sheetOption,
                    { backgroundColor: pressed ? theme.secondary : 'transparent' },
                  ]}
                >
                  {opt.icon}
                  <View style={{ flex: 1, gap: 1 }}>
                    <ThemedText
                      type="label"
                      style={{
                        color: opt.destructive ? theme.destructive : theme.foreground,
                      }}
                    >
                      {opt.label}
                    </ThemedText>
                    {opt.subtitle ? (
                      <ThemedText type="caption" muted>{opt.subtitle}</ThemedText>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

// ─── SelectField ────────────────────────────────────────────────────────────

export interface SelectOption {
  label: string;
  value: string | number;
}

export function SelectField({
  label,
  placeholder = 'Select option...',
  value,
  onChange,
  options,
  error,
  disabled = false,
  searchable = false,
}: {
  label?: string;
  placeholder?: string;
  value?: string | number;
  onChange: (v: any) => void;
  options: SelectOption[];
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const selectedOpt = options.find((o) => o.value === value);

  const filtered = React.useMemo(() => {
    if (!searchable || !search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search, searchable]);

  return (
    <View style={{ gap: SPACING[1.5] }}>
      {label && <ThemedText type="label">{label}</ThemedText>}

      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.selectTrigger,
          {
            backgroundColor: theme.background,
            borderColor: error ? theme.destructive : theme.border,
            opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          },
        ]}
      >
        <ThemedText
          type="body"
          style={{
            color: selectedOpt ? theme.foreground : theme.mutedForeground,
            flex: 1,
          }}
        >
          {selectedOpt ? selectedOpt.label : placeholder}
        </ThemedText>
        <ChevronDown size={16} color={theme.mutedForeground} />
      </Pressable>

      {error && (
        <ThemedText type="caption" style={{ color: theme.destructive }}>
          {error}
        </ThemedText>
      )}

      {open && (
        <Modal visible transparent animationType="none" onRequestClose={() => setOpen(false)}>
          <View style={StyleSheet.absoluteFill}>
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
            </Animated.View>

            <View style={styles.sheetContainer} pointerEvents="box-none">
              <Animated.View
                entering={SlideInDown.duration(250)}
                exiting={SlideOutDown.duration(250)}
                style={[
                  styles.sheetCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    maxHeight: '75%',
                  },
                ]}
              >
                <View style={styles.handleBar}>
                  <View style={[styles.handle, { backgroundColor: theme.border }]} />
                </View>

                {label && (
                  <View style={{ paddingHorizontal: SPACING[4], paddingBottom: SPACING[2] }}>
                    <ThemedText type="cardTitle">{label}</ThemedText>
                  </View>
                )}

                {searchable && (
                  <View style={{ paddingHorizontal: SPACING[4], paddingBottom: SPACING[3] }}>
                    <Input
                      placeholder="Search options..."
                      value={search}
                      onChangeText={setSearch}
                    />
                  </View>
                )}

                <ScrollView
                  contentContainerStyle={{ paddingHorizontal: SPACING[2], paddingBottom: SPACING[6] }}
                  keyboardShouldPersistTaps="handled"
                >
                  {filtered.map((opt) => {
                    const isSel = opt.value === value;
                    return (
                      <Pressable
                        key={String(opt.value)}
                        onPress={() => {
                          onChange(opt.value);
                          setOpen(false);
                          setSearch('');
                        }}
                        style={({ pressed }) => [
                          styles.selectOption,
                          {
                            backgroundColor: isSel
                              ? theme.secondary
                              : pressed
                              ? theme.muted
                              : 'transparent',
                          },
                        ]}
                      >
                        <ThemedText
                          type="body"
                          style={{
                            color: isSel ? theme.foreground : theme.foreground,
                            fontWeight: isSel ? '600' : '400',
                            flex: 1,
                          }}
                        >
                          {opt.label}
                        </ThemedText>
                        {isSel && <Check size={16} color={theme.foreground} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </Animated.View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: RADIUS['3xl'],
    borderTopRightRadius: RADIUS['3xl'],
    borderTopWidth: 1,
    paddingTop: SPACING[2],
    maxHeight: '80%',
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: SPACING[2],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    gap: SPACING[3],
  },
  selectTrigger: {
    height: 48,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
  },
});
