"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { Lock, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const t = searchParams.get("token");
    setToken(t);
    setIsInitializing(false);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!token) {
      toast.error("Invalid or missing reset token");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (error) {
        toast.error(error.message || "Failed to reset password");
      } else {
        setIsSuccess(true);
        toast.success("Password reset successfully!");
        setTimeout(() => router.push("/sign-in"), 3000);
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md shadow-lg border-border/50 bg-card/80 backdrop-blur-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">
              Password reset
            </CardTitle>
            <CardDescription className="text-lg">
              Your password has been successfully reset.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              You will be redirected to the sign-in page in a few seconds.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 text-center">
            <Link
              href="/sign-in"
              className="font-semibold text-primary hover:underline underline-offset-4"
            >
              Go to sign in now
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-lg border-border/50 bg-card/80 backdrop-blur-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Lock className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Reset password
          </CardTitle>
          <CardDescription>
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isInitializing ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Validating reset link...</p>
            </div>
          ) : !token ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Invalid Link</AlertTitle>
              <AlertDescription>
                The reset token is missing or invalid. Please request a new password reset link.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 border-border/50 focus:ring-primary/20"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-11 border-border/50 focus:ring-primary/20"
                />
              </div>
              <Button
                className="w-full h-11 text-base font-semibold shadow-sm transition-all hover:shadow-md mt-2"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Resetting..." : "Reset password"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link
              href="/sign-in"
              className="font-semibold text-primary hover:underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
       <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md shadow-lg border-border/50 bg-card/80 backdrop-blur-md">
          <CardHeader className="space-y-1 text-center">
             <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Lock className="h-10 w-10 text-primary animate-pulse" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">
              Loading
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </CardContent>
        </Card>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
