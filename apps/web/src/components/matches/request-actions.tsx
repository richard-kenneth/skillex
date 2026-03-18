"use client";

import { Button } from "@/components/ui/button";
import { Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface RequestActionsProps {
  requestId: string;
  type: "received" | "sent";
  status: string;
}

export function RequestActions({
  requestId,
  type,
  status,
}: RequestActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  if (status !== "PENDING") return null;

  const handleAction = async (action: "accept" | "reject" | "cancel") => {
    setLoading(action);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/exchanges/requests/${requestId}/${action}`,
        {
          method: "PATCH",
          credentials: "include",
        },
      );

      if (!res.ok) {
        const err = await res.json();
        console.error("Action failed:", err.message);
      }

      router.refresh();
    } catch (e) {
      console.error("Action error:", e);
    } finally {
      setLoading(null);
    }
  };

  if (type === "received") {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
          onClick={() => handleAction("accept")}
          disabled={loading !== null}
        >
          {loading === "accept" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          onClick={() => handleAction("reject")}
          disabled={loading !== null}
        >
          {loading === "reject" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
          Decline
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 border-zinc-700 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300"
      onClick={() => handleAction("cancel")}
      disabled={loading !== null}
    >
      {loading === "cancel" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <X className="h-3.5 w-3.5" />
      )}
      Cancel
    </Button>
  );
}
