import React from 'react';
import { View, TextInput } from 'react-native';
import { FONT_SIZE, RADIUS, SPACING, getAccent, MAX_CONTENT_WIDTH } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, useToast } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { useApplyReferralCode } from '@/lib/api-hooks';
import { Gift, Loader2, X, CheckCircle2, AlertTriangle, Sparkles, ArrowRight } from 'lucide-react-native';

interface ReferralPromptProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onApplied?: () => void;
  allowSkip?: boolean;
}

export function ReferralApplyPrompt({
  open,
  onOpenChange,
  onApplied,
  allowSkip = true,
}: ReferralPromptProps) {
  const t = useT('referrals');
  const toast = useToast();
  const applyQ = useApplyReferralCode();
  const [code, setCode] = React.useState('');
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (open) {
      setCode('');
      setFeedback(null);
    }
  }, [open]);

  async function apply() {
    const c = code.trim().toUpperCase();
    if (!c) return;
    try {
      const res = await applyQ.mutateAsync({ referralCode: c });
      setFeedback({ type: 'success', text: t('appliedDesc', { code: c }) });
      toast.toast({ title: t('appliedTitle'), variant: 'success' });
      setTimeout(() => {
        onOpenChange(false);
        onApplied?.();
      }, 1000);
    } catch (e: any) {
      const msg = e?.message ?? t('invalid');
      setFeedback({ type: 'error', text: msg });
      toast.toast({ title: t('invalid'), description: msg, variant: 'error' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: MAX_CONTENT_WIDTH, width: '100%' }}>
        <DialogHeader style={{ gap: SPACING[2] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: RADIUS.pill,
                backgroundColor: getAccent('emerald').bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Gift size={20} color={getAccent('emerald').main} />
            </View>
            <View style={{ flex: 1 }}>
              <DialogTitle style={{ fontSize: FONT_SIZE.lg }}>{t('promptTitle')}</DialogTitle>
              <DialogDescription>{t('promptDesc')}</DialogDescription>
            </View>
          </View>
        </DialogHeader>

        <CardContent style={{ gap: SPACING[3] }}>
          <View style={{ gap: SPACING[2] }}>
            <Label>{t('applyPlaceholder')}</Label>
            <TextInput
              autoCapitalize="characters"
              autoCorrect={false}
              value={code}
              onChangeText={(v) => {
                setCode(v.replace(/[^A-Za-z0-9]/g, '').toUpperCase());
                setFeedback(null);
              }}
              placeholder="e.g. ALEX-88F2"
              placeholderTextColor="#52525b"
              style={{
                borderRadius: RADIUS.md,
                backgroundColor: 'rgba(39,39,42,0.5)',
                borderWidth: 1,
                borderColor: feedback?.type === 'error' ? getAccent('red').main : feedback?.type === 'success' ? getAccent('green').main : 'rgba(39,39,42,1)',
                paddingHorizontal: SPACING[3],
                paddingVertical: SPACING[3],
                color: '#fff',
                fontSize: FONT_SIZE.md,
                fontWeight: '800',
                letterSpacing: 2,
              }}
              onSubmitEditing={apply}
            />
          </View>

          {feedback ? (
            <View
              style={{
                flexDirection: 'row',
                gap: SPACING[2],
                padding: SPACING[3],
                borderRadius: RADIUS.md,
                backgroundColor:
                  feedback.type === 'success'
                    ? getAccent('green').bg
                    : getAccent('red').bg,
                borderWidth: 1,
                borderColor:
                  feedback.type === 'success'
                    ? getAccent('green').border
                    : getAccent('red').border,
              }}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 size={16} color={getAccent('green').main} />
              ) : (
                <AlertTriangle size={16} color={getAccent('red').main} />
              )}
              <ThemedText
                type="small"
                style={{
                  flex: 1,
                  color:
                    feedback.type === 'success'
                      ? getAccent('green').main
                      : getAccent('red').main,
                  lineHeight: 20,
                  fontSize: 12,
                }}
              >
                {feedback.text}
              </ThemedText>
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: SPACING[2],
                padding: SPACING[3],
                borderRadius: RADIUS.md,
                backgroundColor: getAccent('amber').bg,
                borderWidth: 1,
                borderColor: getAccent('amber').border,
              }}
            >
              <Sparkles size={16} color={getAccent('amber').main} style={{ marginTop: 2 }} />
              <ThemedText type="small" style={{ flex: 1, color: getAccent('amber').main, lineHeight: 18, fontSize: 12 }}>
                {t('rewardDesc')}
              </ThemedText>
            </View>
          )}
        </CardContent>

        <DialogFooter style={{ flexDirection: 'row', justifyContent: 'space-between', gap: SPACING[2] }}>
          {allowSkip ? (
            <Button variant="ghost" onPress={() => onOpenChange(false)} leftIcon={<X size={14} />}>
              {t('promptSkip')}
            </Button>
          ) : (
            <View />
          )}
          <Button
            onPress={apply}
            disabled={!code.trim() || applyQ.isPending || feedback?.type === 'success'}
            leftIcon={applyQ.isPending ? <Loader2 size={14} color="#fff" /> : <Sparkles size={14} color="#fff" />}
            rightIcon={!applyQ.isPending ? <ArrowRight size={14} color="#fff" /> : undefined}
          >
            {applyQ.isPending ? t('applyCta').replace('Apply', 'Applying') : t('applyCta')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Label({ children }: any) {
  const theme = require('@/hooks/use-theme').useTheme();
  return (
    <ThemedText type="smallBold" style={{ fontSize: 11, color: theme.mutedForeground, textTransform: 'uppercase', letterSpacing: 1 }}>
      {children}
    </ThemedText>
  );
}
