# 🔥 Campus Match — Firebase Setup Guide

Your project now uses **Firebase Firestore** as its online database.
All users, matches, and chats are stored in the cloud — shared across all devices and browsers.

---

## Step 1 — Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → give it a name (e.g. `campus-match`) → Continue
3. Disable Google Analytics if you don't need it → **Create project**

---

## Step 2 — Register a Web App

1. In your project dashboard, click the **`</>`** (Web) icon
2. Enter an app nickname (e.g. `campus-match-web`) → **Register app**
3. Firebase shows you a `firebaseConfig` object like:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "campus-match-xxxxx.firebaseapp.com",
  projectId: "campus-match-xxxxx",
  storageBucket: "campus-match-xxxxx.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
```

4. Copy these values.

---

## Step 3 — Paste into db.js

Open **`js/db.js`** and replace the `FIREBASE_CONFIG` at the top:

```js
const FIREBASE_CONFIG = {
    apiKey:            "YOUR_API_KEY_HERE",
    authDomain:        "YOUR_PROJECT.firebaseapp.com",
    projectId:         "YOUR_PROJECT_ID",
    storageBucket:     "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId:             "YOUR_APP_ID"
};
```

---

## Step 4 — Enable Firestore

1. In Firebase Console → **Firestore Database** → **Create database**
2. Choose **"Start in test mode"** (allows all reads/writes — fine for development)
3. Select a region close to Sri Lanka: `asia-south1 (Mumbai)` → **Enable**

---

## Step 5 — Open the App

Open `index.html` in your browser. On first load it will:
- Connect to Firestore
- Seed the demo users automatically
- Show the login page

---

## Collections Created in Firestore

| Collection | What's stored |
|------------|---------------|
| `users`    | One document per user (all profile data, likes, passes, matches) |
| `chats`    | One document per chat thread (array of messages) |

---

## Demo Logins

| Name              | Email               | Password |
|-------------------|---------------------|----------|
| Rashmika Mandanna | rashmika@campus.lk  | pass123  |
| Shah Rukh Khan    | srk@campus.lk       | pass123  |
| Emma Watson       | emma@campus.lk      | pass123  |

