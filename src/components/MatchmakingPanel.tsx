"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DIFFICULTIES } from "@/lib/game/constants";
import type { Difficulty } from "@/lib/game/types";

export function MatchmakingPanel({ difficulty }: { difficulty: Difficulty }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "queued" | "searching">("idle");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async () => {
    const res = await fetch("/api/duel/status");
    const data = await res.json();
    if (data.state === "matched" && data.matchId) {
      stopPolling();
      router.push(`/duel/${data.matchId}`);
    }
  }, [router, stopPolling]);

  async function findMatch() {
    setError(null);
    setState("searching");

    const res = await fetch("/api/duel/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Could not join queue");
      setState("idle");
      return;
    }

    if (data.status === "matched" && data.matchId) {
      router.push(`/duel/${data.matchId}`);
      return;
    }

    setState("queued");
    pollRef.current = setInterval(pollStatus, 1500);
  }

  async function cancel() {
    stopPolling();
    await fetch("/api/duel/queue", { method: "DELETE" });
    setState("idle");
  }

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const cfg = DIFFICULTIES[difficulty];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-lg font-semibold">{cfg.label} Duel</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {cfg.width}×{cfg.height} · {cfg.mines} mines · same board as opponent
      </p>

      {error && (
        <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
      )}

      <div className="mt-4">
        {state === "idle" && (
          <button
            onClick={findMatch}
            className="w-full rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Find opponent
          </button>
        )}
        {(state === "queued" || state === "searching") && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--muted)]">
              Searching for opponent…
            </p>
            <button
              onClick={cancel}
              className="w-full rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--surface-hover)]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
