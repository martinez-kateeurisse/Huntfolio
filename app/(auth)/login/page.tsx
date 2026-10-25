import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in · Huntfolio",
};

// Set by /auth/callback when a magic link can't be used.
const CALLBACK_ERRORS: Record<string, string> = {
  expired:
    "That sign-in link has expired. Request a new one below — links only work once and for a limited time.",
  auth: "That sign-in link didn't work. It may have been used already, or opened in a different browser than the one you requested it from. Request a new link, or use the code from the email.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-3 grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground font-semibold">
            HF
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Huntfolio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your job search from saved to signed.
          </p>
        </div>
        <LoginForm
          initialError={
            error && Object.hasOwn(CALLBACK_ERRORS, error)
              ? CALLBACK_ERRORS[error]
              : null
          }
        />
      </div>
    </div>
  );
}
