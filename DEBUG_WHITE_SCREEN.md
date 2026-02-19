# Debugging White Screen Issue

## Current Status
The app is stuck on a white screen. Console shows iOS system warnings (not JavaScript errors).

## Debugging Steps Added

1. **Inline script test** - Added to `index.html` to verify JavaScript executes
2. **Console logging** - Added extensive logging throughout the app
3. **Error boundaries** - Added React error boundary to catch rendering errors
4. **DOM ready check** - Added check to ensure DOM is ready before rendering

## What to Check in Xcode Console

Look for these logs (in order):
1. `[HTML] Script tag executing` - Confirms inline script runs
2. `[Main] Starting app, platform: native` - Confirms main.jsx loads
3. `[Main] DOM ready state: ...` - Shows DOM state
4. `[Main] Root element exists: true` - Confirms root div exists
5. `[App] Rendering App component` - Confirms App component renders
6. `[AuthContext] useEffect running` - Confirms AuthContext initializes

## Possible Issues

### 1. Remote URL Not Loading
The app is configured to load from `https://sapph-b4f8e.web.app`. If this URL:
- Isn't accessible from the device
- Has CORS issues
- Isn't serving the files correctly
- Has SSL certificate issues

**Test:** Temporarily disable remote URL:
```json
// In capacitor.config.json, comment out or remove:
// "server": {
//   "url": "https://sapph-b4f8e.web.app",
//   "cleartext": false
// }
```

Then rebuild and test locally.

### 2. JavaScript Bundle Not Loading
If the remote URL loads but JavaScript bundles fail:
- Check Network tab in Safari Web Inspector
- Look for 404 errors on `.js` files
- Check if files are being served with correct MIME types

### 3. React/Firebase Initialization Error
If JavaScript loads but React fails:
- Check for import errors
- Check Firebase config
- Look for module resolution errors

## Next Steps

1. **Rebuild in Xcode** and check console for the debug logs
2. **Share console output** - Copy all console logs
3. **Try local loading** - Temporarily disable remote URL to test
4. **Check Safari Web Inspector** - Connect device and inspect WebView

## Quick Test: Load Locally

To test if remote URL is the issue:

1. Edit `capacitor.config.json`:
```json
{
  "appId": "com.sapph.app",
  "appName": "Sapph",
  "webDir": "dist"
  // Remove or comment out the "server" section
}
```

2. Run:
```bash
npm run build && npx cap sync ios
```

3. Rebuild in Xcode

If this works, the issue is with the remote URL loading.
