"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Smartphone } from "lucide-react";

const RealtimeNotificationsContext = createContext<null>(null);

export function useRealtimeNotifications() {
  return useContext(RealtimeNotificationsContext);
}

// Premium chime sound synthesized via Web Audio API
const playPremiumChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    
    // First oscillator (fundamental chime note - E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Second oscillator (harmonious high ring - B5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(987.77, now + 0.08); // B5
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.06, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.65);
  } catch (err) {
    console.warn("Audio Context could not play chime:", err);
  }
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function PushPromoBanner() {
  const t = useTranslations("notifications");
  const { data: session } = useSession();
  const pathname = usePathname();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check support & permissions
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    if (!session?.user?.id || !supported) return;

    // Check if notifications are already allowed/denied
    if (Notification.permission !== "default") return;

    // Check if they dismissed the banner in the last 7 days
    const dismissedTime = localStorage.getItem("push-promo-dismissed");
    if (dismissedTime) {
      const parsedTime = parseInt(dismissedTime, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - parsedTime < sevenDays) {
        return;
      }
    }

    // Don't show on notifications settings page
    if (pathname?.endsWith("/notifications")) return;

    // Give it a brief delay (e.g. 4 seconds) for a smoother enter animation
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, [session?.user?.id, pathname]);

  const handleLater = () => {
    localStorage.setItem("push-promo-dismissed", Date.now().toString());
    setShowBanner(false);
  };

  const handleEnable = async () => {
    try {
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js");
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      const permission = await Notification.requestPermission();
      
      if (permission !== "granted") {
        toast.error(t("pushDenied"));
        handleLater(); // Treat as later so we store dismiss time
        return;
      }

      const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!pubKey) {
        toast.error("VAPID public key is missing on client configuration.");
        return;
      }

      const applicationServerKey = urlBase64ToUint8Array(pubKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Send to API
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/notifications/push-subscription`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error("Server failed to save subscription");

      toast.success(t("pushEnabledSuccess"));
      setShowBanner(false);

      // Trigger test push
      await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/notifications/test-push`,
        { method: "POST", credentials: "include" }
      );
    } catch (err) {
      console.error(err);
      toast.error(t("pushEnableError"));
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full p-4 rounded-2xl bg-zinc-950/95 border border-white/10 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-10 fade-in duration-500 flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary relative">
        <Smartphone className="h-5 w-5" />
        <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
        </span>
      </div>

      <div className="flex-1 space-y-3 min-w-0">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-white">
            {t("promoTitle")}
          </h4>
          <p className="text-xs text-zinc-400 leading-normal pr-4">
            {t("promoDesc")}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleEnable}
            className="flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-colors cursor-pointer shadow-lg shadow-primary/10"
          >
            {t("promoEnable")}
          </button>
          <button
            onClick={handleLater}
            className="py-1.5 px-3 text-xs font-medium rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {t("promoLater")}
          </button>
        </div>
      </div>
      
      <button 
        onClick={handleLater}
        className="absolute top-3 right-3 text-zinc-600 hover:text-white transition-colors cursor-pointer"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function RealtimeNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session?.user?.id) return;

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/notifications/stream`,
      { withCredentials: true }
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "NOTIFICATION_CREATED") {
          const notification = data.notification;
          
          // Play notification sound
          playPremiumChime();

          // Show Toast
          toast(notification.title, {
            description: notification.message,
            duration: 5000,
            action: notification.link ? {
              label: "View",
              onClick: () => {
                window.location.href = notification.link;
              }
            } : undefined,
          });

          // Invalidate notifications queries
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
        } else if (data.type === "COUNT_UPDATED") {
          queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
        }
      } catch (err) {
        console.error("Error parsing notification stream event:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE connection error for notifications:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [session?.user?.id, queryClient]);

  return (
    <RealtimeNotificationsContext.Provider value={null}>
      {children}
      <PushPromoBanner />
    </RealtimeNotificationsContext.Provider>
  );
}
