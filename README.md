# Atelier Chess

A cinematic 3D chess board in the browser. Play Stockfish now; the Academy comes in later phases.

## Run

```bash
npm install
npm run dev        # http://localhost:5173 (generates tokens, copies the Stockfish WASM)
npm test           # rules, engine adapter, scene coords, UI a11y
npm run typecheck
npm run build
```

`node scripts/probe.mjs <url> <outDir> [--quality=low] [--play]` drives the app in headless Chrome and saves screenshots.

## Layout

- `src/design/tokens.ts`: design tokens. `npm run tokens` writes `tokens.css` for Tailwind.
- `src/rules/`: chess.js helpers and stable piece identity (pure, tested).
- `src/engine/`: Stockfish 19 lite (single-threaded WASM) in a Web Worker, UCI adapter.
- `src/store/`: Zustand game and settings stores. The game store is the only caller of chess.js.
- `src/scene/`: React Three Fiber board, procedural pieces, interaction.
  - `choreo/`: a move becomes a `MoveEvent`, the pure `planMove` turns it into timed beats, the performer plays them (queued).
  - `animation/`: the six motion signatures, capture styles, king topple. `fx/`: effects, lighting mood. `CameraRig.tsx`: shake and cinematic focus.
- `src/audio/`: procedural Web Audio sound design (no audio files).
- `src/ui/`: 2D shell, panel, overlays, keyboard play, screen-reader announcer.

Stockfish is GPLv3. It runs as a separate file in `public/engine/`.
