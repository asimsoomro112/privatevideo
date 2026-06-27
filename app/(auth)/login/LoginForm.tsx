"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heart, LockKeyhole, Loader2 } from "lucide-react";
import { SITE_NAME } from "@/lib/site";

export default function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await signIn("credentials", {
      password,
      redirect: false,
      callbackUrl,
    });

    setIsLoading(false);

    if (result?.error) {
      setError("Wrong password. Try again, my love.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-6 text-center sm:mb-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-rose-300/20 bg-rose-400/10 text-accent shadow-[0_0_40px_rgba(244,63,125,0.25)] sm:h-14 sm:w-14">
          <Heart size={26} fill="currentColor" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
          {SITE_NAME}
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          A private cinema made just for you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-5 sm:p-6 md:p-8">
        <div className="mb-5 space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium leading-none text-text-secondary"
          >
            Private password
          </label>
          <div className="relative">
            <LockKeyhole
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              required
              className="h-12 w-full rounded-lg border border-glass-border bg-bg-tertiary px-10 text-base text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm"
              placeholder="Enter the secret"
            />
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-sm leading-relaxed text-accent">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary min-h-12 w-full px-4 py-3 disabled:cursor-wait disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Unlocking...
            </>
          ) : (
            <>
              <Heart size={18} fill="currentColor" />
              Enter Cinema
            </>
          )}
        </button>
      </form>
    </div>
  );
}
