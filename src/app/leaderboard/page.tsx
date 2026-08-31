import { LeaderboardTable } from "@/components/LeaderboardTable";

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ELO Leaderboard</h1>
      <p className="text-[var(--muted)]">
        Top players by duel rating. Everyone starts at 1000 ELO.
      </p>
      <LeaderboardTable />
    </div>
  );
}
