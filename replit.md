# CricketA7 — Live Cricket Scoring App

## Overview
A React Native / Expo web application for live cricket scoring and match management. Built with Expo Router for file-based routing and Firebase Firestore for real-time data.

## Architecture

- **Framework**: React Native with Expo SDK 54, running as a web app via React Native Web
- **Routing**: Expo Router (file-based, similar to Next.js)
- **Database**: Firebase Firestore (real-time subscriptions)
- **Language**: TypeScript throughout

## Project Structure

```
app/
  _layout.tsx          # Root layout — wraps providers (Auth, Match, Toast)
  index.tsx            # Redirects to HomeScreen
  (tabs)/
    _layout.tsx        # Tab navigation layout
    HomeScreen.tsx     # Live/upcoming/completed matches dashboard
    ScoringScreen.tsx  # Ball-by-ball scoring interface
    ManageScreen.tsx   # Match/tournament management
    CommentaryScreen.tsx # Real-time ball commentary feed

components/
  BottomSheet.tsx      # Slide-up modal component
  UI.tsx               # Shared UI components (Btn, Badge, FormField, etc.)

constants/
  theme.ts             # Colors, spacing, radius, shadow tokens

context/
  AuthContext.tsx      # User authentication & role management
  MatchContext.tsx     # Active match state & Firebase subscriptions
  ToastContext.tsx     # Toast notification system

services/
  firebase.ts          # All Firebase operations (match CRUD, ball recording, etc.)

types/
  index.ts             # TypeScript interfaces (Match, Innings, Player, etc.)
```

## Key Features

- Live match scoring with ball-by-ball recording
- Tournament and quick-match setup
- Real-time commentary feed
- Role-based access (developer/organizer/captain/viewer)
- Cricket rules: wides, no-balls, free hits, DRS

## Running the App

The app runs on port 5000 using Expo's Metro web bundler:
```
npx expo start --web --port 5000 --localhost
```

## Firebase Configuration

Set these environment variables for Firebase connectivity:
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

Without these, the app runs in offline mode showing empty state.

## Deployment

Build with `npx expo export --platform web` → outputs to `dist/`. Deploy as a static site.
