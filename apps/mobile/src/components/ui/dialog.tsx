import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalProps,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, FONT_SIZE, MAX_CONTENT_WIDTH } from '@/constants/theme';
import { Button } from './button';
import { cn } from '@/lib/style-utils';
import { X } from 'lucide-react-native';

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
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => dismissable && onOpenChange(false)}
    >
      <Pressable
        style={styles.overlay}
        onPress={() => dismissable && onOpenChange(false)}
      >
        <Pressable onPress={() => {}} style={{ flex: 1, justifyContent: 'center', padding: SPACING[4], width: '100%', alignItems: 'center' }}>
          <View style={styles.cardWrap}>
            <ThemedView style={styles.card} type="backgroundElement">
              {children}
            </ThemedView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function DialogHeader({ children, style, onClose }: { children: React.ReactNode; style?: any; onClose?: () => void }) {
  const theme = useTheme();
  return (
    <View style={cn({ padding: SPACING[5], gap: SPACING[1.5], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }, style)}>
      {onClose ? (
        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={{ position: 'absolute', right: SPACING[4], top: SPACING[4], padding: SPACING[2], zIndex: 5 }}
          accessibilityLabel="Close"
        >
          <X size={18} color={theme.mutedForeground} />
        </Pressable>
      ) : null}
      {children}
    </View>
  );
}

export function DialogTitle({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <ThemedText type="default" style={[{ fontSize: FONT_SIZE['2xl'], fontWeight: '700', lineHeight: 28, letterSpacing: -0.2 }, style]}>
      {children}
    </ThemedText>
  );
}

export function DialogDescription({ children, style }: { children: React.ReactNode; style?: any }) {
  const theme = useTheme();
  return (
    <ThemedText type="small" style={[{ fontSize: FONT_SIZE.md, color: theme.mutedForeground, lineHeight: 22 }, style]}>
      {children}
    </ThemedText>
  );
}

export function DialogContent({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <ScrollView style={cn({ paddingHorizontal: SPACING[5], paddingTop: SPACING[5] }, style)}>
      {children}
    </ScrollView>
  );
}

export function DialogFooter({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={cn({ padding: SPACING[5], flexDirection: 'row', gap: SPACING[2], justifyContent: 'flex-end', borderTopWidth: StyleSheet.hairlineWidth }, style)}>
      {children}
    </View>
  );
}

type AlertVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';
export function Alert({
  variant = 'default',
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
      case 'destructive':
      case 'warning':
        return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', fg: '#f87171' };
      case 'success':
        return { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', fg: '#4ade80' };
      case 'info':
        return { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)', fg: '#60a5fa' };
      default:
        return { bg: theme.muted, border: theme.border, fg: theme.mutedForeground };
    }
  })();
  return (
    <View
      style={cn(
        {
          borderRadius: RADIUS.md,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.bg,
          padding: SPACING[4],
          gap: SPACING[2],
          flexDirection: 'row',
        },
        style
      )}
    >
      {icon ? <View style={{ marginRight: SPACING[2] }}>{icon}</View> : null}
      <View style={{ flex: 1, gap: SPACING[1] }}>
        <ThemedText type="smallBold" style={{ color: palette.fg, fontSize: FONT_SIZE.md }}>
          {title}
        </ThemedText>
        {description ? (
          typeof description === 'string' ? (
            <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm, lineHeight: 20 }}>
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

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
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
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onPress={() => onOpenChange(false)}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'destructive' : 'default'}
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
