Create a complete 2D chessboard web application in one standalone index.html file using only vanilla HTML, CSS, and JavaScript.

This is a correctness challenge. You must implement real chess movement logic, not a visual-only draggable board. You must also integrate Stockfish using a local stockfish.js file that already exists in the same directory as index.html.

The application must be executable as-is by saving the generated file as index.html beside stockfish.js.

Environment constraints:

- The final file will be saved as index.html.
- A local file named stockfish.js already exists in the same directory.
- Load Stockfish from the local file only.
- Do not use CDNs.
- Do not download anything at runtime.
- Do not use npm.
- Do not use webpack, Vite, or any build step.
- Do not use external images.
- Do not use frameworks or libraries.
- The app must run by opening index.html directly in a browser.

Core UI requirements:

- Render an 8x8 chessboard using CSS Grid.
- Use Unicode chess symbols for pieces.
- Correct initial chess setup.
- White pieces must start at the bottom.
- Board must include coordinate labels:
  - Files: a-h
  - Ranks: 1-8
- Add a reset button.
- Add a move history panel using coordinate notation, for example e2-e4.
- Show captured pieces for both sides.
- Highlight the selected piece.
- Highlight legal destination squares.
- Highlight the last move.
- Show whose turn it is.
- Show game status:
  - Normal
  - Check
  - Checkmate
  - Stalemate
  - Win on time
- Show Stockfish availability:
  - Ready
  - Thinking
  - Analyzing
  - Unavailable
  - Error

Visual design requirements:

- The chessboard must have a polished brown chessboard style similar to Chess.com:
  - Light squares should use a warm light brown / beige tone.
  - Dark squares should use a rich medium-to-dark brown tone.
  - Avoid flat, harsh colors.
  - Use subtle shadows, rounded corners, and clean spacing.
  - The board should look professional, not like a debug grid.
- White pieces must use a light cream / tan color that remains readable on both square colors.
- Black pieces must use a dark brown color that remains readable on both square colors.
- Pieces should have subtle text-shadow or visual contrast so they remain readable.
- The selected square must be clearly highlighted without destroying the brown board aesthetic.
- Legal destination squares must be highlighted using Lichess-style move indicators:
  - For an empty legal destination square, draw a small semi-transparent circular dot centered in the square.
  - For a legal capture destination, draw a semi-transparent circular ring around the target piece.
  - The capture ring should sit visually around the piece, similar to Lichess.
  - The legal-move indicators must not hide the piece.
  - The legal-move indicators must not change the board layout.
- Last-move highlighting should be subtle and compatible with the brown theme.
- Check highlighting should be visually urgent but still tasteful, for example a red glow or red-tinted overlay on the king's square.
- The UI panels, buttons, selectors, clocks, move history, captured pieces, and evaluation bar must use a consistent professional theme matching the brown chessboard.
- The overall look should be closer to a polished chess web app than a plain programming demo.

Coordinate mapping requirements:

Use this exact board mapping:

- Internal board row 0 = rank 8.
- Internal board row 1 = rank 7.
- Internal board row 2 = rank 6.
- Internal board row 3 = rank 5.
- Internal board row 4 = rank 4.
- Internal board row 5 = rank 3.
- Internal board row 6 = rank 2.
- Internal board row 7 = rank 1.
- Internal board col 0 = file a.
- Internal board col 1 = file b.
- Internal board col 2 = file c.
- Internal board col 3 = file d.
- Internal board col 4 = file e.
- Internal board col 5 = file f.
- Internal board col 6 = file g.
- Internal board col 7 = file h.

Therefore:

- a8 = row 0, col 0.
- h8 = row 0, col 7.
- a1 = row 7, col 0.
- h1 = row 7, col 7.
- White pawns start on row 6 and move toward decreasing row indexes.
- Black pawns start on row 1 and move toward increasing row indexes.

Game mode requirements:

Add a game mode selector with these modes:

- Human vs Human
- Human as White vs Stockfish as Black
- Human as Black vs Stockfish as White

In Human vs Stockfish mode:

- The human may only move their own pieces.
- Stockfish must automatically move when it is the engine's turn.
- Stockfish must not move when it is the human's turn.
- The app must prevent the human from interacting with the board while Stockfish is thinking.
- Engine moves must obey the same board-state rules as human moves.
- Validate every Stockfish move against the app's own legal move generator before executing it.
- If Stockfish returns an illegal, empty, or unusable move, do not execute it. Show an engine error message instead.

Stockfish strength-level requirements:

Add a Stockfish strength selector with at least these levels:

Beginner:
- Skill Level 0
- UCI_Elo 800
- movetime 150 ms

Casual:
- Skill Level 3
- UCI_Elo 1100
- movetime 300 ms

Intermediate:
- Skill Level 7
- UCI_Elo 1400
- movetime 500 ms

Advanced:
- Skill Level 12
- UCI_Elo 1800
- movetime 800 ms

Strong:
- Skill Level 20
- UCI_Elo 2200
- movetime 1200 ms

When the user selects an engine level, attempt to configure Stockfish using UCI options:

- setoption name UCI_LimitStrength value true
- setoption name UCI_Elo value <ELO>
- setoption name Skill Level value <N>

If the local Stockfish build does not support one of these options, the app must continue working. Do not crash.

Chess movement requirements:

You must implement legal chess movement. Do not fake legality by only moving pieces visually.

Required legal move behavior:

Pawns:
- Move one square forward if empty.
- Move two squares from starting rank if both squares are empty.
- Capture diagonally.
- White pawns move toward decreasing row index.
- Black pawns move toward increasing row index.
- Auto-promote pawns to queens when they reach the final rank.

Knights:
- L-shaped moves.
- Can jump over pieces.

Bishops:
- Diagonal movement.
- Blocked by pieces.

Rooks:
- Horizontal and vertical movement.
- Blocked by pieces.

Queens:
- Rook plus bishop movement.
- Blocked by pieces.

Kings:
- One square in any direction.

King-safety requirements:

- Detect check.
- Prevent a move that leaves the moving side's own king in check.
- Prevent king moves onto attacked squares.
- A player in check must make a move that resolves the check.
- Detect checkmate.
- Detect stalemate.

Bonus rules:

Implement these only if you can do them correctly.

Castling:
- King and rook have not moved.
- No pieces between king and rook.
- King is not currently in check.
- King does not pass through check.
- King does not end in check.

En passant:
- Only immediately after a two-square pawn advance.
- Correctly removes the captured pawn.

User interaction requirements:

- Click-based movement only.
- First click selects a piece belonging to the side to move.
- Legal destination squares are highlighted.
- Second click attempts to move the selected piece.
- If the move is legal, execute it.
- If the move is illegal, reject it without changing the board.
- If the second click is another friendly piece, switch selection to that piece.
- Do not allow moving opponent pieces.
- Do not allow moving pieces when the game is over.
- Do not allow moving pieces while Stockfish is thinking.
- Alternate turns between White and Black.

When a piece is selected:

- Empty legal destination squares must show a small centered circular dot.
- Legal capture destination squares must show a circular ring around the capturable piece.
- The selected piece square must remain visibly selected.
- If the selection changes to another friendly piece, update the dots and capture rings immediately.
- If the move is executed or canceled, remove all legal-move dots and capture rings.

After every legal move:

- Update the board.
- Update move history.
- Update captured pieces.
- Update last-move highlight.
- Update check/checkmate/stalemate status.
- Update Stockfish analysis.
- Update the chess clock.
- If in Human vs Stockfish mode and it is now Stockfish's turn, request an engine move.

Illegal moves must not alter:

- Turn
- Clock
- History
- Captured pieces
- Board state
- Last move
- Stockfish analysis
- Game status

Clock requirements:

Add selectable time controls:

- 5 minute game
- 10 minute game

Clock behavior:

- Each side has its own countdown clock.
- The active player's clock runs only when the game is active.
- The clock starts when the first legal move is made.
- The clock switches after each legal move.
- The clock pauses when the game is over.
- If a player's clock reaches zero, stop the game and declare the other player the winner on time.
- Reset must reset:
  - Selected clock time
  - Board
  - Move history
  - Captured pieces
  - Last move
  - Game status
  - Stockfish analysis
  - Both clocks

Stockfish integration requirements:

- Use the local file stockfish.js.
- Create the engine in JavaScript using Web Worker style if supported by the local Stockfish build:

  const engine = new Worker("stockfish.js");

- Communicate with Stockfish using UCI commands.
- Initialize Stockfish with:
  - uci
  - isready
  - ucinewgame

- If Stockfish fails to load, the chessboard must still work.
- If Stockfish is unavailable, show Stockfish unavailable instead of breaking the app.

Stockfish workflows:

The app must support two separate Stockfish workflows:

1. Evaluation workflow.
2. Engine-player workflow.

These workflows must be kept separate.

Use an explicit Stockfish request state variable, for example:

- currentEngineRequest = "analysis"
- currentEngineRequest = "move"
- currentEngineRequest = null

Do not confuse an analysis bestmove with an engine-player bestmove.

Evaluation workflow requirements:

After each legal move:

- Generate a valid FEN from the current board state.
- Send the position to Stockfish:

  position fen <FEN>

- Ask Stockfish to analyze using short fixed depth:

  go depth 12

- Parse Stockfish info lines.
- Extract evaluation from:
  - score cp <value>
  - score mate <value>

- Use only the latest useful score from the active analysis request.
- Prefer multipv 1 if multipv appears.
- Ignore lowerbound and upperbound scores unless no exact score is available.
- Do not automatically play the analysis bestmove.
- If Stockfish later emits bestmove for the analysis request, ignore it.

Critical evaluation-orientation rule:

The eval bar must use a conventional white-positive score:

- Positive score means White is better.
- Negative score means Black is better.
- Zero means equal.

Do not assume that UCI score cp <x> always means White is better.

UCI scores are from the side-to-move perspective for the analyzed position.

Therefore, convert UCI cp scores to white-positive scores using this exact rule:

// sideToMove is "w" or "b" for the FEN being analyzed.
// cp is the UCI centipawn score from the side-to-move perspective.
// whiteCp is the conventional white-positive score.
const whiteCp = sideToMove === "w" ? cp : -cp;

Convert UCI mate scores to white-positive mate scores using this exact rule:

// mate > 0 means the side to move has mate.
// mate < 0 means the side to move is getting mated.
// whiteMate is positive if White is mating.
// whiteMate is negative if Black is mating.
const whiteMate = sideToMove === "w" ? mate : -mate;

Required examples:

- White to move, score cp 300 => whiteCp = +300 => White is better.
- Black to move, score cp 300 => whiteCp = -300 => Black is better.
- White to move, score mate 2 => whiteMate = +2 => White mates.
- Black to move, score mate 2 => whiteMate = -2 => Black mates.
- White to move, score mate -3 => whiteMate = -3 => White gets mated.
- Black to move, score mate -3 => whiteMate = +3 => Black gets mated, so White mates.

Evaluation text requirements:

Display a small text evaluation using the white-positive score:

- Equal or near equal: 0.00
- White advantage: +0.35, +1.20, +10.00
- Black advantage: -0.35, -1.20, -10.00
- White has mate: Mate in 3
- Black has mate: Mate in -2

Centipawn display:

- Convert centipawns to pawns by dividing by 100.
- Keep two decimals for non-integer pawn values.
- It is acceptable to show +12.00 if White is winning by 1200 cp.
- It is acceptable to show -11.00 if Black is winning by 1100 cp.

Evaluation bar requirements:

Implement the eval bar as a stable relative-strength bar, not as a direction-toggling patch.

The eval bar must follow these semantics:

- White advantage increases the White side of the bar.
- Black advantage increases the Black side of the bar.
- Equal position is centered at 50% White / 50% Black.
- Positive whiteCp means White gets more of the bar.
- Negative whiteCp means Black gets more of the bar.
- The bar must not invert incorrectly when Black has a large advantage.
- The bar must not display a positive White advantage when Black is winning.
- The bar must not toggle layout direction based on who is winning.
- Use a single consistent layout and update only the fill percentage.

Use this exact normalization model for centipawn scores:

const clamped = Math.max(-1000, Math.min(1000, whiteCp));
const whitePercent = 50 + (clamped / 1000) * 50;
const blackPercent = 100 - whitePercent;

This means:

- whiteCp = 0 => whitePercent = 50, blackPercent = 50.
- whiteCp = +1000 => whitePercent = 100, blackPercent = 0.
- whiteCp = -1000 => whitePercent = 0, blackPercent = 100.
- whiteCp = +300 => whitePercent = 65, blackPercent = 35.
- whiteCp = -300 => whitePercent = 35, blackPercent = 65.

Mate-score display in the eval bar:

- If whiteMate > 0, show decisive White advantage.
- If whiteMate < 0, show decisive Black advantage.
- For display purposes:
  - whiteMate > 0 => whitePercent = 100.
  - whiteMate < 0 => whitePercent = 0.

The eval bar must be visually clear:

- Use one segment for White.
- Use one segment for Black.
- White segment and Black segment must sum to 100%.
- Do not position the bar using conflicting left/right toggles.
- Do not use separate code paths that reverse the gradient direction for White and Black.
- Do not use absolute positioning tricks that can leave stale left/right CSS properties.
- Prefer a flex layout where the White segment width is whitePercent and the Black segment width is blackPercent.

Engine-player workflow requirements:

This workflow is available only in Human vs Stockfish mode.

When it is Stockfish's turn:

- Generate a valid FEN from the current board state.
- Send the position to Stockfish:

  position fen <FEN>

- Ask Stockfish for a move using limited thinking time:

  go movetime <milliseconds>

The movetime must come from the selected strength level:

- Beginner: 150 ms
- Casual: 300 ms
- Intermediate: 500 ms
- Advanced: 800 ms
- Strong: 1200 ms

When Stockfish returns bestmove:

- Parse the bestmove response.
- Convert the UCI move, for example e2e4, into board coordinates.
- Support promotion notation, for example e7e8q.
- Validate the engine move against the app's own legal move generator before executing it.
- If the move is valid, execute it exactly like a human move.
- If the move is invalid, empty, or unusable, do not execute it. Show an engine error message.

FEN requirements:

Your FEN generator must correctly include:

- Piece placement.
- Active color.
- Castling availability if castling is implemented.
- En passant target square if en passant is implemented.
- Halfmove clock if tracked, otherwise use a valid reasonable value.
- Fullmove number.

The FEN must be valid enough for Stockfish to analyze the current position.

Testing expectations:

The following legal moves must work from the initial position:

1. e2-e4
2. e7-e5
3. g1-f3
4. b8-c6
5. f1-b5

The following illegal moves must be rejected from the initial position:

1. e2-e5
2. g1-g3
3. a1-a4 because the pawn on a2 blocks the rook.
4. f1-c4 because the pawn on e2 blocks the bishop's path.
5. e1-e2 because e2 is occupied by a friendly pawn.

Additional correctness tests:

- A side must not be allowed to make a move that exposes its own king to check.
- A king must not be allowed to move into check.
- A player in check must make a move that resolves the check.
- Pawns must promote to queens on the final rank.
- Captured pieces must disappear from the board and appear in the captured pieces area.
- Move history must match actual executed moves only.

Stockfish-specific tests:

- If the game mode is Human vs Human, Stockfish must only analyze. It must not make moves.
- If the game mode is Human as White vs Stockfish as Black, Stockfish must move only for Black.
- If the game mode is Human as Black vs Stockfish as White, Stockfish must move only for White.
- Changing strength level must affect later Stockfish moves.
- Engine moves must appear in move history.
- Engine captures must update captured pieces.
- Engine moves must update the clock.
- Engine moves must update the evaluation bar.
- The app must remain playable even if stockfish.js fails to load.

Evaluation-bar test cases:

Your implementation must correctly handle these artificial Stockfish score cases:

Case 1:
- sideToMove = "w"
- score cp 300
- Expected whiteCp = +300
- Text should show +3.00
- Eval bar should favor White.

Case 2:
- sideToMove = "b"
- score cp 300
- Expected whiteCp = -300
- Text should show -3.00
- Eval bar should favor Black.

Case 3:
- sideToMove = "b"
- score cp 1000
- Expected whiteCp = -1000
- Text should show -10.00
- Eval bar should show decisive Black advantage.
- It must not show +10.00.
- It must not favor White.

Case 4:
- sideToMove = "w"
- score cp -1000
- Expected whiteCp = -1000
- Text should show -10.00
- Eval bar should show decisive Black advantage.

Case 5:
- sideToMove = "w"
- score mate 2
- Expected whiteMate = +2
- Text should show Mate in 2
- Eval bar should show decisive White advantage.

Case 6:
- sideToMove = "b"
- score mate 2
- Expected whiteMate = -2
- Text should show Mate in -2
- Eval bar should show decisive Black advantage.

Implementation quality requirements:

Keep the code organized.

Use clear functions for:

- Board initialization
- Rendering
- Coordinate conversion
- Legal move generation
- Attack detection
- Check detection
- Checkmate detection
- Stalemate detection
- Move execution
- Captured piece tracking
- Move history tracking
- FEN generation
- Stockfish initialization
- Stockfish strength configuration
- Stockfish analysis
- Stockfish engine move generation
- Stockfish request-state management
- Evaluation score normalization
- Evaluation bar rendering
- Clock management
- Reset logic
- Legal move indicator rendering
- Capture-ring rendering
- Board theme styling

Avoid global spaghetti code where possible.

Do not silently skip difficult parts.

If a feature is implemented, it must be implemented correctly.

Output rules:

- Output exactly one complete HTML code block.
- The code block must contain the full index.html.
- No explanations before the code.
- No explanations after the code.
- No Markdown except the single HTML code block.
- No external dependencies except the local stockfish.js file.
- Do not include stockfish.js contents inside the HTML.
- Do not use images.
- Do not use TODO comments.
- Do not use placeholders.
- Do not use pseudocode.
- Do not omit any JavaScript logic.
- The app must be executable as-is when saved as index.html beside stockfish.js.

Before writing the code, reason internally about:

- Board coordinates
- Legal move generation
- King safety
- FEN generation
- Stockfish request state
- Evaluation score orientation
- Eval bar normalization
- Engine move validation
- Clock state
- Brown professional board styling
- Lichess-style move dots and capture rings

Then output the complete application.
