// Generates validated theory lesson JSON files for the new content.
// FEN validation: every position's piece-placement must have 8 ranks,
// each rank expanding to exactly 8 squares, and contain both kings.
// Writes to chess-app/src/data/theory/lessons and backend/lessons.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT, 'chess-app/src/data/theory/lessons');
const BACKEND_DIR = path.join(ROOT, 'backend/lessons');

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// ---------- FEN validation ----------
function validateFEN(fen, ctx) {
  const placement = fen.split(' ')[0];
  const ranks = placement.split('/');
  if (ranks.length !== 8) throw new Error(`${ctx}: FEN has ${ranks.length} ranks, expected 8 -> ${fen}`);
  let wk = 0, bk = 0;
  for (const r of ranks) {
    let sum = 0;
    for (const ch of r) {
      if (/\d/.test(ch)) sum += parseInt(ch, 10);
      else {
        sum += 1;
        if (ch === 'K') wk++;
        if (ch === 'k') bk++;
        if (!/[pnbrqkPNBRQK]/.test(ch)) throw new Error(`${ctx}: bad piece char '${ch}' -> ${fen}`);
      }
    }
    if (sum !== 8) throw new Error(`${ctx}: rank '${r}' sums to ${sum}, expected 8 -> ${fen}`);
  }
  if (wk !== 1 || bk !== 1) throw new Error(`${ctx}: kings wk=${wk} bk=${bk} -> ${fen}`);
}

// ---------- helpers ----------
function pos(fen, commentary, expectedMove, hints) {
  const p = { fen, commentary };
  if (expectedMove) p.expectedMove = expectedMove;
  if (hints) p.hints = hints;
  return p;
}

const lessons = [];
function L(obj) { lessons.push(obj); }

// =====================================================================
// OPENINGS (10)
// =====================================================================
L({
  id: 'ruy-lopez', title: 'The Ruy Lopez', category: 'openings', difficulty: 'intermediate',
  description: 'One of the oldest and most respected openings. White develops the bishop to b5, pressuring the knight that defends e5, and builds a lasting initiative.',
  estimatedMinutes: 20,
  keyConcepts: ['Pin on the knight', 'Central control', 'The Spanish bishop', 'Slow maneuvering', 'Pawn on e5 pressure'],
  sections: [
    { title: 'The Main Idea', content: 'After 1.e4 e5 2.Nf3 Nc6 3.Bb5, White attacks the knight on c6 that defends the e5 pawn. The threat is not immediate, but the bishop creates long-term pressure on Black\'s center.', positions: [
      pos('r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', 'The starting position of the Ruy Lopez. The bishop on b5 eyes the c6 knight. Black usually plays 3...a6 to question the bishop immediately.', 'a6', ['Challenge the bishop', 'The Morphy Defense begins with a7-a6']) ] },
    { title: 'The Closed System', content: 'In the Closed Ruy Lopez, both sides develop slowly and castle. White plays c3 and d4 to build a big center, while Black counters on the queenside. Patience and maneuvering define this opening.', positions: [
      pos('r1bqk2r/2ppbppp/p1n2n2/1p2p3/4P3/1B3N2/PPPP1PPP/RNBQR1K1 b kq - 2 7', 'A typical Closed Ruy Lopez structure. White has retreated the bishop to b3 and castled. The slow battle for the center begins.', 'd6', ['Support the e5 pawn', 'Solidify before counterattacking']) ] },
  ],
  exercises: [
    { fen: 'r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4', title: 'Maintain the Pressure', description: 'White to play. After ...a6, where does the bishop go to keep the pin alive?', targetColor: 'w', expectedMoves: ['Bb3'], hints: ['Retreat along the a4-e8 diagonal', 'Keep aiming at f7'], maxMoves: 1 },
  ],
});

L({
  id: 'french-defense', title: 'The French Defense', category: 'openings', difficulty: 'intermediate',
  description: 'A solid, strategic reply to 1.e4. Black accepts a slightly cramped position in exchange for a rock-solid pawn chain and clear counterplay against White\'s center.',
  estimatedMinutes: 20,
  keyConcepts: ['Pawn chains', 'The bad bishop', 'Queenside counterplay', 'Central tension', 'Breaks with c5 and f6'],
  sections: [
    { title: 'The Pawn Chain', content: 'After 1.e4 e6 2.d4 d5, Black challenges the center. White can advance, exchange, or maintain tension. The resulting pawn chains dictate the plans for both sides.', positions: [
      pos('rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6 0 3', 'The French Defense. Black\'s solid e6/d5 structure challenges White\'s center. White must decide how to handle the central tension.', 'e5', ['Gain space with the Advance Variation', 'Lock the center and play on the wings']) ] },
    { title: 'The Bad Bishop Problem', content: 'Black\'s light-squared bishop on c8 is often hemmed in by its own pawns on e6 and d5. A key strategic theme is finding a good role for this piece, often via b6 and Ba6 or by breaking with c5/f6.', positions: [
      pos('rnbqkbnr/pp3ppp/4p3/2ppP3/3P4/8/PPP2PPP/RNBQKBNR w KQkq c6 0 4', 'The Advance French. Black strikes at the base of the chain with c5. White must defend d4 while Black builds queenside pressure.', 'c3', ['Defend the d4 pawn', 'Support the head of the chain']) ] },
  ],
  exercises: [
    { fen: 'rnbqkbnr/pp3ppp/4p3/2ppP3/3P4/2P5/PP3PPP/RNBQKBNR b KQkq - 0 4', title: 'Pressure the Base', description: 'Black to play. Increase the pressure on White\'s pawn chain by developing toward d4.', targetColor: 'b', expectedMoves: ['Nc6'], hints: ['Attack the d4 pawn again', 'Develop with a threat'], maxMoves: 1 },
  ],
});

L({
  id: 'caro-kann', title: 'The Caro-Kann Defense', category: 'openings', difficulty: 'beginner',
  description: 'A reliable, low-risk defense to 1.e4. Black supports a future d5 with c6, avoiding the cramped bishop of the French while keeping a sturdy structure.',
  estimatedMinutes: 18,
  keyConcepts: ['Solid structure', 'Free light bishop', 'Endgame soundness', 'Central break with d5', 'Few weaknesses'],
  sections: [
    { title: 'Why c6?', content: 'After 1.e4 c6, Black prepares d5 with pawn support. Unlike the French, the light-squared bishop can develop actively to f5 or g4 before being locked in.', positions: [
      pos('rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'The Caro-Kann. Black will follow with d5, challenging the center while keeping the c8 bishop\'s diagonal open.', 'd4', ['Build a broad center', 'Prepare to meet d5']) ] },
    { title: 'The Active Bishop', content: 'A hallmark of the Caro-Kann is developing the light-squared bishop to f5 before playing e6. This solves the classic problem bishop of 1.e4 e6 setups.', positions: [
      pos('rn1qkbnr/pp2pppp/2p5/3p1b2/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 1 4', 'Black has developed the bishop to f5 outside the pawn chain — a key strategic achievement of the Caro-Kann.', 'Nc3', ['Develop and pressure d5', 'Prepare to challenge the bishop']) ] },
  ],
  exercises: [
    { fen: 'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6 0 3', title: 'Challenge the Center', description: 'White to play. Develop a knight to attack the d5 pawn.', targetColor: 'w', expectedMoves: ['Nc3'], hints: ['Develop toward the center', 'Add a defender of e4 and attacker of d5'], maxMoves: 1 },
  ],
});

L({
  id: 'queens-gambit', title: 'The Queen\'s Gambit', category: 'openings', difficulty: 'intermediate',
  description: 'White offers the c-pawn to deflect Black\'s d5 pawn and dominate the center. One of the most classical and instructive openings in chess.',
  estimatedMinutes: 22,
  keyConcepts: ['Central majority', 'The c4 lever', 'Minority attack', 'Isolated queen pawn', 'Classical development'],
  sections: [
    { title: 'The Gambit Offer', content: 'After 1.d4 d5 2.c4, White offers a pawn. It is not a true sacrifice — if Black takes with 2...dxc4, White regains the pawn easily while gaining central control.', positions: [
      pos('rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2', 'The Queen\'s Gambit. White challenges d5 from the side. Black usually declines with e6 or c6, keeping a solid center.', 'e6', ['Decline and stay solid', 'Support the d5 pawn']) ] },
    { title: 'Queen\'s Gambit Declined', content: 'With 2...e6, Black builds a solid wall. The downside is the c8 bishop is temporarily blocked. White develops naturally and aims for pressure with the minority attack or central play.', positions: [
      pos('rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 1 4', 'A standard Queen\'s Gambit Declined position. White piles up on d5 and prepares to develop the bishop to g5.', 'Bg5', ['Pin the f6 knight', 'Increase pressure on d5']) ] },
  ],
  exercises: [
    { fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2', title: 'Decline Solidly', description: 'Black to play. Support d5 and prepare to develop the kingside.', targetColor: 'b', expectedMoves: ['e6'], hints: ['Reinforce the d5 pawn', 'Open a path for the f8 bishop'], maxMoves: 1 },
  ],
});

L({
  id: 'kings-indian', title: 'The King\'s Indian Defense', category: 'openings', difficulty: 'advanced',
  description: 'A hypermodern, fighting defense. Black lets White build a big center, then strikes back with e5 or c5 and launches a kingside pawn storm.',
  estimatedMinutes: 25,
  keyConcepts: ['Hypermodern strategy', 'Fianchetto', 'Kingside pawn storm', 'Central counterstrike', 'Closed center dynamics'],
  sections: [
    { title: 'Inviting the Center', content: 'After 1.d4 Nf6 2.c4 g6, Black prepares to fianchetto the bishop and allows White a broad pawn center, planning to undermine it later. This is hypermodern thinking in action.', positions: [
      pos('rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3', 'The King\'s Indian setup begins. Black will fianchetto with Bg7 and castle, then counter the center with e5.', 'Nc3', ['Build the big center', 'Develop and support e4']) ] },
    { title: 'The Kingside Attack', content: 'In the classical King\'s Indian, the center locks and the play becomes a race: White attacks on the queenside, Black storms the kingside with f5-f4, g5-g4 aiming at White\'s king.', positions: [
      pos('r1bq1rk1/ppp1npbp/3p1np1/3Pp3/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 b - - 0 8', 'A classical King\'s Indian. The center is closed; Black prepares f5 to attack the kingside while White expands with c5 on the other wing.', 'f5', ['Start the kingside pawn storm', 'Strike at White\'s e4 pawn']) ] },
  ],
  exercises: [
    { fen: 'rnbqk2r/ppppppbp/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 1 4', title: 'Claim the Center', description: 'White to play. Occupy the center with a pawn now that Black has committed to the fianchetto.', targetColor: 'w', expectedMoves: ['e4'], hints: ['Take full central control', 'Build the broad pawn center'], maxMoves: 1 },
  ],
});

L({
  id: 'english-opening', title: 'The English Opening', category: 'openings', difficulty: 'intermediate',
  description: 'A flexible flank opening starting with 1.c4. White fights for the center from the side and can transpose into many structures, keeping the opponent guessing.',
  estimatedMinutes: 20,
  keyConcepts: ['Flank control', 'Flexibility', 'Reversed Sicilian', 'Fianchetto setups', 'Transpositions'],
  sections: [
    { title: 'Controlling d5', content: '1.c4 stakes a claim on the d5 square without committing the center pawns. White keeps options open and often fianchettoes the king\'s bishop for long-diagonal pressure.', positions: [
      pos('rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3 0 1', 'The English Opening. White controls d5 from the wing and retains maximum flexibility about the central structure.', 'e5', ['Grab central space', 'Play a reversed Sicilian']) ] },
    { title: 'The Reversed Sicilian', content: 'If Black answers 1...e5, the position resembles a Sicilian Defense with colors reversed — and an extra tempo for White. Understanding Sicilian themes helps here.', positions: [
      pos('rnbqkbnr/pppp1ppp/8/4p3/2P5/8/PP1PPPPP/RNBQKBNR w KQkq e6 0 2', 'A Reversed Sicilian. White enjoys Sicilian-style play with an extra move, often fianchettoing to pressure the long diagonal.', 'g3', ['Prepare the fianchetto', 'Aim the bishop at the center']) ] },
  ],
  exercises: [
    { fen: 'rnbqkbnr/pppp1ppp/8/4p3/2P5/6P1/PP1PPP1P/RNBQKBNR b KQkq - 0 2', title: 'Develop Naturally', description: 'Black to play. Develop a knight toward the center to support e5.', targetColor: 'b', expectedMoves: ['Nc6'], hints: ['Develop a piece', 'Defend the e5 pawn'], maxMoves: 1 },
  ],
});

L({
  id: 'scandinavian', title: 'The Scandinavian Defense', category: 'openings', difficulty: 'beginner',
  description: 'A direct defense: Black immediately challenges e4 with 1...d5. Simple to learn, it leads to clear plans and a sound, if slightly passive, position.',
  estimatedMinutes: 16,
  keyConcepts: ['Immediate central challenge', 'Early queen development', 'Solid structure', 'Quick development', 'Clear plans'],
  sections: [
    { title: 'The Direct Challenge', content: 'After 1.e4 d5, Black instantly attacks the e4 pawn. White almost always takes with 2.exd5, after which Black recaptures with the queen or plays a gambit with Nf6.', positions: [
      pos('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2', 'The Scandinavian Defense. Black challenges the center immediately. White typically captures on d5.', 'exd5', ['Win the central pawn', 'Force Black to recapture']) ] },
    { title: 'The Queen Recapture', content: 'After 2...Qxd5 3.Nc3, the queen is hit by the knight and must move, usually to a5 or d6. Black gains development time for White but reaches a solid structure.', positions: [
      pos('rnb1kbnr/ppp1pppp/8/q7/8/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 4', 'The queen has retreated to a5 after being attacked. Black\'s structure is sound; White is slightly ahead in development.', 'd4', ['Build the center with tempo', 'Develop while gaining space']) ] },
  ],
  exercises: [
    { fen: 'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3', title: 'Gain a Tempo', description: 'White to play. Develop a knight while attacking the exposed black queen.', targetColor: 'w', expectedMoves: ['Nc3'], hints: ['Hit the queen with development', 'Knight to c3'], maxMoves: 1 },
  ],
});

L({
  id: 'slav-defense', title: 'The Slav Defense', category: 'openings', difficulty: 'intermediate',
  description: 'A rock-solid answer to the Queen\'s Gambit. Black supports d5 with c6 instead of e6, keeping the light-squared bishop free to develop.',
  estimatedMinutes: 20,
  keyConcepts: ['Solid d5 support', 'Free light bishop', 'Pawn structure integrity', 'The c4-d5 tension', 'Queenside development'],
  sections: [
    { title: 'Supporting d5 with c6', content: 'After 1.d4 d5 2.c4 c6, Black defends the d5 pawn while keeping the c8 bishop\'s diagonal open — a key improvement over the Queen\'s Gambit Declined.', positions: [
      pos('rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3', 'The Slav Defense. Black\'s c6 supports d5 without blocking the light-squared bishop, which can later reach f5 or g4.', 'Nf3', ['Develop the kingside', 'Control e5 before committing']) ] },
    { title: 'Releasing the Bishop', content: 'A core Slav idea is to play dxc4 at the right moment and develop the bishop to f5 or g4. Timing the capture and freeing the bishop is the strategic heart of the opening.', positions: [
      pos('rn1qkbnr/pp2pppp/2p5/3p1b2/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 1 5', 'Black has developed the light-squared bishop to f5 — the dream setup of the Slav. The structure is harmonious and solid.', 'e3', ['Solidify the center', 'Open the f1 bishop']) ] },
  ],
  exercises: [
    { fen: 'rnbqkb1r/pp2pppp/2p2n2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 1 4', title: 'Develop the Kingside', description: 'White to play. Bring the king\'s knight into the game toward e5 control.', targetColor: 'w', expectedMoves: ['Nf3'], hints: ['Develop a knight', 'Prepare to castle'], maxMoves: 1 },
  ],
});

L({
  id: 'london-system', title: 'The London System', category: 'openings', difficulty: 'beginner',
  description: 'A popular, easy-to-learn system for White. Develop the dark-squared bishop to f4 early and follow a reliable setup against almost anything Black plays.',
  estimatedMinutes: 16,
  keyConcepts: ['System-based play', 'Bishop to f4', 'Solid pawn triangle', 'Easy development', 'Kingside safety'],
  sections: [
    { title: 'The London Setup', content: 'After 1.d4 d5 2.Bf4, White develops the bishop outside the pawn chain before playing e3. The same setup — Bf4, e3, Bd3, Nf3, c3 — works against many Black defenses.', positions: [
      pos('rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq - 1 2', 'The London System. The bishop is developed to f4 before the e-pawn moves, avoiding the bad-bishop problem entirely.', 'Nf6', ['Develop naturally', 'Control the e4 square']) ] },
    { title: 'A Reliable Structure', content: 'White\'s pawns on c3, d4, and e3 form a sturdy triangle. The plan is simple: complete development, castle, and look for a kingside attack or central break with e4 at the right time.', positions: [
      pos('rnbqkb1r/ppp2ppp/4pn2/3p4/3P1B2/2N1P3/PPP2PPP/R2QKBNR w KQkq - 0 5', 'A typical London structure. White has the classic triangle and easy development. The setup is hard to break down.', 'Bd3', ['Complete development', 'Aim the bishop at h7']) ] },
  ],
  exercises: [
    { fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR w KQkq - 2 3', title: 'Build the Triangle', description: 'White to play. Support the d4 pawn and open the f1 bishop with a modest pawn move.', targetColor: 'w', expectedMoves: ['e3'], hints: ['Reinforce d4', 'Free the light-squared bishop'], maxMoves: 1 },
  ],
});

L({
  id: 'scotch-game', title: 'The Scotch Game', category: 'openings', difficulty: 'intermediate',
  description: 'White strikes in the center early with d4 on move three, opening lines quickly and steering the game away from the heavily analyzed Ruy Lopez.',
  estimatedMinutes: 18,
  keyConcepts: ['Early central break', 'Open lines', 'Rapid development', 'Knight on d4', 'Initiative'],
  sections: [
    { title: 'The Early d4 Break', content: 'After 1.e4 e5 2.Nf3 Nc6 3.d4, White immediately challenges the center. Following 3...exd4 4.Nxd4, the position opens and both sides develop quickly.', positions: [
      pos('r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3 0 3', 'The Scotch Game. White breaks in the center with d4 on move three, opening the position for fast piece play.', 'exd4', ['Accept the central challenge', 'Open the e-file']) ] },
    { title: 'Active Piece Play', content: 'With the center opened, White\'s knight sits actively on d4. The bishops gain scope and White develops with tempo, aiming for an early initiative against Black\'s position.', positions: [
      pos('r1bqkbnr/pppp1ppp/2n5/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq - 0 4', 'After 4.Nxd4, White\'s pieces are active and the center is open. Black must develop carefully to neutralize White\'s lead in space.', 'Bc5', ['Develop with a threat', 'Pressure the d4 knight']) ] },
  ],
  exercises: [
    { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3 0 3', title: 'Accept the Break', description: 'Black to play. Capture the d4 pawn to open the center.', targetColor: 'b', expectedMoves: ['exd4'], hints: ['Take the central pawn', 'Open lines for your pieces'], maxMoves: 1 },
  ],
});

// =====================================================================
// MIDDLEGAME (4)
// =====================================================================
L({
  id: 'open-files-rooks', title: 'Open Files and Rooks', category: 'middlegame', difficulty: 'intermediate',
  description: 'Rooks crave open files. Learn how to seize and exploit open and half-open files, double rooks, and invade the seventh rank.',
  estimatedMinutes: 20,
  keyConcepts: ['Open files', 'Half-open files', 'Doubling rooks', 'The seventh rank', 'Rook activity'],
  sections: [
    { title: 'Seizing the Open File', content: 'A file with no pawns is an open file — a highway for rooks. The side that controls it first can invade the enemy position. Place a rook on the file and contest control.', positions: [
      pos('3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', 'The d-file is open. Whoever controls it dominates. White should contest or seize the file and look to penetrate to the seventh or eighth rank.', 'Rd1', ['Contest the only open file', 'Rooks belong on open files']) ] },
    { title: 'The Seventh Rank', content: 'A rook on the seventh rank (the enemy\'s second) attacks pawns and traps the king. Two rooks on the seventh — "pigs on the seventh" — are often decisive.', positions: [
      pos('6k1/R4ppp/8/8/8/8/5PPP/6K1 w - - 0 1', 'A rook on the seventh rank devours pawns and cuts off the enemy king. This is one of the most powerful rook placements in chess.', 'Ra8', ['Attack from behind', 'Use the rook\'s activity']) ] },
  ],
  exercises: [
    { fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', title: 'Claim the File', description: 'White to play. Contest the open d-file with your rook.', targetColor: 'w', expectedMoves: ['Rd1'], hints: ['Put the rook on the open file', 'Challenge for control'], maxMoves: 1 },
  ],
});

L({
  id: 'outposts', title: 'Outposts and Weak Squares', category: 'middlegame', difficulty: 'intermediate',
  description: 'A protected square in enemy territory that cannot be attacked by a pawn is an outpost. Knights love outposts. Learn to create and exploit them.',
  estimatedMinutes: 20,
  keyConcepts: ['Outposts', 'Weak squares', 'Knight placement', 'Pawn support', 'Permanent advantages'],
  sections: [
    { title: 'What Makes an Outpost', content: 'An outpost is a square, usually on the fifth or sixth rank, that your piece occupies and a pawn protects, where no enemy pawn can ever drive it away. A knight on a strong outpost can be worth more than a rook.', positions: [
      pos('r2qkb1r/pp2pppp/2n2n2/3N4/8/8/PPP1PPPP/R1BQKB1R b KQkq - 0 7', 'The white knight sits proudly on d5 — a classic outpost. No black pawn can challenge it, making it a permanent thorn in Black\'s position.', 'Nxd5', ['Eliminate the strong knight', 'Trade off the outpost piece']) ] },
    { title: 'Creating Weak Squares', content: 'Weak squares often arise from pawn moves that can\'t be undone. When the opponent advances a pawn, the squares it used to guard may become permanent homes for your pieces.', positions: [
      pos('r1bqk2r/ppp2ppp/2np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6', 'Black\'s pawn structure leaves the d5 square soft. White will maneuver a knight toward d5 to establish a dominant outpost.', 'Nd5', ['Head for the weak square', 'Plant a knight on the outpost']) ] },
  ],
  exercises: [
    { fen: 'r2qkb1r/pp2pppp/2n2n2/3N4/8/8/PPP1PPPP/R1BQKB1R w KQkq - 0 7', title: 'Cement the Outpost', description: 'White to play. Develop a piece to support the powerful d5 knight and complete development.', targetColor: 'w', expectedMoves: ['c4'], hints: ['Reinforce the outpost', 'A pawn can support the knight'], maxMoves: 1 },
  ],
});

L({
  id: 'bishop-pair', title: 'The Bishop Pair', category: 'middlegame', difficulty: 'intermediate',
  description: 'Two bishops working together control both color complexes and dominate open positions. Learn when the bishop pair is an advantage and how to use it.',
  estimatedMinutes: 18,
  keyConcepts: ['Two bishops', 'Open positions', 'Color complexes', 'Opening lines', 'Long-term advantage'],
  sections: [
    { title: 'Power in Open Positions', content: 'When the position opens, two bishops cover long diagonals across the whole board. Together they control both light and dark squares, something a bishop and knight cannot match.', positions: [
      pos('6k1/5ppp/8/8/8/2B5/1B3PPP/6K1 w - - 0 1', 'Two bishops on adjacent diagonals form a powerful battery, sweeping the board. In open positions this pair is a serious long-term advantage.', 'Bd4', ['Coordinate the bishops', 'Control the long diagonals']) ] },
    { title: 'Opening the Position', content: 'The bishop pair thrives when lines open. If you hold two bishops, seek pawn breaks that open the board. If you face them, keep the position closed and find outposts for your knights.', positions: [
      pos('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', 'White aims to keep both bishops and open the center later. Knowing when to open lines is the key to exploiting the bishop pair.', 'c3', ['Prepare a central break', 'Keep the bishops\' scope']) ] },
  ],
  exercises: [
    { fen: '6k1/5ppp/8/8/8/2B5/1B3PPP/6K1 w - - 0 1', title: 'Aim the Battery', description: 'White to play. Centralize a bishop on the long diagonal to maximize the pair\'s reach.', targetColor: 'w', expectedMoves: ['Bd4'], hints: ['Centralize a bishop', 'Control the long diagonal'], maxMoves: 1 },
  ],
});

L({
  id: 'pawn-breaks', title: 'Pawn Breaks and Levers', category: 'middlegame', difficulty: 'advanced',
  description: 'Pawn breaks open lines, free your pieces, and change the structure in your favor. Learn to identify and time the critical lever in any position.',
  estimatedMinutes: 22,
  keyConcepts: ['Pawn levers', 'Opening lines', 'Timing breaks', 'Changing structure', 'Creating weaknesses'],
  sections: [
    { title: 'The Lever Concept', content: 'A pawn lever is a pawn advance that, if captured, opens a file or diagonal. Breaks like c5, f5, d5, or e5 are the engines of middlegame play — they transform static positions into dynamic ones.', positions: [
      pos('r1bq1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N1PN2/PP3PPP/R1BQ1RK1 b - c3 0 8', 'Black can consider the ...dxc4 or ...c5 break to challenge White\'s center. Choosing the right lever defines the entire plan.', 'c5', ['Strike at the center', 'Open lines for your pieces']) ] },
    { title: 'Timing Is Everything', content: 'A break played too early may just create weaknesses; too late and the chance is gone. Prepare a break by bringing pieces to support it, then strike when the lines opening favor you.', positions: [
      pos('2rq1rk1/pp1bbppp/2n1pn2/3p4/3P4/2NBPN2/PP3PPP/R1BQ1RK1 b - - 0 10', 'Black has prepared the ...e5 break with full piece support. Now opening the center will activate the well-placed pieces.', 'e5', ['Open the center with support', 'Activate your developed pieces']) ] },
  ],
  exercises: [
    { fen: 'r1bq1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N1PN2/PP3PPP/R1BQ1RK1 b - c3 0 8', title: 'Choose the Lever', description: 'Black to play. Strike at White\'s center with the thematic queenside break.', targetColor: 'b', expectedMoves: ['c5'], hints: ['Challenge the d4 pawn', 'The c5 break opens lines'], maxMoves: 1 },
  ],
});

// =====================================================================
// ENDINGS (4)
// =====================================================================
L({
  id: 'opposition-triangulation', title: 'Opposition and Triangulation', category: 'endings', difficulty: 'intermediate',
  description: 'Master the most important king-and-pawn technique: the opposition. Then learn triangulation — losing a move to put your opponent in zugzwang.',
  estimatedMinutes: 22,
  keyConcepts: ['Direct opposition', 'Distant opposition', 'Triangulation', 'Key squares', 'Zugzwang'],
  sections: [
    { title: 'The Direct Opposition', content: 'When kings face each other with one square between them and it is the opponent\'s move, you "have the opposition." The player to move must give way. This single idea decides countless pawn endings.', positions: [
      pos('8/8/8/4k3/8/4K3/4P3/8 w - - 0 1', 'The kings stand in direct opposition. Whoever does NOT have to move controls the key squares. Here White wants to outflank to win.', 'Kd3', ['Sidestep to gain ground', 'Take the opposition at the right moment']) ] },
    { title: 'Triangulation', content: 'Sometimes you want to keep the same position but with the opponent to move. By maneuvering your king in a triangle while the enemy king can only shuffle, you lose a tempo and hand them the zugzwang.', positions: [
      pos('8/8/3k4/3P4/3K4/8/8/8 w - - 0 1', 'White triangulates with the king to reach the same position with Black to move, forcing the black king to abandon the blockade of the passed pawn.', 'Kd3', ['Lose a move on purpose', 'Force Black into zugzwang']) ] },
  ],
  exercises: [
    { fen: '8/8/4k3/8/4K3/8/4P3/8 b - - 0 1', title: 'Take the Opposition', description: 'It is Black to move and the white king must be opposed. As White, you want Black forced to give way — understand who holds the opposition here.', targetColor: 'w', expectedMoves: ['Kd4', 'Kf4', 'Ke3'], hints: ['Keep the kings opposed', 'Force the opponent to step aside'], maxMoves: 1 },
  ],
});

L({
  id: 'lucena-philidor', title: 'Lucena and Philidor Positions', category: 'endings', difficulty: 'advanced',
  description: 'The two most important rook endgames. The Lucena shows how to win with an extra pawn; the Philidor shows how to draw a pawn down. Know both cold.',
  estimatedMinutes: 25,
  keyConcepts: ['Building a bridge', 'The third-rank defense', 'Cutting off the king', 'Rook activity', 'Drawing technique'],
  sections: [
    { title: 'The Lucena Position (Winning)', content: 'With a rook and pawn versus a rook, the Lucena position is the key winning method. The technique is "building a bridge" — using the rook to shield your king from checks so the pawn can promote.', positions: [
      pos('1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', 'The Lucena position. White wins by building a bridge: the rook will cover the checks while the king escorts the pawn to promotion.', 'Rc4', ['Prepare to block checks', 'Build a bridge for the king']) ] },
    { title: 'The Philidor Position (Drawing)', content: 'When defending a rook down a pawn, the Philidor draw is your lifeline. Keep your rook on the third rank to stop the enemy king from advancing, then check from behind once the pawn pushes.', positions: [
      pos('4k3/8/8/4P3/4K3/8/r7/4R3 b - - 0 1', 'The Philidor drawing setup: Black keeps the rook active and ready to check from behind once the white pawn advances past the third rank, holding the draw.', 'Ra1', ['Defend from the third rank', 'Check from behind when the pawn pushes']) ] },
  ],
  exercises: [
    { fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', title: 'Build the Bridge', description: 'White to play. Begin the Lucena winning method by lifting the rook to the fourth rank.', targetColor: 'w', expectedMoves: ['Rc4'], hints: ['Lift the rook to shield the king', 'The fourth rank builds the bridge'], maxMoves: 1 },
  ],
});

L({
  id: 'zugzwang', title: 'Zugzwang', category: 'endings', difficulty: 'intermediate',
  description: 'Zugzwang is the situation where any move worsens your position — but you must move. It is the deciding factor in countless endgames. Learn to recognize and create it.',
  estimatedMinutes: 18,
  keyConcepts: ['Compulsion to move', 'Mutual zugzwang', 'Waiting moves', 'Endgame technique', 'Tempo'],
  sections: [
    { title: 'Forced to Worsen', content: 'In most positions, having the move is good. In zugzwang it is a curse: every legal move makes things worse, yet passing is illegal. Endgames are where zugzwang most often decides the result.', positions: [
      pos('8/8/8/8/8/1k6/p7/K7 w - - 0 1', 'White is in zugzwang. Any king move either allows the pawn to promote or loses immediately. The compulsion to move is fatal.', 'Ka1', ['Recognize there are no good moves', 'Every move loses ground']) ] },
    { title: 'Creating Zugzwang', content: 'Strong players engineer zugzwang by removing the opponent\'s useful moves until only damaging ones remain. A well-timed waiting move can hand the opponent a lost position.', positions: [
      pos('8/p7/P7/8/8/8/1k6/K7 w - - 0 1', 'With pawns locked, the position becomes a pure king battle where running out of moves — zugzwang — determines who must give way.', 'Kb1', ['Make a waiting move', 'Hand the opponent the burden of moving']) ] },
  ],
  exercises: [
    { fen: '8/8/8/3k4/3p4/3K4/8/8 w - - 0 1', title: 'Feel the Squeeze', description: 'White to move and the king is forced to give way. Step aside while keeping in front of the pawn.', targetColor: 'w', expectedMoves: ['Kd2', 'Ke2', 'Kc2'], hints: ['You must move even though it hurts', 'Stay as close to the pawn as possible'], maxMoves: 1 },
  ],
});

L({
  id: 'fortress-draws', title: 'Fortresses and Defensive Draws', category: 'endings', difficulty: 'advanced',
  description: 'Sometimes a material deficit can be held with a fortress — an impregnable setup the stronger side cannot break. Learn to build defensive walls and save lost-looking endings.',
  estimatedMinutes: 20,
  keyConcepts: ['Fortress', 'Impenetrable setup', 'Defensive technique', 'Material vs structure', 'Holding the draw'],
  sections: [
    { title: 'The Idea of a Fortress', content: 'A fortress is a position where the defending side, though materially worse, sets up a wall the opponent simply cannot break. Recognizing fortress potential can save half points from seemingly lost positions.', positions: [
      pos('8/8/8/3k4/8/3B4/3K4/8 w - - 0 1', 'A lone bishop cannot deliver mate, and many bishop endings without pawns are dead draws. Knowing which material cannot win is a vital defensive skill.', 'Bf5', ['Understand insufficient material', 'Hold the position calmly']) ] },
    { title: 'Building the Wall', content: 'Defensive fortresses often rely on a blockade — placing pieces and pawns so the enemy king and pieces have no entry. Keep the structure intact and avoid creating new weaknesses.', positions: [
      pos('8/8/4k3/4p3/4P3/4K3/8/8 w - - 0 1', 'Locked pawns and opposing kings can produce a fortress where neither side can break through, ending in a draw despite the tension.', 'Kd3', ['Maintain the blockade', 'Keep the opposition and hold']) ] },
  ],
  exercises: [
    { fen: '8/8/4k3/4p3/4P3/4K3/8/8 w - - 0 1', title: 'Hold the Wall', description: 'White to play. Maintain the blockade and opposition to hold the draw.', targetColor: 'w', expectedMoves: ['Kd3', 'Kf3', 'Ke2'], hints: ['Do not let the black king in', 'Keep the kings opposed'], maxMoves: 1 },
  ],
});

// =====================================================================
// FUNDAMENTALS & TIPS (new category, 5)
// =====================================================================
L({
  id: 'chess-fundamentals', title: 'Core Chess Fundamentals', category: 'fundamentals', difficulty: 'beginner',
  description: 'The bedrock principles every strong player relies on: control the center, develop pieces, castle early, and connect your rooks. Master these before anything else.',
  estimatedMinutes: 15,
  keyConcepts: ['Center control', 'Piece development', 'King safety', 'Connecting rooks', 'Not moving pieces twice'],
  sections: [
    { title: 'The Opening Checklist', content: 'Every good opening follows the same goals: occupy or control the center, develop knights and bishops toward the center, castle to safety, and connect your rooks. If you do these four things, you will rarely get a bad position.', positions: [
      pos(START, 'From the start, aim to control the center with pawns and pieces. The four golden rules — center, development, castle, connect — guide every opening.', 'e4', ['Fight for the center first', 'A central pawn opens lines for pieces']) ] },
    { title: 'Develop with Purpose', content: 'Bring every minor piece into the game before launching an attack. Avoid moving the same piece twice in the opening without reason, and do not bring the queen out too early where it can be chased with tempo.', positions: [
      pos('rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', 'Both sides develop knights toward the center — a model opening. Each move improves a piece and prepares to castle.', 'Nc3', ['Develop a new piece each move', 'Head toward castling']) ] },
  ],
  exercises: [
    { fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', title: 'Develop Toward the Center', description: 'White to play. Make a natural developing move that brings a knight out and prepares castling.', targetColor: 'w', expectedMoves: ['Nf3'], hints: ['Develop a knight', 'Aim for the center and prepare O-O'], maxMoves: 1 },
  ],
});

L({
  id: 'common-mistakes', title: 'Common Mistakes to Avoid', category: 'fundamentals', difficulty: 'beginner',
  description: 'Avoid the errors that cost beginners and club players the most points: hanging pieces, ignoring threats, premature attacks, and neglecting king safety.',
  estimatedMinutes: 15,
  keyConcepts: ['Blunder checking', 'King safety', 'Counting attackers', 'Avoiding premature attacks', 'Responding to threats'],
  sections: [
    { title: 'Always Check for Threats', content: 'Before every move, ask: what is my opponent threatening? Most lost games come from missing a simple threat. Look for checks, captures, and attacks against your pieces before deciding on your plan.', positions: [
      pos('rnbqkbnr/ppp2ppp/8/3pp3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq d6 0 3', 'Before grabbing material, always ask what the opponent threatens in reply. A two-second safety check prevents most blunders.', 'Nxe5', ['Look before you leap', 'Check what the opponent threatens']) ] },
    { title: 'Don\'t Attack Too Early', content: 'Launching an attack before completing development usually backfires. A premature queen raid or pawn lunge can be repelled with tempo, leaving the attacker behind in development and exposed.', positions: [
      pos('rnbqkbnr/pppp1ppp/8/4p3/6P1/8/PPPPPP1P/RNBQKBNR b KQkq g3 0 2', 'Weakening pawn moves like g4 create lasting holes around the king. Avoid loosening your structure without a concrete reason.', 'Qh4', ['Punish premature weakening', 'Exploit the weakened kingside']) ] },
  ],
  exercises: [
    { fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3', title: 'Punish the Weakening', description: 'A reminder of why loose pawn moves are dangerous. White must now deal with the threat to the king — the lesson is in the danger created.', targetColor: 'w', expectedMoves: ['Ke2', 'Nf3'], hints: ['The king is exposed', 'Weak pawn moves invite attacks'], maxMoves: 1 },
  ],
});

L({
  id: 'calculation-visualization', title: 'Calculation and Visualization', category: 'fundamentals', difficulty: 'intermediate',
  description: 'Learn a reliable thinking process: identify candidate moves, calculate forcing lines first, and visualize the resulting positions before committing.',
  estimatedMinutes: 20,
  keyConcepts: ['Candidate moves', 'Forcing moves first', 'Calculating to a quiet position', 'Visualization', 'Blunder check'],
  sections: [
    { title: 'Candidate Moves', content: 'Strong calculation starts by listing candidate moves — the two or three most promising options. Then calculate the most forcing ones first: checks, captures, and threats, since they limit the opponent\'s replies.', positions: [
      pos('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5', 'Identify your candidate moves, then calculate the most forcing options first. Forcing moves are easier to calculate because replies are limited.', 'Nc3', ['List a few candidate moves', 'Calculate checks and captures first']) ] },
    { title: 'Calculate to a Quiet Position', content: 'Don\'t stop a calculation in the middle of a tactical sequence. Follow each line until the position quiets down, then evaluate. And always do a final blunder-check before you play the move.', positions: [
      pos('r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 6 7', 'Calculate forcing lines to their end, then evaluate the resulting position. A move that wins material but loses the king is no good — always blunder-check.', 'h3', ['Follow lines to a quiet point', 'Evaluate the end position, not the middle']) ] },
  ],
  exercises: [
    { fen: 'r1bqkbnr/pppp1Bpp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 3', title: 'Forced Recapture', description: 'Black to play. The bishop just captured on f7 with check — find the only legal, forcing reply.', targetColor: 'b', expectedMoves: ['Kxf7'], hints: ['You are in check', 'Calculate the forced recapture'], maxMoves: 1 },
  ],
});

L({
  id: 'evaluating-positions', title: 'How to Evaluate a Position', category: 'fundamentals', difficulty: 'intermediate',
  description: 'Judge any position using four pillars: material, king safety, pawn structure, and piece activity. A clear evaluation tells you whether to attack, defend, or simplify.',
  estimatedMinutes: 20,
  keyConcepts: ['Material balance', 'King safety', 'Pawn structure', 'Piece activity', 'Making a plan'],
  sections: [
    { title: 'The Four Pillars', content: 'Evaluate every position by asking four questions: Who has more material? Whose king is safer? Who has the better pawn structure? Whose pieces are more active? The answers point you to the right plan.', positions: [
      pos('r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7', 'A balanced position. Material is equal, both kings are castled, structures are sound. The battle will be decided by who activates their pieces better.', 'Be3', ['Assess all four factors', 'Activity often decides equal positions']) ] },
    { title: 'From Evaluation to Plan', content: 'Your evaluation dictates your strategy. If you are better, increase the pressure and avoid simplifying into nothing. If you are worse, seek activity or simplify toward a draw. If equal, improve your worst-placed piece.', positions: [
      pos('r4rk1/ppp2ppp/2n1bn2/3qp3/8/2NP1NP1/PPP1PPBP/R2Q1RK1 w - - 0 11', 'When unsure what to do, improve your worst-placed piece. This simple rule turns a vague position into a concrete plan.', 'Re1', ['Improve your worst piece', 'Let the evaluation guide the plan']) ] },
  ],
  exercises: [
    { fen: 'r4rk1/ppp2ppp/2n1bn2/3qp3/8/2NP1NP1/PPP1PPBP/R2Q1RK1 w - - 0 11', title: 'Improve a Piece', description: 'White to play. Activate the least useful rook by bringing it toward an open or soon-to-open file.', targetColor: 'w', expectedMoves: ['Re1'], hints: ['Find your worst-placed piece', 'A rook belongs on a central file'], maxMoves: 1 },
  ],
});

L({
  id: 'study-improvement', title: 'How to Study and Improve', category: 'fundamentals', difficulty: 'beginner',
  description: 'Practical advice for getting better: solve tactics daily, analyze your own games, learn essential endgames, and study master games. A roadmap to real progress.',
  estimatedMinutes: 15,
  keyConcepts: ['Tactics training', 'Analyzing your games', 'Endgame study', 'Learning from masters', 'Consistent practice'],
  sections: [
    { title: 'Tactics and Endgames First', content: 'The fastest way to gain rating is daily tactics practice — pattern recognition wins games at every level. Pair this with the essential endgames (king and pawn, basic rook endings) which decide a huge share of games.', positions: [
      pos('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', 'Studying simple winning techniques like rook endgames pays off in real games. Endgame knowledge converts small advantages into full points.', 'Rd8', ['Practice essential endgames', 'Technique turns advantages into wins']) ] },
    { title: 'Analyze Your Own Games', content: 'The single most valuable study habit is reviewing your own games — especially losses. Find the moment things went wrong, understand why, and you will stop repeating the same mistakes. Studying annotated master games builds positional understanding over time.', positions: [
      pos(START, 'Improvement is a cycle: play, analyze, learn, repeat. Review your games honestly, study masters, and practice consistently to climb steadily.', 'd4', ['Review your own games', 'Learn from every loss']) ] },
  ],
  exercises: [
    { fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', title: 'Use Your Rook', description: 'White to play. Demonstrate basic rook activity by seizing the open file with an aggressive rook move.', targetColor: 'w', expectedMoves: ['Rd8'], hints: ['Activate the rook', 'Invade on the open file'], maxMoves: 1 },
  ],
});

// =====================================================================
// VALIDATE + WRITE
// =====================================================================
let errors = 0;
for (const lesson of lessons) {
  try {
    for (const [si, s] of lesson.sections.entries()) {
      for (const [pi, p] of s.positions.entries()) {
        validateFEN(p.fen, `${lesson.id} section${si} pos${pi}`);
      }
    }
    for (const [ei, ex] of (lesson.exercises || []).entries()) {
      validateFEN(ex.fen, `${lesson.id} exercise${ei}`);
    }
  } catch (e) {
    console.error('FEN ERROR:', e.message);
    errors++;
  }
}
if (errors > 0) {
  console.error(`\n${errors} FEN validation error(s). Aborting write.`);
  process.exit(1);
}

for (const lesson of lessons) {
  const json = JSON.stringify(lesson, null, 2) + '\n';
  fs.writeFileSync(path.join(FRONTEND_DIR, `${lesson.id}.json`), json);
  fs.writeFileSync(path.join(BACKEND_DIR, `${lesson.id}.json`), json);
}

console.log(`✓ All ${lessons.length} lessons validated and written.`);
console.log('IDs:', lessons.map(l => l.id).join(', '));
console.log('By category:');
const byCat = {};
lessons.forEach(l => { (byCat[l.category] ||= []).push(l.id); });
for (const [c, ids] of Object.entries(byCat)) console.log(`  ${c}: ${ids.length}`);
