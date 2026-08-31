import Link from "next/link";
import { notFound } from "next/navigation";
import { MinesweeperGame } from "@/components/MinesweeperGame";
import { DIFFICULTIES } from "@/lib/game/constants";
import type { Difficulty } from "@/lib/game/types";

const VALID = new Set<string>(["beginner", "intermediate", "expert"]);

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ difficulty: string }>;
  searchParams: Promise<{ ranked?: string }>;
}) {
  const { difficulty: diffParam } = await params;
  const { ranked: rankedParam } = await searchParams;

  if (!VALID.has(diffParam)) notFound();

  const difficulty = diffParam as Difficulty;
  const ranked = rankedParam === "1";
  const config = DIFFICULTIES[difficulty];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {config.label}
          {ranked ? " — Ranked" : " — Practice"}
        </h1>
      </div>
      <MinesweeperGame difficulty={difficulty} ranked={ranked} />
    </div>
  );
}
