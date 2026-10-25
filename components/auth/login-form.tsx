"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { CheckCircle2, KeyRound, Loader2, LogIn, Mail } from "lucide-react";
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

type Mode = "password" | "link";
type Status = "idle" | "working" | "sent" | "verifying";

// Email + password is the everyday way in. The emailed link (or code) is the
// fallback for the first sign-in, a forgotten password, or a new device —
// after using it, set a password from the account menu.
export function LoginForm({ initialError }: { initialError: string | null }) {
  const router = useRouter();
  // Arriving from a broken email link, the next step is a fresh link.
  const [mode, setMode] = useState<Mode>(initialError ? "link" : "password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(initialError);

  function signedIn() {
    router.replace("/");
    router.refresh();
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStatus("idle");
    setError(null);
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setError(null);

    const { error } = await createClient().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(
        isAuthRetryableFetchError(error)
          ? friendlyError(error)
          : "Wrong email or password. No password yet? Sign in with an email link once, then set one from the account menu.",
      );
      setStatus("idle");
    } else {
      signedIn();
    }
  }

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setError(null);

    const { error } = await createClient().auth.signInWithOtp({
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

    const { error } = await createClient().auth.verifyOtp({
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
      signedIn();
    }
  }

  const working = status === "working" || status === "verifying";

  if (mode === "link" && (status === "sent" || status === "verifying")) {
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
                disabled={working}
                className="text-center tracking-widest"
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={working || code.length < 6}
              >
                {working ? (
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
              setCode("");
              switchMode("password");
            }}
          >
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  const emailField = (
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
        disabled={working}
      />
    </div>
  );

  if (mode === "link") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email me a sign-in link</CardTitle>
          <CardDescription>
            For your first sign-in, a forgotten password, or a new device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendLink} className="flex flex-col gap-4">
            {emailField}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={working || !email}>
              {working ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Mail className="size-4" />
              )}
              Send link
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => switchMode("password")}
            >
              Sign in with password instead
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back — pick up where you left off.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePassword} className="flex flex-col gap-4">
          {emailField}
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={working}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={working || !email || !password}>
            {working ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogIn className="size-4" />
            )}
            Sign in
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => switchMode("link")}
          >
            Forgot password or first time? Email me a link
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
