// Generates additional middlegame and endgame lessons (thematic positions),
// bringing each category to 15 total. FENs validated for renderability
// (8 ranks summing to 8, one king per side). Also recategorizes
// openings-principles into the Fundamentals & Tips category.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT, 'chess-app/src/data/theory/lessons');
const BACKEND_DIR = path.join(ROOT, 'backend/lessons');

function validateFEN(fen, ctx) {
  const ranks = fen.split(' ')[0].split('/');
  if (ranks.length !== 8) throw new Error(`${ctx}: ${ranks.length} ranks -> ${fen}`);
  let wk = 0, bk = 0;
  for (const r of ranks) {
    let sum = 0;
    for (const ch of r) {
      if (/\d/.test(ch)) sum += +ch;
      else { sum++; if (ch === 'K') wk++; if (ch === 'k') bk++; if (!/[pnbrqkPNBRQK]/.test(ch)) throw new Error(`${ctx}: bad char ${ch}`); }
    }
    if (sum !== 8) throw new Error(`${ctx}: rank '${r}' sums ${sum} -> ${fen}`);
  }
  if (wk !== 1 || bk !== 1) throw new Error(`${ctx}: kings wk=${wk} bk=${bk} -> ${fen}`);
}

const P = (fen, commentary, expectedMove, hints) => {
  const p = { fen, commentary };
  if (expectedMove) p.expectedMove = expectedMove;
  if (hints) p.hints = hints;
  return p;
};

const lessons = [];

// ===================== MIDDLEGAME (+7 -> 15) =====================
lessons.push({
  id: 'weak-pawns', title: 'Weak Pawns: Isolated, Doubled, Backward', category: 'middlegame', difficulty: 'intermediate',
  description: 'Learn to recognize and exploit the three classic pawn weaknesses — and how to handle them when they are yours.',
  estimatedMinutes: 20,
  keyConcepts: ['Isolated pawns', 'Doubled pawns', 'Backward pawns', 'Blockade', 'Targeting weaknesses'],
  sections: [
    { title: 'The Isolated Queen Pawn', content: 'An isolated pawn has no friendly pawns on adjacent files, so it cannot be defended by a pawn. It grants active piece play but becomes a target in the endgame. Blockade it with a knight and trade pieces to exploit it.', positions: [
      P('3rr1k1/pp3ppp/2n2n2/3p4/3P4/2N2N2/PP3PPP/3RR1K1 w - - 0 1', 'Black has an isolated pawn on d5. White blockades it with a knight on d4 and aims to trade down to a winning endgame.', 'Nd4', ['Blockade the isolani', 'A knight on d4 is ideal']) ] },
    { title: 'Doubled Pawns', content: 'Doubled pawns cannot defend each other and often cannot advance. They can be useful when they open a file for a rook, but as a static weakness they are a long-term liability.', positions: [
      P('6k1/pp3ppp/2p5/2P5/8/1P6/P4PPP/6K1 w - - 0 1', 'White has doubled c-pawns. They are weak and can be fixed and attacked. Black will target them with pieces and the king.', 'b4', ['Try to free the doubled pawns', 'Advance to challenge the structure']) ] },
    { title: 'The Backward Pawn', content: 'A backward pawn lags behind its neighbors on a half-open file and cannot be supported by them. The square in front of it is a perfect outpost for the opponent. Pile pressure on it.', positions: [
      P('3r2k1/1p3ppp/p2p4/3P4/8/1P6/P4PPP/3R2K1 w - - 0 1', 'Black\'s d6 pawn is backward on the half-open d-file. White stacks rooks on the d-file and wins it.', 'Rd4', ['Pressure the backward pawn', 'Use the half-open file']) ] },
  ],
  exercises: [
    { fen: '3rr1k1/pp3ppp/2n2n2/3p4/3P4/2N2N2/PP3PPP/3RR1K1 w - - 0 1', title: 'Blockade the Isolani', description: 'White to play. Establish the ideal blockade in front of the isolated d-pawn.', targetColor: 'w', expectedMoves: ['Nd4'], hints: ['Knight to the blockade square'], maxMoves: 1 },
  ],
});

lessons.push({
  id: 'the-initiative', title: 'The Initiative', category: 'middlegame', difficulty: 'advanced',
  description: 'The initiative is the power to make threats that force the opponent to react. Learn to seize it, keep it, and convert it before it fades.',
  estimatedMinutes: 20,
  keyConcepts: ['Forcing moves', 'Tempo', 'Dictating play', 'Sacrificing for initiative', 'Not letting up'],
  sections: [
    { title: 'Forcing the Opponent to React', content: 'Holding the initiative means your opponent must answer your threats instead of pursuing their own plans. A stream of checks, captures, and threats keeps them on the back foot.', positions: [
      P('r1bq1rk1/ppp2ppp/2n5/3np3/1b6/2NP1NP1/PPP1PPBP/R1BQ1RK1 w - - 0 1', 'White seizes the initiative by challenging the centralized black knight and gaining tempo with each developing threat.', 'e4', ['Strike with tempo', 'Hit the centralized knight']) ] },
    { title: 'Sacrificing for the Initiative', content: 'Sometimes a pawn or even a piece is worth giving up to keep the opponent reacting. If the attack flows fast enough, material matters less than tempo and king safety.', positions: [
      P('r2qkb1r/ppp2ppp/2n5/3np1B1/2B5/5N2/PPP2PPP/RN1QK2R w KQkq - 0 1', 'White keeps the initiative with active piece play, refusing to let Black consolidate the extra central pawn.', 'Nc3', ['Develop with threats', 'Pressure d5 immediately']) ] },
  ],
  exercises: [
    { fen: 'r1bq1rk1/ppp2ppp/2n5/3np3/1b6/2NP1NP1/PPP1PPBP/R1BQ1RK1 w - - 0 1', title: 'Seize the Initiative', description: 'White to play. Gain time by challenging the strong black knight in the center.', targetColor: 'w', expectedMoves: ['e4'], hints: ['Hit the knight with a pawn', 'Gain a tempo'], maxMoves: 1 },
  ],
});

lessons.push({
  id: 'space-advantage', title: 'Using a Space Advantage', category: 'middlegame', difficulty: 'intermediate',
  description: 'More space means more room for your pieces and less for your opponent\'s. Learn to gain space, avoid trades, and convert a cramping bind.',
  estimatedMinutes: 18,
  keyConcepts: ['Space and mobility', 'Avoiding trades when cramping', 'The maneuvering edge', 'Pawn chains', 'Restricting pieces'],
  sections: [
    { title: 'Cramp and Restrict', content: 'When you have more space, avoid exchanges — every trade relieves the opponent\'s cramped position. Keep pieces on the board and maneuver to the better squares.', positions: [
      P('r1bqk2r/pp1n1ppp/2p1pn2/3pP3/2PP4/2N2N2/PP3PPP/R1BQKB1R w KQkq - 0 1', 'White\'s advanced e5 pawn grabs kingside space and cramps Black. White keeps pieces on and prepares a kingside attack.', 'Bd3', ['Keep pieces on the board', 'Build toward a kingside attack']) ] },
    { title: 'Expanding the Bind', content: 'A space advantage can be widened with further pawn advances, squeezing the opponent until their pieces have no good squares. Patience converts space into something concrete.', positions: [
      P('2r1r1k1/pp1n1ppp/3p1n2/2pPp3/2P1P3/2N3P1/PP3PBP/2R1R1K1 w - - 0 1', 'White has a Benoni-style space bind. Slow expansion and piece maneuvers gradually suffocate Black\'s position.', 'b4', ['Expand on the queenside', 'Widen the bind']) ] },
  ],
  exercises: [
    { fen: 'r1bqk2r/pp1n1ppp/2p1pn2/3pP3/2PP4/2N2N2/PP3PPP/R1BQKB1R w KQkq - 0 1', title: 'Keep the Tension', description: 'White to play. Develop a piece while keeping the cramping e5 pawn and avoiding helpful trades.', targetColor: 'w', expectedMoves: ['Bd3', 'Be2'], hints: ['Develop, do not trade', 'Aim at the kingside'], maxMoves: 1 },
  ],
});

lessons.push({
  id: 'knight-vs-bishop', title: 'Knight vs Bishop', category: 'middlegame', difficulty: 'intermediate',
  description: 'The eternal debate. Learn when the knight outshines the bishop and vice versa, and how to steer the position toward your better minor piece.',
  estimatedMinutes: 18,
  keyConcepts: ['Open vs closed positions', 'Good and bad bishops', 'Knight outposts', 'Fixing pawns', 'Trading the right piece'],
  sections: [
    { title: 'The Good Knight', content: 'In closed positions with fixed pawn chains, a knight on a strong outpost can dominate a bishop hemmed in by its own pawns. Fix the pawns on the bishop\'s color to entomb it.', positions: [
      P('5k2/1p3pp1/p1p1p3/2PpP3/1P1P1P2/4N3/6PP/5K2 w - - 0 1', 'A closed structure where the knight is superior. The black bishop would be a "bad bishop", blocked by its own fixed pawns.', 'Nc2', ['Reroute the knight to a strong square', 'Closed position favors the knight']) ] },
    { title: 'The Good Bishop', content: 'In open positions with pawns on both wings, the bishop\'s long-range power lets it dominate. Open the position and create targets on both sides to maximize the bishop.', positions: [
      P('5k2/pp3ppp/2p5/8/2P5/1P3B2/P4PPP/4n1K1 w - - 0 1', 'With pawns on both wings and open lines, the bishop is much stronger than the knight, switching wings in a single move.', 'Be4', ['Activate the long-range bishop', 'Target pawns on both wings']) ] },
  ],
  exercises: [
    { fen: '5k2/pp3ppp/2p5/8/2P5/1P3B2/P4PPP/4n1K1 w - - 0 1', title: 'Maximize the Bishop', description: 'White to play. Centralize the bishop to dominate both wings and restrict the knight.', targetColor: 'w', expectedMoves: ['Be4'], hints: ['Centralize on the long diagonal', 'Restrict the knight'], maxMoves: 1 },
  ],
});

lessons.push({
  id: 'prophylaxis', title: 'Prophylaxis and Planning', category: 'middlegame', difficulty: 'advanced',
  description: 'Prophylaxis means preventing the opponent\'s plans before pursuing your own. Learn to ask "what does my opponent want?" and stop it.',
  estimatedMinutes: 20,
  keyConcepts: ['Prophylactic thinking', 'Anticipating threats', 'Improving slowly', 'Restraint', 'Nimzowitsch\'s legacy'],
  sections: [
    { title: 'What Does the Opponent Want?', content: 'Before making your own plan, identify the opponent\'s best idea and prevent it. A single prophylactic move can neutralize an entire plan and leave you free to improve.', positions: [
      P('r1bq1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 1', 'White plays h3, a quiet prophylactic move stopping ...Bg4 and ...Ng4 ideas before continuing the plan.', 'h3', ['Prevent ...Bg4 and ...Ng4', 'A quiet move that stops counterplay']) ] },
    { title: 'Improve Your Worst Piece', content: 'When there is no immediate plan, prophylaxis pairs with the rule: improve your worst-placed piece. Restrain the opponent, then slowly better your own position.', positions: [
      P('2r2rk1/pp1bppbp/3p1np1/q7/2PNP3/2N1B3/PP2BPPP/R2Q1RK1 w - - 0 1', 'White centralizes and restrains Black\'s queenside play, improving the position without committing to a premature attack.', 'Nb3', ['Restrain the enemy queen', 'Improve a passive piece']) ] },
  ],
  exercises: [
    { fen: 'r1bq1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 1', title: 'Play Prophylaxis', description: 'White to play. Make the quiet move that prevents Black\'s ...Bg4 and ...Ng4 pin ideas.', targetColor: 'w', expectedMoves: ['h3'], hints: ['Stop the pin before it happens', 'A little luft helps too'], maxMoves: 1 },
  ],
});

lessons.push({
  id: 'art-of-exchanges', title: 'The Art of Exchanges', category: 'middlegame', difficulty: 'intermediate',
  description: 'Knowing what to trade is as important as knowing how to attack. Learn which exchanges help you and which help your opponent.',
  estimatedMinutes: 18,
  keyConcepts: ['Trade when cramped relieve... no', 'Trade to exploit weaknesses', 'Keep attackers when attacking', 'Trade the opponent\'s good pieces', 'Simplify when ahead'],
  sections: [
    { title: 'Trade Off the Defenders', content: 'When attacking, exchange the pieces that defend the enemy king. Removing a key defender often collapses the defense, even at the cost of your own attacker.', positions: [
      P('r2q1rk1/pp3ppp/2n1pn2/3p4/3P2b1/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 1', 'White trades the light-squared bishop for the knight that guards the kingside, weakening the squares around the black king.', 'h3', ['Question the pinning bishop', 'Remove a kingside defender']) ] },
    { title: 'Simplify When Ahead', content: 'With a material or structural advantage, exchanging pieces (but not pawns) brings you closer to a winning endgame and reduces the opponent\'s chances of complications.', positions: [
      P('3r2k1/pp3ppp/4p3/2bp4/8/1PN1P3/P4PPP/3R2K1 w - - 0 1', 'A slightly better White trades minor pieces to reach a clean rook endgame where the small edge is easier to convert.', 'Nxd5', ['Simplify toward the endgame', 'Trade pieces, keep pawns']) ] },
  ],
  exercises: [
    { fen: '3r2k1/pp3ppp/4p3/2bp4/8/1PN1P3/P4PPP/3R2K1 w - - 0 1', title: 'Simplify the Win', description: 'White to play. Exchange into a favorable endgame by capturing the central pawn with the knight.', targetColor: 'w', expectedMoves: ['Nxd5'], hints: ['Trade toward the endgame', 'Capture on d5'], maxMoves: 1 },
  ],
});

lessons.push({
  id: 'rook-lifts', title: 'Rook Lifts and Batteries', category: 'middlegame', difficulty: 'advanced',
  description: 'Rooks are not just for open files. Learn to lift rooks into the attack along the third rank and to build powerful batteries.',
  estimatedMinutes: 18,
  keyConcepts: ['Rook lift', 'Third-rank maneuver', 'Doubling rooks', 'Queen+rook battery', 'Bringing the last piece in'],
  sections: [
    { title: 'The Rook Lift', content: 'A rook lift (e.g. Re1-e3-g3/h3) swings a rook in front of its pawns to join a kingside attack. It is often the move that brings the decisive extra attacker.', positions: [
      P('r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1R1K w - - 0 1', 'White prepares a kingside attack with a rook lift Rf1-f3-g3/h3, adding a heavy piece to the assault.'),
      P('r1bq1rk1/ppp2pp1/2np1n1p/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1R1K w - - 0 2', 'The rook is ready to swing to g3 or h3, joining the queen and bishop in a direct attack on the black king.', undefined) ] },
    { title: 'Building a Battery', content: 'A battery lines up two pieces on the same file or diagonal — queen behind rook on a file, or bishop behind queen on a diagonal — multiplying their power against a single target.', positions: [
      P('3r2k1/pp3ppp/2p5/8/8/1P2Q3/P4PPP/3R2K1 w - - 0 1', 'White doubles queen and rook on the d-file, a battery that overloads the defense of the back rank and the d-file.', 'Qd3', ['Line up heavy pieces', 'Build a battery on the open file']) ] },
  ],
  exercises: [
    { fen: '3r2k1/pp3ppp/2p5/8/8/1P2Q3/P4PPP/3R2K1 w - - 0 1', title: 'Form the Battery', description: 'White to play. Combine the queen with the rook on the open d-file.', targetColor: 'w', expectedMoves: ['Qd3', 'Qe8+'], hints: ['Stack heavy pieces on the file', 'Queen supports the rook'], maxMoves: 1 },
  ],
});

// ===================== ENDINGS (+4 -> 15) =====================
lessons.push({
  id: 'passed-pawns', title: 'Passed Pawns', category: 'endings', difficulty: 'intermediate',
  description: 'A passed pawn has no enemy pawns blocking or able to capture it on its way to promotion. Learn to create, support, and push passed pawns — and to blockade the opponent\'s.',
  estimatedMinutes: 20,
  keyConcepts: ['Creating passers', 'Protected passed pawn', 'Outside passed pawn', 'Blockade', 'Passed pawns must be pushed'],
  sections: [
    { title: 'The Outside Passed Pawn', content: 'An outside passed pawn — far from the other pawns — is a decisive endgame asset. It lures the enemy king away, letting your king feast on the other wing.', positions: [
      P('6k1/5ppp/8/p7/P7/8/5PPP/6K1 w - - 0 1', 'The a-pawn is an outside passer. Pushed at the right moment, it drags the black king to the queenside while White\'s king invades the kingside.', 'Kf1', ['Use the passer as a decoy', 'March your king while the pawn distracts']) ] },
    { title: 'The Protected Passed Pawn', content: 'A passed pawn defended by another pawn is "protected" — the enemy king cannot win it and is tied down forever. This is often a winning advantage by itself.', positions: [
      P('8/8/4k3/3p4/3P4/4P3/6K1/8 w - - 0 1', 'White\'s e3 pawn protects the passed d4 pawn. The black king can never capture it, and White\'s king is free to advance.', 'Kf3', ['Push with king support', 'The protected passer ties the enemy down']) ] },
  ],
  exercises: [
    { fen: '6k1/5ppp/8/p7/P7/8/5PPP/6K1 w - - 0 1', title: 'Activate the King', description: 'White to play. Begin marching the king toward the action while the outside passer ties Black down.', targetColor: 'w', expectedMoves: ['Kf1', 'Kf2', 'Kg2'], hints: ['The king is the key piece in the endgame', 'Head for the center/kingside'], maxMoves: 1 },
  ],
});

lessons.push({
  id: 'king-activity-endgame', title: 'King Activity in the Endgame', category: 'endings', difficulty: 'beginner',
  description: 'In the endgame the king becomes a strong piece. Learn to activate and centralize your king to attack pawns and support your own.',
  estimatedMinutes: 16,
  keyConcepts: ['Centralizing the king', 'King as an attacker', 'Racing to key pawns', 'Opposition', 'Activity over material'],
  sections: [
    { title: 'Centralize the King', content: 'When the queens come off, rush the king toward the center. A centralized king influences both wings, attacks weak pawns, and shepherds passers. Do not leave it idle on the back rank.', positions: [
      P('8/8/8/3k4/8/8/4K3/8 w - - 0 1', 'In a king-and-pawn endgame, the more active, centralized king usually wins. Race your king to the center and the key pawns.', 'Kd3', ['Centralize immediately', 'An active king is decisive']) ] },
    { title: 'The King as Attacker', content: 'An active king can win enemy pawns directly. While the opponent\'s king defends one weakness, yours marches in to capture another. Activity often outweighs a pawn.', positions: [
      P('8/p4pkp/6p1/8/8/1P6/P3KPPP/8 w - - 0 1', 'White\'s king heads to the queenside to attack the a7 pawn, exploiting its greater activity to win material.', 'Kd3', ['Send the king to the weak pawns', 'Outpace the enemy king']) ] },
  ],
  exercises: [
    { fen: '8/8/8/3k4/8/8/4K3/8 w - - 0 1', title: 'Race to the Center', description: 'White to play. Take the most active step toward the center with the king.', targetColor: 'w', expectedMoves: ['Kd3', 'Ke3', 'Kd2'], hints: ['Centralize the king', 'Toward d4/e4'], maxMoves: 1 },
  ],
});

lessons.push({
  id: 'pawn-races', title: 'Pawn Races and Counting', category: 'endings', difficulty: 'advanced',
  description: 'When both sides push passed pawns toward promotion, the game becomes a race. Learn to count tempi accurately and use queening with check or threats to win the race.',
  estimatedMinutes: 20,
  keyConcepts: ['Counting tempi', 'Queening with check', 'New queen stops the enemy', 'Promotion squares', 'Calculating to the end'],
  sections: [
    { title: 'Count the Tempi', content: 'In a pawn race, count exactly how many moves each pawn needs to promote. Whoever queens first — or queens with check or an immediate threat — wins the race. Calculate to the very last move.', positions: [
      P('8/6p1/8/8/8/1p6/P5K1/7k w - - 0 1', 'A pawn race. White must count precisely: push the a-pawn and calculate whether it queens in time, possibly with a check that wins the enemy pawn.', 'a4', ['Count the moves to promotion', 'Race your passer immediately']) ] },
    { title: 'Queen With Tempo', content: 'A new queen that gives check or attacks the opponent\'s pawn can stop their promotion. Even a move behind in the race, queening with check can turn the tables.', positions: [
      P('8/8/8/8/8/k1p5/8/4K2Q w - - 0 1', 'White\'s queen demonstrates how a new queen halts an enemy passer: it checks the king and then captures or blockades the runaway pawn.', 'Qh3', ['Use checks to gain time', 'Stop the enemy pawn with tempo']) ] },
  ],
  exercises: [
    { fen: '8/6p1/8/8/8/1p6/P5K1/7k w - - 0 1', title: 'Win the Race', description: 'White to play. Start your passed pawn down the board — count carefully!', targetColor: 'w', expectedMoves: ['a4'], hints: ['Push the passer', 'Count tempi to promotion'], maxMoves: 1 },
  ],
});

lessons.push({
  id: 'rook-vs-minor', title: 'Rook vs Minor Piece Endings', category: 'endings', difficulty: 'advanced',
  description: 'A rook is usually worth a minor piece plus pawns, but with few pawns these endings are often drawn. Learn the key technique and the drawing fortresses.',
  estimatedMinutes: 20,
  keyConcepts: ['Rook vs bishop draws', 'Rook vs knight', 'Cutting off the king', 'Fortresses', 'Active rook'],
  sections: [
    { title: 'Rook vs Bishop (Drawn)', content: 'Rook versus a lone bishop is a draw — the defender keeps the king in the corner of the OPPOSITE color to the bishop, where it cannot be driven out. Knowing this saves many half points.', positions: [
      P('7k/8/8/8/8/8/5B2/6RK b - - 0 1', 'Bare rook versus bishop is a theoretical draw if the weaker side reaches the safe corner. The defender shuffles the king and holds.', undefined),
      P('6k1/8/8/8/8/8/5B2/6RK w - - 0 2', 'The defending king heads to the corner of the wrong color for the bishop, where the rook alone cannot force mate.', 'Rg2', ['Drive toward the safe corner', 'Lone rook cannot mate']) ] },
    { title: 'Converting Rook vs Knight', content: 'Rook versus knight is also usually drawn, but the knight can get awkwardly placed. The attacker tries to separate the knight from its king, where a lone knight may get trapped.', positions: [
      P('8/8/8/4k3/8/4n3/8/4K1R1 w - - 0 1', 'The attacker probes to separate the knight from the king. If the knight strays too far from its monarch, it can be cornered and won.', 'Rg3', ['Attack the knight', 'Separate it from its king']) ] },
  ],
  exercises: [
    { fen: '8/8/8/4k3/8/4n3/8/4K1R1 w - - 0 1', title: 'Probe the Knight', description: 'White to play. Use the rook to harass the knight and try to separate it from its king.', targetColor: 'w', expectedMoves: ['Rg3', 'Ra1', 'Rg5+'], hints: ['Attack the awkward knight', 'Keep the rook active'], maxMoves: 1 },
  ],
});

// ===================== WRITE LESSONS =====================
let errors = 0;
for (const lesson of lessons) {
  try {
    for (const [si, s] of lesson.sections.entries())
      for (const [pi, p] of s.positions.entries())
        validateFEN(p.fen, `${lesson.id} s${si}p${pi}`);
    for (const [ei, ex] of (lesson.exercises || []).entries())
      validateFEN(ex.fen, `${lesson.id} ex${ei}`);
  } catch (e) { console.error('FEN ERROR:', e.message); errors++; }
}
if (errors) { console.error(`${errors} errors, aborting.`); process.exit(1); }

for (const lesson of lessons) {
  const json = JSON.stringify(lesson, null, 2) + '\n';
  fs.writeFileSync(path.join(FRONTEND_DIR, `${lesson.id}.json`), json);
  fs.writeFileSync(path.join(BACKEND_DIR, `${lesson.id}.json`), json);
}

// ===================== RECATEGORIZE openings-principles -> fundamentals =====================
for (const dir of [FRONTEND_DIR, BACKEND_DIR]) {
  const f = path.join(dir, 'openings-principles.json');
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
    data.category = 'fundamentals';
    fs.writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
  }
}

console.log(`Wrote ${lessons.length} theme lessons (7 middlegame + 4 endings).`);
console.log('Recategorized openings-principles -> fundamentals.');
