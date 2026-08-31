"use client";

import { useEffect, useState } from "react";

interface Entry {
  rank: number;
  username: string;
  elo: number;
}

export function LeaderboardTable() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[var(--muted)]">Loading…</p>;

  if (entries.length === 0) {
    return <p className="text-[var(--muted)]">No players yet. Win a duel to appear here!</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
          <th className="py-2 pr-4">#</th>
          <th className="py-2 pr-4">Player</th>
          <th className="py-2">ELO</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.rank} className="border-b border-[var(--border)]/50">
            <td className="py-2 pr-4 font-mono text-[var(--muted)]">{e.rank}</td>
            <td className="py-2 pr-4">{e.username}</td>
            <td className="py-2 font-mono font-medium">{e.elo}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
