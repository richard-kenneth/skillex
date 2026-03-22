"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
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
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [balRes, txRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/points/balance`, {
          credentials: "include",
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/points/transactions`, {
          credentials: "include",
        }),
      ]);

      if (balRes.ok) {
        const data = await balRes.json();
        setBalance(data.balance ?? data);
      }
      if (txRes.ok) {
        setTransactions(await txRes.json());
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

  const handlePurchase = async () => {
    const amount = parseInt(purchaseAmount);
    if (!amount || amount < 1) return;

    setPurchasing(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/points/purchase`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount }),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Purchase failed");
      }

      setPurchaseAmount("");
      await fetchData();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPurchasing(false);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Balance Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-amber-400" />
              Your Balance
            </CardTitle>
            <CardDescription>
              Available points for exchanges
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-amber-400">
                {balance ?? 0}
              </span>
              <span className="text-lg text-muted-foreground">points</span>
            </div>
          </CardContent>
        </Card>

        {/* Buy Points Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Coins className="h-5 w-5 text-primary" />
              Buy Points
            </CardTitle>
            <CardDescription>
              Add points to your balance
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
              />
              <Button
                onClick={handlePurchase}
                disabled={purchasing || !purchaseAmount || parseInt(purchaseAmount) < 1}
                className="gap-2"
              >
                {purchasing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Buy
              </Button>
            </div>

            {/* Quick buy options */}
            <div className="flex flex-wrap gap-2">
              {[50, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setPurchaseAmount(String(amt))}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    purchaseAmount === String(amt)
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted"
                  }`}
                >
                  {amt} pts
                </button>
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/20 px-3 py-2 rounded-md">
                {error}
              </p>
            )}
          </CardContent>
        </Card>
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

      {/* Info */}
      <div className="rounded-lg border border-border/30 bg-muted/10 p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">💡 How points work:</span>{" "}
          Points are only needed when exchanging skills of uneven value. Most
          exchanges are free! When an exchange involves points, they&apos;re held
          in escrow and released upon completion.
        </p>
      </div>
    </div>
  );
}
