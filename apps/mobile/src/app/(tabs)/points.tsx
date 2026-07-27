import React from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useTheme } from '@/hooks/use-theme';
import { FONT_SIZE, RADIUS, SPACING, getAccent, MAX_CONTENT_WIDTH } from '@/constants/theme';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Separator,
  Tabs,
  SkeletonText,
  useToast,
  AlertDialog,
  SelectField,
  Skeleton,
} from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  usePointsBalance,
  usePointsTransactions,
  useBanks,
  useFeeConfig,
  useRates,
  usePurchasePoints,
  useWithdrawPoints,
  useResolveAccount,
} from '@/lib/api-hooks';
import {
  POINT_TO_USD_RATE,
  DEFAULT_WITHDRAWAL_SPREAD,
  MIN_PURCHASE_POINTS,
  MIN_WITHDRAWAL_POINTS,
  getCurrencyDecimals,
  applyCurrencyPrecision,
  calculatePointsBreakdown,
  getTransactionMeta,
  formatDateShort,
  formatDateTimeShort,
  TransactionType,
} from '@skil-ex2/shared';
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Coins,
  Landmark,
  Lock,
  Plus,
  Unlock,
  Wallet,
  Zap,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Search,
  ChevronDown,
  Gift,
  ShieldCheck,
} from 'lucide-react-native';

type SubTab = 'all' | 'purchase' | 'withdraw' | 'exchange';

const QUICK_BUY = [500, 1000, 5000, 10000];
const WITHDRAWAL_CURRENCY = 'NGN';

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: getCurrencyDecimals(currency),
      minimumFractionDigits: getCurrencyDecimals(currency),
    }).format(amount);
  } catch {
    return `${amount.toFixed(getCurrencyDecimals(currency))} ${currency}`;
  }
}

/* ---------- Screen ---------- */

export default function PointsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

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

  // Purchase
  const [purchaseAmount, setPurchaseAmount] = React.useState('');
  const [purchaseError, setPurchaseError] = React.useState<string | null>(null);

  // Withdraw
  const [withdrawAmount, setWithdrawAmount] = React.useState('');
  const [withdrawBankCode, setWithdrawBankCode] = React.useState('');
  const [withdrawAccount, setWithdrawAccount] = React.useState('');
  const [withdrawError, setWithdrawError] = React.useState<string | null>(null);
  const [resolvedName, setResolvedName] = React.useState<string | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = React.useState(false);

  // Rates & Currency
  const [selectedCurrency, setSelectedCurrency] = React.useState("USD");
  const [currencyDetecting, setCurrencyDetecting] = React.useState(true);
  const resolveDebounceRef = React.useRef<any>(null);

    // Auto-detect IP Currency
    React.useEffect(() => {
      const detectCurrency = async () => {
        try {
          const res = await fetch("https://ipapi.co/currency/");
          if (res.ok) {
            const currency = await res.text();
            if (currency && currency.trim().length === 3) {
              setSelectedCurrency(currency.trim().toUpperCase());
            }
          }
        } catch (e) {
          console.error("Currency detection failed, defaulting to USD.");
        } finally {
          setCurrencyDetecting(false);
        }
      };
      detectCurrency();
    }, []);
  

  const balance = (balanceQ.data as any) ?? 0;
  const transactions = (txQ.data ?? []) as any[];
  const feeConfig = feeQ.data as any;
  const rates = (ratesQ.data ?? {}) as Record<string, number>;
  const rate = rates ? rates[selectedCurrency] || 1 : 1;
  const ngnRate = rates ? rates["NGN"] || 1500 : 1500;
  const minWithdrawalPoints = feeConfig?.minWithdrawalPoints ?? MIN_WITHDRAWAL_POINTS;
  const withdrawalSpread = feeConfig?.withdrawalSpread ?? DEFAULT_WITHDRAWAL_SPREAD;

  /* -------- Derived: purchase -------- */
  const pAmount = parseInt(purchaseAmount) || 0;
  const baseFiatRaw = pAmount * POINT_TO_USD_RATE * rate;
  const pFiatTotal = React.useMemo(() => {
    if (!pAmount) return 0;
    return applyCurrencyPrecision(baseFiatRaw, selectedCurrency, rate);
  }, [pAmount, rate, selectedCurrency]);

  /* -------- Derived: withdraw -------- */
  const wAmount = parseInt(withdrawAmount) || 0;
  const wNominalRaw = React.useMemo(
    () => (wAmount ? wAmount * POINT_TO_USD_RATE * ngnRate : 0),
    [wAmount, ngnRate],
  );
  const wReceive = React.useMemo(
    () => (wNominalRaw ? applyCurrencyPrecision(wNominalRaw * (1 - withdrawalSpread), WITHDRAWAL_CURRENCY, ngnRate) : 0),
    [wNominalRaw, withdrawalSpread, ngnRate],
  );

  /* -------- refresh -------- */
  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        balanceQ.refetch(),
        txQ.refetch(),
        feeQ.refetch(),
        ratesQ.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  /* -------- Account resolve (debounced) -------- */
  React.useEffect(() => {
    if (withdrawAccount.length === 10 && withdrawBankCode) {
      setWithdrawError(null);
      setResolvedName(null);
      if (resolveDebounceRef.current) clearTimeout(resolveDebounceRef.current);
      resolveDebounceRef.current = setTimeout(async () => {
        try {
          const r = await resolveQ.mutateAsync({
            accountNumber: withdrawAccount,
            bankCode: withdrawBankCode,
          });
          if ((r as any)?.success) {
            setResolvedName((r as any).accountName);
          } else {
            setWithdrawError((r as any)?.message ?? 'Could not verify account');
          }
        } catch (e: any) {
          setWithdrawError(e?.message ?? 'Could not verify account');
        }
      }, 600);
    } else {
      setResolvedName(null);
    }
    return () => {
      if (resolveDebounceRef.current) clearTimeout(resolveDebounceRef.current);
    };
  }, [withdrawAccount, withdrawBankCode]);

  /* -------- Purchase: WebBrowser + polling -------- */
  const handlePurchase = async () => {
    if (!pAmount || pAmount < MIN_PURCHASE_POINTS) {
      setPurchaseError(`Minimum purchase is ${MIN_PURCHASE_POINTS} points`);
      return;
    }
    setPurchaseError(null);
    try {
      const redirectUrl =
        Platform.OS === 'web'
          ? `${window.location.origin}/points`
          : Linking.createURL('points');
      const res = await purchaseQ.mutateAsync({ amount: pAmount, currency: selectedCurrency, redirectUrl });
      const { paymentLink, txRef } = res as any;      

      if (paymentLink) {
        // Open Flutterwave hosted payment page
        if (Platform.OS === 'web') {
          window.location.href = paymentLink;
          return;
        }
        const browserResult = await WebBrowser.openAuthSessionAsync(paymentLink, redirectUrl, {
          showTitle: true,
          enableBarCollapsing: true,
        });

        if (browserResult.type !== 'success' || !browserResult.url) {
          toast.toast({title: 'Payment failed', description: browserResult.type, variant: 'error'})
          return;
        }

        const { queryParams } = Linking.parse(browserResult.url);
        const transactionId = queryParams?.transaction_id as string | undefined;
        if (!transactionId) {
          toast.toast({title: 'Payment failed', description: 'Cancelled', variant: 'info'})
          return;
        }

        setPurchaseAmount('');

        // Webhook validation takes a moment. Keep the spinner active
        // and fetch the updated balance after 3 seconds.
        setTimeout(() => {
          Promise.all([balanceQ.refetch(), txQ.refetch()]).finally(() => {
          });
        }, 3000);
      } else {
        toast.toast({ title: 'Payment initiated', variant: 'info' });
      }
    } catch (e: any) {
      setPurchaseError(e?.message ?? 'Purchase failed');
    }
  };

  /* -------- Withdraw -------- */
  const handleWithdraw = async () => {
    if (!wAmount || wAmount < minWithdrawalPoints) {
      setWithdrawError(`Minimum withdrawal is ${minWithdrawalPoints} points`);
      return;
    }
    if (!withdrawBankCode || !withdrawAccount) {
      setWithdrawError('Please select bank and enter account number');
      return;
    }
    if (balance < wAmount) {
      setWithdrawError('Insufficient balance');
      return;
    }
    if (!resolvedName) {
      setWithdrawError('Please wait for account verification');
      return;
    }
    setConfirmWithdraw(true);
  };

  const submitWithdraw = async () => {
    setWithdrawError(null);
    try {
      await withdrawQ.mutateAsync({
        amount: wAmount,
        bankCode: withdrawBankCode,
        accountNumber: withdrawAccount,
      });
      toast.toast({
        title: 'Withdrawal request sent',
        description: 'Funds are typically paid within 24 hours.',
        variant: 'success',
      });
      setWithdrawAmount('');
      setWithdrawAccount('');
      setWithdrawBankCode('');
      setResolvedName(null);
      await Promise.all([balanceQ.refetch(), txQ.refetch()]);
    } catch (e: any) {
      setWithdrawError(e?.message ?? 'Withdrawal failed');
    }
  };

  const loading = balanceQ.isLoading || txQ.isLoading;

  /* -------- Filter transactions -------- */
  const filteredTransactions = React.useMemo(() => {
    if (tab === 'all') return transactions;
    const byType: Record<SubTab, string[]> = {
      purchase: [TransactionType.PURCHASE],
      withdraw: [TransactionType.WITHDRAWAL],
      exchange: [
        TransactionType.ESCROW_LOCK,
        TransactionType.ESCROW_RELEASE,
        TransactionType.EXCHANGE_COMMISSION,
        TransactionType.FACILITATION_FEE,
        TransactionType.PENALTY,
        TransactionType.RECORDING_FEE,
      ],
      all: [],
    };
    return transactions.filter((t) => byType[tab].includes(t.type));
  }, [transactions, tab]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ThemedView type="background" style={{ flex: 1, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: MAX_CONTENT_WIDTH, flex: 1 }}>
          {/* Header */}
          <View
            style={{
              paddingHorizontal: SPACING[5],
              paddingTop: SPACING[2],
              paddingBottom: SPACING[4],
              gap: SPACING[3],
            }}
          >
            <ThemedText type="title" style={{ fontSize: FONT_SIZE['2xl'], fontWeight: '800', letterSpacing: -0.2 }}>
              Points wallet
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}>
              Buy, withdraw, and track your skill-economy credits
            </ThemedText>
          </View>

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: SPACING[5],
              paddingBottom: insets.bottom + SPACING[10],
              gap: SPACING[4],
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
          >
            {/* Balance + 2 action cards */}
            <View style={{ gap: SPACING[4] }}>
              <BalanceCard balance={balance} loading={loading} ngnRate={ngnRate} />

              <View style={{ flexDirection: 'row', gap: SPACING[3] }}>
                <InfoStat
                  loading={loading}
                  label="Commission"
                  value="10%"
                  hint="Per exchange"
                  Icon={Zap}
                  accent="indigo"
                />
                <InfoStat
                  loading={loading}
                  label="Withdraw spread"
                  value={`${Math.round(withdrawalSpread * 100)}%`}
                  hint={`Min ${minWithdrawalPoints} pts`}
                  Icon={ShieldCheck}
                  accent="blue"
                />
              </View>
            </View>

            {/* Purchase */}
            <Card>
              <CardHeader>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: RADIUS.md,
                      backgroundColor: getAccent('indigo').bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={18} color={getAccent('indigo').main} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <CardTitle>Buy points</CardTitle>
                    <CardDescription>Pay with card, bank transfer, or mobile money</CardDescription>
                  </View>
                </View>
              </CardHeader>
              <CardContent style={{ gap: SPACING[4] }}>
                <Input
                  label="Points amount"
                  value={purchaseAmount}
                  onChangeText={(v) => {
                    setPurchaseAmount(v.replace(/[^0-9]/g, ''));
                    setPurchaseError(null);
                  }}
                  placeholder={`Min ${MIN_PURCHASE_POINTS}`}
                  keyboardType="numeric"
                  rightSlot={
                    <Badge variant="accent" accent="amber">
                      <Coins size={12} color={getAccent('amber').main} />
                    </Badge>
                  }
                />

                {pAmount > 0 && pAmount < MIN_PURCHASE_POINTS ? (
                  <ThemedText type="small" style={{ color: theme.destructive, fontSize: 11 }}>
                    Minimum purchase is {MIN_PURCHASE_POINTS} points
                  </ThemedText>
                ) : null}

                {pAmount >= MIN_PURCHASE_POINTS ? (
                  <View
                    style={{
                      padding: SPACING[3],
                      borderRadius: RADIUS.md,
                      backgroundColor: theme.backgroundElement,
                      borderWidth: 1,
                      borderColor: theme.border,
                      gap: SPACING[2],
                    }}
                  >
                    <Row label="Rate" value={`1 pt = ${formatCurrency(POINT_TO_USD_RATE * rate, selectedCurrency)}`} />
                    <Row label="Subtotal" value={`${pAmount.toLocaleString()} pts`} />
                    <Separator />
                    <Row
                      label="You pay"
                      value={formatCurrency(pFiatTotal, selectedCurrency)}
                      strong
                      accent="indigo"
                    />
                  </View>
                ) : null}

                <View style={{ gap: SPACING[2] }}>
                  <Label label="Quick amounts" />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] }}>
                    {QUICK_BUY.map((amt) => {
                      const active = purchaseAmount === String(amt);
                      return (
                        <Badge
                          key={amt}
                          variant={active ? 'default' : 'outline'}
                          style={{ paddingHorizontal: SPACING[3], paddingVertical: SPACING[1.5] }}
                        >
                          <Pressable
                            hitSlop={6}
                            onPress={() => {
                              setPurchaseAmount(String(amt));
                              setPurchaseError(null);
                            }}
                          >
                            <ThemedText type="smallBold" style={{ fontSize: 12 }}>
                              {amt.toLocaleString()}
                            </ThemedText>
                          </Pressable>
                        </Badge>
                      );
                    })}
                  </View>
                </View>

                <Button
                  onPress={handlePurchase}
                  loading={purchaseQ.isPending}
                  leftIcon={<Plus size={16} color="#fff" />}
                  disabled={!pAmount || pAmount < MIN_PURCHASE_POINTS||
                  currencyDetecting}
                >
                  {pAmount >= MIN_PURCHASE_POINTS
                      ? `Buy for ${formatCurrency(pFiatTotal, selectedCurrency)}`
                      : 'Buy points'}
                </Button>

                {purchaseError ? (
                  <ThemedText type="small" style={{ color: theme.destructive, fontSize: 12 }}>
                    {purchaseError}
                  </ThemedText>
                ) : null}
              </CardContent>
            </Card>

            {/* Withdraw */}
            <Card>
              <CardHeader>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: RADIUS.md,
                      backgroundColor: getAccent('emerald').bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Landmark size={18} color={getAccent('emerald').main} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <CardTitle>Withdraw to bank</CardTitle>
                    <CardDescription>Convert points to local currency</CardDescription>
                  </View>
                </View>
              </CardHeader>
              <CardContent style={{ gap: SPACING[4] }}>
                <Input
                  label="Points to withdraw"
                  value={withdrawAmount}
                  onChangeText={(v) => {
                    setWithdrawAmount(v.replace(/[^0-9]/g, ''));
                    setWithdrawError(null);
                  }}
                  placeholder={`Min ${minWithdrawalPoints} pts`}
                  keyboardType="numeric"
                  rightSlot={
                    <Badge variant="outline">Bal: {balance.toLocaleString()}</Badge>
                  }
                />

                {wAmount > 0 && wAmount < minWithdrawalPoints ? (
                  <ThemedText type="small" style={{ color: theme.destructive, fontSize: 11 }}>
                    Minimum is {minWithdrawalPoints} points
                  </ThemedText>
                ) : wAmount > balance ? (
                  <ThemedText type="small" style={{ color: theme.destructive, fontSize: 11 }}>
                    Exceeds your balance ({balance.toLocaleString()})
                  </ThemedText>
                ) : null}

                {wAmount > 0 ? (
                  <View
                    style={{
                      padding: SPACING[3],
                      borderRadius: RADIUS.md,
                      backgroundColor: theme.backgroundElement,
                      borderWidth: 1,
                      borderColor: theme.border,
                      gap: SPACING[2],
                    }}
                  >
                    <Row label="Nominal value" value={`${formatCurrency(wNominalRaw / ngnRate, 'USD')} · ${formatCurrency(wNominalRaw, WITHDRAWAL_CURRENCY)}`} />
                    <Row label={`Spread (${Math.round(withdrawalSpread * 100)}%)`} value={`- ${formatCurrency(wNominalRaw - wReceive, WITHDRAWAL_CURRENCY)}`} dim />
                    <Separator />
                    <Row
                      label="You receive"
                      value={formatCurrency(wReceive, WITHDRAWAL_CURRENCY)}
                      strong
                      accent="emerald"
                    />
                  </View>
                ) : null}

                <SelectField
                  label="Select bank"
                  placeholder="Tap to pick your bank"
                  value={withdrawBankCode}
                  onChange={(v) => {
                    setWithdrawBankCode(v as string);
                    setResolvedName(null);
                    setWithdrawError(null);
                  }}
                  options={(banksQ.data ?? []).map((b: any) => ({ label: b.name, value: b.code }))}
                  emptyLabel="Loading banks…"
                />

                <Input
                  label="Account number (10 digits)"
                  value={withdrawAccount}
                  onChangeText={(v) => {
                    setWithdrawAccount(v.replace(/[^0-9]/g, '').slice(0, 10));
                    setResolvedName(null);
                    setWithdrawError(null);
                  }}
                  placeholder="0123456789"
                  keyboardType="numeric"
                  rightSlot={
                    resolveQ.isPending ? (
                      <Loader2 size={14} color={theme.primary} />
                    ) : resolvedName ? (
                      <CheckCircle2 size={16} color={getAccent('emerald').main} />
                    ) : null
                  }
                />

                {resolvedName ? (
                  <View
                    style={{
                      padding: SPACING[3],
                      borderRadius: RADIUS.md,
                      backgroundColor: getAccent('emerald').bg,
                      borderWidth: 1,
                      borderColor: getAccent('emerald').border,
                      gap: 2,
                    }}
                  >
                    <ThemedText type="small" style={{ fontSize: 11, color: getAccent('emerald').main, textTransform: 'uppercase' as const }}>
                      Account verified
                    </ThemedText>
                    <ThemedText type="default" style={{ fontWeight: '700' }}>
                      {resolvedName}
                    </ThemedText>
                  </View>
                ) : null}

                {withdrawError ? (
                  <ThemedText type="small" style={{ color: theme.destructive, fontSize: 12 }}>
                    {withdrawError}
                  </ThemedText>
                ) : null}

                <Button
                  onPress={handleWithdraw}
                  loading={withdrawQ.isPending}
                  leftIcon={<ArrowDownRight size={16} color="#fff" />}
                  disabled={!wAmount || wAmount < minWithdrawalPoints || wAmount > balance || !withdrawBankCode || !resolvedName}
                  variant="default"
                >
                  Withdraw to bank
                </Button>
              </CardContent>
            </Card>

            {/* Transactions */}
            <View style={{ gap: SPACING[3] }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: SPACING[1],
                }}
              >
                <ThemedText type="title" style={{ fontSize: FONT_SIZE.lg, fontWeight: '800' }}>
                  History
                </ThemedText>
                <Pressable hitSlop={10} onPress={refresh} style={{ padding: SPACING[2] }}>
                  <RefreshCw size={16} color={theme.mutedForeground} />
                </Pressable>
              </View>

              <Tabs<SubTab>
                variant="pills"
                value={tab}
                onChange={setTab}
                items={[
                  { value: 'all', label: 'All', badge: transactions.length || undefined },
                  { value: 'purchase', label: 'Purchases' },
                  { value: 'withdraw', label: 'Withdrawals' },
                  { value: 'exchange', label: 'Exchanges' },
                ]}
              />

              <View>
                {loading ? (
                  <View style={{ gap: SPACING[3] }}>
                    <SkeletonText lines={4} />
                    <SkeletonText lines={4} />
                    <SkeletonText lines={4} />
                  </View>
                ) : filteredTransactions.length === 0 ? (
                  <Card>
                    <CardContent style={{ paddingVertical: SPACING[8], alignItems: 'center', gap: SPACING[3] }}>
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: RADIUS.pill,
                          backgroundColor: getAccent('zinc').bg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Banknote size={22} color={theme.mutedForeground} />
                      </View>
                      <ThemedText type="default" style={{ fontWeight: '700', textAlign: 'center' }}>
                        No transactions yet
                      </ThemedText>
                      <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: 'center' }}>
                        Buy some points, or complete an exchange to see activity here.
                      </ThemedText>
                    </CardContent>
                  </Card>
                ) : (
                  filteredTransactions.map((tx) => <TxRow key={tx.id} tx={tx} />)
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </ThemedView>

      <AlertDialog
        open={confirmWithdraw}
        onOpenChange={setConfirmWithdraw}
        title={`Withdraw ${wAmount.toLocaleString()} points?`}
        description={`You will receive ~${formatCurrency(wReceive, WITHDRAWAL_CURRENCY)} in ${resolvedName ?? 'your account'} (${(withdrawalSpread * 100).toFixed(0)}% spread applied).`}
        confirmLabel="Confirm withdrawal"
        onConfirm={submitWithdraw}
      />
    </SafeAreaView>
  );
}

/* -------- Balance Card -------- */

function BalanceCard({ balance, loading, ngnRate }: { balance: number; loading: boolean; ngnRate: number }) {
  const theme = useTheme();
  const usd = balance * POINT_TO_USD_RATE;
  const ngn = usd * ngnRate;
  return (
    <Card
      style={{
        borderColor: getAccent('amber').border,
        backgroundColor: '#13100a',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Amber glow */}
      <View
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
        }}
        pointerEvents="none"
      />
      <CardContent style={{ gap: SPACING[3], paddingTop: SPACING[6], paddingBottom: SPACING[6], position: 'relative', zIndex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: RADIUS.md,
              backgroundColor: 'rgba(245,158,11,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(245,158,11,0.3)',
            }}
          >
            <Wallet size={20} color="#f59e0b" />
          </View>
          <View>
            <ThemedText type="small" style={{ fontSize: 11, color: '#d4a260', textTransform: 'uppercase' as const, fontWeight: '700' }}>
              Available balance
            </ThemedText>
          </View>
        </View>

        {loading ? (
          <View style={{ gap: SPACING[2], paddingVertical: SPACING[2] }}>
            <Skeleton width={240} height={46} />
            <Skeleton width={140} height={16} />
          </View>
        ) : (
          <View style={{ gap: SPACING[2] }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SPACING[2] }}>
              <ThemedText type="title" style={{ fontSize: 48, fontWeight: '900', color: '#f59e0b', letterSpacing: -1 }}>
                {balance.toLocaleString()}
              </ThemedText>
              <ThemedText type="default" style={{ fontSize: FONT_SIZE.lg, color: '#d4a260', fontWeight: '700' }}>
                pts
              </ThemedText>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[3] }}>
              <Badge variant="accent" accent="blue">
                ≈ {formatCurrency(usd, 'USD')}
              </Badge>
              <Badge variant="outline">
                ≈ {formatCurrency(ngn, WITHDRAWAL_CURRENCY)}
              </Badge>
            </View>
          </View>
        )}
      </CardContent>
    </Card>
  );
}

/* -------- Info stat -------- */

function InfoStat({
  loading,
  label,
  value,
  hint,
  Icon,
  accent,
}: {
  loading: boolean;
  label: string;
  value: string;
  hint: string;
  Icon: any;
  accent: string;
}) {
  const theme = useTheme();
  const palette = getAccent(accent);
  return (
    <Card style={{ flex: 1 }}>
      <CardContent style={{ gap: SPACING[2], paddingVertical: SPACING[4] }}>
        <View style={{ width: 30, height: 30, borderRadius: RADIUS.sm, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={palette.main} />
        </View>
        {loading ? (
          <SkeletonText lines={2} />
        ) : (
          <>
            <ThemedText type="small" style={{ fontSize: 11, color: theme.mutedForeground }}>
              {label}
            </ThemedText>
            <ThemedText type="title" style={{ fontSize: FONT_SIZE.lg, fontWeight: '800' }}>
              {value}
            </ThemedText>
            <ThemedText type="small" style={{ fontSize: 10, color: theme.mutedForeground }}>
              {hint}
            </ThemedText>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* -------- Transaction row -------- */

function TxRow({ tx }: { tx: any }) {
  const theme = useTheme();
  const meta = getTransactionMeta(tx.type);
  const isPositive = tx.amount > 0;
  const accent = meta.color;
  const palette = getAccent(accent);
  const Icon = iconForType(tx.type, isPositive);

  return (
    <Pressable
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING[3],
        padding: SPACING[3],
        borderRadius: RADIUS.md,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: RADIUS.pill,
          backgroundColor: palette.bg,
          borderWidth: 1,
          borderColor: palette.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={16} color={palette.main} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
          {labelForTx(tx.type, tx.description)}
        </ThemedText>
        <ThemedText type="small" style={{ fontSize: 11, color: theme.mutedForeground }}>
          {formatDateShort(tx.createdAt)}
          {tx.status ? ` · ${tx.status}` : ''}
        </ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <ThemedText
          type="default"
          style={{
            fontWeight: '800',
            color: isPositive ? getAccent('green').main : getAccent('red').main,
            fontSize: FONT_SIZE.md,
          }}
        >
          {isPositive ? '+' : ''}
          {tx.amount} pts
        </ThemedText>
        {tx.fiatAmount && tx.fiatCurrency ? (
          <ThemedText type="small" style={{ fontSize: 10, color: theme.mutedForeground }}>
            {formatCurrency(tx.fiatAmount, tx.fiatCurrency)}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

function iconForType(type: string, isPositive: boolean): any {
  switch (type) {
    case TransactionType.PURCHASE:
      return Plus;
    case TransactionType.WITHDRAWAL:
      return ArrowDownRight;
    case TransactionType.ESCROW_LOCK:
      return Lock;
    case TransactionType.ESCROW_RELEASE:
      return Unlock;
    case TransactionType.EXCHANGE_COMMISSION:
      return Zap;
    case TransactionType.FACILITATION_FEE:
      return Banknote;
    case TransactionType.PENALTY:
      return Zap;
    case TransactionType.RECORDING_FEE:
      return Zap;
    case TransactionType.REFERRAL_REWARD:
    case TransactionType.REFERRAL_BONUS:
      return Gift;
    default:
      return isPositive ? ArrowDownLeft : ArrowUpRight;
  }
}

function labelForTx(type: string, desc: string | null): string {
  if (desc) return desc;
  const lookup: Record<string, string> = {
    [TransactionType.PURCHASE]: 'Points purchase',
    [TransactionType.WITHDRAWAL]: 'Bank withdrawal',
    [TransactionType.ESCROW_LOCK]: 'Escrow held',
    [TransactionType.ESCROW_RELEASE]: 'Escrow released',
    [TransactionType.EXCHANGE_COMMISSION]: 'Platform commission',
    [TransactionType.FACILITATION_FEE]: 'Facilitation fee',
    [TransactionType.PENALTY]: 'Penalty',
    [TransactionType.RECORDING_FEE]: 'Session recording',
    [TransactionType.REFERRAL_REWARD]: 'Referral reward',
    [TransactionType.REFERRAL_BONUS]: 'Referral bonus',
    [TransactionType.CONVERSION]: 'Currency conversion',
  };
  return lookup[type] ?? type.replace(/_/g, ' ');
}

/* -------- helpers -------- */

function Row({ label, value, dim, strong, accent }: any) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <ThemedText type="small" style={{ color: dim ? theme.mutedForeground : theme.foreground, fontSize: FONT_SIZE.sm }}>
        {label}
      </ThemedText>
      <ThemedText
        type={strong ? 'default' : 'small'}
        style={{
          color: accent ? getAccent(accent).main : theme.foreground,
          fontSize: FONT_SIZE.sm,
          fontWeight: strong ? '800' : '500',
        }}
      >
        {value}
      </ThemedText>
    </View>
  );
}
