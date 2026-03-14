/* ===== CAMPUS MATCH — MAIN APP (Firebase edition) ===== */

// --- GLOBAL STATE ---
let currentUser = null;
let users = [];
let pendingUser = null;

// --- DOM READY ---
document.addEventListener('DOMContentLoaded', () => {

    const body             = document.body;
    const modeToggleButton = document.getElementById('modeToggle');
    const allPages         = document.querySelectorAll('.container');
    const userNameSpan     = document.getElementById('userName');

    // --- NAVIGATION ---
    window.showPage = (pageId) => {
        allPages.forEach(page => page.classList.remove('active'));
        const newPage = document.getElementById(pageId);
        if (newPage) {
            newPage.classList.add('active');
            body.style.background = window.getComputedStyle(newPage).background;
        }
        if (pageId === 'profilePage' && currentUser) {
            document.getElementById('bio').value = currentUser.bio || '';
            document.getElementById('insta').value = currentUser.insta || '';
            document.getElementById('facebook').value = currentUser.facebook || '';
            const wa = (currentUser.whatsapp || '').replace('+94', '');
            document.getElementById('whatsapp').value = wa;
            document.querySelectorAll('.interests-grid input[type="checkbox"]').forEach(cb => {
                cb.checked = (currentUser.interests || []).includes(cb.value);
            });
        }
    };

    // --- SHARED HELPER: save current user back to users array + DB ---
    window.updateAndSaveCurrentUser = () => {
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = currentUser;
            // Save only the changed user document (efficient single-doc write)
            DB.saveUser(currentUser).catch(err => console.error('saveUser error:', err));
        }
    };

    // --- NOTIFICATION BADGE ---
    window.updateMatchNotification = () => {
        const badge = document.getElementById('matchNotificationBadge');
        if (!currentUser || !currentUser.newMatches || currentUser.newMatches.length === 0) {
            badge.style.display = 'none';
            return;
        }
        const count = currentUser.newMatches.length;
        badge.textContent   = count > 9 ? '9+' : count;
        badge.style.display = 'flex';
    };

    // --- DARK MODE TOGGLE ---
    modeToggleButton.addEventListener('click', () => {
        body.classList.toggle('dark');
        if (body.classList.contains('dark')) {
            modeToggleButton.textContent = '☀️ Light';
            DB.setTheme('dark');
        } else {
            modeToggleButton.textContent = '🌙 Dark';
            DB.setTheme('light');
        }
        const activePage = document.querySelector('.container.active');
        if (activePage) body.style.background = window.getComputedStyle(activePage).background;
    });

    // --- PASSWORD STRENGTH (Signup page) ---
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            updateStrengthIndicator(checkPasswordStrength(passwordInput.value));
        });
    }

    // --- PASSWORD TOGGLE ---
    window.togglePassword = (icon) => {
        const input = icon.previousElementSibling;
        if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = '🙈';
        } else {
            input.type = 'password';
            icon.textContent = '👁️';
        }
    };

    // CSV import removed — Firebase is the canonical store now
    // (keep the hidden input in HTML harmless; function is a no-op)
    window.handleCSVImport = () => {
        alert('CSV import is disabled — Firebase is your live database now!');
    };

    // --- LOADING OVERLAY helpers ---
    function showLoading(msg) {
        let overlay = document.getElementById('_fbLoading');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = '_fbLoading';
            overlay.style.cssText = [
                'position:fixed;inset:0;background:rgba(0,0,0,.55);',
                'display:flex;align-items:center;justify-content:center;',
                'z-index:99999;flex-direction:column;gap:14px;'
            ].join('');
            overlay.innerHTML = `
                <div style="width:48px;height:48px;border:5px solid #fff3;
                            border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite;"></div>
                <p id="_fbMsg" style="color:#fff;font-size:1.1rem;font-weight:600;margin:0"></p>
                <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
            document.body.appendChild(overlay);
        }
        document.getElementById('_fbMsg').textContent = msg || 'Connecting to database…';
        overlay.style.display = 'flex';
    }
    function hideLoading() {
        const overlay = document.getElementById('_fbLoading');
        if (overlay) overlay.style.display = 'none';
    }

    // --- INITIALIZATION (async — waits for Firestore) ---
    async function initializeApp() {
        showLoading('Connecting to database…');
        try {
            const version     = await DB.getVersion();
            const storedUsers = await DB.getUsers();

            if (storedUsers && version === 'v4') {
                users = storedUsers;
            } else {
                // First run — seed demo users into Firestore
                showLoading('Seeding demo data…');
                users = DEMO_USERS;
                await DB.saveUsers(users);
                await DB.setVersion('v4');
            }

            // Restore logged-in session
            const currentUserId = DB.getCurrentUserId();
            if (currentUserId) {
                currentUser = users.find(u => u.id === currentUserId);
                if (currentUser) {
                    updateMatchNotification();
                    currentUser.lastSeen = new Date().toISOString();
                    updateAndSaveCurrentUser();
                    userNameSpan.textContent = currentUser.name;
                    hideLoading();
                    showPage('dashboardPage');
                } else {
                    hideLoading();
                    showPage('loginPage');
                }
            } else {
                hideLoading();
                showPage('loginPage');
            }
        } 
        catch (err) {
            hideLoading();
            console.error('Firebase init error:', err);
            // document.body.innerHTML = `
            //     <div style="display:flex;align-items:center;justify-content:center;
            //                 height:100vh;flex-direction:column;gap:16px;font-family:sans-serif;padding:24px;text-align:center;">
            //         <h2 style="color:#e53e3e">⚠️ Firebase Not Configured</h2>
            //         <p style="max-width:480px;color:#555">
            //             Please open <code>js/db.js</code> and replace the placeholder values in
            //             <strong>FIREBASE_CONFIG</strong> with your real Firebase project credentials.<br><br>
            //             See the comment at the top of that file for step-by-step instructions.
            //         </p>
            //         <a href="https://console.firebase.google.com" target="_blank"
            //            style="background:#ff6b6b;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;">
            //             Open Firebase Console →
            //         </a>
            //     </div>`;
        }

        // Restore dark mode
        if (DB.getTheme() === 'dark') {
            body.classList.add('dark');
            modeToggleButton.textContent = '☀️ Light';
        }

        const activePage = document.querySelector('.container.active');
        if (activePage) body.style.background = window.getComputedStyle(activePage).background;
    }

    // --- BOOT ---
    initializeApp();
});
