"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameBoard } from "@/lib/game/board";
import type { Difficulty, GameSnapshot, Move, MoveAction } from "@/lib/game/types";
import { DIFFICULTIES } from "@/lib/game/constants";

interface GameSession {
  gameId: string;
  seed: string;
  difficulty: Difficulty;
  ranked: boolean;
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

export function MinesweeperGame({
  difficulty,
  ranked,
}: {
  difficulty: Difficulty;
  ranked: boolean;
}) {
  const config = DIFFICULTIES[difficulty];
  const [session, setSession] = useState<GameSession | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const boardRef = useRef<GameBoard | null>(null);
  const movesRef = useRef<Move[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cellSize =
    config.width >= 30 ? 24 : config.width >= 16 ? 28 : 36;

  useEffect(() => {
    fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty, ranked }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to start game");
        setSession({
          gameId: data.gameId,
          seed: data.seed,
          difficulty: data.difficulty,
          ranked: data.ranked,
        });
        const empty = GameBoard.createEmpty(difficulty);
        boardRef.current = empty;
        setSnapshot(empty.toClientSnapshot());
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [difficulty, ranked]);

  const startTimer = useCallback(() => {
    if (running) return;
    setRunning(true);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 10);
  }, [running]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRunning(false);
  }, []);

  const recordMove = useCallback((x: number, y: number, action: MoveAction) => {
    movesRef.current.push({
      x,
      y,
      action,
      timestamp: Date.now() - (startTimeRef.current || Date.now()),
    });
  }, []);

  const applyAction = useCallback(
    async (x: number, y: number, action: MoveAction) => {
      let board = boardRef.current;
      if (!board || !session) return;

      if (action === "reveal" && !board.firstClickDone) {
        board = GameBoard.fromSeed(session.seed, difficulty, x, y);
        boardRef.current = board;
        startTimer();
        recordMove(x, y, action);
      } else {
        if (!board.firstClickDone) return;
        board.applyMove({ x, y, action, timestamp: 0 });
        recordMove(x, y, action);
      }

      const revealMines = board.status === "lost";
      setSnapshot(board.toClientSnapshot(revealMines));

      if (board.status === "won" || board.status === "lost") {
        stopTimer();
        const finalTime = Date.now() - startTimeRef.current;

        if (board.status === "won" && session.ranked) {
          const res = await fetch(`/api/games/${session.gameId}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              timeMs: finalTime,
              moves: movesRef.current,
            }),
          });
          const data = await res.json();
          if (data.accepted) {
            const pb = data.isPersonalBest ? " — New personal best!" : "";
            setResult(
              `Ranked clear: ${formatTime(data.timeMs)} · 3BV ${data.threeBv}${pb}`
            );
          } else {
            setResult(data.reason ?? "Run not accepted for leaderboard");
          }
        } else if (board.status === "won") {
          setResult(`Practice clear: ${formatTime(finalTime)}`);
        } else {
          setResult("Mine hit — game over");
        }
      }
    },
    [session, difficulty, startTimer, stopTimer, recordMove]
  );

  function handleClick(x: number, y: number) {
    if (!snapshot || snapshot.status !== "playing") return;
    applyAction(x, y, "reveal");
  }

  function handleContextMenu(e: React.MouseEvent, x: number, y: number) {
    e.preventDefault();
    if (!snapshot || snapshot.status !== "playing") return;
    applyAction(x, y, "flag");
  }

  function handleChord(e: React.MouseEvent, x: number, y: number) {
    if (e.button !== 0) return;
    if (!snapshot || snapshot.status !== "playing") return;
    const cell = snapshot.cells[y][x];
    if (!cell.revealed || cell.adjacentMines === 0) return;
    applyAction(x, y, "chord");
  }

  if (loading) {
    return <p className="text-[var(--muted)]">Starting game…</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--danger)] bg-red-950/30 p-4">
        <p>{error}</p>
        {error.includes("Sign in") && (
          <a href="/login" className="mt-2 inline-block text-[var(--accent)] underline">
            Log in to play ranked
          </a>
        )}
      </div>
    );
  }

  if (!snapshot) return null;

  const minesLeft = snapshot.mineCount - snapshot.flagsPlaced;

  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex w-full max-w-full flex-wrap items-center gap-6 text-sm">
        <div>
          <span className="text-[var(--muted)]">Time </span>
          <span className="font-mono text-xl tabular-nums">{formatTime(elapsed)}</span>
        </div>
        <div>
          <span className="text-[var(--muted)]">Mines </span>
          <span className="font-mono text-xl tabular-nums">{minesLeft}</span>
        </div>
        <div>
          <span className="text-[var(--muted)]">Mode </span>
          <span>{ranked ? "Ranked" : "Practice"}</span>
        </div>
      </div>

      {result && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            result.includes("clear") || result.includes("best")
              ? "border-[var(--success)] bg-green-950/30"
              : "border-[var(--border)] bg-[var(--surface)]"
          }`}
        >
          {result}
        </div>
      )}

      <div
        className="inline-block select-none border-4 border-[#808080] bg-[#808080] p-1"
        style={{ touchAction: "manipulation" }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {snapshot.cells.map((row, y) => (
          <div key={y} className="flex">
            {row.map((cell, x) => {
              const hidden = !cell.revealed;

              let content: React.ReactNode = null;
              if (cell.flagged && hidden) {
                content = "🚩";
              } else if (cell.revealed) {
                if (cell.isMine) {
                  content = "💣";
                } else if (cell.adjacentMines > 0) {
                  content = (
                    <span className={`font-bold ${NUMBER_CLASSES[cell.adjacentMines]}`}>
                      {cell.adjacentMines}
                    </span>
                  );
                }
              }

              return (
                <button
                  key={x}
                  type="button"
                  className={`flex items-center justify-center font-bold leading-none ${
                    hidden ? "cell-hidden" : "cell-revealed"
                  } ${cell.isMine && cell.revealed ? "cell-mine-hit" : ""}`}
                  style={{ width: cellSize, height: cellSize, fontSize: cellSize * 0.55 }}
                  onClick={() => handleClick(x, y)}
                  onContextMenu={(e) => handleContextMenu(e, x, y)}
                  onDoubleClick={(e) => handleChord(e, x, y)}
                  disabled={snapshot.status !== "playing" && hidden}
                >
                  {content}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--muted)]">
        Left-click reveal · Right-click flag · Double-click chord on revealed numbers
      </p>
    </div>
  );
}
