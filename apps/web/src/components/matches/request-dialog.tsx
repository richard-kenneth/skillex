"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface UserSkill {
  id: string;
  type: "OFFERING" | "SEEKING";
  skill: { id: string; name: string };
}

interface MatchUser {
  id: string;
  name: string | null;
  skills: UserSkill[];
}

interface RequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchUser: MatchUser;
  currentUserSkills: UserSkill[];
}

export function RequestDialog({
  open,
  onOpenChange,
  matchUser,
  currentUserSkills,
}: RequestDialogProps) {
  const router = useRouter();
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Skills they offer that I want to learn
  const theirOffering = matchUser.skills.filter((s) => s.type === "OFFERING");
  // Skills I offer that I can give in return
  const myOffering = currentUserSkills.filter((s) => s.type === "OFFERING");

  const handleSubmit = async () => {
    if (!selectedSkillId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/exchanges/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            receiverId: matchUser.id,
            requestedSkillId: selectedSkillId,
            offeredSkillId: selectedOfferId ?? undefined,
            message: message || undefined,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send request");
      }

      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Request Exchange</DialogTitle>
          <DialogDescription>
            Send an exchange request to{" "}
            <span className="font-semibold text-foreground">
              {matchUser.name ?? "this user"}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Select skill to learn */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              What do you want to learn from them?
            </p>
            <div className="flex flex-wrap gap-2">
              {theirOffering.map((s) => (
                <Badge
                  key={s.skill.id}
                  variant={
                    selectedSkillId === s.skill.id ? "default" : "outline"
                  }
                  className={`cursor-pointer transition-all ${
                    selectedSkillId === s.skill.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setSelectedSkillId(s.skill.id)}
                >
                  {s.skill.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Select skill to offer */}
          {myOffering.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                What can you teach in return?{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {myOffering.map((s) => (
                  <Badge
                    key={s.skill.id}
                    variant={
                      selectedOfferId === s.skill.id ? "default" : "outline"
                    }
                    className={`cursor-pointer transition-all ${
                      selectedOfferId === s.skill.id
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "hover:bg-muted"
                    }`}
                    onClick={() =>
                      setSelectedOfferId(
                        selectedOfferId === s.skill.id ? null : s.skill.id,
                      )
                    }
                  >
                    {s.skill.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Message */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Message{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi! I'd love to learn from you..."
              className="w-full rounded-md border border-border/50 bg-muted/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={3}
              maxLength={500}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/20 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedSkillId || loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
