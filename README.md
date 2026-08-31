# Ranked Minesweeper

1v1 minesweeper duels on identical boards. Race to clear the grid before your opponent — wins and losses update your ELO.

## Features

- **1v1 matchmaking** — queue by difficulty (Beginner / Intermediate / Expert)
- **Shared grid** — same seed and mine layout for both players
- **First to clear wins** — opponent loses immediately when you finish
- **ELO rating** — starts at 1000, K-factor 32
- **Leaderboard** — ranked by ELO

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000. Sign up, pick a difficulty, and click **Find opponent**. Open a second browser (or incognito) with another account to test locally.

## How duels work

1. Both players join the queue for the same difficulty
2. A match is created with one shared seed (mines placed from center safe cell)
3. Timer starts on your first click
4. **Win** — clear the entire board first → opponent loses, ELO updates
5. **Both explode** — draw, small ELO adjustment toward 0.5 expected score
6. **Both clear** — faster time wins (rare if first-clear rule already ended match)

## Tech

Next.js 15 · React 19 · sql.js (SQLite, no native build) · JWT auth
