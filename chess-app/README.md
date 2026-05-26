# Chess Frontend

React + TypeScript frontend for Qwen's 3.6 Chess. It provides local chess, Stockfish play, online multiplayer, PGN study, user profile, and rated game history.

## Architecture

### App Shell

- `src/App.tsx` owns BrowserRouter routes, authenticated layout, top navigation, and links to Home, Lobby, Local Game, Online Game, PGN Study, Profile, and History.
- `src/components/Home.tsx` defaults the Single Player card to Human playing White vs Stockfish. Human-as-black Stockfish play is available from the Stockfish color picker, and local Human-vs-Human remains available from the game-mode dropdown on the local board.
- `src/main.tsx` mounts the React application.
- `src/index.css` contains the shared board, panel, responsive, and history styles. Desktop uses sidebars, tablet stacks panels below the board, and phone layouts use a full-width board.

### State And Context

- `src/context/AuthContext.tsx` stores the authenticated user, access token, loading state, profile refresh, and profile update actions.
- `src/context/GameWebSocketContext.tsx` owns WebSocket connection state, lobby state, active online game state, draw offers, and multiplayer actions.
- `src/lib/auth.ts` stores JWT access tokens, refresh tokens, and serialized user profile data.
- `src/lib/api.ts` wraps REST calls for auth, profile, Elo stats, game history, and Stockfish game recording.
- `src/lib/ws.ts` creates the browser WebSocket connection to `/ws`.

### Chess Engine Layer

- `src/engine/types.ts` defines piece ids, coordinates, move types, game status, Stockfish strength levels from 500 to 2400 Elo, and text chess symbols.
- `public/stockfish.js` is Stockfish 18.0.7 packaged as one browser worker file with the WASM payload embedded. The app intentionally keeps the single `/stockfish.js` deployment contract instead of serving a separate `.wasm` sidecar.
- `src/engine/logic.ts` contains reusable board logic: move generation, legal move filtering, attack detection, check/checkmate/stalemate, castling, en passant, and promotion.
- `src/engine/notation.ts` handles FEN, PGN, and UCI helpers.
- `src/engine/pgn.ts` parses PGN and replays SAN through legal move resolution so ambiguous moves and pawn moves such as `d4` select the correct source square.

### Local And Stockfish Play

- `src/hooks/useChessGame.ts` is the source of truth for local board behavior.
- It owns board state, selected square, legal move list, captures, clocks, Stockfish worker lifecycle, sounds, SAN move history, PGN export, and game-end detection.
- Stockfish is driven with the UCI flow used by the browser worker: `uci`, `isready`, `setoption`, `ucinewgame`, `position fen ...`, and `go ...`.
- Stockfish 18 reports native `UCI_Elo` support only from 1320 upward. For selected UI levels below 1320, the hook disables native ELO limiting, requests shallow searches, enables MultiPV, and mixes nearby evaluated candidates with tapered random legal moves. The random legal move chance starts at 45% for 500 Elo and drops to 8% by 1300 Elo; 1400+ uses native strength without random moves.
- Stockfish games post completed results to `/api/users/me/history/stockfish` with the selected Stockfish Elo, player color, result, move count, and duration.
- Human players can retract their latest move against Stockfish up to 3 times per game. Using any retract makes that Stockfish game unrated, so it is not posted to ELO history.
- Human-as-black games flip the board so black pieces are at the bottom.

### Online Multiplayer

- `src/components/Lobby.tsx` joins/leaves the waiting lobby and creates or joins games.
- `src/components/OnlineGame.tsx` renders the synchronized board, clocks, move history, captured pieces, draw/resign controls, game-over state, and leave-game guard.
- Online boards reuse the same `Board` and `Square` components as local play. Legal move hints and check/checkmate clues are derived from the received FEN and local engine helpers.
- Multiplayer sound effects mirror local board sounds for moves, captures, illegal moves, check, checkmate, stalemate, and promotion.

### Board Components

- `src/components/Board.tsx` renders the 8x8 grid, supports white/black orientation, highlights last move, selected squares, legal targets, and the checked king.
- `src/components/Square.tsx` renders individual squares with text chess symbols, coordinate labels, legal dots/rings, and mobile-safe piece styling.
- `src/components/Clock.tsx`, `CapturedPieces.tsx`, `MoveHistory.tsx`, `StatusBar.tsx`, `EvalBar.tsx`, `Settings.tsx`, and `Controls.tsx` compose the game surfaces around the board.

### Profile And History

- `src/components/Profile.tsx` edits display name and avatar, and shows current Elo, games, wins, and draws.
- `src/components/GameHistory.tsx` fetches `/api/users/me/elo` and `/api/users/me/history?limit=50`, then displays last 50 rated games and last-10 Stockfish performance.
- The top navigation shows the current user Elo and links directly to Profile and History.

### PGN Study

- `src/components/PGNLoader.tsx` accepts pasted or uploaded PGN, parses headers and moves, replays positions, and provides first/previous/next/last navigation.
- It uses the same board renderer as live games, so orientation, coordinates, last-move highlighting, and piece styling remain consistent.

## Responsive Layout

- **Desktop and laptop**: board centered with evaluation/captured panel on the left and settings/history panel on the right.
- **Tablet**: board remains centered and panels wrap below the board in two-column style where space allows.
- **Mobile**: board fills available width, clocks and buttons shrink, side panels stack, move history height is capped, and text chess glyphs prevent mobile emoji-style black pawn rendering for white pawns.

## Build

```bash
npm install
npm run build
```

The build emits a Vite static bundle for the Nginx production image.

## Development

```bash
npm run dev
```

The Vite dev server runs the frontend locally. In the full app, Docker Compose serves the production frontend on `http://localhost:3001` and proxies API/WebSocket traffic to the backend container.

## Mobile Shells

Capacitor is configured for Android and iOS in `capacitor.config.ts`.

- App id: `io.levelg.chess`
- App name: `Qwen Chess`
- Bundled app assets: `dist`
- Remote API/WebSocket endpoint: `https://chess-chess-project.apps.ocp-think.levelg.io`
- Android: uses Android System WebView / Chrome-backed WebView.
- iOS: uses WKWebView, as required by iPhone/iPad platform rules.

The native shells bundle the web app so Local Human-vs-Human, Human-vs-Stockfish, and PGN study can run offline. Login, profile/history sync, lobby, online games, and WebSockets use the private OpenShift route when phones and tablets are on a network that can resolve and reach it.

In native builds only, the last logged-in account remains usable for offline local play if the server cannot be reached. Login and register screens also expose Continue offline so the player can return to the local app shell without server access. Completed Stockfish games are saved on-device first and synced to server history later when the account is logged in and the route is reachable. Browser builds keep live server validation for auth.

Screenshots:

<p>
  <img src="../docs/screenshots/android-local-settings.png" alt="Android local game settings" width="260">
  <img src="../docs/screenshots/ios-iphone-local-settings.png" alt="iPhone local game settings" width="260">
  <img src="../docs/screenshots/ios-ipad-home.png" alt="iPad local game settings" width="360">
</p>

```bash
npm run cap:sync
npm run cap:open:android
npm run cap:open:ios
```

Run `cap:sync` after frontend or Capacitor config changes before opening Android Studio or Xcode.

### Native Release Deployment

The native apps embed the current Vite production bundle. Always rebuild and sync the web app before making an Android or iOS release:

```bash
cd chess-app
npm install
npm run build
npx cap sync
```

`npm run build` writes `dist/`. `npx cap sync` copies that build into Android and iOS:

- `android/app/src/main/assets/public`
- `ios/App/App/public`

This step is required after changes to React components, CSS, `public/` assets, Stockfish, routes, auth/API config, or `capacitor.config.ts`.

#### Android Release APK

Build the release APK and Android App Bundle:

```bash
cd chess-app/android
./gradlew :app:assembleRelease
./gradlew :app:bundleRelease
```

Outputs:

- `android/app/build/outputs/apk/release/app-release-unsigned.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

For local sideload testing, align and sign the APK. This example uses the local debug keystore and is not for Play Store distribution:

```bash
cd chess-app
~/Library/Android/sdk/build-tools/37.0.0/zipalign -v -p 4 \
  android/app/build/outputs/apk/release/app-release-unsigned.apk \
  android/app/build/outputs/apk/release/app-release-debug-signed.apk

~/Library/Android/sdk/build-tools/37.0.0/apksigner sign \
  --ks android/app/debug.keystore \
  --ks-pass pass:android \
  --ks-key-alias chess_debug \
  --key-pass pass:android \
  android/app/build/outputs/apk/release/app-release-debug-signed.apk

~/Library/Android/sdk/build-tools/37.0.0/apksigner verify --verbose \
  android/app/build/outputs/apk/release/app-release-debug-signed.apk
```

Install directly over USB:

```bash
adb uninstall io.levelg.chess
adb install -r android/app/build/outputs/apk/release/app-release-debug-signed.apk
```

If Android reports `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, uninstall the existing app first; it was signed with a different key.

#### Serve The APK On The LAN

Use the helper script to serve the release APK directory from this laptop:

```bash
cd chess-app
scripts/serve-android-apk.sh
```

The script binds to `0.0.0.0:8099` and serves:

```text
android/app/build/outputs/apk/release
```

Open this from an Android device on the same network:

```text
http://<laptop-lan-ip>:8099/
```

The signed sideload APK URL is:

```text
http://<laptop-lan-ip>:8099/app-release-debug-signed.apk
```

If the port is already in use:

```bash
lsof -nP -iTCP:8099 -sTCP:LISTEN
kill <pid>
```

#### iOS Release Install

The iOS project is:

```text
ios/App/App.xcodeproj
```

Use `App.xcodeproj`; this project does not currently use `App.xcworkspace`.

Check that connected or paired iPhone/iPad devices are visible:

```bash
xcrun devicectl list devices
```

The command prints device names, generated identifiers, state, and model. Do not commit real iPhone/iPad identifiers. In docs and scripts, use placeholders like `<iphone-device-id>` and `<ipad-device-id>`.

Build a signed Release app for physical devices:

```bash
cd chess-app
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination generic/platform=iOS \
  -derivedDataPath ios/DerivedData-install-release \
  DEVELOPMENT_TEAM=<apple-team-id> \
  CODE_SIGN_STYLE=Automatic \
  build
```

The signed app is produced at:

```text
ios/DerivedData-install-release/Build/Products/Release-iphoneos/App.app
```

Install it on each visible iPhone or iPad:

```bash
xcrun devicectl device install app \
  --device <iphone-device-id> \
  ios/DerivedData-install-release/Build/Products/Release-iphoneos/App.app

xcrun devicectl device install app \
  --device <ipad-device-id> \
  ios/DerivedData-install-release/Build/Products/Release-iphoneos/App.app
```

The device must be registered for development and included in the selected Apple Development provisioning profile. If the unsigned Release build succeeds but the signed build or install fails, check the Apple team, bundle id `io.levelg.chess`, provisioning profile, certificate access in Keychain, and the device trust prompt.

Archive for TestFlight or App Store distribution:

```bash
cd chess-app
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination generic/platform=iOS \
  -archivePath "$PWD/ios/output/QwenChess.xcarchive" \
  DEVELOPMENT_TEAM=<apple-team-id> \
  CODE_SIGN_STYLE=Automatic \
  archive

xcodebuild -exportArchive \
  -archivePath "$PWD/ios/output/QwenChess.xcarchive" \
  -exportPath "$PWD/ios/output/export" \
  -exportOptionsPlist "$PWD/ios/export-options.plist"
```

Use `BUILD-PROCEDURE.md` in the repo root for the longer checklist and troubleshooting notes.

Route, browser, and engine regression tests:

```bash
npm run test:browser
```

### Unit and Integration Tests

The project uses **Vitest** with jsdom for fast unit and integration tests of the chess engine and library code.

```bash
npm run test:unit           # Run all unit + integration tests
npm run test:unit:coverage  # Run with coverage report
```

**Test suite** (122 tests across 7 files):

| Test File | Tests | Coverage Area |
|---|---|---|
| `tests/unit/types.test.ts` | 27 | Piece IDs, color helpers, `PIECE_TYPE`, `STRENGTH_MAP`, `RANKS`/`FILES` |
| `tests/unit/logic.test.ts` | 38 | Board initialization, move generation, attacks, check/mate/stalemate, castling, en passant, promotion, state cloning |
| `tests/unit/notation.test.ts` | 12 | FEN parsing/generation, PGN move extraction, UCI conversion |
| `tests/unit/pgn.test.ts` | 16 | PGN header parsing, comment/NAG stripping, SAN replay, castling replay, en passant |
| `tests/unit/auth.test.ts` | 10 | JWT token storage, user serialization, auth status, native app detection, WebSocket/API URLs |
| `tests/unit/localHistory.test.ts` | 9 | Local history persistence, CRUD operations, capacity limits |
| `tests/integration/gameflow.test.ts` | 10 | Full game flows (Italian Game, Scholar's Mate, Fool's Mate), FEN round-trips, en passant, promotion, castling |

**Coverage summary**:

| Module | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `engine/types.ts` | 100% | 100% | 100% | 100% |
| `engine/logic.ts` | 95.6% | 92.4% | 94.1% | 98.3% |
| `engine/notation.ts` | 100% | 93.3% | 100% | 100% |
| `engine/pgn.ts` | 85.0% | 75.0% | 100% | 92.0% |
| `lib/auth.ts` | 80.6% | 50.0% | 92.3% | 80.6% |
| `lib/localHistory.ts` | 55.6% | 60.0% | 85.7% | 56.5% |
| **Total** | **90.7%** | **85.4%** | **95.0%** | **93.4%** |

Focused test files:

- `tests/chess-rules.spec.ts` validates legal move generation, en passant, stale castling rights guards, matching rook requirements, and white/black kingside castling from real opening sequences.
- `tests/pgn-replay.spec.ts` validates PGN header parsing, comment/NAG/variation stripping, SAN castling replay, castling rights updates, and en passant replay context.
- `tests/offline-routes.spec.ts` validates offline-capable local routes, protected online routes, authenticated lobby rendering, and deep-link/refresh behavior.
- `tests/stockfish.spec.ts` validates the bundled Stockfish 18 worker UCI flow, bestmove behavior, and low-Elo random legal move configuration.

Run only the rule and PGN replay coverage:

```bash
npm run test:browser -- tests/chess-rules.spec.ts tests/pgn-replay.spec.ts
```

Run the route suite against the production frontend served by Docker Compose:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:browser -- tests/offline-routes.spec.ts
```

The external route mode uses the live Compose backend for auth and catches production-only routing failures, including `/lobby` rendering the Home page after clicking Online Multiplayer.

Android debug build:

```bash
cd android
JAVA_HOME="$HOME/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew :app:assembleDebug
```

The debug APK is emitted at `android/app/build/outputs/apk/debug/app-debug.apk`.

Install it on a connected Android device with USB debugging:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

For real iPhone/iPad installation, open `ios/App/App.xcodeproj` in Xcode, select a signing team for bundle id `io.levelg.chess`, connect the device, and run the `App` scheme. Simulator builds can run from CLI, but physical device installs need Apple signing.

Check that connected or paired iPhone/iPad devices are visible before building or installing:

```bash
xcrun devicectl list devices
```

Emulator prerequisites:

- Android: create an AVD in Android Studio Device Manager. The command `~/Library/Android/sdk/emulator/emulator -list-avds` should list it before CLI emulator tests can run.
- iOS: install an iOS simulator runtime in Xcode Settings > Platforms. The generated Xcode scheme is `App`, but simulator builds need an installed runtime/destination.

## Docker

```bash
docker build -t chess-app .
```

The frontend image is a multi-stage build: Node builds the Vite bundle, then Nginx serves static assets and proxies `/api` and `/ws`.
