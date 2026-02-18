# TestFlight Setup Guide

This guide will help you build and deploy your Sapph app to TestFlight for iOS testing.

## Prerequisites

1. **macOS** with **Xcode** installed (from Mac App Store)
2. **Apple Developer Account** ($99/year) - Required for TestFlight
3. **Network connection** - For downloading dependencies

## App size & load time

- **Splash image:** `public/images/splash.jpg` is used on the first screen. Keep it under ~500 KB (e.g. max width 1200–1600 px, JPEG quality 80) so TestFlight loads faster. Resize/compress in an image editor or with `sips` on macOS.
- **Code splitting:** Routes (Home, Onboarding, Chat, etc.) load on demand so the initial bundle is smaller and the app becomes interactive sooner.

## Getting the latest build onto your phone (important)

If you changed code but still see the old behavior (e.g. still see Google/Apple, or old freeze):

1. **Rebuild and sync:**  
   `npm run build && npx cap sync ios`
2. **In Xcode:** **Product → Clean Build Folder** (⌘⇧K), then **Product → Run** (⌘R).
3. **On the phone:** Delete the Sapph app (long-press → Remove App), then run again from Xcode so it installs fresh. This avoids the WebView using cached old JavaScript.

---

## Deploying your latest code to Xcode (after updates)

Whenever you’ve made changes (e.g. sign-in flow, forgot password, UI tweaks, new app icon), do this so the iOS app uses the new build:

1. **Build the web app** (in your project folder, in Terminal or Cursor):
   ```bash
   npm run build
   ```
2. **Sync the build into the iOS project**:
   ```bash
   npx cap sync ios
   ```
   This copies the latest `dist/` into the iOS app and updates native config if needed.
3. **Open the app in Xcode**:
   ```bash
   npx cap open ios
   ```
   (Or in Xcode: **File → Open** and choose `ios/App/App.xcworkspace` — use the **.xcworkspace** file, not the .xcodeproj.)
4. In Xcode you can then:
   - **Run on simulator:** Choose an iPhone simulator from the device menu, then **Product → Run** (or **⌘R**).
   - **Run on your iPhone:** Connect the phone, select it in the device menu, then Run. Trust the developer certificate on the device if asked.
   - **Upload to TestFlight:** See **Step 8** and **Step 9** below (select **Any iOS Device**, then **Product → Archive**, then **Distribute App**).

After **cap sync**, Xcode will use the new web bundle on the next build; you don’t need to change anything inside Xcode for JS/CSS/asset updates.

---

## Step 1: Build the Web App

The web app has already been built. If you need to rebuild:

```bash
npm run build
```

## Step 2: Initialize iOS Project

If the `ios` folder doesn't exist, create it:

```bash
npx cap add ios
```

This will create the iOS project structure.

## Step 3: Sync Web Build to iOS

Sync your web build to the iOS project:

```bash
npx cap sync ios
```

## Step 4: Open in Xcode

Open the iOS project in Xcode:

```bash
npx cap open ios
```

Or manually:
- Open Xcode
- File → Open → Navigate to `ios/App/App.xcworkspace`

## Step 5: Configure Signing & Capabilities

In Xcode:

1. **Select the App target** in the project navigator
2. Go to **Signing & Capabilities** tab
3. **Team**: Select your Apple Developer team
4. **Bundle Identifier**: Should be `com.sapph.app` (or update if needed)
5. **Capabilities**: Ensure these are enabled:
   - Camera (if using camera features)
   - Push Notifications (if using push notifications)
   - Location Services (if using geolocation)

## Step 6: Configure Info.plist

Add required permissions in `Info.plist`:

1. Open `ios/App/App/Info.plist`
2. Add these keys if not present:

```xml
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to upload profile photos</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to select profile photos</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to show nearby matches</string>
```

## Step 7: Build for Device/Simulator

### For Simulator (Testing):
1. Select a simulator from the device dropdown (e.g., "iPhone 15 Pro")
2. Click the **Play** button or press `Cmd + R`
3. The app will build and launch in the simulator

### For Physical Device:
1. Connect your iPhone via USB
2. Select your device from the device dropdown
3. Click the **Play** button
4. Trust the developer certificate on your phone if prompted

## Step 8: Archive for TestFlight

1. In Xcode, select **Any iOS Device** from the device dropdown
2. Go to **Product → Archive**
3. Wait for the archive to complete
4. The **Organizer** window will open automatically

## Step 9: Upload to App Store Connect

1. In the Organizer window, select your archive
2. Click **Distribute App**
3. Choose **App Store Connect**
4. Click **Next**
5. Select **Upload** (not Export)
6. Click **Next**
7. Review the options and click **Upload**
8. Wait for the upload to complete

## Step 10: Configure in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **My Apps**
3. Create a new app if you haven't already:
   - **Name**: Sapph
   - **Primary Language**: English
   - **Bundle ID**: com.sapph.app
   - **SKU**: sapph-app (or any unique identifier)
4. Go to **TestFlight** tab
5. Wait for processing (can take 10-30 minutes)
6. Once processed, add **Internal Testers** or **External Testers**
7. Add yourself as a tester
8. Install **TestFlight** app on your iPhone
9. You'll receive an email invitation to test

## Step 11: Install on Your Phone

1. Open the **TestFlight** app on your iPhone
2. Accept the invitation if you received one
3. Tap **Install** next to your app
4. The app will install and you can launch it

## Troubleshooting

### Network Issues
If you encounter network errors:
- Check your internet connection
- Try using a different network
- Check if you're behind a corporate firewall/proxy

### Signing Errors
- Make sure you have a valid Apple Developer account
- Ensure your team is selected in Xcode
- Check that the Bundle ID matches your App Store Connect app

### Build Errors
- Clean build folder: **Product → Clean Build Folder** (`Cmd + Shift + K`)
- Delete derived data: `~/Library/Developer/Xcode/DerivedData`
- Rebuild the project

### Capacitor Sync Issues
- Make sure `npm run build` completed successfully
- Check that `dist` folder exists with built files
- Try `npx cap sync ios --force`

### Xcode Issue Navigator (3 issues / warnings)
If you see **3 issues** for the App target:

1. **"Update to recommended settings"**
   - In the **Issue Navigator** (left sidebar, triangle-with-exclamation icon), click this warning.
   - In the detail area, Xcode usually shows a **"Perform Changes"** (or similar) button. Click it to apply the recommended project settings (e.g. Swift version, build system). Safe to apply.

2. **"CDVWebViewProcessPoolFactory" / "WKProcessPool is deprecated" (×2)**
   - These come from **Capacitor’s** iOS web view code, not your project. They are **deprecation warnings** (iOS 15+), not build errors.
   - The app will still build and run. To reduce or remove them later, keep **@capacitor/ios** updated (e.g. `npm update @capacitor/ios` and then `npx cap sync ios`). No change required for TestFlight.

### Common device console messages (usually safe to ignore)
When running on a physical device you may see:
- **"Could not create a sandbox extension for .../App.app"** – Common on device/simulator; often benign. If the app runs normally, no action needed.
- **"WebContent[...] Unable to hide query parameters from script (missing data)"** – WebKit/Capacitor message when loading the in-app web view. Does not affect app behavior.
- **"Failed to send CA Event for app launch measurements"** – Apple internal analytics. Safe to ignore.
- **"Unable to simultaneously satisfy constraints"** (ButtonWrapper / _UIButtonBarButton / width == 0) – Comes from iOS keyboard/input bar or WebView chrome, not your app code. UIKit recovers by breaking a constraint. Safe to ignore.
- **"UIInputViewSetPlacementInvisible" / "RTIInputSystemClient ... session" / "Can only set suggestions for an active session"** – Keyboard/input system messages when the keyboard appears or dismisses in the WebView. Do not affect app behavior.
- **"Result accumulator timeout"** – Internal system message. Safe to ignore.

## Quick Commands Reference

```bash
# Build web app
npm run build

# Sync to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios

# Check Capacitor version
npx cap --version
```

## Next Steps

Once TestFlight is working:
- Test all features on your phone
- Share TestFlight link with beta testers
- Collect feedback
- Fix bugs and iterate
- Prepare for App Store submission
