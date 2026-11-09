# Plan: Phase 4 — Academy shell

> **Request:** Academy shell, curriculum research summary, roadmap, skill map.
> **Depth:** Quick. User: "Implement with your recommendations".
> **Last updated:** 2026-11-09

## Architecture

The curriculum is data (`src/academy/curriculum.ts`), with pure state derivation in `state.ts`. Progress is a persisted Zustand store (`src/store/progress.ts`, key `atelier-progress`). Routing uses wouter: `/` is Play (the lazy 3D Scene), `/academy` is the skill map, and `/academy/:skillId` is the lesson frame. Academy pages never load the Scene chunk.

## Decisions

| ID | Question | Choice | Status |
|----|----------|--------|--------|
| A1 | Skill map style | 2D illustrated map in the Atelier look | user (recommended) |
| A2 | Lock rule | Soft locks: states later, recommended, in progress, mastered; every lesson is openable | user (recommended) |
| A3 | Progress storage | localStorage, no accounts | user (recommended) |
| A4 | Play tie-in | The tactic tag in the move list links to the matching lesson | user (recommended) |
| A5 | Router | wouter (small); browser paths, not hash | assumed |
| A6 | Lesson loop | Watch, Try, Solve, Review (research section 3) | assumed |
| A7 | Mastery rule | At least 85% over the last 12 puzzles, then a delayed retest; tune later | assumed |
