/* ===== SWIPE / DISCOVER ===== */

let swipeQueue = [];
let currentSwipeUser = null;

window.startSwipe = () => {
    if (!currentUser) return;

    const alreadySwiped = [...currentUser.likes, ...currentUser.passes];

    swipeQueue = users.filter(user => {
        if (user.id === currentUser.id) return false;
        if (alreadySwiped.includes(user.id)) return false;
        if (currentUser.blocked && currentUser.blocked.includes(user.id)) return false;
        if (user.blocked && user.blocked.includes(currentUser.id)) return false;
        if (currentUser.preference !== 'Any' && currentUser.preference !== user.gender) return false;
        if (user.preference !== 'Any' && user.preference !== currentUser.gender) return false;
        return true;
    });

    showPage('swipePage');
    loadNextSwipeCard();
};

function loadNextSwipeCard() {
    const swipeCardContainer = document.getElementById('swipeCard');
    if (swipeQueue.length > 0) {
        currentSwipeUser = swipeQueue.shift();
        swipeCardContainer.innerHTML = `
            <div class="card">
                <h3>${currentSwipeUser.name}, ${currentSwipeUser.age}</h3>
                <p><em>${currentSwipeUser.faculty}</em></p>
                <img src="${currentSwipeUser.photo}" alt="${currentSwipeUser.name}">
                <p>${currentSwipeUser.bio}</p>
                <p><strong>Interests:</strong> ${currentSwipeUser.interests.join(', ')}</p>
                <div class="swipe-card-actions">
                    <button onclick="initiateContact('chat')" title="Chat">💬</button>
                    <button onclick="initiateContact('voice')" title="Voice Call">📞</button>
                    <button onclick="initiateContact('video')" title="Video Call">📹</button>
                </div>
            </div>
        `;
    } else {
        swipeCardContainer.innerHTML = `<div class="card"><p>No more people to show right now. Check back later!</p></div>`;
        currentSwipeUser = null;
    }
}

window.likeUser = () => {
    if (!currentSwipeUser || !currentUser) return;

    currentUser.likes.push(currentSwipeUser.id);

    const otherUser = users.find(u => u.id === currentSwipeUser.id);
    if (otherUser && otherUser.likes.includes(currentUser.id)) {
        alert(`It's a match with ${otherUser.name}!`);
        if (!currentUser.newMatches) currentUser.newMatches = [];
        currentUser.newMatches.push(otherUser.id);
        updateMatchNotification();
    }

    updateAndSaveCurrentUser();
    showToast('Saved ✓');
    loadNextSwipeCard();
};

window.passUser = () => {
    if (!currentSwipeUser || !currentUser) return;
    currentUser.passes.push(currentSwipeUser.id);
    updateAndSaveCurrentUser();
    showToast('Saved ✓');
    loadNextSwipeCard();
};

window.initiateContact = (type) => {
    if (!currentUser || !currentSwipeUser) return;

    const otherUser = users.find(u => u.id === currentSwipeUser.id);
    const isMatch = currentUser.likes.includes(currentSwipeUser.id) &&
                    otherUser && otherUser.likes.includes(currentUser.id);

    if (isMatch) {
        switch (type) {
            case 'chat':  startChat(currentSwipeUser.id); break;
            case 'voice': startVoiceCall(currentSwipeUser.id); break;
            case 'video': startVideoCall(currentSwipeUser.id); break;
        }
    } else {
        alert(`You need to match with ${currentSwipeUser.name} to contact them. Press 'Like' to show your interest!`);
    }
};
