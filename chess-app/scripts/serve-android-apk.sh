#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-8099}"
HOST="${HOST:-0.0.0.0}"
APK_DIR="$ROOT_DIR/android/app/build/outputs/apk/release"

cd "$ROOT_DIR"

if [[ "${BUILD_APK:-0}" == "1" || ! -f "$APK_DIR/app-release-unsigned.apk" ]]; then
  npm run build
  npx cap sync android
  (cd android && ./gradlew :app:assembleRelease)
fi

SIGNED_APK="$APK_DIR/app-release-debug-signed.apk"
UNSIGNED_APK="$APK_DIR/app-release-unsigned.apk"

if [[ ! -f "$UNSIGNED_APK" ]]; then
  echo "No release APK found at $APK_DIR/app-release-unsigned.apk" >&2
  exit 1
fi

SIGNED_LINK=""
if [[ -f "$SIGNED_APK" ]]; then
  SIGNED_LINK='    <p><a href="./app-release-debug-signed.apk">Download signed release APK for sideload testing</a></p>'
fi

cat > "$APK_DIR/index.html" <<HTML
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Qwen Chess Android APK</title>
  </head>
  <body>
    <h1>Qwen Chess Android APK</h1>
${SIGNED_LINK}
    <p><a href="./app-release-unsigned.apk">Download unsigned release APK</a></p>
  </body>
</html>
HTML

echo "Serving Android APK directory:"
echo "  $APK_DIR"
echo
echo "Open from another device on this network:"
echo "  http://<this-laptop-ip>:$PORT/"
echo
echo "Local URL:"
echo "  http://127.0.0.1:$PORT/"

cd "$APK_DIR"
exec python3 -m http.server "$PORT" --bind "$HOST"
