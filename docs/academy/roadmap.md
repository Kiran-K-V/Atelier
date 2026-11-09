# Academy roadmap

Six levels. The skill graph lives in `src/academy/curriculum.ts`. Each skill has soft prerequisites, and the map recommends a skill once its prerequisites are mastered.

| Level | Skills | Why here |
|---|---|---|
| **Foundations** | Board; rook and bishop; queen and king; knight; pawn; attack and defend; check and escape; checkmate and stalemate; castling; piece values and trades | Steps 1 order: rules first, then attack and defence, check, mate, the profitable exchange |
| **Tactics I** | Fork, pin, skewer, discovered attack, double check | Every source teaches double attack first. Each tactic matches a Phase 3 tactic in Play |
| **Checkmate patterns** | Back-rank, ladder, smothered, sacrifices for mate | Lichess and ChessKid put mating patterns right after the basic tactics |
| **Opening principles** | Centre, develop and castle, early traps | The Steps 2 "three golden rules" come before deep openings |
| **Endgame essentials** | Queen mate, rook mate, opposition, passed pawns | Basic mates, then king activity (Lichess Pawn endgames) |
| **Tactics II** | Deflection and decoy, overload, in-between move, combining tactics | Lichess advanced tactics and Steps 2–3. They need the basic set first |

## Delivery

- **Phase 4 (now):** Academy shell, skill map, lesson frame, progress storage, Play-to-Academy links.
- **Phase 5:** the Foundations level as full lessons in the Watch, Try, Solve, Review loop, with motion-graphic explanations on the 3D board.
- **Phase 6:** engagement (streaks, review queue), polish, performance and accessibility.
- **Later:** Tactics I lessons, then the other levels. Each level reuses the lesson engine from Phase 5.
