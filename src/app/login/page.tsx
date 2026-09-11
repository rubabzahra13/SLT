"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowRight, Loader2, Lock, Mail, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { BrandMonogram } from "@/components/layout/BrandMonogram";
import { AUTH_PAGE_CANVAS, useAuthPageCanvas } from "@/components/login/useAuthPageCanvas";

const CollageBackground = dynamic(
  () =>
    import("@/components/login/CollageBackground").then(
      (mod) => mod.CollageBackground
    ),
  { ssr: false }
);

type DemoRole = "admin" | "user";

const DEMO_ACCOUNTS: {
  name: string;
  email: string;
  pass: string;
  role: DemoRole;
}[] = [
  { name: "Megan", email: "megan@soundslikethat.com", pass: "admin", role: "admin" },
  { name: "Andrea", email: "apetty@powermusic.com", pass: "admin", role: "admin" },
  { name: "Lori", email: "lori@powermusic.com", pass: "view", role: "user" },
  { name: "Dan", email: "dan@powermusic.com", pass: "view", role: "user" },
  { name: "Steve", email: "steve@powermusic.com", pass: "view", role: "user" },
];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.07] py-3 pl-10 pr-4 text-[15px] text-white placeholder:text-white/35 outline-none transition focus:border-white/25 focus:bg-white/10 focus:ring-2 focus:ring-white/10";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  useAuthPageCanvas();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoRole, setDemoRole] = useState<DemoRole>("admin");

  const demoAccountsForRole = DEMO_ACCOUNTS.filter((a) => a.role === demoRole);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function fillSample(sampleEmail: string, samplePass: string) {
    setEmail(sampleEmail);
    setPassword(samplePass);
    setError(null);
  }

  return (
    <div
      className="fixed inset-0 z-0 overflow-y-auto overscroll-y-none"
      style={{ backgroundColor: AUTH_PAGE_CANVAS }}
    >
      <CollageBackground className="pointer-events-none fixed inset-0 z-0" />

      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10 sm:px-6">
        <main className="w-full max-w-[400px] min-w-0">
          {/* Brand above card */}
          <div className="mb-6 flex flex-col items-center text-center">
            <BrandMonogram size="lg" imageTranslateXPx={10} />
            <h1 className="mt-4 text-[12px] font-semibold uppercase leading-tight tracking-[0.06em] text-brand-sidebar-accent drop-shadow-md">
              Sounds Like That
            </h1>
            <p className="mt-0.5 text-[10px] font-semibold uppercase leading-none tracking-[0.06em] text-brand-sidebar-text-muted">
              Admin Studio
            </p>
          </div>

          {/* Dark glass card — neutral tones that sit over the collage */}
          <div className="login-scrap-card p-7 sm:p-8">
            <h2 className="text-lg font-semibold text-white">Sign in</h2>
            <p className="mt-1 text-sm text-white/50">
              Studio email and password
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error ? (
                <div className="flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-3 text-sm text-red-200">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-300" strokeWidth={2} />
                  <span>{error}</span>
                </div>
              ) : null}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/45">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
                    strokeWidth={2}
                  />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@powermusic.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/45">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
                    strokeWidth={2}
                  />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-bold text-neutral-900 transition hover:scale-[1.01] hover:bg-white/95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Demo accounts
              </p>
              <p className="mt-2 text-xs text-white/50">Are you an admin?</p>
              <div
                className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-white/[0.06] p-1"
                role="tablist"
                aria-label="Demo account role"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={demoRole === "admin"}
                  onClick={() => setDemoRole("admin")}
                  className={clsx(
                    "rounded-lg py-2 text-xs font-semibold transition",
                    demoRole === "admin"
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-white/45 hover:text-white/70"
                  )}
                >
                  Admin
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={demoRole === "user"}
                  onClick={() => setDemoRole("user")}
                  className={clsx(
                    "rounded-lg py-2 text-xs font-semibold transition",
                    demoRole === "user"
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-white/45 hover:text-white/70"
                  )}
                >
                  User
                </button>
              </div>
              <p className="mt-2 text-[11px] text-white/40">
                {demoRole === "admin"
                  ? "Full access: edit, send, and complete orders."
                  : "User access: view dashboards and records only."}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {demoAccountsForRole.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => fillSample(account.email, account.pass)}
                    className="rounded-lg border border-white/10 bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white/85 transition hover:bg-white/14 active:scale-[0.98]"
                  >
                    {account.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] text-white/50">
            Authorized personnel only
          </p>
        </main>
      </div>
    </div>
  );
}
