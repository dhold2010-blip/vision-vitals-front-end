import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Apple, Fingerprint, Mail, ArrowRight, Lock, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Backdrop } from "@/components/vv/app-shell";
import { GlassCard } from "@/components/vv/glass-card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — VisionVitals AI" },
      {
        name: "description",
        content:
          "Sign in or create your VisionVitals AI account with email, biometrics, Google or Apple.",
      },
      { property: "og:title", content: "Sign in — VisionVitals AI" },
      { property: "og:description", content: "Email, biometric, Google and Apple sign in." },
    ],
  }),
  component: Auth,
});

type Mode = "login" | "register" | "forgot";

function Field({
  icon: Icon,
  label,
  type = "text",
  autoComplete,
}: {
  icon: typeof Mail;
  label: string;
  type?: string;
  autoComplete?: string;
}) {
  const [value, setValue] = useState("");
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
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full bg-transparent pl-7 text-sm outline-none"
      />
    </label>
  );
}

function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const navigate = useNavigate();

  const copy = {
    login: { title: "Welcome back", sub: "Sign in to pick up your health trend.", cta: "Sign in" },
    register: {
      title: "Create account",
      sub: "Two fields and your first scan is ready.",
      cta: "Create account",
    },
    forgot: {
      title: "Reset password",
      sub: "We'll email you a secure reset link.",
      cta: "Send reset link",
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
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === "forgot") {
                toast.success("Reset link sent");
                setMode("login");
              } else {
                void navigate({ to: "/" });
              }
            }}
          >
            {mode === "register" ? (
              <Field icon={User} label="Full name" autoComplete="name" />
            ) : null}
            <Field icon={Mail} label="Email address" type="email" autoComplete="email" />
            {mode !== "forgot" ? (
              <Field icon={Lock} label="Password" type="password" autoComplete="current-password" />
            ) : null}

            {mode === "login" ? (
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="justify-self-end text-xs font-medium text-secondary"
              >
                Forgot password?
              </button>
            ) : null}

            <button
              type="submit"
              className="press mt-2 flex items-center justify-center gap-2 rounded-2xl aurora py-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              {copy.cta} <ArrowRight className="size-4" />
            </button>
          </form>

          {mode !== "forgot" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  toast.success("Face ID verified");
                  void navigate({ to: "/" });
                }}
                className="press mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-secondary/40 bg-secondary/10 py-4 text-sm font-semibold"
              >
                <Fingerprint className="size-4 text-secondary" /> Use biometrics
              </button>

              <div className="my-6 flex items-center gap-3 text-[11px] tracking-widest text-muted-foreground uppercase">
                <span className="h-px flex-1 bg-border" /> or{" "}
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => void navigate({ to: "/" })}
                  className="press flex items-center justify-center gap-2 rounded-2xl border border-border bg-white/5 py-3.5 text-sm font-medium"
                >
                  <GoogleMark /> Google
                </button>
                <button
                  type="button"
                  onClick={() => void navigate({ to: "/" })}
                  className="press flex items-center justify-center gap-2 rounded-2xl border border-border bg-white/5 py-3.5 text-sm font-medium"
                >
                  <Apple className="size-4" /> Apple
                </button>
              </div>
            </>
          ) : null}
        </GlassCard>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {mode === "register" ? "Already have an account? " : "New to VisionVitals? "}
          <button
            type="button"
            onClick={() => setMode(mode === "register" ? "login" : "register")}
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

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5a4.7 4.7 0 0 1-2 3.1l3.2 2.5c1.9-1.7 3-4.3 3-7.3 0-.7-.1-1.4-.2-2z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3 5.9 15l-2.5 2A9 9 0 0 0 12 21c2.4 0 4.5-.8 6-2.2l-3.2-2.5c-.8.6-1.9.9-2.8.9-2.3 0-4.2-1.5-4.9-3.6z"
      />
      <path fill="#FBBC05" d="M3.4 7A9 9 0 0 0 3.4 17l3.2-2.5a5.4 5.4 0 0 1 0-3.4z" />
      <path
        fill="#4285F4"
        d="M12 6.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 3.4 7l3.2 2.5C7.3 7.4 9.5 6.6 12 6.6z"
      />
    </svg>
  );
}
