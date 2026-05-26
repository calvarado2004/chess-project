# Chess App Native Release Build Guide

This project builds the native apps from the Vite React frontend in `chess-app/` using Capacitor 8.

The important rule is: after any frontend change in `src/`, `public/`, `index.html`, `vite.config.ts`, or `capacitor.config.ts`, rebuild the web app and run Capacitor sync before building iOS or Android. The native apps embed the generated web bundle.

## Current Native Configuration

| Item | Value |
| --- | --- |
| Capacitor app id | `io.levelg.chess` |
| App name | `Qwen Chess` |
| Web output | `chess-app/dist` |
| Android package | `io.levelg.chess` |
| Android min/target/compile SDK | `24` / `36` / `36` |
| iOS bundle id | `io.levelg.chess` |
| iOS deployment target | `15.0` |
| iOS project | `chess-app/ios/App/App.xcodeproj` |
| iOS dependency style | Swift Package Manager, no CocoaPods workspace |

Do not use `ios/App/App.xcworkspace`; this project currently uses `App.xcodeproj` directly.

## Prerequisites

- Node.js/npm that can install and run the versions in `chess-app/package-lock.json`.
- Android Studio or Android SDK with JDK, build tools, and SDK 36 installed.
- Xcode with iOS SDK and a valid Apple Developer team for signed archives.
- First iOS build needs Swift Package Manager access to `https://github.com/ionic-team/capacitor-swift-pm.git` unless the package is already cached.

## Build And Sync The Frontend

Run this from the repo root:

```bash
cd chess-app
npm install
npm run build
npx cap sync
```

`npm run build` runs TypeScript and Vite, then writes `dist/`.

`npx cap sync` copies the current `dist/` into:

- `chess-app/android/app/src/main/assets/public`
- `chess-app/ios/App/App/public`

This sync step is the mobile-side fix required after frontend changes. Do not hand-edit the generated native `public` folders; update the frontend source, rebuild, then sync.

## Android Release

Build an unsigned release APK:

```bash
cd chess-app/android
./gradlew :app:assembleRelease
```

Output:

```text
chess-app/android/app/build/outputs/apk/release/app-release-unsigned.apk
```

Build a release Android App Bundle for Play Console:

```bash
cd chess-app/android
./gradlew :app:bundleRelease
```

Output:

```text
chess-app/android/app/build/outputs/bundle/release/app-release.aab
```

For distribution, configure release signing before publishing. Prefer keeping secrets out of git by putting values in `~/.gradle/gradle.properties` or environment variables, then reading them from `android/app/build.gradle`.

Minimum `android/app/build.gradle` shape:

```gradle
android {
    signingConfigs {
        release {
            storeFile file(System.getenv("CHESS_ANDROID_KEYSTORE"))
            storePassword System.getenv("CHESS_ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("CHESS_ANDROID_KEY_ALIAS")
            keyPassword System.getenv("CHESS_ANDROID_KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

Install a locally signed APK on a device:

```bash
adb uninstall io.levelg.chess
adb install -r chess-app/android/app/build/outputs/apk/release/app-release.apk
```

If you only have `app-release-unsigned.apk`, sign it with `zipalign` and `apksigner`; do not use `jarsigner` for modern Android releases.

## iOS Release

The iOS target builds from `chess-app/ios/App/App.xcodeproj`, scheme `App`.

Quick compile check without code signing:

```bash
cd chess-app
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -derivedDataPath ios/DerivedData-release-check \
  CODE_SIGNING_ALLOWED=NO \
  build
```

Archive with automatic signing:

```bash
cd chess-app
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$PWD/ios/output/QwenChess.xcarchive" \
  archive
```

If automatic signing does not pick the right team, pass the team explicitly:

```bash
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$PWD/ios/output/QwenChess.xcarchive" \
  DEVELOPMENT_TEAM=<apple-team-id> \
  CODE_SIGN_STYLE=Automatic \
  archive
```

Export an IPA from the archive:

```bash
xcodebuild -exportArchive \
  -archivePath "$PWD/ios/output/QwenChess.xcarchive" \
  -exportPath "$PWD/ios/output/export" \
  -exportOptionsPlist "$PWD/ios/export-options.plist"
```

Example `ios/export-options.plist` for App Store/TestFlight:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>teamID</key>
  <string>&lt;apple-team-id&gt;</string>
  <key>signingStyle</key>
  <string>automatic</string>
</dict>
</plist>
```

For ad hoc device distribution, use `method` value `ad-hoc` and make sure the target device UDIDs are in the provisioning profile.

## Frontend Notes That Affect Native Builds

- Native routing is already handled in `src/App.tsx`: native protocols use `HashRouter`, web uses `BrowserRouter`.
- Native API/WebSocket traffic is already routed to `VITE_REMOTE_APP_ORIGIN` or the default `https://chess-chess-project.apps.ocp-think.levelg.io` in `src/lib/auth.ts`.
- Stockfish is loaded from `/stockfish.js`; because it lives in `public/`, `npm run build` and `npx cap sync` must run before native builds.
- Chess piece SVGs are also loaded from `public/staunty` and `public/avatars`; missing public assets can break native rendering even when native compilation succeeds.

## Verified On This Worktree

These commands were run successfully on May 26, 2026:

```bash
cd chess-app
npm run build
npx cap sync
cd android && ./gradlew :app:assembleRelease
cd android && ./gradlew :app:bundleRelease
cd chess-app && xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' -derivedDataPath ios/DerivedData-release-check CODE_SIGNING_ALLOWED=NO build
cd chess-app && xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' -archivePath /private/tmp/chess-app-release-check.xcarchive -derivedDataPath ios/DerivedData-archive-check CODE_SIGNING_ALLOWED=NO archive
```

The iOS unsigned archive check proves the project compiles and archives. A distributable IPA still requires valid Apple signing and export options.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| iOS says `App.xcworkspace does not exist` | Use `-project ios/App/App.xcodeproj`; there is no CocoaPods workspace in this project. |
| iOS Swift package resolution fails | Re-run with network access or open the project in Xcode once so SwiftPM can fetch `capacitor-swift-pm`. |
| iOS archive fails only during signing | Check `DEVELOPMENT_TEAM`, bundle id `io.levelg.chess`, provisioning profile, and certificate access in Keychain. |
| Android install fails with `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Uninstall the existing app first; it was signed with a different key. |
| Android release APK cannot install | Sign the APK with `apksigner`, or configure `signingConfigs.release` and rebuild. |
| Native app shows stale UI | Run `npm run build && npx cap sync` before native builds. |
| Stockfish or pieces missing on device | Confirm the files exist under `dist/`, then re-run `npx cap sync`. |
