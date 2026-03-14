/* ===== MATCHES & PROFILES ===== */

let currentMatchTab = 'matches'; // 'matches' | 'all'

window.showMatches = () => {
    if (!currentUser) return;

    // Clear new match notifications
    if (currentUser.newMatches && currentUser.newMatches.length > 0) {
        currentUser.newMatches = [];
        updateAndSaveCurrentUser();
        updateMatchNotification();
    }

    showPage('matchPage');

    // Reset to Matches tab
    currentMatchTab = 'matches';
    document.getElementById('tabMatches').style.cssText = '';
    document.getElementById('tabAll').style.cssText =
        'background:transparent;border:1.5px solid rgba(232,99,122,0.4);color:var(--rose);box-shadow:none;';
    document.getElementById('matchFilters').style.display = 'none';
    document.getElementById('matchSearchInput').value = '';
    filterMatches();
};

window.switchMatchTab = (tab) => {
    currentMatchTab = tab;
    const tabMatches = document.getElementById('tabMatches');
    const tabAll     = document.getElementById('tabAll');
    const filters    = document.getElementById('matchFilters');
    const inactiveStyle = 'background:transparent;border:1.5px solid rgba(232,99,122,0.4);color:var(--rose);box-shadow:none;';

    if (tab === 'matches') {
        tabMatches.style.cssText = '';
        tabAll.style.cssText     = inactiveStyle;
        filters.style.display    = 'none';
    } else {
        tabAll.style.cssText     = '';
        tabMatches.style.cssText = inactiveStyle;
        filters.style.display    = 'flex';
        populateFacultyFilter();
    }
    document.getElementById('matchSearchInput').value = '';
    filterMatches();
};

function populateFacultyFilter() {
    const sel = document.getElementById('filterFaculty');
    const faculties = [...new Set(users.map(u => u.faculty).filter(Boolean))].sort();
    sel.innerHTML = '<option value="">Any Faculty</option>';
    faculties.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f; opt.textContent = f;
        sel.appendChild(opt);
    });
}

window.filterMatches = () => {
    const term    = (document.getElementById('matchSearchInput').value || '').toLowerCase().trim();
    const gender  = (document.getElementById('filterGender')  || {}).value || '';
    const faculty = (document.getElementById('filterFaculty') || {}).value || '';
    const year    = (document.getElementById('filterYear')    || {}).value || '';
    const isAllTab = currentMatchTab === 'all';

    let pool;
    if (isAllTab) {
        pool = users.filter(u => {
            if (u.id === currentUser.id) return false;
            if (currentUser.blocked && currentUser.blocked.includes(u.id)) return false;
            if (u.blocked && u.blocked.includes(currentUser.id)) return false;
            return true;
        });
    } else {
        const myInterests = currentUser.interests || [];
        pool = users.filter(u => {
            if (u.id === currentUser.id) return false;
            if (currentUser.blocked && currentUser.blocked.includes(u.id)) return false;
            if (u.blocked && u.blocked.includes(currentUser.id)) return false;
            const commonCount = myInterests.filter(i => (u.interests || []).includes(i)).length;
            return commonCount >= 3;
        });
    }

    if (term) {
        pool = pool.filter(u => {
            const haystack = [u.name, u.faculty, u.bio, u.year, ...(u.interests || [])].join(' ').toLowerCase();
            return haystack.includes(term);
        });
    }

    if (gender)  pool = pool.filter(u => u.gender  === gender);
    if (faculty) pool = pool.filter(u => u.faculty === faculty);
    if (year)    pool = pool.filter(u => String(u.year) === String(year));

    // Sort: mutual matches first, then by compatibility
    pool.sort((a, b) => {
        const aMatch = currentUser.likes.includes(a.id) && a.likes && a.likes.includes(currentUser.id);
        const bMatch = currentUser.likes.includes(b.id) && b.likes && b.likes.includes(currentUser.id);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return calculateCompatibility(currentUser, b) - calculateCompatibility(currentUser, a);
    });

    renderMatches(pool, isAllTab);
};

function renderMatches(profilesToRender, isAllTab) {
    const matchListContainer = document.getElementById('matchList');
    matchListContainer.innerHTML = '';
    const countEl = document.getElementById('matchResultCount');

    if (profilesToRender.length === 0) {
        matchListContainer.innerHTML = `
            <div style="text-align:center;padding:30px 10px;opacity:0.6;">
                <div style="font-size:40px;margin-bottom:10px;">${isAllTab ? '🔍' : '💔'}</div>
                <p>${isAllTab
                    ? 'No profiles match your search.'
                    : 'No matches yet. Complete your profile with interests to find people who share at least 3 of them!'
                }</p>
            </div>`;
        countEl.textContent = '';
        return;
    }

    countEl.textContent = profilesToRender.length + ' profile' + (profilesToRender.length !== 1 ? 's' : '') + ' found';

    profilesToRender.forEach(profile => {
        const compat       = calculateCompatibility(currentUser, profile);
        const lastSeen     = formatLastSeen(profile.lastSeen);
        const isMutualMatch = currentUser.likes.includes(profile.id) && profile.likes && profile.likes.includes(currentUser.id);
        const iLiked        = currentUser.likes.includes(profile.id);
        const unreadCount   = (currentUser.unreadMessages && currentUser.unreadMessages[profile.id]) || 0;

        const unreadBadge = unreadCount > 0
            ? `<span class="chat-notification-badge">${unreadCount > 9 ? '9+' : unreadCount}</span>` : '';

        const matchBadge = isMutualMatch
            ? `<span style="display:inline-block;background:linear-gradient(135deg,var(--rose),var(--rose-deep));color:white;font-size:11px;font-weight:700;padding:3px 10px;border-radius:50px;margin-bottom:6px;letter-spacing:0.05em;">💞 MATCHED</span>` : '';

        const likeStatus = !isMutualMatch && iLiked
            ? `<span style="display:inline-block;background:rgba(232,99,122,0.12);color:var(--rose);font-size:11px;font-weight:600;padding:3px 10px;border-radius:50px;margin-bottom:6px;">❤️ You liked</span>` : '';

        const interestTags = (profile.interests || []).map(i =>
            `<span style="display:inline-block;background:rgba(232,99,122,0.10);color:var(--rose-deep);font-size:11px;padding:3px 9px;border-radius:50px;margin:2px;font-weight:500;">${i}</span>`
        ).join('');

        // Connecting details – only visible to mutual matches
        let connectingDetails = '';
        if (isMutualMatch) {
            const instaLink = profile.insta
                ? `<a href="https://instagram.com/${profile.insta.replace('@','')}" target="_blank" style="display:flex;align-items:center;gap:6px;color:var(--rose-deep);font-size:12px;font-weight:500;text-decoration:none;padding:3px 0;"><span style="font-size:15px;">📸</span> @${profile.insta.replace('@','')}</a>` : '';
            const fbLink = profile.facebook
                ? `<a href="${profile.facebook.startsWith('http') ? profile.facebook : 'https://facebook.com/' + profile.facebook}" target="_blank" style="display:flex;align-items:center;gap:6px;color:var(--rose-deep);font-size:12px;font-weight:500;text-decoration:none;padding:3px 0;"><span style="font-size:15px;">💙</span> ${profile.facebook}</a>` : '';
            const waLink = profile.whatsapp
                ? `<a href="https://wa.me/${profile.whatsapp.replace('+','')}" target="_blank" style="display:flex;align-items:center;gap:6px;color:var(--rose-deep);font-size:12px;font-weight:500;text-decoration:none;padding:3px 0;"><span style="font-size:15px;">💬</span> ${profile.whatsapp}</a>` : '';

            connectingDetails = (instaLink || fbLink || waLink)
                ? `<div style="margin:10px 0 6px;padding:10px 12px;background:rgba(232,99,122,0.07);border-radius:12px;border:1px solid rgba(232,99,122,0.18);"><div style="font-size:11px;font-weight:700;color:var(--rose-deep);letter-spacing:0.06em;margin-bottom:6px;">🔗 CONNECTING DETAILS</div>${instaLink}${fbLink}${waLink}</div>`
                : `<div style="margin:10px 0 6px;padding:8px 12px;background:rgba(232,99,122,0.05);border-radius:12px;border:1px dashed rgba(232,99,122,0.2);font-size:12px;opacity:0.6;text-align:center;">💞 Mutual match — no contact details added yet.</div>`;
        }

        const actionButtons = isMutualMatch
            ? `
                <div class="match-tabs">
                    <button class="match-tab-button active" onclick="openMatchTab(event, 'message-tab-${profile.id}', this)">Message</button>
                    <button class="match-tab-button" onclick="openMatchTab(event, 'voice-tab-${profile.id}', this)">Voice</button>
                    <button class="match-tab-button" onclick="openMatchTab(event, 'video-tab-${profile.id}', this)">Video</button>
                </div>
                <div id="message-tab-${profile.id}" class="match-tab-content" style="display:block;">
                    <button onclick="startChat('${profile.id}')">💬 Chat with ${profile.name}</button>
                </div>
                <div id="voice-tab-${profile.id}" class="match-tab-content" style="display:none;">
                    <button onclick="startVoiceCall('${profile.id}')">📞 Voice Call ${profile.name}</button>
                </div>
                <div id="video-tab-${profile.id}" class="match-tab-content" style="display:none;">
                    <button onclick="startVideoCall('${profile.id}')">📹 Video Call ${profile.name}</button>
                </div>
            `
            : (!iLiked
                ? `<button onclick="quickLike('${profile.id}')" style="flex:1;margin:0;padding:9px;font-size:13px;background:rgba(232,99,122,0.12);border:1.5px solid rgba(232,99,122,0.3);color:var(--rose);box-shadow:none;">❤️ Like</button>`
                : '');

        matchListContainer.innerHTML += `
            <div class="card" style="text-align:left;">
                ${unreadBadge}
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                    <img src="${profile.photo || 'https://i.pravatar.cc/80'}" alt="${profile.name}"
                        style="width:58px;height:58px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid rgba(232,99,122,0.3);margin:0;">
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;">
                            <strong style="font-family:'Cormorant Garamond',serif;font-size:1.15rem;color:var(--rose-deep);">${profile.name}</strong>
                            <span style="font-size:12px;opacity:0.65;">${profile.age ? profile.age + ' yrs' : ''}</span>
                        </div>
                        <div style="font-size:12px;opacity:0.7;margin-top:2px;">${profile.faculty || ''}${profile.year ? ' · Year ' + profile.year : ''}</div>
                        <div style="font-size:11px;margin-top:2px;">${lastSeen}</div>
                    </div>
                </div>
                <div style="margin-bottom:6px;">${matchBadge}${likeStatus}</div>
                ${profile.bio ? `<p style="font-size:13px;margin-bottom:8px;line-height:1.5;">${profile.bio}</p>` : ''}
                ${interestTags ? `<div style="margin-bottom:10px;">${interestTags}</div>` : ''}
                <div style="margin-bottom:8px;">
                    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                        <span style="opacity:0.65;">Compatibility</span>
                        <strong style="color:var(--rose-deep);">${compat}%</strong>
                    </div>
                    <div class="bar"><div class="fill" style="width:${compat}%;"></div></div>
                </div>
                ${connectingDetails}
                <div style="margin-top:12px;">
                    ${actionButtons}
                </div>
            </div>
        `;
    });
}

window.quickLike = (userId) => {
    if (!currentUser) return;
    if (!currentUser.likes.includes(userId)) {
        currentUser.likes.push(userId);
        const otherUser = users.find(u => u.id === userId);
        if (otherUser && otherUser.likes && otherUser.likes.includes(currentUser.id)) {
            showToast('🎉 It\'s a match with ' + otherUser.name + '!');
            if (!currentUser.newMatches) currentUser.newMatches = [];
            currentUser.newMatches.push(userId);
            updateMatchNotification();
        } else {
            showToast('❤️ Liked!');
        }
        updateAndSaveCurrentUser();
        filterMatches();
    }
};

window.openMatchTab = (evt, tabName, elmnt) => {
    const card = elmnt.closest('.card');
    card.querySelectorAll('.match-tab-content').forEach(tc => tc.style.display = 'none');
    card.querySelectorAll('.match-tab-button').forEach(tb => tb.classList.remove('active'));
    card.querySelector('#' + tabName).style.display = 'block';
    elmnt.classList.add('active');
};
