import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Backdrop } from "@/components/vv/app-shell";
import { GlassCard } from "@/components/vv/glass-card";
import {
  getCurrentUser,
  loginAccount,
  logoutAccount,
  registerAccount,
  type AuthUser,
} from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — VisionVitals AI" },
      {
        name: "description",
        content: "Sign in or create your VisionVitals AI account with email and password.",
      },
      { property: "og:title", content: "Sign in — VisionVitals AI" },
      { property: "og:description", content: "Email and password sign in." },
    ],
  }),
  component: Auth,
});

type Mode = "login" | "register";

function Field({
  icon: Icon,
  label,
  type = "text",
  autoComplete,
  value,
  onChange,
  hint,
  disabled,
}: {
  icon: typeof Mail;
  label: string;
  type?: string;
  autoComplete?: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;

  return (
    <label
      className={cn(
        "relative block rounded-2xl border bg-white/4 px-4 pt-6 pb-2.5 transition-all duration-300 ease-[var(--ease-smooth)]",
        focused ? "border-primary/60 shadow-[var(--shadow-glow)]" : "border-border",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute left-11 transition-all duration-300 ease-[var(--ease-smooth)]",
          floated
            ? "top-2 text-[10px] tracking-wide text-secondary uppercase"
            : "top-4.5 text-sm text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span className="absolute top-1/2 left-4 -translate-y-1/2">
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <input
        type={type}
        autoComplete={autoComplete}
        aria-label={label}
        aria-describedby={hint ? `${type}-hint` : undefined}
        required
        disabled={disabled}
        maxLength={type === "password" ? 128 : 320}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full bg-transparent pl-7 text-sm outline-none"
      />
      {hint ? (
        <span id={`${type}-hint`} className="mt-2 block pl-7 text-xs text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    void getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  const copy = {
    login: { title: "Welcome back", sub: "Sign in to pick up your health trend.", cta: "Sign in" },
    register: {
      title: "Create account",
      sub: "Create your account to start a personal scan.",
      cta: "Create account",
    },
  }[mode];

  return (
    <div className="relative min-h-dvh">
      <Backdrop />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-10">
        <div className="animate-rise mb-8 text-center">
          <p className="text-lg font-bold tracking-tight">
            Vision<span className="text-gradient">Vitals</span> AI
          </p>
        </div>

        <GlassCard className="animate-scale-in p-7">
          <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">{copy.title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{copy.sub}</p>

          <form
            className="mt-7 grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (pending) return;
              setError(null);
              if (!email.trim() || !password) {
                setError("Enter your email address and password.");
                return;
              }
              if (mode === "register" && password.length < 12) {
                setError("Use at least 12 characters for your new password.");
                return;
              }
              if (password.length > 128) {
                setError("Your password must be 128 characters or fewer.");
                return;
              }
              setPending(true);
              try {
                const authenticatedUser =
                  mode === "register"
                    ? await registerAccount({ data: { email, password } })
                    : await loginAccount({ data: { email, password } });
                setUser(authenticatedUser);
                toast.success(mode === "register" ? "Account created" : "Signed in");
                void navigate({ to: "/" });
              } catch (reason) {
                setError(
                  reason instanceof Error
                    ? reason.message
                    : "Authentication failed. Please try again.",
                );
              } finally {
                setPending(false);
              }
            }}
          >
            <Field
              icon={Mail}
              label="Email address"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              disabled={pending}
            />
            <Field
              icon={Lock}
              label="Password"
              type="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={password}
              onChange={setPassword}
              disabled={pending}
              hint={
                mode === "register"
                  ? "Use 12–128 characters for your new password."
                  : "Enter the password you used when creating your account."
              }
            />
            {error ? (
              <p role="alert" className="text-sm text-warning">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="press mt-2 flex items-center justify-center gap-2 rounded-2xl aurora py-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Please wait…" : copy.cta} <ArrowRight className="size-4" />
            </button>
          </form>

          {user ? (
            <button
              type="button"
              className="press mt-4 w-full rounded-2xl border border-border py-3 text-sm"
              onClick={async () => {
                await logoutAccount();
                setUser(null);
                toast.success("Signed out");
              }}
            >
              Sign out {user.email}
            </button>
          ) : null}
        </GlassCard>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {mode === "register" ? "Already have an account? " : "New to VisionVitals? "}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setMode(mode === "register" ? "login" : "register");
            }}
            className="font-semibold text-secondary"
          >
            {mode === "register" ? "Sign in" : "Create one"}
          </button>
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          <Link to="/onboarding">See how it works</Link>
        </p>
      </div>
    </div>
  );
}
