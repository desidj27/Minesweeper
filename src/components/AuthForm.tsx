"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-4">
      <div>
        <label className="mb-1 block text-sm text-[var(--muted)]">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
          autoComplete="username"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-[var(--muted)]">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-[var(--accent)] py-2 font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
      >
        {loading ? "…" : mode === "login" ? "Log in" : "Create account"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        {mode === "login" ? (
          <>
            No account?{" "}
            <Link href="/register" className="text-[var(--accent)] hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have one?{" "}
            <Link href="/login" className="text-[var(--accent)] hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
