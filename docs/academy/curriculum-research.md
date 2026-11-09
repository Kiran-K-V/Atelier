# Curriculum research summary

> Phase 4 input for the Academy. Gathered 2026-11-09 from public sources. Claims marked *unconfirmed* came from search snippets, not the source itself.

## 1. How established courses order topics

**Steps Method (Brunia & van Wijgerden).** Dutch school curriculum in six steps (Step 1 to about 800 rating, Step 6 to about 2100). Read from the English handbook tables of contents:

- **Step 1 (15 lessons):** board and pieces, how pieces move, attack and capture, the pawn, defending, check, mate (two lessons), castling, the profitable exchange, the twofold attack, draws, mating with the queen, en passant, notation.
- **Step 2 (13 lessons):** activity, double attack (two lessons), the pin, eliminating the defence, three golden opening rules, mate in two, more double attack, mating with the rook, discovered attack, defending against mate, the intermediate move, tests.
- **Step 3:** completing the opening, discovered and double check, attacking a pinned piece, X-ray, key squares, threats.

Sources: stappenmethode.nl handbook samples (en_lp_h1, en_lp_h2, en_lp_h3), chess-steps.com.

**Lichess Practice** (lichess.org/practice) has five chapters:
- Checkmates: piece mates, patterns I–IV.
- Fundamental tactics: pin, skewer, fork, discovered attack, double check, overload, zwischenzug, X-ray.
- Advanced tactics: deflection, attraction, clearance and others.
- Pawn endgames: key squares, opposition.
- Rook endgames.

**ChessKid** (chesskid.com lessons guide) teaches in this order:
1. Piece moves.
2. Check, mate and stalemate.
3. Basic mates.
4. Castling, special pawn moves and back-rank mate.
5. Hanging pieces and counting, then double attack, fork, pin, skewer and discovered attack.
6. Later: passed pawns, opposition, deflection, attraction and smothered mate.

**Chess.com Learn path** runs New to Chess, then Beginner (checkmates, basic openings), then Intermediate (endgames, strategy), then Advanced.

**US Chess** curriculum guides could not be read (HTTP 403). They are *unconfirmed* and not used.

### Common order across sources
1. Board, piece moves, then the special rules (castling, en passant, promotion).
2. Attack, defence, check, and checkmate in one. Basic material counting.
3. Double attack (fork) first, then pin, then skewer and discovered attack. The Steps Method puts the fork in Step 1 and the pin in Step 2.
4. Basic mating patterns early: back rank, ladder, queen mate.
5. Opening principles at beginner level, as three golden rules: centre, development, king safety.
6. Advanced tactics (deflection, decoy, overload, intermediate move) after the basic tactic set.
7. Endgame technique (opposition, key squares, passed pawns) after tactics.

## 2. What learning science says

| Finding | Design consequence | Source |
|---|---|---|
| Experts recognise *chunks*, groups of pieces stored as one pattern | Teach patterns in many real positions, not one diagram | Chase & Simon 1973; Gobet & Simon 1996 *(snippet)* |
| Practice testing and spaced practice beat rereading | Every lesson ends in puzzles; missed patterns come back days later | Dunlosky et al. 2013; Roediger & Karpicke 2006 *(snippet)* |
| Worked examples help novices; the benefit fades with skill (*expertise reversal*) | Show a full worked example first, then fade hints | Sweller 1988; Kalyuga *(snippet)* |
| Mastery learning helps weaker learners most | Recommend the next skill only after mastery (soft lock) | Kulik, Kulik & Bangert-Drowns 1990 *(abstract)* |
| Practice hours explain only part of skill | Do not promise rating gains | Macnamara & Maitra 2019 (read) |
| About 85% success keeps learning efficient | Tune puzzle difficulty to about 85% correct | Wilson et al. 2019 *(model-based, snippet)* |

The Steps Method gives the same advice from classroom practice:
- Do not move on while a learner still leaves pieces hanging in their own games.
- Repeat with extra exercise sets: "We forget, when we do not repeat."

## 3. Decisions for this Academy

- **Lesson loop** (Phase 5 builds it): **Watch** a worked example with reasons, **Try** a guided position with hints on request, **Solve** independent puzzles with no hints, then **Review** missed patterns later.
- **Mastery rule** (proposed, *no source fixes the numbers*): at least 85% correct over the last 12 puzzles of a skill, with at least 12 attempts, then one delayed retest. These numbers need tuning with real use.
- **Order:** the skill map in `src/academy/curriculum.ts` follows the common order above. Fork, pin, skewer and discovered attack link to the tactics detected in Play.
