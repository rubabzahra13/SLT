"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  ArrowRight,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { BrandMonogram } from "@/components/layout/BrandMonogram";
import { LoginBgAtmosphere } from "@/components/login/LoginBgAtmosphere";
import { LoginCollagePanel } from "@/components/login/LoginCollagePanel";
import { useAuthPageCanvas } from "@/components/login/useAuthPageCanvas";
import styles from "./login.module.css";

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
  "login-figma-input w-full rounded-xl border border-white/12 bg-[#0a0d12]/90 py-2.5 pl-10 pr-4 text-[15px] text-white placeholder:text-white/30 outline-none transition focus:border-brand-blue/60 focus:ring-2 focus:ring-brand-blue/20";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  useAuthPageCanvas("#0a0c10");

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
    <div className="fixed inset-0 z-0">
      <LoginBgAtmosphere />
      <div
        className="login-figma-vignette pointer-events-none fixed inset-0 z-[1]"
        aria-hidden="true"
      />

      <div className="relative z-20 flex h-full min-h-[100dvh] items-center justify-center overflow-y-auto px-4 py-8 sm:px-6 lg:px-10">
        <div className="flex w-full max-w-[1180px] items-center gap-0">
          <LoginCollagePanel />

          <main className={styles.formPanel}>
            <div className="login-scrap-card login-figma-card">
              <div className="mb-4 flex items-center gap-3">
                <BrandMonogram size="md" imageTranslateXPx={4} />
                <span className="text-[15px] font-semibold tracking-tight text-white">
                  Sounds Like That
                </span>
              </div>

              <h1 className={styles.headline}>
                Sign in as{" "}
                <span
                  className={
                    demoRole === "admin" ? "text-brand-blue" : "text-brand-orange"
                  }
                >
                  {demoRole === "admin" ? "Admin" : "User"}
                </span>
              </h1>
              <p className="mt-1.5 text-sm leading-snug text-white/50">
                Studio email and password for Sounds Like That producers and
                staff.
              </p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {error ? (
                  <div className="flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
                    <ShieldAlert
                      className="mt-0.5 h-4 w-4 shrink-0 text-red-300"
                      strokeWidth={2}
                    />
                    <span>{error}</span>
                  </div>
                ) : null}

                <div className="grid gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/55">
                      Work email
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
                    <label className="mb-1.5 block text-xs font-medium text-white/55">
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
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="login-figma-submit flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
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

              <div className="login-card-demo mt-5 border-t border-white/8 pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  Demo accounts
                </p>
                <p className="mt-1.5 text-xs text-white/50">Are you an admin?</p>
                <div
                  className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1"
                  role="tablist"
                  aria-label="Demo account role"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={demoRole === "admin"}
                    onClick={() => setDemoRole("admin")}
                    className={clsx(
                      "rounded-lg py-1.5 text-xs font-semibold transition",
                      demoRole === "admin"
                        ? "bg-brand-blue text-white shadow-[inset_0_1px_0_0_var(--color-brand-blue-deep)]"
                        : "text-white/45 hover:text-brand-blue/90"
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
                      "rounded-lg py-1.5 text-xs font-semibold transition",
                      demoRole === "user"
                        ? "bg-brand-orange text-white shadow-[inset_0_1px_0_0_var(--color-brand-orange-deep)]"
                        : "text-white/45 hover:text-brand-orange/90"
                    )}
                  >
                    User
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-white/40">
                  {demoRole === "admin"
                    ? "Full access: edit, send, and complete orders."
                    : "User access: view dashboards and records only."}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {demoAccountsForRole.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => fillSample(account.email, account.pass)}
                      className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/85 transition hover:bg-white/12 active:scale-[0.98]"
                    >
                      {account.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-[11px] text-white/45">
              Authorized personnel only
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}
