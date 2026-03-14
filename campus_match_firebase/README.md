# Campus Match — Firebase Edition

A campus dating/matching app with **Firebase Firestore** as the live online database.
All users, matches, and chats are stored in the cloud — shared across all devices and browsers in real time.

## 📁 File Structure

```
campus_match_firebase/
├── index.html                ← Main HTML
├── FIREBASE_SETUP.md         ← ⭐ Start here — step-by-step Firebase setup
├── css/
│   └── styles.css
└── js/
    ├── db.js                 ← 🔥 Firebase Firestore layer (replace FIREBASE_CONFIG here)
    ├── data.js               ← Demo user seed data
    ├── utils.js              ← Helpers
    ├── auth.js               ← Login / signup / settings (async)
    ├── profile.js            ← Profile setup
    ├── swipe.js              ← Discover / swipe
    ├── matches.js            ← Match tabs & filtering
    ├── chat.js               ← Messaging & calls (async)
    └── app.js                ← App init (async, loads Firestore on boot)
```

## 🚀 Quick Start

1. **Read `FIREBASE_SETUP.md`** and follow the 5 steps to create your Firebase project
2. **Open `js/db.js`** and paste your `firebaseConfig` values into `FIREBASE_CONFIG`
3. **Open `index.html`** in any modern browser — no build step needed

## 🔑 Demo Logins

| Name              | Email               | Password |
|-------------------|---------------------|----------|
| Rashmika Mandanna | rashmika@campus.lk  | pass123  |
| Shah Rukh Khan    | srk@campus.lk       | pass123  |
| Emma Watson       | emma@campus.lk      | pass123  |

## 📦 Script Load Order

1. Firebase App SDK (CDN)
2. Firebase Firestore SDK (CDN)
3. `db.js` — Firestore layer
4. `data.js` → `utils.js` → `auth.js` → `profile.js` → `swipe.js` → `matches.js` → `chat.js` → `app.js`
