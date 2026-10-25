"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";

export default function OfflinePage() {
  const t = useTranslations("pwa");
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const handleRetry = () => {
    setIsChecking(true);

    // Simulate check
    setTimeout(() => {
      if (navigator.onLine) {
        toast.success(t("onlineToast"));
        router.refresh();
        // Go back or redirect to home if possible
        router.push("/");
      } else {
        toast.error(t("offlineToast"));
        setIsChecking(false);
      }
    }, 1000);
  };

  useEffect(() => {
    const handleOnline = () => {
      toast.success(t("onlineToast"));
      router.push("/");
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [router, t]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] px-4 text-center animate-in fade-in duration-500">
      <div className="relative">
        <div className="absolute -inset-1 rounded-full bg-primary/10 blur-xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 shadow-inner">
          <WifiOff className="h-10 w-10 text-zinc-400" />
        </div>
      </div>

      <h1 className="mt-8 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {t("offlineTitle")}
      </h1>

      <p className="mt-4 text-sm text-zinc-400 max-w-sm leading-relaxed">
        {t("offlineDescription")}
      </p>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-[280px]">
        <Button
          onClick={handleRetry}
          disabled={isChecking}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isChecking ? "animate-spin" : ""}`}
          />
          {t("offlineRetryButton")}
        </Button>

        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex-1 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-900"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t("offlineBack")}
        </Button>
      </div>
    </div>
  );
}
