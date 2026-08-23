# QuickSolv Android Release & Google Play Store Setup Guide

This document provides step-by-step instructions for producing a production-ready **Android App Bundle (.aab)** for Google Play Store release.

---

## 1. Prerequisites
- **Android Studio** installed (latest version recommendation: Ladybug/Koala or higher).
- **Android SDK** API level 34+ installed.
- Valid **Google Play Console Developer Account**.

---

## 2. Generating Android Native Project via Capacitor
Run the following commands in the terminal:
```bash
npm install
npm run build
npx cap add android
npx cap sync
```

---

## 3. Production Release Signing Setup
Create a release keystore (NEVER commit this keystore or password to Git):
```bash
keytool -genkey -v -keystore quicksolv-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias quicksolv-key
```

Add your keystore credentials to `android/key.properties` (added to `.gitignore`):
```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=quicksolv-key
storeFile=../quicksolv-release-key.jks
```

---

## 4. Building the Android App Bundle (.aab)
1. Open `android/` directory in Android Studio.
2. Navigate to **Build > Generate Signed Bundle / APK**.
3. Choose **Android App Bundle (.aab)**.
4. Select `quicksolv-release-key.jks`, enter your key passwords, and select `release`.
5. Locate the generated bundle at:
   `android/app/release/app-release.aab`

---

## 5. Google Play Store Submission Checklist
- [x] Package Identifier: `com.quicksolv.app`
- [x] App Name: `QuickSolv — AI Study Platform`
- [x] All backend requests route securely via HTTPS (`/api/chat`).
- [x] Privacy Policy URL provided in Play Console.
