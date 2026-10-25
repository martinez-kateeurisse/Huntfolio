"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// "Failed to fetch" means nothing to a person; say what actually happened.
function friendlyError(error: Error): string {
  if (isAuthRetryableFetchError(error)) {
    return "Can't reach the sign-in service right now. Check your connection and try again in a minute.";
  }
  return error.message;
}

export function LoginForm({ initialError }: { initialError: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "verifying"
  >("idle");
  const [error, setError] = useState<string | null>(initialError);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(friendlyError(error));
      setStatus("idle");
    } else {
      setStatus("sent");
    }
  }

  // The same email carries a one-time code (when the Supabase email template
  // includes {{ .Token }}). Typing it in works on any device or browser,
  // unlike the link, which must open where it was requested.
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setStatus("verifying");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setError(
        isAuthRetryableFetchError(error)
          ? friendlyError(error)
          : "That code didn't work. Check it, or request a new email.",
      );
      setStatus("sent");
    } else {
      router.replace("/");
      router.refresh();
    }
  }

  if (status === "sent" || status === "verifying") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <CheckCircle2 className="size-8 text-emerald-500" />
          <div>
            <p className="font-medium">Check your inbox</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a sign-in link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
              Open it in this browser, or enter the code from the email.
            </p>
          </div>

          <form onSubmit={handleVerify} className="flex w-full flex-col gap-2">
            <Label htmlFor="code" className="sr-only">
              Code from the email
            </Label>
            <div className="flex gap-2">
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                maxLength={10}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                disabled={status === "verifying"}
                className="text-center tracking-widest"
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={status === "verifying" || code.length < 6}
              >
                {status === "verifying" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                Verify
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatus("idle");
              setCode("");
              setError(null);
            }}
          >
            Use a different email
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a magic link — no password
          needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "sending"}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={status === "sending" || !email}>
            {status === "sending" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mail className="size-4" />
            )}
            Send magic link
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
