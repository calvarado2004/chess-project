#!/usr/bin/env bash
set -euo pipefail

# Serves the signed RELEASE APK over HTTP so an Android device on the same
# network can download and sideload it.
#
# The served file is android/.../release/app-release.apk, signed with a real
# release keystore (NOT the Android debug key). To (re)build and sign it, set
# the keystore env vars below and run with BUILD_APK=1; otherwise the script
# just serves an already-built app-release.apk.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-8099}"
HOST="${HOST:-0.0.0.0}"
APK_DIR="$ROOT_DIR/android/app/build/outputs/apk/release"
RELEASE_APK="$APK_DIR/app-release.apk"

# Release signing config (override via env). Defaults to the project keystore.
KEYSTORE="${CHESS_RELEASE_KEYSTORE:-$HOME/.android/chess-release.jks}"
KEY_ALIAS="${CHESS_RELEASE_ALIAS:-chess-release}"
KS_PASS="${CHESS_RELEASE_PASSWORD:-}"
BUILD_TOOLS="${ANDROID_BUILD_TOOLS:-$HOME/Library/Android/sdk/build-tools/37.0.0}"

cd "$ROOT_DIR"

if [[ "${BUILD_APK:-0}" == "1" || ! -f "$RELEASE_APK" ]]; then
  if [[ ! -f "$RELEASE_APK" && "${BUILD_APK:-0}" != "1" ]]; then
    echo "No signed release APK at $RELEASE_APK." >&2
    echo "Re-run with BUILD_APK=1 (and CHESS_RELEASE_PASSWORD set) to build it." >&2
    exit 1
  fi
  if [[ -z "$KS_PASS" ]]; then
    echo "CHESS_RELEASE_PASSWORD must be set to build+sign the release APK." >&2
    exit 1
  fi
  npm run build
  npx cap sync android
  (cd android && ./gradlew :app:assembleRelease)
  "$BUILD_TOOLS/zipalign" -p -f 4 "$APK_DIR/app-release-unsigned.apk" "$APK_DIR/aligned.apk"
  "$BUILD_TOOLS/apksigner" sign \
    --ks "$KEYSTORE" --ks-pass "pass:$KS_PASS" \
    --ks-key-alias "$KEY_ALIAS" --key-pass "pass:$KS_PASS" \
    --out "$RELEASE_APK" "$APK_DIR/aligned.apk"
  rm -f "$APK_DIR/aligned.apk" "$APK_DIR/aligned.apk.idsig" "$APK_DIR/app-release-unsigned.apk"
fi

cat > "$APK_DIR/index.html" <<HTML
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Qwen Chess — Android</title>
    <style>
      body { font-family: system-ui, sans-serif; background:#1e1e2e; color:#cdd6f4; text-align:center; padding:48px 16px; }
      a.btn { display:inline-block; margin-top:24px; padding:16px 28px; background:#89b4fa; color:#1e1e2e; font-weight:700; font-size:18px; text-decoration:none; border-radius:10px; }
      p.note { color:#a6adc8; margin-top:24px; font-size:14px; }
    </style>
  </head>
  <body>
    <h1>♟ Qwen Chess</h1>
    <p>Tap to download, then open the file to install.</p>
    <a class="btn" href="./app-release.apk">Download Qwen Chess (Android)</a>
    <p class="note">You may need to allow "install unknown apps" for your browser.</p>
  </body>
</html>
HTML

echo "Serving signed release APK:"
echo "  $RELEASE_APK"
echo
echo "Open from a device on this network:"
echo "  http://<this-laptop-ip>:$PORT/"
echo
echo "Local URL:"
echo "  http://127.0.0.1:$PORT/"

cd "$APK_DIR"
exec python3 -m http.server "$PORT" --bind "$HOST"
