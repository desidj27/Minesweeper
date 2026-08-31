"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GameBoard } from "@/lib/game/board";
import type { Difficulty, GameSnapshot, MoveAction } from "@/lib/game/types";
import { DIFFICULTIES } from "@/lib/game/constants";

interface MatchInfo {
  id: string;
  seed: string;
  difficulty: Difficulty;
  safeX: number;
  safeY: number;
  status: string;
}

interface OpponentInfo {
  username: string;
  elo: number;
  finished: boolean;
  outcome: string | null;
  timeMs: number | null;
}

interface MeResult {
  won: boolean | null;
  eloDelta: number | null;
  elo: number;
  timeMs: number | null;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${s}.${String(cs).padStart(2, "0")}`;
}

const NUMBER_CLASSES = [
  "",
  "num-1",
  "num-2",
  "num-3",
  "num-4",
  "num-5",
  "num-6",
  "num-7",
  "num-8",
];

export function DuelGame({
  matchId,
  initialMatch,
  opponent,
}: {
  matchId: string;
  initialMatch: MatchInfo;
  opponent: OpponentInfo;
}) {
  const difficulty = initialMatch.difficulty;
  const config = DIFFICULTIES[difficulty];

  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [meResult, setMeResult] = useState<MeResult | null>(null);
  const [oppStatus, setOppStatus] = useState(opponent);
  const [submitted, setSubmitted] = useState(false);

  const boardRef = useRef<GameBoard | null>(null);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cellSize =
    config.width >= 30 ? 24 : config.width >= 16 ? 28 : 36;

  useEffect(() => {
    const board = GameBoard.layoutFromSeed(
      initialMatch.seed,
      difficulty,
      initialMatch.safeX,
      initialMatch.safeY
    );
    boardRef.current = board;
    setSnapshot(board.toClientSnapshot());
  }, [initialMatch, difficulty]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRunning(false);
  }, []);

  const startTimer = useCallback(() => {
    if (running) return;
    setRunning(true);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 10);
  }, [running]);

  const submitResult = useCallback(
    async (outcome: "won" | "lost", timeMs: number) => {
      if (submitted) return;
      setSubmitted(true);

      const res = await fetch(`/api/duel/matches/${matchId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, timeMs }),
      });
      const data = await res.json();

      if (data.me) {
        setMeResult({
          won: data.me.won,
          eloDelta: data.me.eloDelta,
          elo: data.me.elo,
          timeMs: data.me.timeMs,
        });
      }
      if (data.opponent) setOppStatus(data.opponent);

      if (data.finalized && data.me?.won === true) {
        const delta =
          data.me.eloDelta != null
            ? ` · ${data.me.eloDelta >= 0 ? "+" : ""}${data.me.eloDelta} ELO`
            : "";
        setResult(`Victory in ${formatTime(timeMs)}${delta}`);
      } else if (data.finalized && data.me?.won === false) {
        const delta =
          data.me.eloDelta != null
            ? ` · ${data.me.eloDelta} ELO`
            : "";
        setResult(`Defeat${delta}`);
      } else if (data.finalized && data.me?.won === null) {
        setResult("Draw — no ELO change");
      } else if (outcome === "lost") {
        setResult("You exploded — waiting for opponent…");
      }

      return data;
    },
    [matchId, submitted]
  );

  const pollMatch = useCallback(async () => {
    const res = await fetch(`/api/duel/matches/${matchId}`);
    if (!res.ok) return;
    const data = await res.json();

    if (data.opponent) setOppStatus(data.opponent);

    if (data.match?.status === "finished" && !submitted) {
      setLocked(true);
      stopTimer();
    }

    if (data.match?.status === "finished" && data.me) {
      setMeResult({
        won: data.me.won,
        eloDelta: data.me.eloDelta,
        elo: data.me.elo,
        timeMs: data.me.timeMs,
      });

      if (!result) {
        if (data.me.won === true) {
          const delta =
            data.me.eloDelta != null
              ? ` · +${data.me.eloDelta} ELO`
              : "";
          setResult(
            `Victory! Opponent: ${formatTime(data.opponent?.timeMs ?? 0)}${delta}`
          );
        } else if (data.me.won === false) {
          const delta =
            data.me.eloDelta != null
              ? ` · ${data.me.eloDelta} ELO`
              : "";
          setResult(
            data.opponent?.outcome === "won"
              ? `Opponent cleared first${delta}`
              : `Defeat${delta}`
          );
        } else {
          setResult("Draw");
        }
      }
      setLocked(true);
    }

    if (
      data.opponent?.outcome === "won" &&
      data.match?.status === "finished" &&
      boardRef.current?.status === "playing"
    ) {
      setLocked(true);
      stopTimer();
      if (!submitted) {
        const time = Date.now() - (startTimeRef.current || Date.now());
        await submitResult("lost", time);
      }
    }
  }, [matchId, submitted, result, stopTimer, submitResult]);

  useEffect(() => {
    const interval = setInterval(pollMatch, 1500);
    return () => clearInterval(interval);
  }, [pollMatch]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const applyAction = useCallback(
    async (x: number, y: number, action: MoveAction) => {
      const board = boardRef.current;
      if (!board || locked) return;

      if (action === "reveal" && !running) {
        startTimer();
      }

      board.applyMove({ x, y, action, timestamp: 0 });
      const revealMines = board.status === "lost";
      setSnapshot(board.toClientSnapshot(revealMines));

      if (board.status === "won" || board.status === "lost") {
        setLocked(true);
        stopTimer();
        const finalTime = Date.now() - startTimeRef.current;
        const outcome = board.status === "won" ? "won" : "lost";
        await submitResult(outcome, finalTime);
      }
    },
    [locked, running, startTimer, stopTimer, submitResult]
  );

  if (!snapshot) {
    return <p className="text-[var(--muted)]">Loading board…</p>;
  }

  const minesLeft = snapshot.mineCount - snapshot.flagsPlaced;

  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex w-full flex-wrap gap-6 text-sm">
        <div>
          <span className="text-[var(--muted)]">You </span>
          <span className="font-mono text-xl tabular-nums">{formatTime(elapsed)}</span>
        </div>
        <div>
          <span className="text-[var(--muted)]">Mines </span>
          <span className="font-mono text-xl">{minesLeft}</span>
        </div>
        <div>
          <span className="text-[var(--muted)]">vs </span>
          <span className="font-medium">{oppStatus.username}</span>
          <span className="text-[var(--muted)]"> ({oppStatus.elo} ELO)</span>
        </div>
        <div>
          <span className="text-[var(--muted)]">Opponent </span>
          <span>
            {oppStatus.finished
              ? oppStatus.outcome === "won"
                ? `cleared in ${formatTime(oppStatus.timeMs ?? 0)}`
                : "exploded"
              : "still playing…"}
          </span>
        </div>
      </div>

      {result && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            meResult?.won === true
              ? "border-[var(--success)] bg-green-950/30"
              : meResult?.won === false
                ? "border-[var(--danger)] bg-red-950/30"
                : "border-[var(--border)] bg-[var(--surface)]"
          }`}
        >
          <p className="font-medium">{result}</p>
          {meResult && (
            <p className="mt-1 text-[var(--muted)]">
              Rating: {meResult.elo} ELO
            </p>
          )}
          <Link
            href="/"
            className="mt-3 inline-block text-[var(--accent)] hover:underline"
          >
            Back to lobby
          </Link>
        </div>
      )}

      <div
        className="inline-block select-none border-4 border-[#808080] bg-[#808080] p-1"
        onContextMenu={(e) => e.preventDefault()}
      >
        {snapshot.cells.map((row, y) => (
          <div key={y} className="flex">
            {row.map((cell, x) => {
              const hidden = !cell.revealed;
              let content: React.ReactNode = null;
              if (cell.flagged && hidden) content = "🚩";
              else if (cell.revealed) {
                if (cell.isMine) content = "💣";
                else if (cell.adjacentMines > 0)
                  content = (
                    <span
                      className={`font-bold ${NUMBER_CLASSES[cell.adjacentMines]}`}
                    >
                      {cell.adjacentMines}
                    </span>
                  );
              }

              return (
                <button
                  key={x}
                  type="button"
                  disabled={locked || (snapshot.status !== "playing" && hidden)}
                  className={`flex items-center justify-center font-bold ${
                    hidden ? "cell-hidden" : "cell-revealed"
                  } ${cell.isMine && cell.revealed ? "cell-mine-hit" : ""}`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    fontSize: cellSize * 0.55,
                  }}
                  onClick={() => applyAction(x, y, "reveal")}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    applyAction(x, y, "flag");
                  }}
                  onDoubleClick={(e) => {
                    if (!cell.revealed || cell.adjacentMines === 0) return;
                    applyAction(x, y, "chord");
                  }}
                >
                  {content}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--muted)]">
        Same mine layout as your opponent · First to clear wins · Right-click flag · Double-click chord
      </p>
    </div>
  );
}
