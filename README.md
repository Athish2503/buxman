# 🌌 Pixel Reimburse (Buxman)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

**Pixel Reimburse** (codenamed **Buxman**) is a premium, privacy-first, offline-ready expense reimbursement and personal finance workspace. Designed with a luxury-minimalist aesthetic, it combines local security with native device integrations, enabling you to seamlessly track your expenses, manage vehicle logs, plan multi-day business trips, split bills with friends, capture receipt details via offline OCR, and export invoice-grade PDF reports—all while keeping your data fully under your control.

---

## 🌟 Key Features

### 💵 Core Finance & Reimbursements
*   **Intuitive Transaction Logging:** Easily record expenses with tags, receipts, and split details.
*   **Invoice-Grade PDF Generator:** Generate client-ready reimbursement sheets containing summary stats, itemized breakdowns, and interactive payment QR codes (UPI-compatible).
*   **Digital Receipt Wallet:** A safe local storage container for managing, editing, and keeping track of all your receipt photos.
*   **Split Payments & Reminders:** Keep track of peer-to-peer debts, share bill details, and schedule reminders.

### 🚗 Garage & Travel Modules
*   **Garage Pro (Vehicle Logger):** Log mileage, track vehicle fuel costs, monitor fuel efficiency, odometer readings, and record refueling checkpoints in an interactive journey timeline.
*   **Trips Module:** Manage multi-destination travel itineraries, bundle expenses under individual trips, and see travel spending analytics.

### 🍽️ Dining out & Lifestyle Modules
*   **Dining Dashboard:** Log culinary experiences with rich text notes, track meal budgets and calories, and explore restauarants using interactive maps (powered by Leaflet).
*   **Watchlist (Media Module):** Track movies and TV shows to watch, log recommendations received from friends, sync item metadata automatically via the OMDb API, and rate/export your watched list.

### 🧠 Native Device & Intelligence Features (Offline-First)
*   **Tesseract OCR Scanning:** Extract expense amounts, dates, and vendors from receipt photos completely offline using WebAssembly-based optical character recognition.
*   **Offline NLP Parsing & Voice input:** Dictate expenses in natural language (e.g., *"Spent 450 rupees on dinner yesterday at Starbucks"*) and let the local parser automatically populate the vendor, amount, date, and category.
*   **Real-time Bank SMS & Notification Capturing:** Using a custom native Capacitor plugin (`FinancialNotification`), the app intercepts incoming transactional SMS messages (HDFC, SBI, ICICI, etc.) and pushes real-time native alerts.
*   **Ambient System Overlays:** Displays immediate "draw over other apps" overlays on Android/iOS to let you save or dismiss transactions with a single tap.
*   **Biometric Shield:** Protect your app with fingerprint or facial recognition using Capgo Native Biometrics.
*   **Google Drive Secure Sync:** Authenticate with Google Drive OAuth2 to back up and restore all local storage data securely to your personal cloud.

---

## 📐 Project Architecture

Here is a summary of the project's folder structure and organization:

```text
pixel-reimburse/
├── android/                   # Native Android Studio Project
├── assets/                    # Graphic assets and design resources
├── components.json            # Shadcn UI configuration
├── capacitor.config.ts        # Capacitor App and Plugin configuration
├── src/
│   ├── components/            # Reusable UI Elements & Modules
│   │   ├── dashboard/         # Dashboard Widgets (Analytics, Splits, Trips)
│   │   ├── food/              # Culinary Map, Dining dashboard, Dishes
│   │   ├── media/             # Watchlist Dashboard & Platforms
│   │   ├── ui/                # Core Shadcn UI custom components
│   │   ├── vehicle/           # Fuel logs, Road timelines, and Mileage track
│   │   └── split/             # Bill splits, Contact selectors
│   ├── hooks/                 # Custom React Hooks (Theme, Transaction listeners)
│   ├── lib/                   # Business Logic & Infrastructure services
│   │   ├── ocr-service.ts     # Offline Tesseract WebWorker implementation
│   │   ├── google-drive.ts    # Google OAuth2 file sync client
│   │   ├── pdf-generator.ts   # Invoice & QR Code jsPDF builder
│   │   ├── sms-parser.ts      # Bank transactional parsing rules
│   │   ├── audio.ts           # Speech synthesis & Voice processing
│   │   └── permissions.ts     # Platform permission management helper
│   ├── pages/                 # Main routes (Home Dashboard, Diagnostics)
│   ├── types/                 # Shared TypeScript models
│   ├── App.tsx                # Routing, splash screens, permission guidance
│   └── main.tsx               # Application mount point
```

---

## ⚙️ Requirements & Prerequisites

To run this application locally, ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v18.x or higher) or [Bun](https://bun.sh/)
*   [Git](https://git-scm.com/)
*   For Android Builds: [Android Studio](https://developer.android.com/studio) and Android SDK Command-line Tools
*   For iOS Builds: macOS with [Xcode](https://developer.apple.com/xcode/) and CocoaPods

---

## 🚀 Installation & Local Web Development

Follow these steps to get your local environment running:

### 1. Clone the Repository
```bash
git clone https://github.com/Athish2503/pixel-reimburse.git
cd pixel-reimburse
```

### 2. Install Dependencies
You can use standard `npm` or the ultra-fast `bun` runtime:
```bash
# Using npm
npm install

# Or using Bun
bun install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory. You can copy the template provided:
```bash
cp .env.example .env
```
Open `.env` and fill in the necessary keys:
```env
# OMDb API Key (Required for the Watchlist Movie/TV series details lookup)
# Get a key from https://www.omdbapi.com/
VITE_OMDB_API_KEY=YOUR_OMDB_API_KEY
```

### 4. Run the Development Server
```bash
# Using npm
npm run dev

# Or using Bun
bun dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 📱 Mobile Native Build (Capacitor)

Building the app as a hybrid native application on Android or iOS is simple.

### 1. Compile the Web Assets
Generate the distribution files inside the `dist` folder:
```bash
npm run build
```

### 2. Add Native Platforms (If not already present)
```bash
# Add Android Studio template
npx cap add android

# Add Xcode template (iOS)
npx cap add ios
```

### 3. Generate App Icons & Splash Screens
Capacitor Assets will automatically generate all necessary sizing formats and put them into the respective native folders:
```bash
npx @capacitor/assets generate --iconBackgroundColor '#0A0B10' --splashBackgroundColor '#0A0B10'
```

### 4. Sync Web Assets with Native Projects
Every time you build changes in the `src/` directory, update the native wrapper with:
```bash
npx cap sync
```

### 5. Launch IDEs to Build/Run
```bash
# Open project in Android Studio
npx cap open android

# Open project in Xcode
npx cap open ios
```
Run the project on a physical device or emulator directly inside Android Studio / Xcode.

---

## 🛠️ Diagnostics & Hidden Developer Features

> [!TIP]
> **Accessing the Hidden Diagnostics Panel:**
> 1. Open the application.
> 2. Locate the logo icon at the top of the screen on the dashboard home.
> 3. **Triple-tap** the logo.
> 4. A success haptic buzz will trigger, navigating you to the **Engine Diagnostics Dashboard**.

The Diagnostics Dashboard lets you:
*   Inspect logs generated by the `FinancialNotification` background service.
*   Simulate transactional notifications (e.g., GPay swipe-ins, SMS events) to debug OCR, NLP parsing, and native overlay reactions directly.
*   Check overlay rendering heights, battery optimization toggles, and MIUI compatibility configurations.

---

## 🔐 Privacy & Backup Policy

*   **100% Offline by Default:** No trackers, remote databases, or external analytics servers are bundled. All expenses, receipt images, travel details, and vehicle logs reside inside browser `localStorage` or native `Preferences`.
*   **Google Drive Syncing:** When Google Drive backup is enabled, the app authenticates directly via Google OAuth to standard API folders, transferring a custom sandboxed JSON package named `BuxmanBackup.json`. No third party (including developers) has access to your credentials or files.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
