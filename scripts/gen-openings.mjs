// Deep opening-lesson generator. Each opening has several "lines" (principal
// variations) given as SAN move strings. chess.js plays them out, producing a
// legal FEN for every ply, so lessons walk through real theory move by move.
// Output JSON goes to both the frontend bundle and the backend seed dir.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Chess } from 'chess.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT, 'chess-app/src/data/theory/lessons');
const BACKEND_DIR = path.join(ROOT, 'backend/lessons');

function moveLabel(ply, san) {
  const n = Math.floor(ply / 2) + 1;
  return ply % 2 === 0 ? `${n}.${san}` : `${n}...${san}`;
}

// Build a section from a line definition. Produces one position per ply (board
// BEFORE the move, with the move to find), plus a final summary position.
function buildSection(line) {
  const chess = new Chess();
  const sans = line.moves.trim().split(/\s+/);
  const positions = [];
  const notes = line.notes || {};
  sans.forEach((san, ply) => {
    const fenBefore = chess.fen();
    const result = chess.move(san);
    if (!result) throw new Error(`Illegal move '${san}' at ply ${ply} in line '${line.name}'`);
    const label = moveLabel(ply, result.san);
    const commentary = notes[ply] ? `${label} — ${notes[ply]}` : `${label}. ${line.fill || 'A main-line move; follow the theory and find it on the board.'}`;
    positions.push({
      fen: fenBefore,
      commentary,
      expectedMove: result.lan, // long algebraic (e.g. e2e4) matches board UCI
      hints: [`Play ${result.san}`],
    });
  });
  positions.push({
    fen: chess.fen(),
    commentary: line.summary || `End of the ${line.name}. This is the tabiya — the typical middlegame position both sides aim for.`,
  });
  return { title: line.name, content: line.intro, positions };
}

function buildOpening(o) {
  const sections = o.lines.map(buildSection);
  // First exercise: the very first key move of the main line.
  const first = new Chess();
  const mainSans = o.lines[0].moves.trim().split(/\s+/);
  const exercises = [];
  if (o.exercise) {
    const ex = new Chess();
    for (const san of o.exercise.setup.trim().split(/\s+/)) ex.move(san);
    const sol = new Chess(ex.fen());
    const solMove = sol.move(o.exercise.solution);
    exercises.push({
      fen: ex.fen(),
      title: o.exercise.title,
      description: o.exercise.description,
      targetColor: ex.turn(),
      expectedMoves: [solMove.lan],
      hints: o.exercise.hints || [`Play ${solMove.san}`],
      maxMoves: 1,
    });
  }
  void first; void mainSans;
  return {
    id: o.id,
    title: o.title,
    category: 'openings',
    difficulty: o.difficulty,
    description: o.description,
    estimatedMinutes: o.estimatedMinutes || 30,
    keyConcepts: o.keyConcepts,
    sections,
    exercises,
  };
}

// =====================================================================
// 15 OPENINGS WITH DEEP PRINCIPAL VARIATIONS
// =====================================================================
const openings = [
  {
    id: 'italian-game', title: 'The Italian Game', difficulty: 'beginner',
    description: 'The classical 1.e4 e5 opening where White develops the bishop to c4, eyeing f7. We study the quiet Giuoco Piano, the sharp Evans Gambit, and the Two Knights Defense.',
    keyConcepts: ['Rapid development', 'The c4 bishop and f7', 'Central break with c3-d4', 'Giuoco Pianissimo', 'Evans Gambit'],
    lines: [
      { name: 'Giuoco Piano Main Line', intro: 'The "quiet game". White builds a center with c3 and d4 while both sides develop naturally.',
        moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 a4 Ba7 h3 Be6',
        notes: { 0: 'opening the center and freeing the bishops.', 4: 'the Italian bishop targets the f7 pawn, the weakest point in Black\'s camp.', 5: 'Black mirrors with the Giuoco Piano bishop.', 6: 'preparing the central pawn break d4.', 8: 'the modern Pianissimo: White delays d4 and maneuvers slowly.', 10: 'king safety first.', 12: 'the rook supports a future e4-e5 or d4 break.', 16: 'gaining kingside space and stopping ...Bg4 pins.' },
        summary: 'A typical Giuoco Pianissimo tabiya: a slow maneuvering battle where White will reroute the b1-knight via d2-f1-g3.' },
      { name: 'Evans Gambit', intro: 'White sacrifices the b-pawn to gain time and build a big center — a romantic, aggressive try.',
        moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O Nge7 cxd4 d5',
        notes: { 6: 'the Evans Gambit! White offers a pawn to deflect the bishop and gain tempo.', 7: 'accepting the gambit.', 8: 'hitting the bishop and preparing the big center.', 10: 'White grabs the center with tempo.', 12: 'castling and accelerating development for the pawn.', 15: 'Black returns the pawn to free his game.' },
        summary: 'White has a strong center and a lead in development as compensation for the sacrificed pawn.' },
      { name: 'Two Knights Defense', intro: 'Instead of ...Bc5, Black plays the combative 3...Nf6, immediately challenging e4.',
        moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5 c6 dxc6 bxc6 Be2 h6',
        notes: { 5: 'the Two Knights — Black ignores the threat to f7 and counterattacks.', 6: 'the aggressive Ng5, attacking f7 at once.', 7: 'the only good defense, striking in the center.', 9: 'the key move — Black sidesteps the fork and chases the bishop.', 11: 'preparing to round up the d5 pawn.', 14: 'the bishop retreats; Black has a lead in development for the pawn (the Knorre/Polerio).' },
        summary: 'A sharp gambit position: Black has sacrificed a pawn for fast development and pressure against the white king.' },
    ],
    exercise: { setup: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4', solution: 'exd4', title: 'Meet the Center Break', description: 'Black to play. White just played d4. Resolve the central tension correctly.', hints: ['Capture toward the center', 'Open lines while White is not fully developed'] },
  },
  {
    id: 'ruy-lopez', title: 'The Ruy Lopez', difficulty: 'intermediate',
    description: 'The Spanish Opening — one of the deepest in chess. We cover the Closed Main Line, the Exchange Variation, and the Berlin Defense, the choice of world champions.',
    keyConcepts: ['Pressure on e5 via the pin', 'The Spanish bishop', 'Closed center maneuvering', 'The Berlin endgame', 'Queenside expansion'],
    lines: [
      { name: 'Closed Main Line', intro: 'The classical battleground. White builds the center with c3 and d4; Black expands on the queenside and reroutes the knight to the kingside.',
        moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4 Qc7',
        notes: { 4: 'the Ruy Lopez bishop pins the c6 knight to the king, indirectly pressuring e5.', 5: 'the Morphy Defense, questioning the bishop.', 6: 'maintaining the pin along the a4-e8 diagonal.', 11: 'gaining space and forcing the bishop back.', 12: 'the bishop retreats to its long-term post.', 14: 'the key move c3 supports the coming d4 break.', 16: 'a useful luft, preventing ...Bg4 pins before playing d4.', 17: 'the Chigorin: Black\'s knight heads to c4 or back to influence the center.', 20: 'White finally strikes in the center with d4.' },
        summary: 'The classical Closed Ruy tabiya. White presses in the center and on the kingside; Black counters on the queenside.' },
      { name: 'Exchange Variation', intro: 'White trades on c6, doubling Black\'s pawns and heading for a favorable endgame where the kingside majority is healthy.',
        moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Ne2 Qxd1 Rxd1 Bd6',
        notes: { 6: 'the Exchange Variation — White accepts giving up the bishop pair to damage Black\'s structure.', 7: 'recapturing toward the center, opening the d-file and the c8 bishop.', 8: 'castling; White\'s plan is a healthy 4-vs-3 kingside majority in the endgame.', 9: 'reinforcing e5.', 14: 'heading to g3; White avoids trades that help Black\'s bishops.', 15: 'the queens come off — White wants an endgame.' },
        summary: 'A structural endgame battle: White\'s clean kingside majority versus Black\'s bishop pair and central pawns.' },
      { name: 'Berlin Defense', intro: 'The rock-solid 3...Nf6. After the famous queen trade Black reaches the "Berlin Wall" endgame — slightly worse structure but very hard to break.',
        moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8 Kxd8',
        notes: { 5: 'the Berlin Defense — Black counterattacks e4 immediately.', 6: 'castling, offering the e-pawn.', 7: 'grabbing the pawn (the open Berlin).', 8: 'striking the center and chasing the knight.', 11: 'damaging Black\'s queenside but conceding the bishop pair.', 13: 'the knight reroutes to f5.', 14: 'the trademark queen trade — Black must recapture with the king, losing castling rights.' },
        summary: 'The Berlin Wall endgame: Black\'s king is stuck in the center but the position is famously solid and drawish.' },
    ],
    exercise: { setup: 'e4 e5 Nf3 Nc6 Bb5 a6', solution: 'Ba4', title: 'Keep the Pin', description: 'White to play after 3...a6. Maintain the bishop\'s pressure on the c6 knight.', hints: ['Retreat along the diagonal', 'Do not give up the bishop yet'] },
  },
  {
    id: 'sicilian-defense', title: 'The Sicilian Defense', difficulty: 'advanced',
    description: 'The most popular and combative answer to 1.e4. Black fights for the center asymmetrically. We study the Najdorf, the Dragon, and the Sveshnikov.',
    keyConcepts: ['Asymmetric pawn structure', 'Open c-file counterplay', 'Opposite-side castling races', 'The d5 break', 'Dynamic imbalance'],
    lines: [
      { name: 'Najdorf Variation', intro: 'The most famous Sicilian. Black\'s 5...a6 prepares ...e5 or ...e6 and prevents White pieces from using b5.',
        moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6 f3 Nbd7',
        notes: { 0: 'staking a central claim.', 1: 'the Sicilian — Black challenges e4 from the side.', 3: 'the Open Sicilian; White trades to open lines.', 9: 'the Najdorf move, taking control of b5 and preparing central play.', 10: 'the classical, positional Be2 setup.', 11: 'grabbing central space.', 12: 'the knight retreats to b3.', 16: 'developing toward the kingside and supporting d4-ideas.', 18: 'the f3 setup, solidifying e4 and preparing a kingside expansion.' },
        summary: 'A classical Najdorf middlegame: White plays on the kingside and the d5 square, Black on the queenside and the c-file.' },
      { name: 'Dragon Variation', intro: 'Black fianchettoes the bishop on g7, aiming it at White\'s queenside. Both sides race to attack opposite-side castled kings.',
        moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 Nc6 Qd2 O-O O-O-O d5',
        notes: { 9: 'the Dragon — the g7 bishop will be a monster on the long diagonal.', 10: 'the Yugoslav Attack setup begins.', 12: 'f3 secures e4 and prepares g4-h4 pawn storm.', 14: 'queen to d2, connecting rooks and preparing O-O-O.', 15: 'opposite-side castling — now it is a race!', 17: 'the key freeing break ...d5, the heart of Dragon counterplay.' },
        summary: 'A razor-sharp opposite-castling battle: White storms the kingside with h4-h5, Black counters down the c-file and the long diagonal.' },
      { name: 'Sveshnikov Variation', intro: 'Black accepts a backward d-pawn and a hole on d5 in return for active piece play and the bishop pair.',
        moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Nd5 Nxd5 exd5 Nb8 c4 Be7',
        notes: { 9: 'the Sveshnikov — Black grabs the center but weakens d5.', 10: 'the knight jumps to b5, eyeing d6 and c7.', 11: 'defending against the fork.', 12: 'Nd5 is the critical test of the system.', 15: 'the knight reroutes from c6 to a more useful square.', 16: 'White grips the d5 square with c4.' },
        summary: 'White owns the d5 outpost and a queenside bind; Black has the bishop pair and dynamic chances with ...f5.' },
    ],
    exercise: { setup: 'e4 c5 Nf3 d6 d4', solution: 'cxd4', title: 'Open the Sicilian', description: 'Black to play. White offered the central trade with d4 — take it.', hints: ['Capture in the center', 'Trade the c-pawn for the d-pawn'] },
  },
  {
    id: 'french-defense', title: 'The French Defense', difficulty: 'intermediate',
    description: 'A solid, strategic reply to 1.e4 built on pawn chains. We study the Advance, the Tarrasch, and the Winawer variations.',
    keyConcepts: ['Pawn chains', 'The bad light-squared bishop', 'Breaks with c5 and f6', 'Queenside play', 'Central tension'],
    lines: [
      { name: 'Advance Variation', intro: 'White grabs space with e5 and builds a big pawn chain; Black attacks its base with c5 and f6.',
        moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 Nh6 b4 cxd4 cxd4 Nf5 Bb2 Bd7',
        notes: { 1: 'the French — solid but slightly passive.', 4: 'the Advance, gaining space and locking the center.', 5: 'striking immediately at the base of the chain.', 6: 'defending d4, the head of the chain.', 9: 'Qb6 piles pressure on d4 and b2.', 10: 'making luft and preparing to defend with Bd3.', 11: 'rerouting the knight to f5 to hit d4.', 13: 'resolving the tension in the center.' },
        summary: 'A classic French structure: Black pressures d4 while White seeks kingside space and an attack.' },
      { name: 'Tarrasch Variation', intro: 'With 3.Nd2 White avoids the Winawer pin and keeps a flexible, solid position.',
        moves: 'e4 e6 d4 d5 Nd2 c5 exd5 exd5 Ngf3 Nc6 Bb5 Bd6 dxc5 Bxc5 O-O Nge7 Nb3 Bd6',
        notes: { 4: 'the Tarrasch — the knight goes to d2 to keep options open.', 5: 'the main response, hitting d4.', 6: 'opening the position with an isolated queen pawn structure.', 10: 'pinning the c6 knight.', 12: 'White wins a tempo on the bishop.', 16: 'the knight pressures the isolated d5 pawn.' },
        summary: 'An isolated-queen-pawn middlegame: Black has active pieces and the open e-file; White blockades d5.' },
      { name: 'Winawer Variation', intro: 'The sharpest French. Black pins with ...Bb4, trades on c3 to wreck White\'s queenside pawns, and plays for the dark squares.',
        moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3 bxc3 Ne7 Qg4 O-O Bd3 Nbc6 Qh5 Ng6',
        notes: { 4: 'Nc3 invites the Winawer.', 5: 'the pin — Black threatens to damage White\'s structure.', 6: 'gaining space; the center locks.', 9: 'Black doubles White\'s c-pawns, accepting White\'s bishop pair.', 12: 'Qg4 attacks g7, the thematic Winawer kingside lunge.', 13: 'castling into the attack — Black accepts weaknesses for queenside play.', 16: 'the queen probes the kingside.' },
        summary: 'A deeply imbalanced fight: White has the bishop pair and kingside chances; Black targets the doubled c-pawns and dark squares.' },
    ],
    exercise: { setup: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4 b4', solution: 'cxb3', title: 'En Passant Break', description: 'Black to play. White just pushed b4 next to your c4 pawn — find the en passant capture.', hints: ['A pawn just moved two squares beside yours', 'Capture en passant'] },
  },
  {
    id: 'caro-kann', title: 'The Caro-Kann Defense', difficulty: 'intermediate',
    description: 'A reliable, sound defense to 1.e4 where Black gets a free light-squared bishop. We study the Classical, the Advance, and the Exchange variations.',
    keyConcepts: ['Solid structure', 'Active light bishop', 'Endgame soundness', 'The c5 break', 'Few weaknesses'],
    lines: [
      { name: 'Classical Variation', intro: 'Black develops the light-squared bishop to f5 outside the chain — the great achievement of the Caro-Kann.',
        moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6',
        notes: { 1: 'the Caro-Kann, preparing ...d5 with support.', 5: 'releasing the central tension.', 7: 'the classical Bf5 — the bishop escapes before ...e6 locks it in.', 8: 'gaining a tempo on the bishop.', 10: 'White gains kingside space with h4-h5.', 13: 'developing the knight to d7, heading for f6 or b6.', 16: 'offering to trade the strong light-squared bishops.', 19: 'completing a solid, harmonious setup.' },
        summary: 'A model Caro-Kann structure: Black is solid with no weaknesses; White has more space and tries to exploit it.' },
      { name: 'Advance Variation', intro: 'White plays e5 to gain space; unlike the French, Black gets the bishop out to f5 first.',
        moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Qb6 Nc3 Ne7 O-O Nbc6 dxc5 Qxc5',
        notes: { 4: 'the Advance, locking the center.', 5: 'the key point — the bishop develops actively before ...e6.', 9: 'striking at the base of the chain.', 11: 'Qb6 pressures b2 and d4.', 16: 'resolving the central tension with a small edge in development.' },
        summary: 'Black has comfortably solved the problem bishop and has active piece play against White\'s center.' },
      { name: 'Exchange Variation', intro: 'White trades on d5 for a simple, solid structure resembling a Queen\'s Gambit with colors reversed.',
        moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6 Ngf3 Bd6',
        notes: { 4: 'the Exchange — a quiet, low-risk approach.', 6: 'the standard setup with Bd3 and c3.', 10: 'developing the bishop actively to f4.', 12: 'Qb3 probes the queenside, hitting b7 and d5.', 15: 'Black completes development with a sound, symmetrical-looking position.' },
        summary: 'A solid Carlsbad-type structure where White may try the minority attack with b4-b5.' },
    ],
    exercise: { setup: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4', solution: 'Bf5', title: 'Free the Bishop', description: 'Black to play. Develop the light-squared bishop to its best square, hitting the knight.', hints: ['Get the bishop outside the pawn chain', 'Develop with tempo against the e4 knight'] },
  },
  {
    id: 'queens-gambit', title: 'The Queen\'s Gambit', difficulty: 'intermediate',
    description: 'The most classical 1.d4 opening. White offers the c-pawn to dominate the center. We study the Declined, the Slav, and the Accepted.',
    keyConcepts: ['Central control', 'The minority attack', 'Isolated queen pawn', 'Classical development', 'The c4-d5 tension'],
    lines: [
      { name: 'Queen\'s Gambit Declined', intro: 'Black supports d5 with ...e6, building a solid wall at the cost of temporarily blocking the c8 bishop.',
        moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7',
        notes: { 0: 'claiming the center.', 2: 'the Queen\'s Gambit — offering the c-pawn to deflect d5.', 3: 'declining solidly with ...e6.', 6: 'pinning the f6 knight to pressure d5.', 8: 'the classical Orthodox setup.', 12: 'maintaining the pin.', 13: 'preparing to develop the bishop via b7 (the Tartakower).', 14: 'releasing the tension; the knight recaptures.', 16: 'trading the dark-squared bishops to ease Black\'s game.' },
        summary: 'A classical QGD tabiya where White eyes the minority attack with b4-b5 and Black seeks the ...c5 break.' },
      { name: 'Slav Defense', intro: 'Black supports d5 with ...c6 instead of ...e6, keeping the light-squared bishop free.',
        moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O O-O Qe2 Bg6',
        notes: { 3: 'the Slav — c6 supports d5 without blocking the bishop.', 7: 'the main line; Black grabs the pawn and will develop the bishop to f5.', 8: 'a4 stops ...b5 and regains the pawn.', 9: 'the point of the Slav — the bishop is active on f5.', 12: 'White recaptures the c4 pawn with a comfortable game.' },
        summary: 'A harmonious Slav structure: Black has solved the bishop problem; White has a small space edge.' },
      { name: 'Queen\'s Gambit Accepted', intro: 'Black takes the pawn and aims for quick development and a timely ...c5 to free the position.',
        moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 dxc5 Qxd1 Rxd1 Bxc5 b3 Nbd7',
        notes: { 3: 'accepting the gambit — Black will not try to hold the pawn.', 6: 'preparing to recapture c4 with the bishop.', 8: 'regaining the pawn with a strong centralized bishop.', 9: 'the freeing break ...c5, the core QGA idea.', 11: 'gaining queenside space and preparing ...b5.', 12: 'simplifying into a comfortable endgame.' },
        summary: 'A balanced position where Black has freed the game with ...c5 and equalized comfortably.' },
    ],
    exercise: { setup: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6', solution: 'Bh4', title: 'Hold the Pin', description: 'White to play. Black challenged the bishop with ...h6 — keep the pin on the f6 knight.', hints: ['Retreat but keep the pin', 'Stay on the c1-h6... no, the h4-d8 diagonal'] },
  },
  {
    id: 'kings-indian', title: 'The King\'s Indian Defense', difficulty: 'advanced',
    description: 'A hypermodern fighting defense. Black cedes the center then strikes back with ...e5 and a kingside pawn storm. We study the Classical, the Sämisch, and the Fianchetto.',
    keyConcepts: ['Hypermodern strategy', 'Kingside pawn storm', 'Central counterstrike ...e5', 'Closed-center races', 'The g7 bishop'],
    lines: [
      { name: 'Classical Main Line', intro: 'White builds the big center; Black castles, plays ...e5, and prepares the thematic ...f5 kingside attack.',
        moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 Nd3 f5',
        notes: { 1: 'flexible development, eyeing e4 and the long diagonal.', 3: 'preparing the fianchetto.', 6: 'White takes the full center — exactly what Black invites.', 11: 'the central counterstrike, the heart of the KID.', 14: 'White locks the center with d5, committing to queenside play.', 15: 'the knight reroutes toward the kingside via e7-g6.', 16: 'White\'s knight heads to d3 to support the c5 break.', 19: 'the thematic ...f5 — Black\'s kingside attack begins!' },
        summary: 'The classic KID race: White attacks on the queenside with c5, Black storms the kingside with f5-f4-g5-g4.' },
      { name: 'Sämisch Variation', intro: 'White plays f3 to build an iron center and castle queenside, inviting a sharp mutual attack.',
        moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5 d5 Nh5 Qd2 f5 O-O-O Nd7',
        notes: { 8: 'the Sämisch — f3 over-protects e4 and prepares Be3 and Qd2.', 11: 'the standard central break.', 12: 'closing the center.', 13: 'rerouting the knight and preparing ...f5.', 16: 'castling queenside — opposite-side attacks loom.' },
        summary: 'A double-edged Sämisch battle with opposite-side castling and mutual pawn storms.' },
      { name: 'Fianchetto Variation', intro: 'White fianchettoes too, blunting the g7 bishop and aiming for a calmer positional game.',
        moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nf3 d6 O-O Nbd7 Nc3 e5 e4 c6 h3 Qb6',
        notes: { 4: 'the Fianchetto System — g3 neutralizes the long diagonal.', 10: 'developing the knight to d7, the flexible setup.', 13: 'the central break, here with ...c6 support coming.', 15: 'preparing ...exd4 and central play rather than a pawn storm.', 17: 'Qb6 pressures b2 and d4.' },
        summary: 'A calmer KID where Black plays in the center with ...c6 and ...exd4 rather than a kingside storm.' },
    ],
    exercise: { setup: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5', solution: 'Ne7', title: 'Reroute the Knight', description: 'Black to play. White locked the center with d5, attacking the c6 knight. Reroute it toward the kingside.', hints: ['The knight is attacked', 'Head for g6 via e7 to support ...f5'] },
  },
  {
    id: 'nimzo-indian', title: 'The Nimzo-Indian Defense', difficulty: 'advanced',
    description: 'A sophisticated 1.d4 defense where Black pins the c3 knight to fight for the center with pieces. We study the Rubinstein, the Classical, and the Sämisch.',
    keyConcepts: ['Pinning the knight', 'Doubling White\'s pawns', 'Control of e4', 'Bishop pair vs structure', 'Piece play over pawns'],
    lines: [
      { name: 'Rubinstein Variation', intro: 'White plays the flexible 4.e3 and develops naturally; Black fights for e4 and decides whether to trade on c3.',
        moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O Nc6 a3 Bxc3 bxc3 dxc4',
        notes: { 5: 'the Nimzo — pinning the knight to control e4.', 6: 'the solid Rubinstein system.', 9: 'striking in the center, a Queen\'s-Gambit-style structure.', 11: 'hitting d4 to increase the tension.', 14: 'a3 asks the bishop to declare itself.', 15: 'Black trades, doubling White\'s c-pawns.', 17: 'opening the position and damaging White\'s structure further.' },
        summary: 'White has the bishop pair and a big center; Black targets the doubled c-pawns and the c4 weakness.' },
      { name: 'Classical Variation', intro: 'With 4.Qc2 White avoids doubled pawns and aims to recapture on c3 with the queen, keeping a clean structure and the bishop pair.',
        moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3 Qxc3 b6 Bg5 Bb7 f3 h6 Bh4 d5',
        notes: { 6: 'the Classical Qc2 — protecting c3 in advance.', 8: 'White forces the trade on his terms.', 9: 'recapturing with the queen — no doubled pawns, but a loss of time.', 11: 'preparing ...Bb7 to fight for e4.', 12: 'pinning the f6 knight.', 17: 'the central break ...d5, contesting the center.' },
        summary: 'White owns the bishop pair and central space; Black has a solid structure and pressure on e4 and c4.' },
      { name: 'Sämisch Variation', intro: 'White accepts doubled pawns with 4.a3 immediately to grab the bishop pair and build a huge center.',
        moves: 'd4 Nf6 c4 e6 Nc3 Bb4 a3 Bxc3 bxc3 c5 e3 O-O Bd3 Nc6 Ne2 b6 e4 Ne8',
        notes: { 6: 'the Sämisch — White spends a tempo to win the bishop pair at once.', 7: 'doubling the c-pawns.', 9: 'striking at the big center before it rolls.', 14: 'the knight goes to e2, not f3, to support f3-e4.', 16: 'White erects the classic Sämisch center with e4.', 17: 'rerouting the knight to blockade and prepare ...f5 or ...d6.' },
        summary: 'A classic structure vs bishop-pair battle: White\'s broad center against Black\'s play on the doubled c-pawns.' },
    ],
    exercise: { setup: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3', solution: 'Bxc3', title: 'Damage or Retreat?', description: 'Black to play. White played a3 to question the bishop — take the principled decision.', hints: ['You came to take this knight', 'Trade and make White spend time recapturing'] },
  },
  {
    id: 'english-opening', title: 'The English Opening', difficulty: 'intermediate',
    description: 'A flexible flank opening with 1.c4, fighting for d5 from the side. We study the Reversed Sicilian, the Symmetrical, and the King\'s English.',
    keyConcepts: ['Flank control of d5', 'Fianchetto pressure', 'Reversed Sicilian', 'Flexibility and transpositions', 'Queenside space'],
    lines: [
      { name: 'Reversed Sicilian', intro: 'After 1...e5 the position is a Sicilian with colors reversed and White a tempo up.',
        moves: 'c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6 Nf3 Nc6 O-O Be7 d3 O-O a3 a5',
        notes: { 0: 'the English — controlling d5 from the wing.', 1: 'grabbing the center; now it is a reversed Sicilian.', 4: 'the fianchetto, the soul of the English.', 5: 'Black challenges the center.', 7: 'the knight recaptures and sits actively.', 12: 'White completes a harmonious fianchetto setup.', 16: 'a3 prepares queenside expansion with b4.' },
        summary: 'A reversed Sicilian Dragon where White\'s extra tempo gives a small but lasting initiative.' },
      { name: 'Symmetrical Variation', intro: 'Black mirrors with ...c5. Both sides fianchetto and maneuver in a flexible, strategic game.',
        moves: 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 Nf6 O-O O-O d4 cxd4 Nxd4 Nxd4 Qxd4 d6',
        notes: { 1: 'the Symmetrical English.', 11: 'both sides have mirrored fianchetto setups.', 12: 'White breaks the symmetry with the central d4 push.', 14: 'trading in the center.', 16: 'the queen recaptures, eyeing the long diagonal.' },
        summary: 'A Maroczy-bind type position where White has a small space edge and pressure on the long diagonal.' },
      { name: 'King\'s English with ...Bb4', intro: 'Black develops actively with ...Bb4, pinning the c3 knight in Nimzo-English style.',
        moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 Bb4 Bg2 O-O O-O e4 Ng5 Bxc3 bxc3 Re8 f3 exf3',
        notes: { 7: 'a Nimzo-style pin in the English.', 11: 'gaining space and kicking the knight.', 12: 'the knight jumps to g5 to round up e4.', 13: 'Black trades and damages White\'s pawns.', 17: 'opening the position; the pawn structure is the key imbalance.' },
        summary: 'An imbalanced fight with White\'s bishop pair and center against Black\'s pressure on the doubled c-pawns.' },
    ],
    exercise: { setup: 'c4 e5 Nc3 Nf6 g3 d5 cxd5', solution: 'Nxd5', title: 'Recapture Actively', description: 'Black to play. Recapture the d5 pawn with the piece that lands on a strong central square.', hints: ['Use the knight', 'Centralize on d5'] },
  },
  {
    id: 'scandinavian', title: 'The Scandinavian Defense', difficulty: 'beginner',
    description: 'Black challenges e4 immediately with 1...d5. Simple and direct. We study the ...Qa5 main line, the ...Qd6 line, and the ...Nf6 gambit.',
    keyConcepts: ['Immediate central challenge', 'Early queen safety', 'Solid structure', 'Quick development', 'Clear plans'],
    lines: [
      { name: 'Main Line with Qa5', intro: 'After recapturing with the queen and retreating to a5, Black develops solidly and aims for ...O-O-O.',
        moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Qe2 Bb4 O-O-O Nbd7',
        notes: { 1: 'the Scandinavian — challenging e4 at once.', 2: 'White wins the central pawn.', 3: 'recapturing with the queen.', 5: 'the queen retreats to a5, out of harm and pinning... pressuring along the file.', 6: 'White builds the center.', 9: 'the solid ...c6, giving the queen a retreat and supporting d5.', 11: 'developing the bishop actively before ...e6.', 16: 'castling queenside, a typical Scandinavian plan.' },
        summary: 'A solid Scandinavian structure: White has a space edge; Black is sound and ready to castle long.' },
      { name: 'Modern Qd6 Line', intro: 'The queen retreats to d6, a flexible square eyeing the kingside and supporting ...e5 ideas.',
        moves: 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 c6 Ne5 Nbd7 f4 Nxe5 fxe5 Qxd4 Qxd4',
        notes: { 5: 'the modern ...Qd6 — flexible and harder to attack.', 9: 'preparing ...Bf5 or ...Bg4 and queenside castling.', 10: 'White grabs space with the aggressive Ne5.', 12: 'f4 supports the e5 knight and gains kingside space.', 15: 'Black grabs the d4 pawn, forcing a queen trade.' },
        summary: 'A sharp line that often simplifies; Black must be precise but reaches a sound game.' },
      { name: 'Nf6 Gambit Line', intro: 'Black delays recapturing and plays ...Nf6, often gambiting a pawn for fast development.',
        moves: 'e4 d5 exd5 Nf6 d4 Bg4 Nf3 Bxf3 Qxf3 Qxd5 Qxd5 Nxd5 c4 Nb4 Na3 e5',
        notes: { 3: 'the Nf6 line — Black aims to regain d5 with the knight.', 5: 'pinning the knight to ease the recapture.', 7: 'Black trades to shatter nothing but to speed development.', 9: 'Black regains the pawn on d5.', 13: 'the knight jumps to b4, eyeing c2 and d3.', 15: 'striking in the center for active piece play.' },
        summary: 'A lively piece-play position where Black has full equality after regaining the pawn.' },
    ],
    exercise: { setup: 'e4 d5 exd5 Qxd5 Nc3', solution: 'Qa5', title: 'Tuck the Queen Away', description: 'Black to play. The knight attacks your queen — retreat to the safest active square.', hints: ['Avoid losing tempo later', 'a5 keeps the queen active and safe'] },
  },
  {
    id: 'slav-defense', title: 'The Slav Defense', difficulty: 'intermediate',
    description: 'A rock-solid answer to the Queen\'s Gambit, supporting d5 with ...c6. We study the Main Line, the Czech, and the Exchange.',
    keyConcepts: ['Solid d5 support', 'Free light-squared bishop', 'The dxc4 capture', 'Structural integrity', 'Queenside play'],
    lines: [
      { name: 'Main Line (Dutch/Czech)', intro: 'Black grabs c4 and develops the bishop to f5 before playing ...e6 — the ideal Slav setup.',
        moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O O-O Qe2 Ne4',
        notes: { 3: 'the Slav — supporting d5 without blocking the bishop.', 7: 'the main line; Black takes on c4.', 8: 'a4 prevents ...b5 and ensures the pawn\'s return.', 9: 'the whole point: the bishop is active on f5.', 13: 'pinning the c3 knight, increasing the pressure.', 17: 'a strong central knight, the modern handling.' },
        summary: 'A harmonious Slav middlegame where Black has comfortably equalized with active pieces.' },
      { name: 'Exchange Variation', intro: 'White trades on d5 for a symmetrical, drawish structure where small plans decide.',
        moves: 'd4 d5 c4 c6 cxd5 cxd5 Nc3 Nf6 Nf3 Nc6 Bf4 Bf5 e3 e6 Bd3 Bxd3 Qxd3 Bd6',
        notes: { 4: 'the Exchange Slav — symmetrical and solid.', 10: 'developing the bishop outside the chain to f4.', 11: 'Black mirrors with ...Bf5.', 14: 'offering to trade the active light-squared bishops.', 17: 'the position is nearly symmetrical and very balanced.' },
        summary: 'A symmetrical structure where White nurses a tiny edge; precise play holds comfortably for Black.' },
      { name: 'Semi-Slav Setup', intro: 'Black plays both ...c6 and ...e6, accepting a passive bishop for a super-solid center and ...c5/...e5 breaks.',
        moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 Bb7 O-O a6',
        notes: { 7: 'the Semi-Slav — ...e6 makes the center a fortress.', 11: 'Black takes on c4 and gains queenside space with tempo.', 13: 'the thematic ...b5 grabs space and prepares ...c5.', 15: 'developing the bishop to the long diagonal.', 17: '...a6 supports ...c5 and ...b5-b4.' },
        summary: 'A rich Semi-Slav structure (Meran-style) where Black expands on the queenside with ...c5 and ...b4.' },
    ],
    exercise: { setup: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4', solution: 'Bf5', title: 'The Slav Bishop', description: 'Black to play. Before locking it in with ...e6, develop the light-squared bishop to its dream square.', hints: ['Get the bishop out first', 'f5 is the ideal Slav square'] },
  },
  {
    id: 'london-system', title: 'The London System', difficulty: 'beginner',
    description: 'An easy-to-learn system for White: Bf4, e3, Bd3, c3, Nbd2. We study setups against ...d5, against the King\'s Indian, and the modern Nf3-c4 try.',
    keyConcepts: ['System-based play', 'The Bf4 bishop', 'Solid pawn triangle', 'Easy development', 'Kingside attack with Ne5'],
    lines: [
      { name: 'London vs ...d5', intro: 'The classic London setup against a symmetrical center, aiming for a kingside attack with Ne5 and a queen lift.',
        moves: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 Bd6 Bg3 O-O Bd3 b6 Nbd2 Bb7 Ne5 Nbd7 f4 c5',
        notes: { 0: 'starting the London.', 2: 'the defining move — the bishop comes out before e3.', 4: 'building the pawn triangle c3-d4-e3.', 7: 'Black mirrors with ...Bd6, challenging the f4 bishop.', 8: 'sidestepping the trade and keeping the strong bishop.', 13: 'the powerful Ne5 outpost, the heart of the London attack.', 16: 'f4 supports the knight and prepares a kingside pawn storm.' },
        summary: 'A typical London attacking setup: White plays for f4-f5 and a kingside assault; Black counters with ...c5 on the queenside.' },
      { name: 'London vs King\'s Indian', intro: 'Against a kingside fianchetto, White keeps the solid structure and contests the center carefully.',
        moves: 'd4 Nf6 Bf4 g6 Nf3 Bg7 e3 O-O Be2 d6 h3 Nbd7 O-O Re8 c3 e5 Bh2 Qe7',
        notes: { 2: 'the London works against almost anything.', 10: 'h3 prevents ...Nh5 hitting the bishop and stops ...Bg4.', 14: 'supporting the center before Black plays ...e5.', 15: 'Black strikes in the center.', 16: 'the bishop tucks safely onto h2, still on the strong diagonal.' },
        summary: 'A solid London vs KID structure where White holds the center and waits for Black to commit.' },
      { name: 'Modern London with c4', intro: 'White plays an early c4 to give the London more bite, transposing toward Queen\'s-Gambit structures.',
        moves: 'd4 d5 Bf4 Nf6 Nf3 e6 e3 Bd6 Bg3 O-O Nbd2 b6 Bd3 Bb7 c4 c5 O-O Nc6',
        notes: { 14: 'the modern c4 break gives White a more ambitious central setup.', 15: 'Black contests with ...c5 at once.', 17: 'a rich position with mutual central tension and active pieces.' },
        summary: 'A modern, sharper London where c4 fights for the center instead of the slow Ne5 plan.' },
    ],
    exercise: { setup: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 Bd6', solution: 'Bg3', title: 'Save the Bishop', description: 'White to play. Black offers a trade with ...Bd6 — avoid it and keep your good bishop.', hints: ['Do not trade your strong bishop', 'Retreat to g3, still on a fine diagonal'] },
  },
  {
    id: 'scotch-game', title: 'The Scotch Game', difficulty: 'intermediate',
    description: 'White strikes the center early with 3.d4, opening lines quickly. We study the Classical 4...Bc5, the 4...Nf6 main line, and the Mieses endgame.',
    keyConcepts: ['Early central break', 'Open lines', 'The d4 knight', 'Rapid development', 'Initiative'],
    lines: [
      { name: 'Main Line 4...Nf6', intro: 'Black hits e4 immediately; White plays the critical Nxc6 and e5, gaining time but conceding structure.',
        moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4 Ba6 b3 g6',
        notes: { 4: 'the Scotch — an immediate central break.', 5: 'accepting the central trade.', 7: 'counterattacking e4 at once.', 8: 'the critical capture, damaging Black\'s pawns.', 10: 'gaining space and kicking the knight.', 11: 'Qe7 pins the e5 pawn and prepares ...Nd5.', 13: 'the knight retreats to d5.', 14: 'White expands and challenges the knight.', 15: 'the bishop pressures the c4/f1 diagonal.' },
        summary: 'A sharp structural battle: White has a space edge and the e5 pawn, Black the bishop pair and central pawns.' },
      { name: 'Classical 4...Bc5', intro: 'Black develops the bishop to c5, pressuring the d4 knight; play often revolves around the e-file and the c5/b4 squares.',
        moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4 Ne5 Be2 Qg6 O-O d6',
        notes: { 7: 'the Classical Scotch with the active ...Bc5.', 8: 'defending the knight and challenging the bishop.', 9: 'Qf6 adds pressure to d4 and eyes the kingside.', 10: 'c3 supports d4 and prepares to expand.', 15: 'the queen swings to g6, pressuring g2 and e4.' },
        summary: 'A balanced Classical Scotch where Black has comfortable piece play against White\'s center.' },
      { name: 'Mieses Endgame Line', intro: 'After ...Qe7 White can steer toward an endgame where his space and structure give a pull.',
        moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4 Nb6 Nc3 Qe6',
        notes: { 12: 'Qe2 prepares to trade queens and exploit the structure.', 13: 'the knight retreats to d5.', 15: 'the knight goes to b6, eyeing c4 and d5.', 17: 'Black centralizes the queen, ready to trade.' },
        summary: 'A structural endgame where White\'s kingside space and the e5 pawn give long-term pressure.' },
    ],
    exercise: { setup: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6', solution: 'bxc6', title: 'Recapture Right', description: 'Black to play. White took on c6 — recapture in the way that keeps your center healthy.', hints: ['Capture toward the center', 'Keep a pawn pointing at d5 and the half-open b-file'] },
  },
  {
    id: 'vienna-game', title: 'The Vienna Game', difficulty: 'intermediate',
    description: 'A flexible 1.e4 e5 2.Nc3 opening that can be quiet or explode into a gambit. We study the Vienna Gambit, the quiet g3 line, and the Frankenstein-Dracula.',
    keyConcepts: ['Early Nc3', 'The f4 gambit', 'King-side pressure', 'Flexible setups', 'Control of d5'],
    lines: [
      { name: 'Vienna Gambit', intro: 'White plays an early f4, a King\'s-Gambit-style attack with the knight already developed to c3.',
        moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3 Nxc3 bxc3 c5',
        notes: { 1: 'the open game.', 2: 'the Vienna — a flexible knight move.', 4: 'the Vienna Gambit, striking at e5.', 5: 'the correct response: counterattack in the center, not ...exf4.', 6: 'White takes on e5.', 7: 'Black grabs e4 with the knight.', 9: 'developing and eyeing the kingside.', 13: 'Black trades the active knight.', 15: 'striking at White\'s broad center.' },
        summary: 'A sharp gambit structure where White has a big center and attacking chances; Black counters with ...c5.' },
      { name: 'Quiet g3 System', intro: 'White fianchettoes the king\'s bishop for a calm, positional game centered on the d5 square.',
        moves: 'e4 e5 Nc3 Nf6 g3 d5 exd5 Nxd5 Bg2 Nb6 Nf3 Nc6 O-O Be7 d3 O-O a3 a5',
        notes: { 4: 'the modern quiet Vienna with g3.', 5: 'Black strikes in the center.', 7: 'the knight recaptures actively.', 11: 'a harmonious developing scheme.', 16: 'a3 prepares queenside expansion with b4.' },
        summary: 'A reversed-Sicilian-like structure where White enjoys a small, comfortable space advantage.' },
      { name: 'Max Lange / Mieses Line', intro: 'White plays 3.Bc4 and meets ...Nxe4 with sharp queen play, a tricky and aggressive try.',
        moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5 Qd5 Qe7 Nxc7 Kd8',
        notes: { 4: 'the bishop eyes f7.', 5: 'the greedy ...Nxe4, entering the famous complications.', 6: 'Qh5 attacks e5 and f7 at once.', 7: 'the knight must retreat to defend.', 10: 'Nb5 piles onto c7 and d6.', 14: 'Qd5 forks pieces and pawns.', 16: 'White grabs c7, and a wild king-in-the-center battle ensues.' },
        summary: 'The legendary "Frankenstein-Dracula" tangle — enormously sharp with chances for both sides.' },
    ],
    exercise: { setup: 'e4 e5 Nc3 Nf6 f4', solution: 'd5', title: 'Counter in the Center', description: 'Black to play against the Vienna Gambit. Do NOT take on f4 — find the strong central counter.', hints: ['Meet a wing attack with a center break', 'Strike at e4 with a pawn'] },
  },
  {
    id: 'kings-gambit', title: 'The King\'s Gambit', difficulty: 'advanced',
    description: 'The romantic era\'s favorite: White sacrifices the f-pawn for rapid development and a kingside attack. We study the King\'s Knight Gambit, the Falkbeer, and the Bishop\'s Gambit.',
    keyConcepts: ['Pawn sacrifice for development', 'Open f-file', 'Rapid attack', 'King safety risks', 'Central counterplay'],
    lines: [
      { name: 'King\'s Knight Gambit Accepted', intro: 'Black grabs the pawn; White develops rapidly and aims to recover f4 while attacking.',
        moves: 'e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5 Nf6 Bc4 d5 exd5 Bd6 d4 Nh5 O-O Qe7',
        notes: { 2: 'the King\'s Gambit — offering the f-pawn for a lead in development.', 3: 'accepting the gambit.', 4: 'developing and stopping ...Qh4+.', 5: 'the classical ...g5, trying to hold the extra pawn.', 6: 'h4 strikes at the pawn chain.', 8: 'the knight leaps to e5, the Kieseritzky.', 10: 'developing with tempo toward f7.', 11: 'Black returns the pawn to free his game.', 16: 'White castles into a sharp attacking position.' },
        summary: 'A razor-sharp gambit position with mutual chances; White has development and the open f-file for the pawn.' },
      { name: 'Falkbeer Counter-Gambit', intro: 'Instead of accepting, Black counter-sacrifices with ...d5 to seize the initiative.',
        moves: 'e4 e5 f4 d5 exd5 e4 d3 Nf6 dxe4 Nxe4 Nf3 Bc5 Qe2 Bf5 Nc3 Qe7 Be3 Bxe3',
        notes: { 3: 'the Falkbeer — Black declines and counter-gambits.', 5: 'the point: Black gains a strong, cramping e4 pawn.', 6: 'challenging the advanced pawn.', 9: 'Black recaptures with an active knight.', 11: 'rapid development for the pawn invested.', 17: 'trading to open lines toward the white king.' },
        summary: 'A dynamic counter-gambit where Black has fast development and pressure for the sacrificed pawn.' },
      { name: 'Bishop\'s Gambit', intro: 'White plays 3.Bc4 instead of Nf3, allowing ...Qh4+ but gaining time and a powerful bishop.',
        moves: 'e4 e5 f4 exf4 Bc4 Qh4 Kf1 d5 Bxd5 g5 Nf3 Qh5 h4 Bg7 Nc3 Ne7 d4 h6',
        notes: { 4: 'the Bishop\'s Gambit — developing the bishop and inviting the check.', 5: 'the check costs Black time and the bishop will be strong.', 6: 'Kf1 sidesteps; White loses castling but keeps the initiative.', 7: 'striking back in the center.', 9: '...g5 tries to build the classic f4-g5 pawn chain.', 12: 'h4 immediately challenges the chain.' },
        summary: 'A wild Bishop\'s Gambit where White\'s active pieces and lead in development offset the loose king.' },
    ],
    exercise: { setup: 'e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5 Nf6 Bc4 d5 exd5', solution: 'Bd6', title: 'Return for Activity', description: 'Black to play. Develop with tempo against the strong e5 knight, returning the extra pawn for activity.', hints: ['Challenge the e5 knight', 'Develop the bishop to d6'] },
  },
];

// =====================================================================
// VALIDATE (chess.js already guarantees legality) + WRITE
// =====================================================================
let written = 0;
for (const o of openings) {
  const lesson = buildOpening(o);
  // sanity: every FEN parseable by chess.js
  for (const s of lesson.sections) {
    for (const p of s.positions) new Chess(p.fen);
  }
  for (const ex of lesson.exercises) new Chess(ex.fen);
  const json = JSON.stringify(lesson, null, 2) + '\n';
  fs.writeFileSync(path.join(FRONTEND_DIR, `${o.id}.json`), json);
  fs.writeFileSync(path.join(BACKEND_DIR, `${o.id}.json`), json);
  const posCount = lesson.sections.reduce((n, s) => n + s.positions.length, 0);
  console.log(`✓ ${o.id}: ${lesson.sections.length} variations, ${posCount} boards`);
  written++;
}
console.log(`\nWrote ${written} deep opening lessons.`);
