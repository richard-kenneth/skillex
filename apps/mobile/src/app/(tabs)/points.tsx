import React from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useTheme } from '@/hooks/use-theme';
import { FONT_SIZE, RADIUS, SPACING, getAccent, MAX_CONTENT_WIDTH, ICON_SIZE } from '@/constants/theme';
import { useT } from 'lib/i18n';
import {
  Badge, Button, Card, CardContent, CardHeader, CardTitle, CardDescription,
  PressableCard, Input, Tabs, SkeletonText, Skeleton, AlertDialog, SelectField,
} from '@/components/ui';
import { Separator } from '@/components/ui/form';
import { CustomHeader } from '@/components/ui/custom-header';
import { ThemedText } from '@/components/themed-text';
import {
  usePointsBalance, usePointsTransactions, useBanks, useFeeConfig,
  useRates, usePurchasePoints, useWithdrawPoints, useResolveAccount,
} from '@/lib/api-hooks';
import { useToast } from '@/components/ui/toast';
import {
  POINT_TO_USD_RATE, DEFAULT_WITHDRAWAL_SPREAD, MIN_PURCHASE_POINTS,
  MIN_WITHDRAWAL_POINTS, getCurrencyDecimals, applyCurrencyPrecision,
  getTransactionMeta, formatDateShort, TransactionType,
} from '@skil-ex2/shared';
import {
  ArrowDownLeft, ArrowDownRight, ArrowUpRight, Banknote, Coins, Landmark,
  Lock, Plus, Unlock, Wallet, Zap, RefreshCw, CheckCircle2, Loader2, Gift, ShieldCheck,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnalyticsEvent, track } from '@/lib/analytics';


type SubTab = 'all' | 'purchase' | 'withdraw' | 'exchange';
const QUICK_BUY = [500, 1000, 5000, 10000];
const WITHDRAWAL_CURRENCY = 'NGN';

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency,
      maximumFractionDigits: getCurrencyDecimals(currency),
      minimumFractionDigits: getCurrencyDecimals(currency),
    }).format(amount);
  } catch { return `${amount.toFixed(getCurrencyDecimals(currency))} ${currency}`; }
}

export default function PointsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const t = useT('points');

  const balanceQ = usePointsBalance();
  const txQ = usePointsTransactions();
  const banksQ = useBanks();
  const feeQ = useFeeConfig();
  const ratesQ = useRates();
  const purchaseQ = usePurchasePoints();
  const withdrawQ = useWithdrawPoints();
  const resolveQ = useResolveAccount();

  const [tab, setTab] = React.useState<SubTab>('all');
  const [refreshing, setRefreshing] = React.useState(false);
  const [purchaseAmount, setPurchaseAmount] = React.useState('');
  const [purchaseError, setPurchaseError] = React.useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = React.useState('');
  const [withdrawBankCode, setWithdrawBankCode] = React.useState('');
  const [withdrawAccount, setWithdrawAccount] = React.useState('');
  const [withdrawError, setWithdrawError] = React.useState<string | null>(null);
  const [resolvedName, setResolvedName] = React.useState<string | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = React.useState(false);
  const [selectedCurrency, setSelectedCurrency] = React.useState('USD');
  const [currencyDetecting, setCurrencyDetecting] = React.useState(true);
  const resolveDebounceRef = React.useRef<any>(null);

  React.useEffect(() => {
    const detectCurrency = async () => {
      try {
        const res = await fetch('https://ipapi.co/currency/', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36' },
        });
        if (res.ok) {
          const currency = await res.text();
          if (currency && currency.trim().length === 3) setSelectedCurrency(currency.trim().toUpperCase());
        }
      } catch {} finally { setCurrencyDetecting(false); }
    };
    detectCurrency();
  }, []);

  const balance = (balanceQ.data as any) ?? 0;
  const transactions = (txQ.data ?? []) as any[];
  const feeConfig = feeQ.data as any;
  const rates = (ratesQ.data ?? {}) as Record<string, number>;
  const rate = rates ? rates[selectedCurrency] || 1 : 1;
  const ngnRate = rates ? rates['NGN'] || 1500 : 1500;
  const minWithdrawalPoints = feeConfig?.minWithdrawalPoints ?? MIN_WITHDRAWAL_POINTS;
  const withdrawalSpread = feeConfig?.withdrawalSpread ?? DEFAULT_WITHDRAWAL_SPREAD;

  const pAmount = parseInt(purchaseAmount) || 0;
  const baseFiatRaw = pAmount * POINT_TO_USD_RATE * rate;
  const pFiatTotal = React.useMemo(() => {
    if (!pAmount) return 0;
    return applyCurrencyPrecision(baseFiatRaw, selectedCurrency, rate);
  }, [pAmount, rate, selectedCurrency]);

  const wAmount = parseInt(withdrawAmount) || 0;
  const wNominalRaw = React.useMemo(() => (wAmount ? wAmount * POINT_TO_USD_RATE * ngnRate : 0), [wAmount, ngnRate]);
  const wReceive = React.useMemo(() => (wNominalRaw ? applyCurrencyPrecision(wNominalRaw * (1 - withdrawalSpread), WITHDRAWAL_CURRENCY, ngnRate) : 0), [wNominalRaw, withdrawalSpread, ngnRate]);

  const refresh = async () => {
    setRefreshing(true);
    try { await Promise.all([balanceQ.refetch(), txQ.refetch(), feeQ.refetch(), ratesQ.refetch()]); }
    finally { setRefreshing(false); }
  };

  React.useEffect(() => {
    if (withdrawAccount.length === 10 && withdrawBankCode) {
      setWithdrawError(null); setResolvedName(null);
      if (resolveDebounceRef.current) clearTimeout(resolveDebounceRef.current);
      resolveDebounceRef.current = setTimeout(async () => {
        try {
          const r = await resolveQ.mutateAsync({ accountNumber: withdrawAccount, bankCode: withdrawBankCode });
          if ((r as any)?.success) setResolvedName((r as any).accountName);
          else setWithdrawError((r as any)?.message ?? t('couldNotVerifyAccount'));
        } catch (e: any) { setWithdrawError(e?.message ?? t('couldNotVerifyAccount')); }
      }, 600);
    } else { setResolvedName(null); }
    return () => { if (resolveDebounceRef.current) clearTimeout(resolveDebounceRef.current); };
  }, [withdrawAccount, withdrawBankCode]);

  const handlePurchase = async () => {
    if (!pAmount || pAmount < MIN_PURCHASE_POINTS) { setPurchaseError(t('minPurchasePoints', { amount: MIN_PURCHASE_POINTS })); return; }
    setPurchaseError(null);
    try {
      const redirectUrl = Platform.OS === 'web' && typeof (globalThis as any).window !== 'undefined'
        ? `${(globalThis as any).window.location.origin}/points` : Linking.createURL('points');
      const res = await purchaseQ.mutateAsync({ amount: pAmount, currency: selectedCurrency, redirectUrl });
      const { paymentLink } = res as any;
      if (paymentLink) {
        track(AnalyticsEvent.POINTS_PURCHASE_INITIATED, { points: pAmount, currency: selectedCurrency });
        if (Platform.OS === 'web' && typeof (globalThis as any).window !== 'undefined') { (globalThis as any).window.location.href = paymentLink; return; }
        const browserResult = await WebBrowser.openAuthSessionAsync(paymentLink, redirectUrl, { showTitle: true, enableBarCollapsing: true });
        if (browserResult.type !== 'success' || !browserResult.url) { toast.toast({ title: t('paymentCancelled'), variant: 'info' }); return; }
        setPurchaseAmount('');
        setTimeout(() => { Promise.all([balanceQ.refetch(), txQ.refetch()]); }, 3000);
      } else { toast.toast({ title: t('paymentInitiated'), variant: 'info' }); }
    } catch (e: any) { setPurchaseError(e?.message ?? t('purchaseFailed')); }
  };

  const handleWithdraw = async () => {
    if (!wAmount || wAmount < minWithdrawalPoints) { setWithdrawError(t('minWithdrawalPoints', { amount: minWithdrawalPoints })); return; }
    if (!withdrawBankCode || !withdrawAccount) { setWithdrawError(t('selectBankAndAccount')); return; }
    if (balance < wAmount) { setWithdrawError(t('insufficientBalance')); return; }
    if (!resolvedName) { setWithdrawError(t('pleaseWaitVerification')); return; }
    setConfirmWithdraw(true);
  };

  const submitWithdraw = async () => {
    setWithdrawError(null);
    try {
      await withdrawQ.mutateAsync({ amount: wAmount, bankCode: withdrawBankCode, accountNumber: withdrawAccount });
      track(AnalyticsEvent.POINTS_WITHDRAWAL_REQUESTED, { points: wAmount });
      toast.toast({ title: t('withdrawalRequestSent'), description: t('withdrawalRequestSentDesc'), variant: 'success' });
      setWithdrawAmount(''); setWithdrawAccount(''); setWithdrawBankCode(''); setResolvedName(null);
      await Promise.all([balanceQ.refetch(), txQ.refetch()]);
    } catch (e: any) { setWithdrawError(e?.message ?? t('withdrawalFailed')); }
  };

  const loading = balanceQ.isLoading || txQ.isLoading;

  const filteredTransactions = React.useMemo(() => {
    if (tab === 'all') return transactions;
    const byType: Record<SubTab, string[]> = {
      purchase: [TransactionType.PURCHASE],
      withdraw: [TransactionType.WITHDRAWAL],
      exchange: [TransactionType.ESCROW_LOCK, TransactionType.ESCROW_RELEASE, TransactionType.EXCHANGE_COMMISSION, TransactionType.FACILITATION_FEE, TransactionType.PENALTY, TransactionType.RECORDING_FEE],
      all: [],
    };
    return transactions.filter((t) => byType[tab].includes(t.type));
  }, [transactions, tab]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <CustomHeader title={t('title')} subtitle={t('tradeSkillsDesc')} showNotifications showSearch />

      <View style={{ width: '100%', maxWidth: MAX_CONTENT_WIDTH, flex: 1, alignSelf: 'center' }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: SPACING[4], paddingTop: SPACING[4], paddingBottom: insets.bottom + 100, gap: SPACING[4] }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.mutedForeground} colors={[theme.mutedForeground]} />}
        >
          {/* Balance Hero */}
          <Animated.View entering={FadeInDown.duration(400).delay(50)}>
            <BalanceCard balance={balance} loading={loading} ngnRate={ngnRate} />
          </Animated.View>

          {/* Quick Info */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <View style={{ flexDirection: 'row', gap: SPACING[3] }}>
              <InfoStat loading={loading} label={t('commission')} value="10%" hint={t('perExchange')} Icon={Zap} accent="amber" />
              <InfoStat loading={loading} label={t('withdrawSpread')} value={`${Math.round(withdrawalSpread * 100)}%`} hint={`${t('min')} ${minWithdrawalPoints} pts`} Icon={ShieldCheck} accent="blue" />
            </View>
          </Animated.View>

          {/* Purchase Points */}
          <Animated.View entering={FadeInDown.duration(400).delay(150)}>
            <Card variant="glass">
              <CardHeader>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[3] }}>
                  <View style={{ width: 36, height: 36, borderRadius: RADIUS.lg, backgroundColor: theme.secondary, alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={ICON_SIZE.md} color={theme.foreground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <CardTitle>{t('buyPoints')}</CardTitle>
                    <CardDescription>{t('buyPointsDesc')}</CardDescription>
                  </View>
                </View>
              </CardHeader>
              <CardContent style={{ gap: SPACING[4] }}>
                <Input
                  label={t('pointsAmount')}
                  value={purchaseAmount}
                  onChangeText={(v) => { setPurchaseAmount(v.replace(/[^0-9]/g, '')); setPurchaseError(null); }}
                  placeholder={`${t('min')} ${MIN_PURCHASE_POINTS}`}
                  keyboardType="numeric"
                  error={purchaseError}
                  rightSlot={<Badge variant="secondary">{t('points')}</Badge>}
                />

                {pAmount > 0 && pAmount < MIN_PURCHASE_POINTS ? (
                  <ThemedText type="caption" style={{ color: theme.destructive }}>
                    {t('minPurchase')} {MIN_PURCHASE_POINTS} {t('points')}
                  </ThemedText>
                ) : null}

                {pAmount >= MIN_PURCHASE_POINTS ? (
                  <View style={{ padding: SPACING[3], borderRadius: RADIUS.lg, backgroundColor: theme.secondary, gap: SPACING[2] }}>
                    <Row label={t('rate')} value={`1 ${t('pt')} = ${formatCurrency(POINT_TO_USD_RATE * rate, selectedCurrency)}`} />
                    <Row label={t('subtotal')} value={`${pAmount.toLocaleString()} ${t('pts')}`} />
                    <Separator />
                    <Row label={t('youPay')} value={formatCurrency(pFiatTotal, selectedCurrency)} strong />
                  </View>
                ) : null}

                <View style={{ gap: SPACING[2] }}>
                  <ThemedText type="label">{t('quickAmounts')}</ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] }}>
                    {QUICK_BUY.map((amt) => {
                      const active = purchaseAmount === String(amt);
                      return (
                        <Pressable
                          key={amt}
                          onPress={() => { setPurchaseAmount(String(amt)); setPurchaseError(null); }}
                          style={({ pressed }) => [{
                            paddingHorizontal: SPACING[3], paddingVertical: SPACING[1.5],
                            borderRadius: RADIUS.md, borderWidth: 1,
                            borderColor: active ? theme.foreground : theme.border,
                            backgroundColor: active ? theme.primary : theme.secondary,
                          }, pressed && { opacity: 0.7 }]}
                        >
                          <ThemedText type="label" style={{ color: active ? theme.primaryForeground : theme.foreground }}>
                            +{amt.toLocaleString()}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <Button
                  onPress={handlePurchase} loading={purchaseQ.isPending} variant="default"
                  leftIcon={<Plus size={16} color={theme.primaryForeground} />}
                  disabled={!pAmount || pAmount < MIN_PURCHASE_POINTS || currencyDetecting}
                >
                  {pAmount >= MIN_PURCHASE_POINTS ? `${t('buyFor')} ${formatCurrency(pFiatTotal, selectedCurrency)}` : t('buyPoints')}
                </Button>
              </CardContent>
            </Card>
          </Animated.View>

          {/* Withdraw */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <Card variant="glass">
              <CardHeader>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[3] }}>
                  <View style={{ width: 36, height: 36, borderRadius: RADIUS.lg, backgroundColor: theme.secondary, alignItems: 'center', justifyContent: 'center' }}>
                    <Landmark size={ICON_SIZE.md} color={theme.foreground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <CardTitle>{t('withdrawToBank')}</CardTitle>
                    <CardDescription>{t('withdrawDesc')}</CardDescription>
                  </View>
                </View>
              </CardHeader>
              <CardContent style={{ gap: SPACING[4] }}>
                <Input
                  label={t('pointsToWithdraw')}
                  value={withdrawAmount}
                  onChangeText={(v) => { setWithdrawAmount(v.replace(/[^0-9]/g, '')); setWithdrawError(null); }}
                  placeholder={`${t('min')} ${minWithdrawalPoints} ${t('pts')}`}
                  keyboardType="numeric"
                  rightSlot={<Badge variant="outline">{t('balance')}: {balance.toLocaleString()}</Badge>}
                />

                {wAmount > 0 && wAmount < minWithdrawalPoints ? (
                  <ThemedText type="caption" style={{ color: theme.destructive }}>{t('min')} {minWithdrawalPoints} {t('points')}</ThemedText>
                ) : wAmount > balance ? (
                  <ThemedText type="caption" style={{ color: theme.destructive }}>{t('exceedsBalance')} ({balance.toLocaleString()})</ThemedText>
                ) : null}

                {wAmount > 0 ? (
                  <View style={{ padding: SPACING[3], borderRadius: RADIUS.lg, backgroundColor: theme.secondary, gap: SPACING[2] }}>
                    <Row label={t('nominalValue')} value={`${formatCurrency(wNominalRaw / ngnRate, 'USD')} · ${formatCurrency(wNominalRaw, WITHDRAWAL_CURRENCY)}`} />
                    <Row label={`${t('spread')} (${Math.round(withdrawalSpread * 100)}%)`} value={`- ${formatCurrency(wNominalRaw - wReceive, WITHDRAWAL_CURRENCY)}`} dim />
                    <Separator />
                    <Row label={t('youReceive')} value={formatCurrency(wReceive, WITHDRAWAL_CURRENCY)} strong accent="emerald" />
                  </View>
                ) : null}

                <SelectField
                  label={t('selectBank')} placeholder={banksQ.isLoading ? t('loadingBanks') : t('tapToPickBank')}
                  value={withdrawBankCode}
                  onChange={(v) => { setWithdrawBankCode(v as string); setResolvedName(null); setWithdrawError(null); }}
                  options={(banksQ.data ?? []).map((b: any) => ({ label: b.name, value: b.code }))}
                  searchable
                />

                <Input
                  label={t('accountNumber')} value={withdrawAccount}
                  onChangeText={(v) => { setWithdrawAccount(v.replace(/[^0-9]/g, '').slice(0, 10)); setResolvedName(null); setWithdrawError(null); }}
                  placeholder="0123456789" keyboardType="numeric"
                  rightSlot={resolveQ.isPending ? <Loader2 size={14} color={theme.mutedForeground} /> : resolvedName ? <CheckCircle2 size={16} color={getAccent('green').main} /> : null}
                />

                {resolvedName ? (
                  <View style={{ padding: SPACING[3], borderRadius: RADIUS.lg, backgroundColor: getAccent('green').bg, borderWidth: 1, borderColor: getAccent('green').border, gap: 2 }}>
                    <ThemedText type="overline" style={{ color: getAccent('green').main }}>{t('accountVerified')}</ThemedText>
                    <ThemedText type="cardTitle">{resolvedName}</ThemedText>
                  </View>
                ) : null}

                {withdrawError ? <ThemedText type="caption" style={{ color: theme.destructive }}>{withdrawError}</ThemedText> : null}

                <Button
                  onPress={handleWithdraw} loading={withdrawQ.isPending}
                  leftIcon={<ArrowDownRight size={16} color={theme.primaryForeground} />}
                  disabled={!wAmount || wAmount < minWithdrawalPoints || wAmount > balance || !withdrawBankCode || !resolvedName}
                  variant="default"
                >
                  {t('withdrawToBank')}
                </Button>
              </CardContent>
            </Card>
          </Animated.View>

          {/* Transactions History */}
          <Animated.View entering={FadeInDown.duration(400).delay(250)}>
            <View style={{ gap: SPACING[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING[1] }}>
                <ThemedText type="sectionTitle">{t('history')}</ThemedText>
                <Pressable hitSlop={10} onPress={refresh} style={{ padding: SPACING[2] }}>
                  <RefreshCw size={16} color={theme.mutedForeground} />
                </Pressable>
              </View>

              <Tabs<SubTab>
                variant="pills" value={tab} onChange={setTab}
                items={[
                  { value: 'all', label: t('all'), badge: transactions.length || undefined },
                  { value: 'purchase', label: t('purchases') },
                  { value: 'withdraw', label: t('withdrawals') },
                  { value: 'exchange', label: t('exchanges') },
                ]}
              />

              <View style={{ gap: SPACING[2.5] }}>
                {loading ? (
                  <View style={{ gap: SPACING[3] }}><SkeletonText lines={4} /><SkeletonText lines={4} /></View>
                ) : filteredTransactions.length === 0 ? (
                  <Card>
                    <CardContent style={{ paddingVertical: SPACING[8], alignItems: 'center', gap: SPACING[3] }}>
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.secondary, alignItems: 'center', justifyContent: 'center' }}>
                        <Banknote size={ICON_SIZE.xl} color={theme.mutedForeground} />
                      </View>
                      <ThemedText type="cardTitle" style={{ textAlign: 'center' }}>{t('noTransactions')}</ThemedText>
                      <ThemedText type="caption" muted style={{ textAlign: 'center' }}>{t('noTransactionsDesc')}</ThemedText>
                    </CardContent>
                  </Card>
                ) : (
                  filteredTransactions.map((tx, i) => (
                    <Animated.View key={tx.id} entering={FadeInDown.duration(250).delay(i * 30)}>
                      <TxRow tx={tx} />
                    </Animated.View>
                  ))
                )}
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </View>

      <AlertDialog
        open={confirmWithdraw} onOpenChange={setConfirmWithdraw}
        title={`${t('withdraw')} ${wAmount.toLocaleString()} ${t('points')}?`}
        description={t('confirmWithdrawDesc', { receive: formatCurrency(wReceive, WITHDRAWAL_CURRENCY), account: resolvedName ?? t('yourAccount'), spread: (withdrawalSpread * 100).toFixed(0) })}
        confirmLabel={t('confirmWithdrawal')} onConfirm={submitWithdraw}
      />
    </View>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function BalanceCard({ balance, loading, ngnRate }: { balance: number; loading: boolean; ngnRate: number }) {
  const theme = useTheme();
  const t = useT('points');
  const usd = balance * POINT_TO_USD_RATE;
  const ngn = usd * ngnRate;

  return (
    <Card style={{ padding: SPACING[5] }}>
      <View style={{ gap: SPACING[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
          <View style={{ width: 36, height: 36, borderRadius: RADIUS.lg, backgroundColor: theme.secondary, alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={ICON_SIZE.md} color={theme.foreground} />
          </View>
          <ThemedText type="overline" muted>{t('availableBalance')}</ThemedText>
        </View>

        {loading ? (
          <View style={{ gap: SPACING[2], paddingVertical: SPACING[2] }}>
            <Skeleton width={200} height={36} rounded />
            <Skeleton width={120} height={14} rounded />
          </View>
        ) : (
          <View style={{ gap: SPACING[2] }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SPACING[2] }}>
              <ThemedText type="display" style={{ fontSize: 36 }}>{balance.toLocaleString()}</ThemedText>
              <ThemedText type="label" muted>{t('points')}</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] }}>
              <Badge variant="secondary">≈ {formatCurrency(usd, 'USD')}</Badge>
              <Badge variant="outline">≈ {formatCurrency(ngn, WITHDRAWAL_CURRENCY)}</Badge>
            </View>
          </View>
        )}
      </View>
    </Card>
  );
}

function InfoStat({ loading, label, value, hint, Icon, accent }: {
  loading: boolean; label: string; value: string; hint: string; Icon: any; accent: string;
}) {
  const theme = useTheme();
  const palette = getAccent(accent);
  return (
    <Card style={{ flex: 1, padding: SPACING[4] }}>
      <View style={{ gap: SPACING[2] }}>
        <View style={{ width: 28, height: 28, borderRadius: RADIUS.md, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={palette.main} />
        </View>
        {loading ? <SkeletonText lines={2} /> : (
          <>
            <ThemedText type="caption" muted>{label}</ThemedText>
            <ThemedText type="sectionTitle">{value}</ThemedText>
            <ThemedText type="caption" muted style={{ fontSize: 10 }}>{hint}</ThemedText>
          </>
        )}
      </View>
    </Card>
  );
}

function TxRow({ tx }: { tx: any }) {
  const theme = useTheme();
  const t = useT('points');

  const meta = getTransactionMeta(tx.type);
  const isPositive = tx.amount > 0;
  const palette = getAccent(meta.color);
  const Icon = iconForType(tx.type, isPositive);

  return (
    <PressableCard style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[3], padding: SPACING[3] }}>
      <View style={{ width: 36, height: 36, borderRadius: RADIUS.lg, backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={14} color={palette.main} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="label" style={{ fontSize: FONT_SIZE.md }}>{labelForTx(tx.type, tx.description, t)}</ThemedText>
        <ThemedText type="caption" muted>
          {formatDateShort(tx.createdAt)}{tx.status ? ` · ${formatTxStatus(tx.status, t)}` : ''}
        </ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <ThemedText type="label" style={{ color: isPositive ? getAccent('green').main : getAccent('red').main, fontWeight: '600' }}>
          {isPositive ? '+' : ''}{tx.amount} {t('pts')}
        </ThemedText>
        {tx.fiatAmount && tx.fiatCurrency ? (
          <ThemedText type="caption" muted style={{ fontSize: 10 }}>{formatCurrency(tx.fiatAmount, tx.fiatCurrency)}</ThemedText>
        ) : null}
      </View>
    </PressableCard>
  );
}

function iconForType(type: string, isPositive: boolean): any {
  switch (type) {
    case TransactionType.PURCHASE: return Plus;
    case TransactionType.WITHDRAWAL: return ArrowDownRight;
    case TransactionType.ESCROW_LOCK: return Lock;
    case TransactionType.ESCROW_RELEASE: return Unlock;
    case TransactionType.EXCHANGE_COMMISSION: return Zap;
    case TransactionType.FACILITATION_FEE: return Banknote;
    case TransactionType.PENALTY: return Zap;
    case TransactionType.RECORDING_FEE: return Zap;
    case TransactionType.REFERRAL_REWARD:
    case TransactionType.REFERRAL_BONUS: return Gift;
    default: return isPositive ? ArrowDownLeft : ArrowUpRight;
  }
}

function labelForTx(type: string, desc: string | null, t: any): string {
  if (desc) return desc;
  const lookup: Record<string, string> = {
    [TransactionType.PURCHASE]: t('txPointsPurchase'),
    [TransactionType.WITHDRAWAL]: t('txBankWithdrawal'),
    [TransactionType.ESCROW_LOCK]: t('txEscrowHeld'),
    [TransactionType.ESCROW_RELEASE]: t('txEscrowReleased'),
    [TransactionType.EXCHANGE_COMMISSION]: t('txPlatformCommission'),
    [TransactionType.FACILITATION_FEE]: t('txFacilitationFee'),
    [TransactionType.PENALTY]: t('txPenalty'),
    [TransactionType.RECORDING_FEE]: t('txSessionRecording'),
    [TransactionType.REFERRAL_REWARD]: t('txReferralReward'),
    [TransactionType.REFERRAL_BONUS]: t('txReferralBonus'),
    [TransactionType.CONVERSION]: t('txCurrencyConversion'),
  };
  return lookup[type] ?? type.replace(/_/g, ' ');
}

function formatTxStatus(status: string | undefined | null, t: any): string {
  if (!status) return '';
  const s = status.toUpperCase();
  if (s === 'PENDING') return t('statusPending');
  if (s === 'SUCCESS' || s === 'COMPLETED') return t('statusSuccess');
  if (s === 'FAILED') return t('statusFailed');
  return status;
}

function Row({ label, value, dim, strong, accent }: any) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <ThemedText type="caption" style={{ color: dim ? theme.mutedForeground : theme.foreground }}>{label}</ThemedText>
      <ThemedText type={strong ? 'label' : 'caption'} style={{ color: accent ? getAccent(accent).main : theme.foreground, fontWeight: strong ? '600' : '400' }}>
        {value}
      </ThemedText>
    </View>
  );
}
