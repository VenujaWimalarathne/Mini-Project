/* ===== DATA STORAGE — Firebase Firestore ===== */
/*
 * HOW TO CONFIGURE YOUR OWN FIREBASE PROJECT:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (or use an existing one)
 * 3. Click "Add app" → Web  → Register app
 * 4. Copy the firebaseConfig values into FIREBASE_CONFIG below
 * 5. In the console: Firestore Database → Create database → Test mode
 * 6. Save this file and open index.html
 */

// ─── PASTE YOUR FIREBASE CONFIG HERE ────────────────────────────────────────
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA85TxYL55yqlOj1nXE5ZIHC8Gj_lBdpOI",
    authDomain: "uni-flame.firebaseapp.com",
    projectId: "uni-flame",
    storageBucket: "uni-flame.firebasestorage.app",
    messagingSenderId: "994642208889",
    appId: "1:994642208889:web:091bc3e422ad7887010ca8",
    measurementId: "G-ZDBN7MCPKY"
};
// ────────────────────────────────────────────────────────────────────────────

const COLLECTION_USERS = 'users';
const COLLECTION_CHATS = 'chats';
const META_DOC         = 'app_metadata';

// Initialise Firebase (compat SDK loaded via CDN in index.html)
firebase.initializeApp(FIREBASE_CONFIG);
const _db = firebase.firestore();

// ─── DB OBJECT ───────────────────────────────────────────────────────────────
const DB = {

    /* Session state stays in localStorage (not real data, just UI state) */
    _currentUserKey: 'campusMatchCurrentUser',
    _themeKey:       'campusMatchTheme',

    getCurrentUserId()       { return localStorage.getItem(this._currentUserKey); },
    setCurrentUserId(userId) {
        if (userId) localStorage.setItem(this._currentUserKey, userId);
        else        localStorage.removeItem(this._currentUserKey);
    },
    getTheme()      { return localStorage.getItem(this._themeKey); },
    setTheme(theme) { localStorage.setItem(this._themeKey, theme); },

    /* ── USERS ── */
    async getUsers() {
        const snap = await _db.collection(COLLECTION_USERS).get();
        const arr  = [];
        snap.forEach(doc => { if (doc.id !== META_DOC) arr.push(doc.data()); });
        return arr.length > 0 ? arr : null;
    },

    async saveUsers(usersArray) {
        const batch = _db.batch();
        usersArray.forEach(user => {
            const clean = JSON.parse(JSON.stringify(user));
            const ref   = _db.collection(COLLECTION_USERS).doc(String(clean.id));
            batch.set(ref, clean);
        });
        await batch.commit();
    },

    async saveUser(user) {
        const clean = JSON.parse(JSON.stringify(user));
        await _db.collection(COLLECTION_USERS).doc(String(clean.id)).set(clean);
    },

    async deleteUser(userId) {
        await _db.collection(COLLECTION_USERS).doc(String(userId)).delete();
    },

    /* ── CHATS ── */
    async getChats() {
        const snap = await _db.collection(COLLECTION_CHATS).get();
        const obj  = {};
        snap.forEach(doc => { obj[doc.id] = doc.data().messages || []; });
        return obj;
    },

    async saveChats(chatsObject) {
        const batch = _db.batch();
        for (const chatId in chatsObject) {
            const ref = _db.collection(COLLECTION_CHATS).doc(chatId);
            batch.set(ref, { messages: chatsObject[chatId] });
        }
        await batch.commit();
    },

    /* ── VERSION FLAG ── */
    async getVersion()  {
        const doc = await _db.collection(COLLECTION_USERS).doc(META_DOC).get();
        return doc.exists ? doc.data().version : null;
    },
    async setVersion(v) {
        await _db.collection(COLLECTION_USERS).doc(META_DOC).set({ version: v });
    },

    /* ── CSV EXPORT ── */
    CSV_HEADERS: ['id','password','name','email','age','gender','preference','faculty','year','bio','photo','insta','interests','likes','passes','blocked','newMatches'],

    _escapeCSV(value) {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n'))
            return '"' + str.replace(/"/g, '""') + '"';
        return str;
    },

    usersToCSV(usersArray) {
        const rows = [this.CSV_HEADERS.join(',')];
        usersArray.forEach(user => {
            const photoVal = user.photo && user.photo.startsWith('data:') ? '[photo_data]' : (user.photo || '');
            const row = [
                user.id, user.password, user.name, user.email, user.age,
                user.gender, user.preference, user.faculty, user.year,
                user.bio || '', photoVal, user.insta || '',
                (user.interests  || []).join('|'),
                (user.likes      || []).join('|'),
                (user.passes     || []).join('|'),
                (user.blocked    || []).join('|'),
                (user.newMatches || []).join('|')
            ].map(v => this._escapeCSV(v));
            rows.push(row.join(','));
        });
        return rows.join('\n');
    },

    async downloadCSV() {
        const allUsers = await this.getUsers();
        if (!allUsers || !allUsers.length) { alert('No profile data to export yet.'); return; }
        const csv  = this.usersToCSV(allUsers);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'campus_match_profiles.csv';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    }
};
