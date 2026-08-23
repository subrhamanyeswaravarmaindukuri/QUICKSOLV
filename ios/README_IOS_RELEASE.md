# QuickSolv iOS Release & Apple App Store Setup Guide

This document provides step-by-step instructions for producing a production-ready **iOS App Archive** for Apple App Store release.

---

## 1. Prerequisites
- **macOS** with **Xcode 15+** installed.
- Valid **Apple Developer Program Account** ($99/year).
- Cocoapods installed (`sudo gem install cocoapods`).

---

## 2. Generating iOS Native Project via Capacitor
Run the following commands in terminal:
```bash
npm install
npm run build
npx cap add ios
npx cap sync
```

---

## 3. Configuring Xcode & App Store Connect
1. Open `ios/App/App.xcworkspace` in Xcode.
2. Select the `App` target:
   - **Bundle Identifier**: `com.quicksolv.app`
   - **Signing & Capabilities**: Select your Apple Team and check *Automatically manage signing*.
3. Verify Privacy Descriptions in `Info.plist`:
   - `NSCameraUsageDescription`: *"QuickSolv uses your camera to scan textbook equations and handwritten study notes."*
   - `NSPhotoLibraryUsageDescription`: *"QuickSolv accesses your photos so you can upload study images and problem screenshots."*

---

## 4. Archiving and Submitting to App Store
1. In Xcode, set target device to **Any iOS Device (arm64)**.
2. Go to **Product > Archive**.
3. Once Archive completes, click **Distribute App > App Store Connect**.
4. Upload to TestFlight / Production.
