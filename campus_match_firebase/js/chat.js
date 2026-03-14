/* ===== CHAT & CALLS (Firebase edition) ===== */

let currentChatUser = null;

function createMessageHTML(message) {
    if (!currentUser || !currentChatUser) return '';
    const isCurrentUser = message.senderId === currentUser.id;
    const messageClass  = isCurrentUser ? 'sent' : 'received';
    const time = formatTimestamp(message.timestamp);
    return `
        <div class="message-container ${messageClass}">
            <div class="message-bubble">
                <p class="message-text">${message.text}</p>
                <span class="message-time">${time}</span>
            </div>
        </div>
    `;
}

window.startChat = async (userId) => {
    currentChatUser = users.find(u => u.id === userId);
    if (!currentChatUser || !currentUser) return;

    if (currentUser.unreadMessages && currentUser.unreadMessages[userId]) {
        delete currentUser.unreadMessages[userId];
        updateAndSaveCurrentUser();
    }

    document.getElementById('chatPartnerName').textContent = currentChatUser.name;
    document.getElementById('callButtons').innerHTML = `
        <button onclick="startVoiceCall('${currentChatUser.id}')" title="Voice Call">📞</button>
        <button onclick="startVideoCall('${currentChatUser.id}')" title="Video Call">📹</button>
        <button class="block-btn" onclick="blockUser('${currentChatUser.id}')" title="Block User">🚫</button>
    `;

    const chatBox = document.getElementById('chatBox');
    const typingIndicator = document.getElementById('typingIndicator');
    chatBox.innerHTML = '<em style="opacity:.5">Loading messages…</em>';
    typingIndicator.style.display = 'none';

    const chatId = getChatId(currentUser.id, currentChatUser.id);
    const allChats = await DB.getChats();
    const chatHistory = allChats[chatId] || [];

    chatBox.innerHTML = '';
    if (chatHistory.length === 0) {
        chatBox.innerHTML = `<p><em>This is the beginning of your conversation with ${currentChatUser.name}.</em></p>`;
    } else {
        chatHistory.forEach(message => { chatBox.innerHTML += createMessageHTML(message); });
    }

    chatBox.scrollTop = chatBox.scrollHeight;
    showPage('chatPage');
};

window.sendMessage = async () => {
    const chatInput = document.getElementById('chatInput');
    const typingIndicator = document.getElementById('typingIndicator');
    const messageText = chatInput.value.trim();

    if (messageText && currentUser && currentChatUser) {
        const chatId = getChatId(currentUser.id, currentChatUser.id);
        const allChats = await DB.getChats();
        if (!allChats[chatId]) allChats[chatId] = [];

        const myMessage = {
            senderId:  currentUser.id,
            text:      messageText,
            timestamp: new Date().toISOString()
        };
        allChats[chatId].push(myMessage);
        await DB.saveChats(allChats);

        const chatBox = document.getElementById('chatBox');
        if (chatBox.querySelector('em')) chatBox.innerHTML = '';
        chatBox.insertAdjacentHTML('beforeend', createMessageHTML(myMessage));
        chatInput.value = '';
        chatBox.scrollTop = chatBox.scrollHeight;

        typingIndicator.style.display = 'block';
        typingIndicator.textContent = `${currentChatUser.name} is typing...`;
        setTimeout(() => { typingIndicator.style.display = 'none'; }, 800);
    }
};

window.startVoiceCall = (userId) => {
    const partner = users.find(u => u.id === userId);
    if (!partner) return;
    const overlay = document.getElementById('callOverlay');
    document.getElementById('callPartnerAvatar').src = partner.photo;
    document.getElementById('callStatus').textContent = 'Voice Calling...';
    document.getElementById('callPartnerNameOverlay').textContent = partner.name;
    overlay.style.display = 'flex';
};

window.startVideoCall = (userId) => {
    const partner = users.find(u => u.id === userId);
    if (!partner) return;
    const overlay = document.getElementById('callOverlay');
    document.getElementById('callPartnerAvatar').src = partner.photo;
    document.getElementById('callStatus').textContent = 'Video Calling...';
    document.getElementById('callPartnerNameOverlay').textContent = partner.name;
    overlay.style.display = 'flex';
};

window.hangUp = () => {
    document.getElementById('callOverlay').style.display = 'none';
};

window.blockUser = async (userIdToBlock) => {
    if (!currentUser || !userIdToBlock) return;
    if (!confirm('Are you sure you want to block this user? You will be unmatched and will no longer see each other.')) return;

    const wantToReport = confirm('Do you also want to report this user to the admins for inappropriate behavior?');
    if (wantToReport) alert('User reported. Thank you for helping keep our community safe.');

    if (!currentUser.blocked) currentUser.blocked = [];
    if (!currentUser.blocked.includes(userIdToBlock)) currentUser.blocked.push(userIdToBlock);
    currentUser.likes = currentUser.likes.filter(id => id !== userIdToBlock);

    const blockedUser = users.find(u => u.id === userIdToBlock);
    if (blockedUser) {
        blockedUser.likes = blockedUser.likes.filter(id => id !== currentUser.id);
        await DB.saveUser(blockedUser);
    }

    updateAndSaveCurrentUser();
    alert('User has been blocked.');
    showMatches();
};
