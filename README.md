# BoostT1D

**BoostT1D** is an AI-powered diabetes management app designed for people with Type 1 Diabetes. It helps users track glucose, food, insulin, and receive smart therapy suggestions based on real-time data.

## Features
- AI food analyzer (carb estimation from photos + insulin suggestions)
- Therapy assistant (basal, ISF, I:C adjustments with safety checks)
- Nightscout integration (CGM + pump data, time-in-range, trends)
- Manual logging (exercise, snacks, corrections)
- Secure profiles with cross-device sync
- Buddy Network for peer support
- Insulin Access + Legislation dashboard
- Works on Web and iOS (SwiftUI)

## Tech Stack
- **Web**: Next.js, TypeScript, Tailwind CSS, NextAuth.js
- **iOS**: SwiftUI, Keychain for secure token storage
- **Backend**: PostgreSQL, Prisma ORM
- **AI**: Google Generative AI (food analysis, therapy logic)

> Built by a T1D for T1D