# iOS Build Instructions for vLocker

> For: Friend with Mac
> App: vLocker - Bank Locker Inventory
> Version: 2.5.2 (Build 4)
> GitHub: https://github.com/checkoutram/lockerapp

---

## Prerequisites (Check Before Starting)

- [ ] Mac with macOS 12+ (Monterey or newer)
- [ ] Xcode 15+ installed (from Mac App Store)
- [ ] Apple Developer account ($99/year) - needed for App Store upload
- [ ] CocoaPods installed: `sudo gem install cocoapods`
- [ ] Node.js 22+ installed: `node --version` should show v22.x
- [ ] Git installed

---

## Step 1: Clone the Repo

```bash
cd ~/Documents
git clone https://github.com/checkoutram/lockerapp.git
cd lockerapp
```

---

## Step 2: Install Dependencies

```bash
npm install
```

If you get a Node version error, install Node 22:
```bash
# Using Homebrew
brew install node@22

# Or using n (if installed)
npm install -g n
n 22
```

---

## Step 3: Build & Sync

```bash
npm run build
npx cap sync ios
```

This copies the web build into the iOS project.

---

## Step 4: Open in Xcode

```bash
npx cap open ios
```

Or manually open:
```
ios/App/App.xcworkspace
```
**NOT** the `.xcodeproj` file - open the `.xcworkspace` file.

---

## Step 5: Xcode Configuration (Important!)

### 5a. Set Team/Signing
1. In Xcode, click on the **App** project (blue icon at top left)
2. Select **TARGETS -> App**
3. Go to **Signing & Capabilities** tab
4. Set **Team** to your Apple Developer team
   - If no team, add your Apple ID: Xcode > Settings > Accounts > Add
5. Set **Bundle Identifier** to: `com.vlocker.app`
   - If this is taken, change to `com.vlocker.app.ios` and tell the developer

### 5b. Verify Version (Should Already Be Set)
- **Version**: 2.5.2
- **Build**: 4

If not:
1. General tab > Identity section
2. Set **Version** to `2.5.2`
3. Set **Build** to `4`

### 5c. Set Deployment Target
- iOS Deployment Target: `15.0` (already set)

---

## Step 6: Build & Test on Simulator

1. Press **Cmd + B** (Build)
2. Select a simulator from the top menu (e.g., iPhone 15 Pro)
3. Press **Cmd + R** (Run)
4. Test the app: setup PIN, add items, take photos, use Face ID if available

---

## Step 7: Build for Real Device (Optional but Recommended)

Before App Store, test on a real iPhone:

1. Connect iPhone to Mac with USB
2. Select your iPhone from the device dropdown (top center)
3. Trust the computer on your iPhone
4. Go to iPhone Settings > Privacy & Security > Developer Mode > ON
5. Restart iPhone, tap "Turn On" when prompted
6. In Xcode, press **Cmd + R**
7. The app will install on your iPhone

---

## Step 8: Archive & Upload to App Store

### 8a. Set App Store Distribution Signing
1. **Signing & Capabilities** tab
2. Make sure **Automatically manage signing** is CHECKED
3. Team is selected
4. Provisioning profile should say "Xcode Managed Profile"

### 8b. Archive
1. Select **Any iOS Device (arm64)** from the device dropdown (top center)
2. Menu: **Product > Archive**
3. Wait for the archive to build (2-5 minutes)
4. Archives window opens automatically

### 8c. Upload
1. Select the archive in the Archives window
2. Click **Distribute App**
3. Select **App Store Connect**
4. Select **Upload**
5. Select **Automatically manage signing**
6. Click **Upload**
7. Enter Apple ID password if prompted
8. Wait for upload (5-10 minutes)

---

## Step 9: App Store Connect Setup

After upload, go to: https://appstoreconnect.apple.com

### 9a. Create App (if not exists)
1. My Apps > Click **+** > New App
2. Platforms: **iOS**
3. Name: **vLocker**
4. Primary Language: **English (US)**
5. Bundle ID: **com.vlocker.app** (or whatever you set in Xcode)
6. SKU: **vlocker-2026**
7. User Access: Full Access

### 9b. Fill App Information
- **Subtitle**: Secure Bank Locker Inventory
- **Category**: Finance > Banking
- **Secondary Category**: Utilities
- **Content Rights**: No

### 9c. Fill App Store Information (Required)

**Description:**
```
vLocker is the secure, offline bank locker inventory app that helps you remember what you keep in your bank locker.

KEY FEATURES:
- Take photos of jewelry, bills, documents, and valuables
- Mark items as "In Locker" or "At Home" with one tap
- PIN + Biometric (Face ID/Touch ID) protection
- Secret Questions for PIN recovery - never lose your data
- Full-screen image viewer for bills and certificates
- Export your data anytime as JSON

PRIVACY FIRST:
- 100% offline - no cloud, no servers, no internet needed
- All data stays on your device only
- No analytics, no tracking, no ads
- Your financial privacy is our foundation

Never forget what's in your bank locker again. Know what you hold.
```

**Keywords:** locker, bank, inventory, safe, jewelry, valuables, secure, offline

**Support URL:** https://github.com/checkoutram/lockerapp/issues
**Privacy Policy URL:** https://github.com/checkoutram/lockerapp/blob/main/PRIVACY_POLICY.md
**Marketing URL:** (leave blank or use same GitHub link)

### 9d. Screenshots (REQUIRED)

You need screenshots for these sizes. Use the iOS Simulator:

| Size | Devices | How to Get |
|------|---------|------------|
| 6.7" (1290x2796) | iPhone 15 Pro Max | Simulator > Device > iPhone 15 Pro Max |
| 6.5" (1284x2778) | iPhone 14 Pro Max | Simulator > Device > iPhone 14 Pro Max |
| 5.5" (1242x2208) | iPhone 8 Plus | Simulator > Device > iPhone 8 Plus |
| 12.9" (2048x2732) | iPad Pro | Simulator > Device > iPad Pro 12.9" |

**To take screenshots in Simulator:**
1. Run app in simulator
2. Menu: **File > New Screen Recording** (or press **Cmd + S** for screenshot)
3. Save to Desktop, then drag into App Store Connect

**Tip:** Use the same screens for all sizes - just use the simulator with the right device size.

### 9e. App Review Information

**Contact Information:**
- Name: (Your name)
- Email: (Your email)
- Phone: (Your phone)

**Demo Account:**
- Not needed (app is self-contained, no login)

**Notes for Reviewer:**
```
vLocker is a 100% offline bank locker inventory app. All data is stored locally on the user's device. No internet connection is required. No user accounts or login. The app uses:
- Camera permission (for taking photos of locker items)
- Photo Library permission (for saving/loading photos)
- Face ID/Touch ID (optional, for biometric unlock)

All data stays on the device. No cloud services. No analytics. No third-party SDKs.
```

**Attachment:** Not needed

---

## Step 10: Submit for Review

1. Go to **App Store Connect > vLocker > App Store**
2. Click **Add for Review** (or **Submit for Review**)
3. Answer export compliance:
   - Does your app use encryption? **NO** (data stays local, no network transmission)
4. Submit!

**Review time:** 1-2 days for updates, 1-7 days for new apps.

---

## Troubleshooting

### "Build failed - Signing error"
- Make sure your Apple Developer account is active ($99 paid)
- Make sure Team is selected in Signing & Capabilities
- Try: Product > Clean Build Folder (Cmd+Shift+K), then rebuild

### "No such module 'Capacitor'"
- Make sure you opened the `.xcworkspace` file, not `.xcodeproj`
- Run `npx cap sync ios` again
- Close Xcode, reopen workspace

### "App runs but no camera"
- Check Info.plist has `NSCameraUsageDescription` (already set)
- On simulator, camera won't work (use a real device or use photo library)

### "Build number already used"
- Increment **Build** number in Xcode (General tab)
- Try Build 5, 6, etc.

### "Bundle ID not available"
- Someone else is using `com.vlocker.app`
- Change to `com.vlocker.app.ios` or `com.yourname.vlocker`
- Update the Bundle ID in Xcode AND in App Store Connect

---

## Quick Checklist Before Submitting

- [ ] App builds successfully (Cmd + B)
- [ ] App runs on simulator (Cmd + R)
- [ ] App runs on real device (if available)
- [ ] Version is 2.5.2, Build is 4
- [ ] Bundle ID matches App Store Connect
- [ ] Team/Signing is configured
- [ ] Archive created successfully (Product > Archive)
- [ ] Upload to App Store Connect succeeded
- [ ] Screenshots uploaded for all sizes
- [ ] Description, keywords, privacy policy filled
- [ ] App Review contact info filled
- [ ] Submitted for review!

---

## Questions?

If anything goes wrong, take a screenshot of the error and send it. The most common issues are signing/team configuration and wrong Xcode workspace file.

**Good luck!** 🚀
