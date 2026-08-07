"use client";

import { RequestActions } from "@/components/matches/request-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Inbox, MessageSquare, Send } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";

interface RequestUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface Skill {
  id: string;
  name: string;
}

interface NegotiationMessage {
  id: string;
  messageKey: string;
  pointsProposal: number | null;
  pointsPayerId: string | null;
  requestedSkillSessions: number | null;
  requestedSkillDuration: number | null;
  offeredSkillSessions: number | null;
  offeredSkillDuration: number | null;
  senderId: string;
  createdAt: string;
}

interface ExchangeRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  pointsProposal: number;
  pointsPayerId: string | null;
  pointsProposedBy: string | null;
  requestedSkillSessions: number;
  requestedSkillDuration: number;
  offeredSkillSessions: number;
  offeredSkillDuration: number;
  senderAgreed: boolean;
  receiverAgreed: boolean;
  createdAt: string;
  requestedSkill: Skill;
  offeredSkill: Skill | null;
  sender?: RequestUser;
  receiver?: RequestUser;
  messages?: NegotiationMessage[];
}

interface RequestsContentProps {
  received: ExchangeRequest[];
  sent: ExchangeRequest[];
  currentUserId: string;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  COMMITTED: "bg-green-500/20 text-green-400 border-green-500/30",
  REJECTED: "bg-red-500/20 text-red-400 border-red-500/30",
  CANCELLED: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export function RequestsContent({
  received: initialReceived,
  sent: initialSent,
  currentUserId,
}: RequestsContentProps) {
  const t = useTranslations("requests");
  const [tab, setTab] = useState<"received" | "sent">("received");
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["requests"],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/exchanges/requests`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error(t("failedFetchRequests"));
      return res.json();
    },
    initialData: { received: initialReceived, sent: initialSent },
  });

  useEffect(() => {
    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/exchanges/stream`,
      { withCredentials: true },
    );

    eventSource.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);

  const activeReceived = data?.received ?? initialReceived;
  const activeSent = data?.sent ?? initialSent;

  const tabs = [
    {
      key: "received" as const,
      label: t("received"),
      icon: Inbox,
      count: activeReceived.length,
    },
    {
      key: "sent" as const,
      label: t("sent"),
      icon: Send,
      count: activeSent.length,
    },
  ];

  const activeRequests = tab === "received" ? activeReceived : activeSent;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/40 pb-px">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.key
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {activeRequests.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border/40 rounded-xl bg-card/10 backdrop-blur-sm">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
            {tab === "received" ? (
              <Inbox className="h-8 w-8 text-muted-foreground opacity-50" />
            ) : (
              <Send className="h-8 w-8 text-muted-foreground opacity-50" />
            )}
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {tab === "received" ? t("noReceivedRequests") : t("noSentRequests")}
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto px-4">
            {tab === "received"
              ? t("noReceivedRequestsDesc")
              : t("noSentRequestsDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeRequests.map((request: ExchangeRequest) => (
            <RequestCard
              key={request.id}
              request={request}
              tab={tab}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({
  request,
  tab,
  currentUserId,
}: {
  request: ExchangeRequest;
  tab: "received" | "sent";
  currentUserId: string;
}) {
  const t = useTranslations("requests");
  const tc = useTranslations("common");
  const format = useFormatter();
  const otherUser = tab === "received" ? request.sender : request.receiver;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-border/80 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 border-2 border-border/50 shrink-0">
            <AvatarImage
              src={otherUser?.image ?? ""}
              alt={otherUser?.name ?? "User"}
            />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {otherUser?.name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-semibold">
                {otherUser?.name ?? tc("unknownUser")}
              </span>
              <Badge
                variant="outline"
                className={statusColors[request.status] || ""}
              >
                {request.status === "PENDING"
                  ? t("statusPending")
                  : request.status === "COMMITTED"
                    ? t("statusCommitted")
                    : request.status === "REJECTED"
                      ? t("statusRejected")
                      : request.status === "CANCELLED"
                        ? t("statusCancelled")
                        : request.status}
              </Badge>
            </div>

            <div className="flex items-center flex-wrap gap-2 text-sm">
              <span className="text-muted-foreground">
                {tab === "received" ? t("wantsToLearn") : t("requested")}
              </span>
              <Badge variant="secondary" className="text-xs">
                {request.requestedSkill.name}
              </Badge>
              <span className="text-xs text-muted-foreground">
                ({request.requestedSkillSessions}{" "}
                {request.requestedSkillSessions !== 1 ? tc("sessions") : tc("session")},{" "}
                {request.requestedSkillDuration}m)
              </span>

              {request.offeredSkill && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{t("offering")}</span>
                  <Badge
                    variant="outline"
                    className="text-xs border-blue-500/30 text-blue-400"
                  >
                    {request.offeredSkill.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({request.offeredSkillSessions}{" "}
                    {request.offeredSkillSessions !== 1 ? tc("sessions") : tc("session")},{" "}
                    {request.offeredSkillDuration}m)
                  </span>
                </>
              )}
            </div>

            {/* Agreement Status */}
            <div className="flex flex-col gap-0.5 text-[11px] font-medium bg-muted/40 p-2 rounded border border-border/30">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {request.senderId === currentUserId ? tc("you") : (request.sender?.name ?? t("sender"))}
                </span>
                <span
                  className={
                    request.senderAgreed ? "text-green-500" : "text-amber-500"
                  }
                >
                  {request.senderAgreed ? t("agreed") : t("reviewing")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {request.receiverId === currentUserId ? tc("you") : (request.receiver?.name ?? t("receiver"))}
                </span>
                <span
                  className={
                    request.receiverAgreed ? "text-green-500" : "text-amber-500"
                  }
                >
                  {request.receiverAgreed ? t("agreed") : t("reviewing")}
                </span>
              </div>
            </div>

            {/* Points Info */}
            {request.pointsProposal > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-amber-400 font-medium">
                  {request.pointsProposal} {tc("points_label", { count: request.pointsProposal })}
                </span>
                <span className="text-muted-foreground">
                  {t("paidBy")} {request.pointsPayerId === currentUserId ? tc("you") : (otherUser?.name ?? tc("them"))}
                </span>
              </div>
            )}

            {/* Link to negotiation page */}
            <div className="pt-2">
              <Link href={`/requests/${request.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                >
                  <MessageSquare className="h-4 w-4" />
                  {t("viewExchange")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex flex-col items-end justify-between h-full shrink-0">
            <div className="text-right space-y-2">
              <p className="text-xs text-muted-foreground/60">
                {format.dateTime(new Date(request.createdAt), {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            {/* Actions */}
            <div className="mt-4 pt-10">
              <RequestActions
                requestId={request.id}
                type={tab}
                status={request.status}
                pointsProposal={request.pointsProposal}
                pointsPayerId={request.pointsPayerId}
                currentUserId={currentUserId}
                otherUserName={otherUser?.name ?? "User"}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
