"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Coins, Calendar, ArrowLeft, Send, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

export default function NegotiationPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const { data: session, isPending: isSessionLoading } = useSession();

  const { data: request, isLoading, isError } = useQuery({
    queryKey: ["request", id],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/exchanges/requests/${id}`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 404) {
          router.push("/matches/requests");
        }
        throw new Error("Failed to fetch request");
      }
      return res.json();
    },
    enabled: !!id,
  });

  // Real-time updates via SSE
  useEffect(() => {
    if (!id || !session) return;

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/exchanges/stream`,
      { withCredentials: true }
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Only invalidate if the update is for THIS request
        if (data.requestId === id) {
          queryClient.invalidateQueries({ queryKey: ["request", id] });
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
    };

    return () => {
      eventSource.close();
    };
  }, [id, session, queryClient]);

  const currentUserId = session?.user?.id;
  const isPending = request?.status === "PENDING";
  
  // Propose form state
  const [reqSessions, setReqSessions] = useState("1");
  const [reqDuration, setReqDuration] = useState("60");
  const [offSessions, setOffSessions] = useState("1");
  const [offDuration, setOffDuration] = useState("60");
  const [counterPoints, setCounterPoints] = useState("0");
  const [counterPayerIsMe, setCounterPayerIsMe] = useState(true);

  // Slot states: dayOfWeek (0-6), startTime (HH:mm)
  const [reqDays, setReqDays] = useState<string[]>([]);
  const [reqTime, setReqTime] = useState("");
  const [offDays, setOffDays] = useState<string[]>([]);
  const [offTime, setOffTime] = useState("");

  const [sendingProposal, setSendingProposal] = useState(false);
  const [sendingAccept, setSendingAccept] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Availability state
  const [availDays, setAvailDays] = useState<string[]>([]);
  const [availTimes, setAvailTimes] = useState<string[]>([]);
  const [isUpdatingAvail, setIsUpdatingAvail] = useState(false);

  // Initialize input values to match the current DB state if available
  useEffect(() => {
    if (request) {
      setReqSessions(request.requestedSkillSessions?.toString() || "1");
      setReqDuration(request.requestedSkillDuration?.toString() || "60");
      setOffSessions(request.offeredSkillSessions?.toString() || "1");
      setOffDuration(request.offeredSkillDuration?.toString() || "60");
      setCounterPoints(request.pointsProposal?.toString() || "0");
      if (request.pointsPayerId && currentUserId) {
        setCounterPayerIsMe(request.pointsPayerId === currentUserId);
      }

      const isSender = request.senderId === currentUserId;
      const myAvail = isSender ? request.senderAvailability : request.receiverAvailability;
      if (myAvail) {
        setAvailDays(myAvail.days?.map((d: number) => d.toString()) || []);
        setAvailTimes(myAvail.timeSlots || []);
      }
      
      if (request.proposedSlots && request.proposedSlots.length > 0) {
        // prefer slots proposed by the other user if they exist, else our own
        const otherSlots = request.proposedSlots.filter((s: { proposerId: string }) => s.proposerId !== currentUserId);
        const slotsToUse = otherSlots.length > 0 ? otherSlots : request.proposedSlots;

        const reqSlots = slotsToUse.filter((s: { skillId: string }) => s.skillId === request.requestedSkillId);
        if (reqSlots.length > 0) {
          setReqDays(reqSlots.map((s: { dayOfWeek: number }) => s.dayOfWeek.toString()));
          setReqTime(reqSlots[0].startTime);
        }

        if (request.offeredSkillId) {
          const offSlots = slotsToUse.filter((s: { skillId: string }) => s.skillId === request.offeredSkillId);
          if (offSlots.length > 0) {
            setOffDays(offSlots.map((s: { dayOfWeek: number }) => s.dayOfWeek.toString()));
            setOffTime(offSlots[0].startTime);
          }
        }
      }
    }
  }, [request, currentUserId]); 

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [request?.messages]);

  if (isSessionLoading || isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-zinc-400 animate-pulse">Initializing negotiation...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <p className="text-red-400 font-medium">Failed to load request. It might have been deleted or moved. </p>
        <Button asChild variant="outline">
          <Link href="/matches/requests">Back to Requests</Link>
        </Button>
      </div>
    );
  }

  if (!session) {
    router.push("/sign-in");
    return null;
  }

  if (!request) return null;

  const isSender = request.senderId === currentUserId;
  const otherUser = isSender ? request.receiver : request.sender;
  const amIAgreed = isSender ? request.senderAgreed : request.receiverAgreed;

  const handlePropose = async () => {
    setSendingProposal(true);
    try {
      const pts = parseInt(counterPoints) || 0;
      const slots: { skillId: string; dayOfWeek: number; startTime: string }[] = [];

      if (reqDays.length > 0 && reqTime) {
        reqDays.forEach((day: string) => {
          slots.push({
            skillId: request.requestedSkillId,
            dayOfWeek: parseInt(day),
            startTime: reqTime,
          });
        });
      }

      if (request.offeredSkillId && offDays.length > 0 && offTime) {
        offDays.forEach((day: string) => {
          slots.push({
            skillId: request.offeredSkillId,
            dayOfWeek: parseInt(day),
            startTime: offTime,
          });
        });
      }

      const body = {
        requestedSkillSessions: parseInt(reqSessions) || 1,
        requestedSkillDuration: parseInt(reqDuration) || 60,
        offeredSkillSessions: parseInt(offSessions) || 0,
        offeredSkillDuration: parseInt(offDuration) || 0,
        pointsProposal: pts,
        pointsPayerId: pts > 0 ? (counterPayerIsMe ? currentUserId : otherUser.id) : null,
        slots,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/exchanges/requests/${id}/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to propose");
      
      setReqDays([]);
      setReqTime("");
      setOffDays([]);
      setOffTime("");
      queryClient.invalidateQueries({ queryKey: ["request", id] });
    } catch (err) {
      console.error(err);
    } finally {
      setSendingProposal(false);
    }
  };

  const handleAccept = async () => {
    setSendingAccept(true);
    try {
      const slotsToAccept = request.proposedSlots.map((s: { id: string }) => s.id);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/exchanges/requests/${id}/accept-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requestId: id, slotIds: slotsToAccept }),
      });

      if (!res.ok) throw new Error("Failed to accept");
      queryClient.invalidateQueries({ queryKey: ["request", id] });
    } catch (err) {
      console.error(err);
    } finally {
      setSendingAccept(false);
    }
  };

  const handleQuickReply = async (messageKey: string) => {
    setSendingMessage(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/exchanges/requests/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messageKey }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      queryClient.invalidateQueries({ queryKey: ["request", id] });
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateAvailability = async () => {
    setIsUpdatingAvail(true);
    try {
      const body = {
        days: availDays.map(d => parseInt(d)),
        timeSlots: availTimes,
      };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/exchanges/requests/${id}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to update availability");
      queryClient.invalidateQueries({ queryKey: ["request", id] });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingAvail(false);
    }
  };

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const toggleDay = (days: string[], setDays: React.Dispatch<React.SetStateAction<string[]>>, dayString: string, maxDays: number) => {
    if (days.includes(dayString)) {
      setDays(days.filter(d => d !== dayString));
    } else {
      if (days.length < maxDays) {
        setDays([...days, dayString]);
      }
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/matches/requests" className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Requests
        </Link>
        <Badge variant="outline" className={request.status === "COMMITTED" ? "border-green-500 text-green-500" : "border-yellow-500 text-yellow-500"}>
          {request.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Chat and Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="flex flex-col h-[600px] border-border/50">
            <CardHeader className="border-b border-border/50 pb-4 bg-muted/10">
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10 border border-border/50">
                  <AvatarImage src={otherUser?.image ?? ""} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {otherUser?.name?.charAt(0) ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{otherUser?.name}</CardTitle>
                  <p className="text-xs text-muted-foreground truncate">
                    Negotiating exchange: {request.requestedSkill.name}
                    {request.offeredSkill ? ` ↔ ${request.offeredSkill.name}` : ""}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {request.messages?.map((msg: { id: string; senderId: string; messageKey: string; requestedSkillSessions?: number; requestedSkillDuration?: number; offeredSkillSessions?: number; offeredSkillDuration?: number; pointsProposal?: number; pointsPayerId?: string; createdAt: string | Date }) => {
                const isMe = msg.senderId === currentUserId;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm shadow-sm ${
                        isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted text-foreground rounded-tl-none border border-border/50"
                      }`}
                    >
                      <p className="font-medium text-xs mb-1 opacity-70">
                        {isMe ? "You" : otherUser?.name}
                      </p>
                      
                      {msg.messageKey === "PROPOSE_TERMS" ? (
                        <div className="space-y-2">
                          <p>Proposed new terms & schedule</p>
                          <div className={`p-2 rounded text-xs opacity-90 ${isMe ? "bg-primary-foreground/10" : "bg-background/50"}`}>
                            <p><strong>{request.requestedSkill.name}:</strong> {msg.requestedSkillSessions}x {msg.requestedSkillDuration}m</p>
                            {(msg.offeredSkillSessions ?? 0) > 0 && request.offeredSkill && (
                              <p><strong>{request.offeredSkill.name}:</strong> {msg.offeredSkillSessions}x {msg.offeredSkillDuration}m</p>
                            )}
                            {(msg.pointsProposal ?? 0) > 0 && (
                              <p className="mt-1 flex items-center gap-1 font-semibold text-amber-300">
                                <Coins className="w-3 h-3" /> {msg.pointsProposal} pts (paid by {msg.pointsPayerId === currentUserId ? "you" : "them"})
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p>{msg.messageKey.replace(/_/g, " ")}</p>
                      )}
                      
                      <p className="text-[10px] opacity-50 mt-2 text-right">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
              {request.status === "COMMITTED" && (
                <div className="text-center my-6">
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20 px-3 py-1">
                    Exchange Committed
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">The chat is now locked. You can proceed to your sessions.</p>
                </div>
              )}
              {request.status === "PENDING" && (
                <div className="pt-4 mt-auto border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2 px-1">Quick Replies:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "AVAILABLE_WEEKDAYS", label: "Available on weekdays" },
                      { key: "AVAILABLE_WEEKENDS", label: "Available on weekends" },
                      { key: "NEED_MORE_TIME", label: "Need more time to decide" },
                      { key: "REQUEST_RESCHEDULE", label: "Need to reschedule" }
                    ].map(reply => (
                      <Button
                        key={reply.key}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 rounded-full bg-background/50 hover:bg-muted"
                        disabled={sendingMessage}
                        onClick={() => handleQuickReply(reply.key)}
                      >
                        {reply.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Terms & Propose */}
        <div className="space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-3 border-b border-border/20">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" /> General Availability
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {(() => {
                const otherAvail = isSender ? request.receiverAvailability : request.senderAvailability;
                if (otherAvail && ((otherAvail.days && otherAvail.days.length > 0) || (otherAvail.timeSlots && otherAvail.timeSlots.length > 0))) {
                  return (
                    <div className="mb-4 bg-muted/30 p-3 rounded-lg border border-border/40 text-sm">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{otherUser?.name}&apos;s Availability:</p>
                      <p>Days: {otherAvail.days?.map((d: number) => daysOfWeek[d]).join(', ') || 'Any'}</p>
                      <p>Times: {otherAvail.timeSlots?.join(', ') || 'Any'}</p>
                    </div>
                  );
                }
                return null;
              })()}
              
              {isPending && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Indicate your overall free times to help {otherUser?.name?.split(' ')[0] || 'them'} propose matching slots.</p>
                  
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Usually Free Days</span>
                    <div className="flex flex-wrap gap-1">
                      {daysOfWeek.map((day, idx) => {
                        const isSelected = availDays.includes(idx.toString());
                        return (
                          <Badge 
                            key={idx} 
                            variant={isSelected ? "default" : "outline"}
                            className={`cursor-pointer transition-colors hover:bg-muted ${isSelected ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-background"}`}
                            onClick={() => toggleDay(availDays, setAvailDays, idx.toString(), 7)}
                          >
                            {day.slice(0, 3)}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Usually Free Times</span>
                    <div className="flex flex-wrap gap-1">
                      {["Morning", "Afternoon", "Evening", "Night"].map((timeSlot) => {
                        const isSelected = availTimes.includes(timeSlot);
                        return (
                          <Badge 
                            key={timeSlot} 
                            variant={isSelected ? "default" : "outline"}
                            className={`cursor-pointer transition-colors hover:bg-muted ${isSelected ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-background"}`}
                            onClick={() => {
                              if (isSelected) {
                                setAvailTimes(availTimes.filter(t => t !== timeSlot));
                              } else {
                                setAvailTimes([...availTimes, timeSlot]);
                              }
                            }}
                          >
                            {timeSlot}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Button onClick={handleUpdateAvailability} disabled={isUpdatingAvail} variant="outline" size="sm" className="w-full text-xs h-8">
                       {isUpdatingAvail ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : null}
                       Update Availability
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3 border-b border-border/20">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Terms & Scheduling
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              
              {/* Output current state nicely */}
              <div className="space-y-3 mb-6 bg-muted/30 p-3 rounded-lg border border-border/40">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Agreement</h4>
                <div className="text-sm space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span>{request.sender?.name}</span>
                    <Badge variant="secondary" className={request.senderAgreed ? "bg-green-500/20 text-green-500" : ""}>{request.senderAgreed ? "Agreed" : "Pending"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{request.receiver?.name}</span>
                    <Badge variant="secondary" className={request.receiverAgreed ? "bg-green-500/20 text-green-500" : ""}>{request.receiverAgreed ? "Agreed" : "Pending"}</Badge>
                  </div>
                </div>

                {request.proposedSlots?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <p className="text-xs font-semibold mb-2">Proposed Slots:</p>
                    <ul className="space-y-1.5 text-xs">
                      {request.proposedSlots.map((slot: { id: string; proposerId: string; proposer: { id: string; name: string }; skillId: string; status: string; dayOfWeek: number; startTime: string }) => {
                        const isMeProposer = slot.proposerId === currentUserId;
                        const skillName = slot.skillId === request.requestedSkillId ? request.requestedSkill.name : request.offeredSkill?.name;
                        const isAccepted = slot.status === "ACCEPTED";
                        return (
                          <li key={slot.id} className="flex flex-col gap-1 p-1.5 bg-background rounded border border-border/40">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{skillName}</span>
                              <Badge variant="outline" className={`text-[9px] h-4 ${isAccepted ? 'border-green-500/50 text-green-500' : 'border-yellow-500/50 text-yellow-500'}`}>
                                {isAccepted ? "Accepted" : "Pending"}
                              </Badge>
                            </div>
                            <span className="text-muted-foreground">
                              {daysOfWeek[slot.dayOfWeek]}s at {slot.startTime} (proposed by {isMeProposer ? "You" : (slot.proposer?.name || "Unknown")})
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {request.status === "COMMITTED" && request.exchange?.id && (
                <div className="pt-4 border-t border-border/20">
                  <Button asChild className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20 py-6 text-lg font-bold">
                    <Link href={`/room/${request.exchange.id}`}>
                      Go to Exchange Room
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground mt-3">
                    The negotiation is complete. You can now start your sessions!
                  </p>
                </div>
              )}

              {isPending && (
                <div className="space-y-4 pt-2 border-t border-border/20">
                  <h4 className="text-sm font-semibold">Propose New Terms</h4>
                  
                  {/* Skill 1: Requested */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">{request.requestedSkill.name} (Requesting)</p>
                    <div className="flex gap-2">
                      <input type="number" min={1} value={reqSessions} onChange={e => setReqSessions(e.target.value)} placeholder="Sessions" className="w-[80px] rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" />
                      <input type="number" min={15} step={15} value={reqDuration} onChange={e => setReqDuration(e.target.value)} placeholder="Duration (min)" className="flex-1 rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 items-center">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground shrink-0 w-[50px]">Days</span>
                        <div className="flex flex-wrap gap-1">
                          {daysOfWeek.map((day, idx) => {
                            const isSelected = reqDays.includes(idx.toString());
                            const maxDays = parseInt(reqSessions) || 1;
                            const isDisabled = !isSelected && reqDays.length >= maxDays;
                            return (
                              <Badge 
                                key={idx} 
                                variant={isSelected ? "default" : "outline"}
                                className={`cursor-pointer transition-colors hover:bg-muted ${isSelected ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-background"} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={() => !isDisabled && toggleDay(reqDays, setReqDays, idx.toString(), maxDays)}
                              >
                                {day.slice(0, 3)}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground shrink-0 w-[50px]">Time</span>
                        <input type="time" value={reqTime} onChange={e => setReqTime(e.target.value)} className="w-[120px] rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary h-[30px]" />
                      </div>
                    </div>
                  </div>

                  {/* Skill 2: Offered */}
                  {request.offeredSkill && (
                    <div className="space-y-2 pt-2">
                      <p className="text-xs text-muted-foreground">{request.offeredSkill.name} (Offering)</p>
                      <div className="flex gap-2">
                        <input type="number" min={1} value={offSessions} onChange={e => setOffSessions(e.target.value)} placeholder="Sessions" className="w-[80px] rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" />
                        <input type="number" min={15} step={15} value={offDuration} onChange={e => setOffDuration(e.target.value)} placeholder="Duration (min)" className="flex-1 rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2 items-center">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground shrink-0 w-[50px]">Days</span>
                          <div className="flex flex-wrap gap-1">
                            {daysOfWeek.map((day, idx) => {
                              const isSelected = offDays.includes(idx.toString());
                              const maxDays = parseInt(offSessions) || 1;
                              const isDisabled = !isSelected && offDays.length >= maxDays;
                              return (
                                <Badge 
                                  key={idx} 
                                  variant={isSelected ? "default" : "outline"}
                                  className={`cursor-pointer transition-colors hover:bg-muted ${isSelected ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-background"} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  onClick={() => !isDisabled && toggleDay(offDays, setOffDays, idx.toString(), maxDays)}
                                >
                                  {day.slice(0, 3)}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground shrink-0 w-[50px]">Time</span>
                          <input type="time" value={offTime} onChange={e => setOffTime(e.target.value)} className="w-[120px] rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary h-[30px]" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <p className="text-xs text-muted-foreground">Points <span className="opacity-50">(optional)</span></p>
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-amber-400 shrink-0" />
                      <input type="number" min={0} value={counterPoints} onChange={e => setCounterPoints(e.target.value)} placeholder="0 pts" className="w-[80px] rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" />
                      {parseInt(counterPoints) > 0 && (
                        <div className="flex gap-1 ml-auto">
                          <button type="button" onClick={() => setCounterPayerIsMe(true)} className={`rounded px-2 py-1.5 text-[10px] font-medium transition-colors ${counterPayerIsMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>I pay</button>
                          <button type="button" onClick={() => setCounterPayerIsMe(false)} className={`rounded px-2 py-1.5 text-[10px] font-medium transition-colors ${!counterPayerIsMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>They pay</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 space-y-2">
                    <Button onClick={handlePropose} disabled={sendingProposal} className="w-full gap-2">
                      {sendingProposal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Propose Terms & Schedule
                    </Button>
                    
                    {!amIAgreed && (
                      <Button onClick={handleAccept} disabled={sendingAccept || request.proposedSlots?.length === 0} variant="secondary" className="w-full gap-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 shadow-none">
                        {sendingAccept && <Loader2 className="w-4 h-4 animate-spin" />}
                        Accept Current Terms & Slots
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
