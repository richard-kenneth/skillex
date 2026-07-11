"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Bell,
  Trash2,
  Check,
  Mail,
  Smartphone,
  CheckCircle,
  Inbox,
  MessageSquare,
  Coins,
  Calendar,
  Sparkles,
  AlertCircle,
  Settings,
  Shield,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link, useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

interface Preferences {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  pushNotifications: boolean;
}

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

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionLoading } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"all" | "exchanges" | "points" | "system">("all");
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);

  useEffect(() => {
    if (!isSessionLoading && !session) {
      router.push("/sign-in");
    }
  }, [session, isSessionLoading, router]);

  useEffect(() => {
    setIsPushSupported("serviceWorker" in navigator && "PushManager" in window);
    setIsPermissionGranted(
      typeof window !== "undefined" && (Notification as any).permission === "granted"
    );
  }, []);

  // 1. Fetch user notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/notifications`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
  });

  // 2. Fetch user preferences
  const { data: userProfile, isLoading: isPreferencesLoading } = useQuery({
    queryKey: ["user-profile-notifications"],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/users/me`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  const preferences: Preferences = {
    emailNotifications: userProfile?.emailNotifications ?? true,
    inAppNotifications: userProfile?.inAppNotifications ?? true,
    pushNotifications: userProfile?.pushNotifications ?? true,
  };

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/notifications/${id}/read`,
        { method: "PATCH", credentials: "include" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/notifications/${id}`,
        { method: "DELETE", credentials: "include" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
      toast.success(t("deletedSuccess"));
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/notifications/read-all`,
        { method: "PATCH", credentials: "include" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
      toast.success(t("markedAllReadSuccess"));
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updated: Partial<Preferences>) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/notifications/preferences`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to update preferences");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile-notifications"] });
      toast.success(t("preferencesSaved"));
    },
  });

  // Enable Web Push Subscription
  const handleEnablePush = async () => {
    if (!isPushSupported) return;

    try {
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js");
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      const permission = await Notification.requestPermission();
      
      if (permission !== "granted") {
        toast.error(t("pushDenied"));
        return;
      }

      setIsPermissionGranted(true);

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

      // Trigger a test push notification
      await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/notifications/test-push`,
        { method: "POST", credentials: "include" }
      );
    } catch (err) {
      console.error(err);
      toast.error(t("pushEnableError"));
    }
  };

  const handleNotificationClick = (id: string, read: boolean) => {
    if (!read) {
      markAsReadMutation.mutate(id);
    }
  };

  const getFilteredNotifications = () => {
    if (activeTab === "all") return notifications;
    if (activeTab === "exchanges") {
      return notifications.filter((n) =>
        [
          "EXCHANGE_REQUEST_RECEIVED",
          "EXCHANGE_REQUEST_ACCEPTED",
          "EXCHANGE_REQUEST_REJECTED",
          "EXCHANGE_REQUEST_CANCELLED",
          "EXCHANGE_TERMS_PROPOSED",
          "EXCHANGE_TERMS_AGREED",
          "SESSION_SCHEDULED",
          "SESSION_COMPLETED",
          "SESSION_CANCELLED",
          "SESSION_REMINDER",
        ].includes(n.type)
      );
    }
    if (activeTab === "points") {
      return notifications.filter((n) =>
        ["POINTS_RECEIVED", "POINTS_WITHDREW", "REFERRAL_APPLIED"].includes(n.type)
      );
    }
    if (activeTab === "system") {
      return notifications.filter(
        (n) =>
          ![
            "EXCHANGE_REQUEST_RECEIVED",
            "EXCHANGE_REQUEST_ACCEPTED",
            "EXCHANGE_REQUEST_REJECTED",
            "EXCHANGE_REQUEST_CANCELLED",
            "EXCHANGE_TERMS_PROPOSED",
            "EXCHANGE_TERMS_AGREED",
            "SESSION_SCHEDULED",
            "SESSION_COMPLETED",
            "SESSION_CANCELLED",
            "SESSION_REMINDER",
            "POINTS_RECEIVED",
            "POINTS_WITHDREW",
            "REFERRAL_APPLIED",
          ].includes(n.type)
      );
    }
    return notifications;
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "EXCHANGE_REQUEST_RECEIVED":
        return {
          icon: Inbox,
          colorClass: "text-purple-400 bg-purple-500/10 border-purple-500/20",
        };
      case "EXCHANGE_REQUEST_ACCEPTED":
      case "EXCHANGE_TERMS_AGREED":
        return {
          icon: CheckCircle,
          colorClass: "text-green-400 bg-green-500/10 border-green-500/20",
        };
      case "EXCHANGE_REQUEST_REJECTED":
      case "EXCHANGE_REQUEST_CANCELLED":
        return {
          icon: AlertCircle,
          colorClass: "text-red-400 bg-red-500/10 border-red-500/20",
        };
      case "EXCHANGE_CHAT_MESSAGE":
        return {
          icon: MessageSquare,
          colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        };
      case "SESSION_SCHEDULED":
      case "SESSION_REMINDER":
        return {
          icon: Calendar,
          colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        };
      case "POINTS_RECEIVED":
      case "POINTS_WITHDREW":
        return {
          icon: Coins,
          colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        };
      case "REFERRAL_APPLIED":
        return {
          icon: Sparkles,
          colorClass: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
        };
      default:
        return {
          icon: Bell,
          colorClass: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
        };
    }
  };

  const filtered = getFilteredNotifications();
  const unreadFilteredCount = filtered.filter((n) => !n.read).length;

  return (
    <div className="container py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {t("title")}
          </h1>
          <p className="text-zinc-400">
            {t("subtitle")}
          </p>
        </div>

        {unreadFilteredCount > 0 && (
          <Button
            variant="outline"
            className="border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white"
            onClick={() => markAllReadMutation.mutate()}
          >
            <Check className="mr-2 h-4 w-4" />
            {t("markAllRead")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Notifications List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab buttons */}
          <div className="flex gap-2 p-1 border border-white/5 bg-zinc-950/60 rounded-xl max-w-md">
            {(["all", "exchanges", "points", "system"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-2 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer",
                  activeTab === tab
                    ? "bg-zinc-900 text-white shadow-sm border border-white/5"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {t(`tabs.${tab}`)}
              </button>
            ))}
          </div>

          {/* List Card */}
          <Card className="bg-zinc-950/40 border-zinc-900 backdrop-blur-md">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col h-72 items-center justify-center text-center p-6">
                  <div className="rounded-full bg-zinc-900/50 p-4 border border-white/5 mb-4">
                    <Bell className="h-8 w-8 text-zinc-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {t("noNotifications")}
                  </h3>
                  <p className="text-zinc-500 text-sm mt-2 max-w-sm">
                    {t("noNotificationsDesc")}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-900">
                  {filtered.map((notification) => {
                    const config = getTypeConfig(notification.type);
                    const Icon = config.icon;

                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "flex items-start gap-4 p-5 transition-all relative group",
                          notification.read
                            ? "bg-transparent"
                            : "bg-primary/5 border-l-2 border-primary"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-inner",
                            config.colorClass
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 justify-between">
                            <h4
                              className={cn(
                                "text-sm font-semibold",
                                notification.read ? "text-zinc-400" : "text-white"
                              )}
                            >
                              {notification.title}
                            </h4>
                            <span className="text-xs text-zinc-500">
                              {new Date(notification.createdAt).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>

                          <p
                            className={cn(
                              "text-sm leading-relaxed pr-6",
                              notification.read ? "text-zinc-500" : "text-zinc-300"
                            )}
                          >
                            {notification.message}
                          </p>

                          {notification.link && (
                            <div className="pt-2">
                              <Link
                                href={notification.link}
                                onClick={() =>
                                  handleNotificationClick(
                                    notification.id,
                                    notification.read
                                  )
                                }
                                className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                              >
                                {t("actionLink")} &rarr;
                              </Link>
                            </div>
                          )}
                        </div>

                        {/* Floating actions */}
                        <div className="absolute right-4 top-5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => markAsReadMutation.mutate(notification.id)}
                              className="h-8 w-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-white/5"
                              title={t("markRead")}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(notification.id)}
                            className="h-8 w-8 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-950/40"
                            title={t("delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Preferences & Settings */}
        <div className="space-y-6">
          <Card className="bg-zinc-950/40 border-zinc-900 backdrop-blur-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle className="text-white text-lg">
                  {t("preferencesTitle")}
                </CardTitle>
              </div>
              <CardDescription className="text-zinc-500">
                {t("preferencesDesc")}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {isPreferencesLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* In-App */}
                  <div className="flex items-center justify-between p-3 border border-white/5 bg-zinc-950/60 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-white/5 text-zinc-400">
                        <Bell className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {t("pref.inApp")}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {t("pref.inAppDesc")}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        updatePreferencesMutation.mutate({
                          inAppNotifications: !preferences.inAppNotifications,
                        })
                      }
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none",
                        preferences.inAppNotifications ? "bg-primary" : "bg-zinc-800"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          preferences.inAppNotifications ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between p-3 border border-white/5 bg-zinc-950/60 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-white/5 text-zinc-400">
                        <Mail className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {t("pref.email")}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {t("pref.emailDesc")}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        updatePreferencesMutation.mutate({
                          emailNotifications: !preferences.emailNotifications,
                        })
                      }
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none",
                        preferences.emailNotifications ? "bg-primary" : "bg-zinc-800"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          preferences.emailNotifications ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Push Toggles */}
                  <div className="flex items-center justify-between p-3 border border-white/5 bg-zinc-950/60 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-white/5 text-zinc-400">
                        <Smartphone className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {t("pref.push")}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {t("pref.pushDesc")}
                        </p>
                      </div>
                    </div>
                    <button
                      disabled={!isPermissionGranted}
                      onClick={() =>
                        updatePreferencesMutation.mutate({
                          pushNotifications: !preferences.pushNotifications,
                        })
                      }
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none disabled:opacity-40 disabled:cursor-not-allowed",
                        preferences.pushNotifications && isPermissionGranted
                          ? "bg-primary"
                          : "bg-zinc-800"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          preferences.pushNotifications && isPermissionGranted
                            ? "translate-x-4"
                            : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Web Push configuration widget */}
          {isPushSupported && !isPermissionGranted && (
            <Card className="bg-zinc-950/40 border-zinc-900 backdrop-blur-md relative overflow-hidden">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-xl" />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary animate-pulse" />
                  <CardTitle className="text-white text-base">
                    {t("nativePushTitle")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-zinc-400 text-xs leading-normal">
                  {t("nativePushDesc")}
                </p>
                <Button
                  onClick={handleEnablePush}
                  size="sm"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-4 shadow-lg shadow-primary/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Smartphone className="h-4 w-4" />
                  {t("enableNativePush")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
