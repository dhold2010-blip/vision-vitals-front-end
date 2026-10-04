import { Link, useRouterState } from "@tanstack/react-router";
import { Clock3, House, ScanLine, Settings, ChartNoAxesColumn } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const items: {
  to: "/" | "/history" | "/scan" | "/reports" | "/settings";
  label: string;
  icon: typeof House;
  center?: boolean;
}[] = [
  { to: "/", label: "Home", icon: House },
  { to: "/history", label: "History", icon: Clock3 },
  { to: "/scan", label: "Scan", icon: ScanLine, center: true },
  { to: "/reports", label: "Reports", icon: ChartNoAxesColumn },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="animate-float absolute -top-32 -left-24 h-80 w-80 rounded-full bg-primary/25 blur-[120px]" />
      <div className="animate-float absolute top-1/3 -right-28 h-72 w-72 rounded-full bg-accent/25 blur-[130px] [animation-delay:2s]" />
      <div className="animate-float absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-secondary/15 blur-[130px] [animation-delay:4s]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,white_6%,transparent),transparent_55%)]" />
    </div>
  );
}

export function AppShell({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className="relative min-h-dvh">
      <Backdrop />
      <div className="relative mx-auto w-full max-w-2xl lg:max-w-3xl">
        <main className={cn(padded && "px-5 pt-6 pb-36 sm:px-8", className)}>{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="glass-strong flex items-end gap-1 rounded-[28px] px-2.5 py-2.5">
        {items.map(({ to, label, icon: Icon, center }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          if (center) {
            return (
              <Link
                key={to}
                to={to}
                aria-label={label}
                className="press relative -mt-7 grid size-16 place-items-center rounded-[24px] aurora shadow-[var(--shadow-glow)]"
              >
                <span className="animate-pulse-ring absolute inset-0 rounded-[24px] border border-secondary/50" />
                <Icon className="size-7 text-primary-foreground" strokeWidth={2.2} />
              </Link>
            );
          }
          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "press group flex w-[62px] flex-col items-center gap-1 rounded-2xl px-1 py-2",
                active
                  ? "bg-white/8 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-5 transition-transform duration-300",
                  active && "scale-110 text-secondary",
                )}
                strokeWidth={active ? 2.4 : 1.9}
              />
              <span className="text-[10px] font-medium tracking-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="animate-rise mb-6 flex items-start justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold tracking-[0.18em] text-secondary uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1.5 text-[28px] leading-tight font-extrabold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}
