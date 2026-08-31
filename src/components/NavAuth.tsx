"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface User {
  id: string;
  username: string;
  elo?: number;
}

export function NavAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  }

  if (loading) return <span className="text-[var(--muted)]">…</span>;

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-[var(--muted)]">
          {user.username}
          {user.elo != null && (
            <span className="ml-1 font-mono text-xs">({user.elo})</span>
          )}
        </span>
        <button
          onClick={logout}
          className="text-[var(--muted)] hover:text-[var(--text)]"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link href="/login" className="text-[var(--muted)] hover:text-[var(--text)]">
        Log in
      </Link>
      <Link
        href="/register"
        className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-white hover:bg-[var(--accent-hover)]"
      >
        Sign up
      </Link>
    </div>
  );
}
