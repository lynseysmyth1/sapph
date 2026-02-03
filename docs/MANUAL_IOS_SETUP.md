# Manual iOS Setup (When Network Issues Occur)

If you're experiencing network connectivity issues with npm, here's how to set up iOS manually:

## Option 1: Fix Network/DNS Issues First

Try these commands to diagnose:

```bash
# Check DNS resolution
nslookup registry.npmjs.org

# Try using Google DNS
sudo networksetup -setdnsservers Wi-Fi 8.8.8.8 8.8.4.4

# Or try Cloudflare DNS
sudo networksetup -setdnsservers Wi-Fi 1.1.1.1 1.0.0.1

# Then try again
npx cap add ios
```

## Option 2: Use Capacitor CLI Directly

If Capacitor CLI is installed globally:

```bash
capacitor add ios
capacitor sync ios
capacitor open ios
```

## Option 3: Manual Project Creation

If network issues persist, you can manually create the iOS project:

### Step 1: Install CocoaPods (if not installed)

```bash
sudo gem install cocoapods
```

### Step 2: Create iOS Project Structure

```bash
# Create ios directory
mkdir -p ios/App/App

# Create basic project structure
cd ios/App
```

### Step 3: Initialize Podfile

Create `ios/App/Podfile`:

```ruby
platform :ios, '13.0'
use_frameworks!

target 'App' do
  capacitor_pods
end
```

### Step 4: Install Pods

```bash
cd ios/App
pod install
```

### Step 5: Copy Web Assets

```bash
# From project root
cp -r dist/* ios/App/App/public/
```

## Option 4: Use Xcode to Create New Project

1. Open Xcode
2. File → New → Project
3. Choose "App" template
4. Configure:
   - Product Name: App
   - Team: Your team
   - Organization Identifier: com.sapph
   - Bundle Identifier: com.sapph.app
   - Interface: Storyboard
   - Language: Swift
5. Save in `ios/App` folder
6. Add Capacitor dependencies via CocoaPods

## Recommended: Fix Network First

The easiest solution is to fix the network/DNS issue. Try:

1. **Restart your network connection**
2. **Check firewall settings**
3. **Try a different network** (mobile hotspot)
4. **Configure npm to use a different registry** (if behind corporate firewall):
   ```bash
   npm config set registry https://registry.npmjs.org/
   ```

Once network is working, simply run:
```bash
npx cap add ios
npx cap sync ios
npx cap open ios
```
