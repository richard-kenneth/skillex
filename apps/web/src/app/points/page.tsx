"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { closePaymentModal, useFlutterwave } from "flutterwave-react-v3";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Landmark,
  Loader2,
  Lock,
  Plus,
  Unlock,
  Wallet,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
  purchaseFeePercentage: number;
  purchaseFeeFixed: number;
  withdrawalFeePercentage: number;
  withdrawalFeeFixed: number;
  minWithdrawalAmount: number;
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
  PENALTY: {
    label: "Penalty",
    color: "text-red-400",
    icon: Zap,
  },
  CONVERSION: {
    label: "Conversion",
    color: "text-purple-400",
    icon: ArrowUpRight,
  },
};

export default function PointsPage() {
  const router = useRouter();
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
  const [paymentConfig, setPaymentConfig] = useState<{
    txRef: string;
    amount: number;
    customer: { email: string; name: string };
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [balRes, txRes, banksRes, feeRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/points/balance`, {
          credentials: "include",
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/points/transactions`, {
          credentials: "include",
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/points/banks`, {
          credentials: "include",
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/points/fee-config`),
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
    } catch {
      console.error("Failed to load points data");
    } finally {
      setLoadingData(false);
    }
  }, []);

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
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/points/resolve-account`,
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
            setWithdrawError(data.message || "Could not resolve account");
          }
        } catch {
          setWithdrawError("Failed to resolve account");
        } finally {
          setResolvingAccount(false);
        }
      };

      const timeoutId = setTimeout(resolve, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setResolvedAccountName(null);
    }
  }, [accountNumber, bankCode]);

  const pAmount = parseInt(purchaseAmount) || 0;
  const pFee = feeConfig
    ? Math.ceil(
        pAmount * feeConfig.purchaseFeePercentage + feeConfig.purchaseFeeFixed,
      )
    : 0;
  const pTotal = pAmount + pFee;

  const wAmount = parseInt(withdrawAmount) || 0;
  const wFee = feeConfig
    ? Math.ceil(
        wAmount * feeConfig.withdrawalFeePercentage +
          feeConfig.withdrawalFeeFixed,
      )
    : 0;
  const wReceive = wAmount - wFee;

  const handleFlutterPayment = useFlutterwave({
    public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY!,
    tx_ref: paymentConfig?.txRef || "",
    amount: paymentConfig?.amount || 0,
    currency: "NGN",
    payment_options: "card,mobilemoney,ussd",
    customer: paymentConfig?.customer || {
      email: "user@skil-ex.com",
      name: "Skil-Ex User",
    },
    customizations: {
      title: "Skil-Ex Points Purchase",
      description: "App Points Top-up",
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
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/points/purchase`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount: pAmount }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Purchase failed");
      }

      setPaymentConfig({
        txRef: data.txRef,
        amount: data.totalAmount,
        customer: data.customer,
      });
    } catch (e) {
      setPurchaseError(e instanceof Error ? e.message : "Something went wrong");
      setPurchasing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!wAmount || wAmount < 100) return;
    if (!bankCode || !accountNumber) {
      setWithdrawError("Please provide bank and account details");
      return;
    }
    if (balance === null || balance < wAmount) {
      setWithdrawError("Insufficient points balance");
      return;
    }

    setWithdrawing(true);
    setWithdrawError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/points/withdraw`,
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
        throw new Error(data.message || "Withdrawal failed");
      }

      setWithdrawAmount("");
      setAccountNumber("");
      await fetchData();
      router.refresh();
      alert("Withdrawal successfully initiated!");
    } catch (e) {
      setWithdrawError(e instanceof Error ? e.message : "Something went wrong");
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
          <h1 className="text-3xl font-bold tracking-tight">Points</h1>
          <p className="text-muted-foreground">
            Manage your points for uneven skill exchanges
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden md:col-span-1 h-full flex flex-col justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-amber-400" />
              Your Balance
            </CardTitle>
            <CardDescription>Available points for exchanges</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-bold text-amber-400">
                {balance ?? 0}
              </span>
              <span className="text-lg text-muted-foreground">pts</span>
            </div>
            <div className="mt-4 text-xs text-muted-foreground bg-muted/30 p-3 rounded-md border border-border/50">
              <span className="font-medium text-foreground">💡 Tip:</span>{" "}
              Points are used as collateral during uneven exchanges and returned
              upon completion.
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Buy Points Card */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Coins className="h-5 w-5 text-primary" />
                Buy Points
              </CardTitle>
              <CardDescription>
                Add points to your balance (1 pt = 1 NGN)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  placeholder="Amount"
                  className="flex-1 rounded-md border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={purchasing || paymentConfig !== null}
                />
              </div>

              {pAmount > 0 && (
                <div className="text-xs text-muted-foreground bg-secondary/20 p-2 rounded flex justify-between">
                  <span>Fee: {pFee} NGN</span>
                  <span className="font-medium text-foreground">
                    Total: {pTotal} NGN
                  </span>
                </div>
              )}

              {/* Quick buy options */}
              <div className="flex flex-wrap gap-2">
                {[100, 500, 1000, 5000].map((amt) => (
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
                    {amt}
                  </button>
                ))}
              </div>

              <Button
                onClick={handlePurchase}
                disabled={
                  purchasing ||
                  !pAmount ||
                  pAmount < 1 ||
                  paymentConfig !== null
                }
                className="w-full gap-2 shadow-sm"
              >
                {purchasing || paymentConfig ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Pay {pAmount > 0 ? `${pTotal} NGN` : ""}
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
                Withdraw
              </CardTitle>
              <CardDescription>
                Convert points to cash (Min 100 pts)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <input
                  type="number"
                  min={100}
                  max={balance ?? 0}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Points to withdraw"
                  className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={withdrawing}
                />
                <p className="text-[10px] text-muted-foreground px-1">
                  Min transfer after fees: {feeConfig?.minWithdrawalAmount || 100} NGN
                </p>

                {wAmount > 0 && (
                  <div className="text-xs text-muted-foreground bg-secondary/20 p-2 rounded flex justify-between">
                    <span>Fee: {wFee} pts</span>
                    <span
                      className={`font-medium ${wReceive >= (feeConfig?.minWithdrawalAmount || 100) ? "text-green-500" : "text-red-400"}`}
                    >
                      You receive: {wReceive} NGN
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
                    Select Bank
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
                  placeholder="Account Number (10 digits)"
                  className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  maxLength={10}
                  disabled={withdrawing || resolvingAccount}
                />

                {resolvingAccount && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Resolving
                    account...
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
                  !bankCode ||
                  accountNumber.length < 10 ||
                  wReceive < (feeConfig?.minWithdrawalAmount || 100)
                }
                className="w-full gap-2 shadow-sm shrink-0 mt-2"
                variant="outline"
              >
                {withdrawing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
                Withdraw {wReceive > 0 ? `${wReceive} NGN` : ""}
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
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <Coins className="h-6 w-6 text-muted-foreground opacity-50" />
              </div>
              <p className="text-sm text-muted-foreground">
                No transactions yet
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
                      <p className="text-sm font-medium">{config.label}</p>
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
                        {tx.amount}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString("en-US", {
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
