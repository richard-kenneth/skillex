"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RequestActions } from "@/components/matches/request-actions";
import { Inbox, Send } from "lucide-react";
import { useState } from "react";

interface RequestUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface Skill {
  id: string;
  name: string;
}

interface ExchangeRequest {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  requestedSkill: Skill;
  offeredSkill: Skill | null;
  sender?: RequestUser;
  receiver?: RequestUser;
}

interface RequestsContentProps {
  received: ExchangeRequest[];
  sent: ExchangeRequest[];
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ACCEPTED: "bg-green-500/20 text-green-400 border-green-500/30",
  REJECTED: "bg-red-500/20 text-red-400 border-red-500/30",
  CANCELLED: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  COMPLETED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export function RequestsContent({ received, sent }: RequestsContentProps) {
  const [tab, setTab] = useState<"received" | "sent">("received");

  const tabs = [
    { key: "received" as const, label: "Received", icon: Inbox, count: received.length },
    { key: "sent" as const, label: "Sent", icon: Send, count: sent.length },
  ];

  const activeRequests = tab === "received" ? received : sent;

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
            No {tab} requests
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto px-4">
            {tab === "received"
              ? "You haven't received any exchange requests yet."
              : "You haven't sent any exchange requests yet. Go find matches!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeRequests.map((request) => {
            const otherUser =
              tab === "received" ? request.sender : request.receiver;

            return (
              <Card
                key={request.id}
                className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-border/80 transition-colors"
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <Avatar className="h-12 w-12 border-2 border-border/50 shrink-0">
                      <AvatarImage
                        src={otherUser?.image ?? ""}
                        alt={otherUser?.name ?? "User"}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {otherUser?.name?.charAt(0) ?? "U"}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-semibold">
                          {otherUser?.name ?? "Unknown User"}
                        </span>
                        <Badge
                          variant="outline"
                          className={statusColors[request.status] || ""}
                        >
                          {request.status}
                        </Badge>
                      </div>

                      <div className="flex items-center flex-wrap gap-2 text-sm">
                        <span className="text-muted-foreground">
                          {tab === "received" ? "Wants to learn:" : "Requested:"}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {request.requestedSkill.name}
                        </Badge>
                        {request.offeredSkill && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">
                              Offering:
                            </span>
                            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                              {request.offeredSkill.name}
                            </Badge>
                          </>
                        )}
                      </div>

                      {request.message && (
                        <p className="text-sm text-muted-foreground italic">
                          &ldquo;{request.message}&rdquo;
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground/60">
                        {new Date(request.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0">
                      <RequestActions
                        requestId={request.id}
                        type={tab}
                        status={request.status}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
