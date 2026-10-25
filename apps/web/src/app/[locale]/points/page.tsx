"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  applyCurrencyPrecision,
  DEFAULT_WITHDRAWAL_SPREAD,
  getCurrencyDecimals,
  MIN_PURCHASE_POINTS,
  MIN_WITHDRAWAL_POINTS,
  POINT_TO_USD_RATE,
} from "@skillex/shared";
import { closePaymentModal, useFlutterwave } from "flutterwave-react-v3";
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Coins,
  Landmark,
  Loader2,
  Lock,
  Plus,
  Unlock,
  Wallet,
  Zap,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AnalyticsEvent, track } from "@/lib/analytics";
import { useCallback, useEffect, useState } from "react";
import { ComingSoonGate } from "@/components/home/coming-soon-gate";

const isPrelaunch = process.env.NEXT_PUBLIC_PRELAUNCH_MODE === "true";

interface PointsTransaction {
  id: string;
  amount: number;
  type: string;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

interface Bank {
  id: number;
  code: string;
  name: string;
}

interface FeeConfig {
  exchangeCommissionRate: number;
  facilitationFee: number;
  withdrawalSpread: number;
  minWithdrawalPoints: number;
}

const typeConfig: Record<
  string,
  { label: string; color: string; icon: typeof Coins }
> = {
  PURCHASE: {
    label: "Purchase",
    color: "text-green-400",
    icon: Plus,
  },
  ESCROW_LOCK: {
    label: "Escrow Lock",
    color: "text-amber-400",
    icon: Lock,
  },
  ESCROW_RELEASE: {
    label: "Escrow Release",
    color: "text-blue-400",
    icon: Unlock,
  },
  EXCHANGE_COMMISSION: {
    label: "Platform Service",
    color: "text-violet-400",
    icon: Zap,
  },
  FACILITATION_FEE: {
    label: "Facilitation Fee",
    color: "text-orange-400",
    icon: Banknote,
  },
  PENALTY: {
    label: "Penalty",
    color: "text-red-400",
    icon: Zap,
  },
  WITHDRAWAL: {
    label: "Withdrawal",
    color: "text-pink-500",
    icon: ArrowDownRight,
  },
};

export default function PointsPage() {
  if (isPrelaunch) return <ComingSoonGate />;
  return <PointsContent />;
}

function PointsContent() {
  const router = useRouter();
  const format = useFormatter();
  const WITHDRAWAL_CURRENCY = "NGN";
  const t = useTranslations("points");
  const tCommon = useTranslations("common");
  const tRefs = useTranslations("referrals");
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null);

  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [resolvedAccountName, setResolvedAccountName] = useState<string | null>(
    null,
  );

  const [loadingData, setLoadingData] = useState(true);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [currencyDetecting, setCurrencyDetecting] = useState(true);

  // Auto-detect IP Currency
  useEffect(() => {
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

  const [paymentConfig, setPaymentConfig] = useState<{
    txRef: string;
    amount: number;
    currency: string;
    customer: { email: string; name: string; phone_number: string };
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [balRes, txRes, banksRes, feeRes, ratesRes] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/points/balance`,
          {
            credentials: "include",
          },
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/points/transactions`,
          {
            credentials: "include",
          },
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/points/banks`,
          {
            credentials: "include",
          },
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/points/fee-config`,
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/points/rates`,
        ),
      ]);

      if (balRes.ok) {
        const data = await balRes.json();
        setBalance(data.balance ?? data);
      }
      if (txRes.ok) {
        setTransactions(await txRes.json());
      }
      if (banksRes.ok) {
        setBanks(await banksRes.json());
      }
      if (feeRes.ok) {
        const config = await feeRes.json();
        setFeeConfig(config);
      }
      if (ratesRes.ok) {
        setRates(await ratesRes.json());
      }
    } catch {
      console.error(t("errorLoading"));
    } finally {
      setLoadingData(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (accountNumber.length === 10 && bankCode) {
      setResolvingAccount(true);
      setResolvedAccountName(null);
      setWithdrawError(null);

      const resolve = async () => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/points/resolve-account`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ accountNumber, bankCode }),
            },
          );
          const data = await res.json();
          if (data.success) {
            setResolvedAccountName(data.accountName);
          } else {
            setWithdrawError(data.message || t("resolveAccountFailed"));
          }
        } catch {
          setWithdrawError(t("resolveAccountError"));
        } finally {
          setResolvingAccount(false);
        }
      };

      const timeoutId = setTimeout(resolve, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setResolvedAccountName(null);
    }
  }, [accountNumber, bankCode, t]);

  // Purchase calculations — zero markup
  const pAmount = parseInt(purchaseAmount) || 0;
  const rate = rates ? rates[selectedCurrency] || 1 : 1;
  const baseFiatRaw = pAmount * POINT_TO_USD_RATE * rate;
  const pTotalFiat = applyCurrencyPrecision(
    baseFiatRaw,
    selectedCurrency,
    rate,
  );

  // Withdrawal calculations — structural spread
  const wAmount = parseInt(withdrawAmount) || 0;
  const ngnRate = rates ? rates["NGN"] || 1500 : 1500;
  const withdrawalSpread =
    feeConfig?.withdrawalSpread ?? DEFAULT_WITHDRAWAL_SPREAD;
  const wNominalRaw = wAmount * POINT_TO_USD_RATE * ngnRate;
  const wReceiveRaw = wNominalRaw * (1 - withdrawalSpread);
  const wReceive = applyCurrencyPrecision(
    wReceiveRaw,
    WITHDRAWAL_CURRENCY,
    ngnRate,
  );
  const minWithdrawalPoints =
    feeConfig?.minWithdrawalPoints ?? MIN_WITHDRAWAL_POINTS;

  // Detect if user is Nigerian for bank transfer priority
  const isNGN = selectedCurrency === "NGN";

  const handleFlutterPayment = useFlutterwave({
    public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || "",
    tx_ref: paymentConfig?.txRef || "",
    amount: paymentConfig?.amount || 0,
    currency: paymentConfig?.currency || "USD",
    payment_options: isNGN
      ? "banktransfer,card,mobilemoney,ussd"
      : "card,mobilemoney,ussd",
    customer: paymentConfig?.customer || {
      email: "user@example.com",
      name: "SkillEx User",
      phone_number: "0000000000",
    },
    customizations: {
      title: t("purchaseTitle"),
      description: t("purchaseDesc"),
      logo: "https://st2.depositphotos.com/4403291/7418/v/450/depositphotos_74189661-stock-illustration-online-shop-log.jpg",
    },
  });

  useEffect(() => {
    if (paymentConfig) {
      handleFlutterPayment({
        callback: () => {
          closePaymentModal();
          setPaymentConfig(null);
          setPurchaseAmount("");

          // Webhook validation takes a moment. Keep the spinner active
          // and fetch the updated balance after 3 seconds.
          setTimeout(() => {
            fetchData().finally(() => {
              setPurchasing(false);
            });
          }, 3000);
        },
        onClose: () => {
          setPaymentConfig((prev) => {
            if (prev !== null) {
              setPurchasing(false);
            }
            return null;
          });
        },
      });
    }
  }, [paymentConfig, fetchData, handleFlutterPayment]);

  const handlePurchase = async () => {
    if (!pAmount || pAmount < 1) return;

    setPurchasing(true);
    setPurchaseError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/points/purchase`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount: pAmount, currency: selectedCurrency }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("purchaseFailed"));
      }

      track(AnalyticsEvent.POINTS_PURCHASE_INITIATED, {
        points: pAmount,
        amount: data.fiatAmount,
        currency: data.fiatCurrency,
      });

      // Local development without Flutterwave keys: the API credits the
      // points immediately instead of opening a payment modal.
      if (data.mock) {
        setPurchaseAmount("");
        await fetchData();
        setPurchasing(false);
        alert("Test mode: points were added without a real payment.");
        return;
      }

      setPaymentConfig({
        txRef: data.txRef,
        amount: data.fiatAmount,
        currency: data.fiatCurrency,
        customer: data.customer,
      });
    } catch (e) {
      setPurchaseError(
        e instanceof Error ? e.message : t("somethingWentWrong"),
      );
      setPurchasing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!wAmount || wAmount < minWithdrawalPoints) return;
    if (!bankCode || !accountNumber) {
      setWithdrawError(t("provideBankDetails"));
      return;
    }
    if (balance === null || balance < wAmount) {
      setWithdrawError(t("insufficientBalance"));
      return;
    }

    setWithdrawing(true);
    setWithdrawError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/points/withdraw`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            amount: wAmount,
            bankCode,
            accountNumber,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("withdrawalFailed"));
      }

      track(AnalyticsEvent.POINTS_WITHDRAWAL_REQUESTED, {
        points: wAmount,
        currency: WITHDRAWAL_CURRENCY,
      });
      setWithdrawAmount("");
      setAccountNumber("");
      await fetchData();
      router.refresh();
      alert(t("withdrawalSuccess"));
    } catch (e) {
      setWithdrawError(
        e instanceof Error ? e.message : t("somethingWentWrong"),
      );
    } finally {
      setWithdrawing(false);
    }
  };

  if (loadingData) {
    return (
      <div className="container py-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden md:col-span-1 h-full flex flex-col justify-center">
          <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-amber-400" />
              {t("balance")}
            </CardTitle>
            <CardDescription>{t("availablePoints")}</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-bold text-amber-400">
                {format.number(balance ?? 0)}
              </span>
              <span className="text-lg text-muted-foreground uppercase">
                {tCommon("points_label", { count: balance ?? 0 })}
              </span>
            </div>
            <div className="mt-4 text-xs text-muted-foreground bg-muted/30 p-3 rounded-md border border-border/50">
              <span className="font-medium text-foreground">
                💡 {t("tip")}:
              </span>{" "}
              {t("pointsExplanation")}
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Buy Points Card */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Coins className="h-5 w-5 text-primary" />
                {t("buyPoints")}
              </CardTitle>
              <CardDescription>{t("addPointsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="number"
                  min={MIN_PURCHASE_POINTS}
                  max={100000}
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  placeholder={t("amountPlaceholder")}
                  className="flex-1 rounded-md border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={purchasing || paymentConfig !== null}
                />
              </div>

              {pAmount > 0 && pAmount < MIN_PURCHASE_POINTS && (
                <p className="text-xs text-red-500">
                  {t("minPurchaseError", { amount: MIN_PURCHASE_POINTS })}
                </p>
              )}

              {pAmount >= MIN_PURCHASE_POINTS && (
                <div className="text-xs text-muted-foreground bg-secondary/20 p-3 rounded-xl border border-border/50 space-y-2">
                  <div className="flex justify-between items-center text-foreground font-medium">
                    <span className="flex items-center gap-1.5">
                      {tCommon("points_count", { count: 1 })}{" "}
                      <span className="text-muted-foreground font-normal">
                        ≈
                      </span>{" "}
                      {format.number(POINT_TO_USD_RATE * rate, {
                        style: "currency",
                        currency: selectedCurrency,
                        maximumFractionDigits: 4,
                      })}
                    </span>
                    {isNGN && (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
                      >
                        🏦 {t("bankTransferRecommended")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex justify-between border-t border-border/50 pt-2 text-sm text-foreground">
                    <span>{t("totalCost")}:</span>
                    <span className="font-bold text-primary">
                      {rates
                        ? format.number(pTotalFiat, {
                            style: "currency",
                            currency: selectedCurrency,
                            maximumFractionDigits: getCurrencyDecimals(
                              selectedCurrency,
                              rate,
                            ),
                            minimumFractionDigits: getCurrencyDecimals(
                              selectedCurrency,
                              rate,
                            ),
                          })
                        : tCommon("estimating")}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick buy options */}
              <div className="flex flex-wrap gap-2">
                {[500, 1000, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPurchaseAmount(String(amt))}
                    disabled={purchasing || paymentConfig !== null}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer transition-all ${
                      purchaseAmount === String(amt)
                        ? "bg-primary text-primary-foreground shadow shadow-primary/30"
                        : "bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted"
                    }`}
                  >
                    {format.number(amt)}
                  </button>
                ))}
              </div>

              <Button
                onClick={handlePurchase}
                disabled={
                  purchasing ||
                  !pAmount ||
                  pAmount < MIN_PURCHASE_POINTS ||
                  paymentConfig !== null ||
                  currencyDetecting
                }
                className="w-full gap-2 shadow-sm"
              >
                {purchasing || paymentConfig || currencyDetecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {t("pay")}{" "}
                {pAmount >= MIN_PURCHASE_POINTS && rates
                  ? format.number(pTotalFiat, {
                      style: "currency",
                      currency: selectedCurrency,
                      maximumFractionDigits: getCurrencyDecimals(
                        selectedCurrency,
                        rate,
                      ),
                      minimumFractionDigits: getCurrencyDecimals(
                        selectedCurrency,
                        rate,
                      ),
                    })
                  : ""}
              </Button>

              {purchaseError && (
                <p className="text-sm text-red-400 bg-red-950/20 px-3 py-2 rounded-md">
                  {purchaseError}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Withdraw Points Card */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Landmark className="h-5 w-5 text-primary" />
                {t("withdraw")}
              </CardTitle>
              <CardDescription>{t("convertPointsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <input
                  type="number"
                  min={minWithdrawalPoints}
                  max={balance ?? 0}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={t("pointsToWithdrawPlaceholder")}
                  className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={withdrawing}
                />
                <p className="text-[10px] text-muted-foreground px-1">
                  {t("minWithdrawal")}: {format.number(minWithdrawalPoints)}{" "}
                  {tCommon("points_label", { count: minWithdrawalPoints })}
                  <span className="mx-1">·</span>
                  {t("processingStandard")}:{" "}
                  {(withdrawalSpread * 100).toFixed(0)}%
                </p>

                {wAmount > 0 && (
                  <div className="text-xs text-muted-foreground bg-secondary/20 p-2 rounded flex justify-between">
                    <span>
                      {t("processingStandard")}:{" "}
                      {(withdrawalSpread * 100).toFixed(0)}%
                    </span>
                    <span
                      className={`font-medium ${wAmount >= minWithdrawalPoints ? "text-green-500" : "text-red-400"}`}
                    >
                      {t("youReceive")}:{" "}
                      {format.number(wReceive, {
                        style: "currency",
                        currency: WITHDRAWAL_CURRENCY,
                        maximumFractionDigits: getCurrencyDecimals(
                          WITHDRAWAL_CURRENCY,
                          ngnRate,
                        ),
                        minimumFractionDigits: getCurrencyDecimals(
                          WITHDRAWAL_CURRENCY,
                          ngnRate,
                        ),
                      })}
                    </span>
                  </div>
                )}

                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  disabled={withdrawing}
                  className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground cursor-pointer appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right .7em top 50%",
                    backgroundSize: ".65em auto",
                  }}
                >
                  <option value="" disabled>
                    {t("selectBank")}
                  </option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder={t("accountNumberPlaceholder")}
                  className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  maxLength={10}
                  disabled={withdrawing || resolvingAccount}
                />

                {resolvingAccount && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                    <Loader2 className="h-3 w-3 animate-spin" />{" "}
                    {t("resolvingAccount")}
                  </p>
                )}
                {resolvedAccountName && (
                  <p className="text-sm text-green-500 font-medium mt-2">
                    {resolvedAccountName}
                  </p>
                )}
              </div>

              <Button
                onClick={handleWithdraw}
                disabled={
                  withdrawing ||
                  resolvingAccount ||
                  !resolvedAccountName ||
                  !wAmount ||
                  wAmount < minWithdrawalPoints ||
                  !bankCode ||
                  accountNumber.length < 10
                }
                className="w-full gap-2 shadow-sm shrink-0 mt-2"
                variant="outline"
              >
                {withdrawing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
                {t("withdraw")}{" "}
                {wReceive > 0
                  ? format.number(wReceive, {
                      style: "currency",
                      currency: WITHDRAWAL_CURRENCY,
                      maximumFractionDigits: 0,
                    })
                  : ""}
              </Button>

              {withdrawError && (
                <p className="text-sm text-red-400 bg-red-950/20 px-3 py-2 rounded-md">
                  {withdrawError}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transactions */}

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowDownLeft className="h-5 w-5 text-muted-foreground" />
            {t("transactionHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <Coins className="h-6 w-6 text-muted-foreground opacity-50" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("noTransactions")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const config = typeConfig[tx.type] ?? {
                  label: tx.type,
                  color: "text-foreground",
                  icon: Coins,
                };
                const Icon = config.icon;
                const isPositive = tx.amount > 0;

                const getLabel = (type: string, fallback: string) => {
                  try {
                    switch (type) {
                      case "PURCHASE":
                        return t("purchase");
                      case "ESCROW_LOCK":
                        return t("escrowHeld");
                      case "ESCROW_RELEASE":
                        return t("escrowReleased");
                      case "EXCHANGE_COMMISSION":
                        return t("platformService");
                      case "FACILITATION_FEE":
                        return t("facilitationFee");
                      case "PENALTY":
                        return t("penalty");
                      case "WITHDRAWAL":
                        return t("withdrawal");
                      case "RECORDING_FEE":
                        return t("txSessionRecording");
                      case "CONVERSION":
                        return t("txCurrencyConversion");
                      case "REFERRAL_REWARD":
                        return tRefs("rewardReceived");
                      case "REFERRAL_BONUS":
                        return tRefs("bonusReceived");
                      default:
                        return fallback;
                    }
                  } catch {
                    return fallback;
                  }
                };

                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    <div
                      className={`p-2 rounded-full ${config.color} bg-current/10`}
                      style={{ backgroundColor: "transparent" }}
                    >
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {getLabel(tx.type, config.label)}
                      </p>
                      {tx.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${
                          isPositive ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {format.number(tx.amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format.dateTime(new Date(tx.createdAt), {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
