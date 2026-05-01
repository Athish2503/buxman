# Pixel Reimburse

## Overview
Pixel Reimburse is a premium, mobile-first expense reimbursement workspace. Designed with a luxury-minimalist aesthetic, it provides a seamless experience for tracking expenses, generating invoice-grade PDF reports, and monitoring your budget—all while keeping your data private and stored securely on your device.

## Features
- **Premium Interface:** Sleek, modern design with a deep charcoal theme and neon electric violet & cyan accents.
- **Native Experience:** Built for Capacitor, delivering haptic feedback, responsive gestures, and safe-area adjustments for mobile devices.
- **Invoice-grade PDFs:** Easily generate high-quality reimbursement reports.
- **Privacy First:** All your data remains offline and is stored on your device.

## Technologies Used
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Capacitor (Mobile integration)

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

## Mobile Build

To build the native mobile applications:

1. **Build the web assets:**
   ```bash
   npm run build
   ```

2. **Add Android/iOS platforms (if not already added):**
   ```bash
   npx cap add android
   npx cap add ios
   ```

3. **Generate App Icons & Splash Screens:**
   ```bash
   npx @capacitor/assets generate --iconBackgroundColor '#121215' --splashBackgroundColor '#121215'
   ```

4. **Sync with native projects:**
   ```bash
   npx cap sync
   ```
