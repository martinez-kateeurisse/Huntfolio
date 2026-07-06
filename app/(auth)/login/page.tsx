import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in · Huntfolio",
};

export default function LoginPage() {
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
        <LoginForm />
      </div>
    </div>
  );
}
