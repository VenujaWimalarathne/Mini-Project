/* ===== UTILITY & HELPER FUNCTIONS ===== */

/**
 * Returns a consistent chat ID string for two user IDs (sorted to be order-independent).
 */
function getChatId(userId1, userId2) {
    return [userId1, userId2].sort().join('_');
}

/**
 * Formats an ISO timestamp string to HH:MM.
 */
function formatTimestamp(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Returns a human-readable "last seen" string.
 */
function formatLastSeen(isoString) {
    if (!isoString) return 'Offline';
    const date = new Date(isoString);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 300) return '🟢 Online'; // within 5 mins
    if (diffSeconds < 86400) return `Last seen ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return `Last seen ${date.toLocaleDateString()}`;
}

/**
 * Calculates a compatibility percentage between two users based on shared interests.
 */
function calculateCompatibility(user1, user2) {
    const commonInterests = user1.interests.filter(i => user2.interests.includes(i));
    const maxInterests = Math.max(user1.interests.length, user2.interests.length);
    if (maxInterests === 0) return 20;
    const score = (commonInterests.length / maxInterests) * 100;
    return Math.min(100, Math.round(score) + 20);
}

/**
 * Calculates password strength score (0–4).
 */
function checkPasswordStrength(password) {
    let score = 0;
    if (!password) return 0;
    if (password.length > 7) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
}

/**
 * Updates the password strength bar and label in the UI.
 */
function updateStrengthIndicator(strength) {
    const strengthLevels = {
        0: { text: '', width: '0%', color: '#ddd' },
        1: { text: 'Weak', width: '25%', color: '#e74c3c' },
        2: { text: 'Medium', width: '50%', color: '#f39c12' },
        3: { text: 'Strong', width: '75%', color: '#f1c40f' },
        4: { text: 'Very Strong', width: '100%', color: '#2ecc71' }
    };
    const level = strengthLevels[strength] || strengthLevels[0];
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');
    if (strengthBar) {
        strengthBar.style.width = level.width;
        strengthBar.style.backgroundColor = level.color;
    }
    if (strengthText) {
        strengthText.textContent = level.text;
    }
}

/**
 * Shows a brief toast notification at the bottom of the screen.
 */
window.showToast = (msg) => {
    let toast = document.getElementById('csvToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'csvToast';
        toast.style.cssText = `
            position:fixed; bottom:50px; left:50%; transform:translateX(-50%) translateY(20px);
            background:linear-gradient(135deg,#27ae60,#1a8a45);
            color:white; padding:11px 22px; border-radius:50px;
            font-family:'DM Sans',sans-serif; font-size:13.5px; font-weight:600;
            box-shadow:0 8px 24px rgba(39,174,96,0.4);
            z-index:9998; opacity:0; transition:all 0.35s cubic-bezier(0.23,1,0.32,1);
            pointer-events:none; white-space:nowrap;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2800);
};
