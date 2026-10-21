# Scoring rules (v1) in plain English

The source of truth is `packages/engine/src/rules/v1.ts` and the engine's tests. This page explains them. Any change to scoring is a new rules version; a closed season keeps its version.

## The week

- A week runs Monday 00:00 to Sunday 23:59, London time. A season is three weeks starting on a Monday.
- The week's scores close on **Monday 12:00**, so Sunday runs can still come in.

## Your baseline

Your typical week: **km** and **number of runs**. You enter it when the season starts and it stays frozen until the season ends, so improving mid-season never makes winning harder.

## Your commitment

- By **Sunday 23:59** you commit to next week's **runs and km**. That's all: no training plan needed.
- Km must be **80–130%** of your baseline km. Runs can be **one fewer to two more** than your baseline runs (at least 1).
- A commitment made after Sunday 23:59 doesn't count. If you don't commit, **last week's commitment carries over**. In week one, your baseline is your commitment.

## Which runs count

- A run qualifies if it's **at least 15 minutes or 2 km**.
- It must arrive (from Strava or typed in) by **23:59 two days after the run**, and before the week closes on Monday 12:00.
- Every qualifying run adds to your km. Only **one run per day** counts as a run, so a double day gives you the km but not two runs.

## Points each week

| Rule               | Points                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Show up**        | 5 per run, up to 4 runs (max 20)                                                                                                |
| **Keep your word** | 15 if you did every committed run and 95%+ of your committed km. 8 if you were at most one run short and did 75%+ of your km    |
| **Ambition**       | +1 for each full 10% your committed km sits above your baseline (max +3). Only in a week where you earned keep-your-word points |
| **Duel**           | Win 10, draw 5, lose 0                                                                                                          |
| **Bounty**         | 5, once a week, for claiming the week's bounty on a qualifying run                                                              |
| **Going beyond**   | 0. Running further than you committed earns nothing                                                                             |

The most you can score in a week is **53**. Your season score is the sum of your three weeks.

## Duels

- Every Monday you're paired with a crew mate. Pairings rotate so you meet different people; they're shuffled per season but fixed, so nobody can game them.
- **First to 100% of their own committed km wins**, judged by run date. Both on the same day is a draw.
- If neither gets there, the higher percentage wins, unless the gap is under 5 points, which is a draw.
- In an odd-sized crew, three runners share a trio. You duel both of the others and score the average, rounded up: beat both 10, beat one and lose one 5, beat one and draw one 8, and so on.

## Ties in the standings

Equal points are split by, in order: more duel wins, more weeks with your word fully kept (15 points), then whoever's final qualifying run came earlier. If everything is equal, you share the place.

## Interpretations made in the engine

These fill gaps in the brief and are worth checking with the first users:

- Ambition only counts in a week where you earned keep-your-word points. Otherwise you could commit 130% and run nothing for +3.
- A trio scores the average of its two duels, rounded up, so a draw in a trio is worth the same as a draw in a pair.
- A week that hasn't started yet scores nothing, including its duel.
