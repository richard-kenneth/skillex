"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Download, Share2, PlusSquare, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type IOSNavigator = Navigator & { standalone?: boolean };

export function PWARegistration() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // 1. Detect network status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online!", {
        description: "Your connection has been restored.",
        duration: 4000,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("You are offline", {
        description: "Some features might be limited until you reconnect.",
        duration: 5000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 2. Register Service Worker
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log(
              "Service Worker registered successfully with scope: ",
              registration.scope,
            );

            // Check for updates
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === "installed") {
                    if (navigator.serviceWorker.controller) {
                      toast.info("App updated!", {
                        description:
                          "A new version is available. Please reload.",
                        action: {
                          label: "Reload",
                          onClick: () => window.location.reload(),
                        },
                        duration: 8000,
                      });
                    }
                  }
                };
              }
            };
          })
          .catch((err) => {
            console.error("Service Worker registration failed: ", err);
          });
      });
    }

    // 3. Detect if already running in standalone mode (installed)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as IOSNavigator).standalone === true;
      setIsStandalone(isStandaloneMode);

      // Add standalone class to HTML tag for styling adjustments
      if (isStandaloneMode) {
        document.documentElement.classList.add("is-pwa");
      }
    };
    checkStandalone();

    // 4. Handle installation prompt for Android/Chrome
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);

      // Only show the banner if the user hasn't dismissed it recently
      const dismissedTime = localStorage.getItem("pwa-install-dismissed");
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      const isRecentlyDismissed =
        dismissedTime && Date.now() - parseInt(dismissedTime, 10) < oneWeek;

      if (!isRecentlyDismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);

    // 5. Detect iOS Safari specifically
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIphone = userAgent.includes("iphone") || userAgent.includes("ipad");
    const isSafari =
      userAgent.includes("safari") &&
      !userAgent.includes("crios") &&
      !userAgent.includes("fxios");

    setIsIOS(isIphone && isSafari);

    // Check if iOS prompt should show
    const checkIOSPrompt = () => {
      const dismissedTime = localStorage.getItem("pwa-install-dismissed");
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      const isRecentlyDismissed =
        dismissedTime && Date.now() - parseInt(dismissedTime, 10) < oneWeek;

      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as IOSNavigator).standalone === true;

      if (isIphone && isSafari && !isStandaloneMode && !isRecentlyDismissed) {
        setShowInstallBanner(true);
      }
    };

    // Slight timeout to let other animations settle
    const iosTimeout = setTimeout(checkIOSPrompt, 3000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      clearTimeout(iosTimeout);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA Installation Choice Outcome: ${outcome}`);

    setDeferredPrompt(null);
    setIsInstallable(false);
    setShowInstallBanner(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    setShowInstallBanner(false);
  };

  if (!showInstallBanner || isStandalone) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:right-6 md:left-auto md:w-[380px] animate-in slide-in-from-bottom duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 p-5 shadow-2xl backdrop-blur-md">
        {/* Glow effect */}
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/20 blur-2xl" />

        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900 border border-white/5 shadow-inner">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>

          <div className="flex-1 pr-6">
            <h3 className="font-semibold text-white text-base leading-snug">
              Install SkillEx
            </h3>
            <p className="mt-1 text-xs text-zinc-400 leading-normal">
              Access SkillEx directly from your home screen with offline
              capability and native app feel.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/5">
          {isIOS ? (
            <div className="flex flex-col gap-2 rounded-lg bg-zinc-900/60 p-3 border border-white/5">
              <p className="text-[11px] font-medium text-zinc-300 leading-relaxed">
                To install on iOS:
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Share2 className="h-3.5 w-3.5 text-blue-400" />
                <span>1. Tap the Share button in Safari</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <PlusSquare className="h-3.5 w-3.5 text-zinc-300" />
                <span>2. Select &quot;Add to Home Screen&quot;</span>
              </div>
            </div>
          ) : isInstallable ? (
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Maybe Later
              </Button>
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-4 shadow-lg shadow-primary/20 flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Install App
              </Button>
            </div>
          ) : (
            // Default guide for other browsers
            <p className="text-[11px] text-zinc-500 italic text-center">
              Open in Chrome, Safari or Edge to install directly.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
