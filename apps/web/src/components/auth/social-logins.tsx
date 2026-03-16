"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";
import { getAuthCallbackUrl } from "@/lib/utils";
import { Chrome, Linkedin } from "lucide-react";
import { toast } from "sonner";

interface SocialLoginsProps {
  className?: string;
}

export function SocialLogins({ className }: SocialLoginsProps) {
  const handleSocialSignIn = async (provider: "google" | "linkedin") => {
    try {
      await signIn.social({
        provider,
        callbackURL: getAuthCallbackUrl(),
      });
    } catch {
      toast.error(`Failed to sign in with ${provider}`);
    }
  };

  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      <Button
        variant="outline"
        className="flex items-center gap-2 h-11 hover:bg-primary/5 transition-colors"
        onClick={() => handleSocialSignIn("google")}
      >
        <Chrome className="h-5 w-5" />
        Google
      </Button>
      <Button
        variant="outline"
        className="flex items-center gap-2 h-11 hover:bg-primary/5 transition-colors"
        onClick={() => handleSocialSignIn("linkedin")}
      >
        <Linkedin className="h-5 w-5" />
        LinkedIn
      </Button>
    </div>
  );
}
