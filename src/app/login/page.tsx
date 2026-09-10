"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldAlert, ArrowRight, CheckCircle2, UserCheck } from "lucide-react";
import { useAuth, SAMPLE_USERS } from "@/context/AuthContext";
import { BrandMonogram } from "@/components/layout/BrandMonogram";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
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
    <div className="flex min-h-screen w-full items-center justify-center bg-brand-bg px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-brand-blue/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-brand-sidebar-elevated/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-sidebar shadow-lg ring-1 ring-brand-sidebar-border">
            <BrandMonogram />
          </div>
          <h2 className="text-display mt-6 text-2xl font-bold tracking-tight text-brand-ink">
            Sounds Like That
          </h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
            Admin Studio · Sign In
          </p>
        </div>

        {/* Card Form */}
        <div className="dashboard-panel shadow-xl p-8 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-brand-danger/20 bg-brand-orange-soft/40 px-4 py-3 text-[13px] font-medium text-brand-danger">
                <ShieldAlert className="h-4 w-4 shrink-0 text-brand-danger" />
                <span>{error}</span>
              </div>
            ) : null}

            <div>
              <label className="block text-[12px] font-semibold text-brand-ink-secondary mb-1.5">
                Email or Username
              </label>
              <input
                type="email"
                required
                placeholder="name@powermusic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-brand-line bg-white px-3.5 py-2.5 text-[13px] font-medium text-brand-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-brand-ink-secondary mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-brand-line bg-white px-3.5 py-2.5 text-[13px] font-medium text-brand-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-3 px-4 text-[14px] font-semibold text-white transition hover:bg-brand-blue-hover disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? (
                "Signing in..."
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 border-t border-brand-line pt-6">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
              <UserCheck className="h-3.5 w-3.5 text-brand-blue" />
              Demo Test Accounts
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillSample("megan@soundslikethat.com", "admin")}
                className="flex flex-col text-left rounded-lg border border-brand-line bg-white/60 p-2 text-xs transition hover:border-brand-blue/40 hover:bg-brand-blue-soft/20"
              >
                <span className="font-semibold text-brand-ink">Megan</span>
                <span className="text-[10px] text-brand-blue font-medium">Full Access (admin)</span>
              </button>
              <button
                type="button"
                onClick={() => fillSample("apetty@powermusic.com", "admin")}
                className="flex flex-col text-left rounded-lg border border-brand-line bg-white/60 p-2 text-xs transition hover:border-brand-blue/40 hover:bg-brand-blue-soft/20"
              >
                <span className="font-semibold text-brand-ink">Andrea</span>
                <span className="text-[10px] text-brand-blue font-medium">Full Access (admin)</span>
              </button>
              <button
                type="button"
                onClick={() => fillSample("lori@powermusic.com", "view")}
                className="flex flex-col text-left rounded-lg border border-brand-line bg-white/60 p-2 text-xs transition hover:border-brand-orange-soft hover:bg-brand-orange-soft/20"
              >
                <span className="font-semibold text-brand-ink">Lori</span>
                <span className="text-[10px] text-brand-amber font-medium">View Only (view)</span>
              </button>
              <button
                type="button"
                onClick={() => fillSample("dan@powermusic.com", "view")}
                className="flex flex-col text-left rounded-lg border border-brand-line bg-white/60 p-2 text-xs transition hover:border-brand-orange-soft hover:bg-brand-orange-soft/20"
              >
                <span className="font-semibold text-brand-ink">Dan</span>
                <span className="text-[10px] text-brand-amber font-medium">View Only (view)</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => fillSample("steve@powermusic.com", "view")}
              className="mt-2 w-full flex items-center justify-between rounded-lg border border-brand-line bg-white/60 px-2.5 py-1.5 text-xs transition hover:border-brand-orange-soft hover:bg-brand-orange-soft/20"
            >
              <span className="font-semibold text-brand-ink">Steve</span>
              <span className="text-[10px] text-brand-amber font-medium">View Only (view)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
