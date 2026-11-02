"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Bell,
  Check,
  CheckSquare,
  Coins,
  MessageSquare,
  ArrowLeftRight,
  Sparkles,
  Calendar,
  AlertCircle,
  Inbox,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const t = useTranslations("notifications");
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // 1. Fetch unread count
  const { data: countData } = useQuery({
    queryKey: ["unread-notifications-count"],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/notifications/unread-count`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to fetch unread count");
      return res.json();
    },
    refetchInterval: 30000, // backup polling every 30s
  });
  const unreadCount = countData?.count ?? 0;

  // 2. Fetch recent notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/notifications`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    enabled: isOpen, // Only fetch when dropdown is opened
  });

  // 3. Mark single as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/notifications/${id}/read`,
        {
          method: "PATCH",
          credentials: "include",
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["unread-notifications-count"],
      });
    },
  });

  // 4. Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/notifications/read-all`,
        {
          method: "PATCH",
          credentials: "include",
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["unread-notifications-count"],
      });
    },
  });

  // Get corresponding icon & color theme based on notification type
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
          icon: CheckSquare,
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
          colorClass:
            "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
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

  const handleNotificationClick = (id: string, read: boolean) => {
    if (!read) {
      markAsReadMutation.mutate(id);
    }
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-zinc-400 outline-none transition-all hover:bg-zinc-900 hover:text-white cursor-pointer">
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-zinc-950">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        <span className="sr-only">Notifications</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-[360px] p-0 bg-zinc-950 border-zinc-800 shadow-2xl"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900">
          <h3 className="font-semibold text-white text-sm">{t("title")}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              className="h-7 text-xs text-zinc-400 hover:text-white px-2 hover:bg-zinc-900"
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              {t("markAllRead")}
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-zinc-500 text-sm">
              <span className="animate-pulse">{t("loading")}</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col h-48 items-center justify-center text-center p-4">
              <div className="rounded-full bg-zinc-900/50 p-3 border border-white/5 mb-3">
                <Bell className="h-6 w-6 text-zinc-600" />
              </div>
              <p className="text-zinc-400 text-sm font-medium">
                {t("noNotifications")}
              </p>
              <p className="text-zinc-600 text-xs mt-1">
                {t("noNotificationsDesc")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-900/50">
              {notifications.slice(0, 8).map((notification) => {
                const config = getTypeConfig(notification.type);
                const Icon = config.icon;

                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className="p-0"
                    onClick={() =>
                      handleNotificationClick(
                        notification.id,
                        notification.read,
                      )
                    }
                  >
                    <Link
                      href={notification.link || "/notifications"}
                      className="flex w-full items-start gap-3 p-3 cursor-pointer outline-none transition-colors hover:bg-zinc-900/50 focus:bg-zinc-900/50"
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                          config.colorClass,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-xs font-semibold leading-none truncate",
                              notification.read
                                ? "text-zinc-400"
                                : "text-white",
                            )}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary mt-1" />
                          )}
                        </div>
                        <p
                          className={cn(
                            "text-xs leading-normal line-clamp-2",
                            notification.read
                              ? "text-zinc-500"
                              : "text-zinc-300",
                          )}
                        >
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-zinc-600">
                          {new Date(notification.createdAt).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-zinc-900 bg-zinc-950/80 sticky bottom-0">
          <Link href="/notifications" onClick={() => setIsOpen(false)}>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs font-medium text-zinc-300 hover:text-white border-zinc-800 hover:bg-zinc-900 bg-zinc-950 cursor-pointer"
            >
              {t("viewAll")}
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
