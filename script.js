// --- DATA STORAGE (DATABASE SIMULATION using localStorage) ---
const DB = {
    _usersKey: 'campusMatchUsers',
    _currentUserKey: 'campusMatchCurrentUser',
    _themeKey: 'campusMatchTheme',
    _chatsKey: 'campusMatchChats',

    getUsers: function() {
        const stored = localStorage.getItem(this._usersKey);
        return stored ? JSON.parse(stored) : null;
    },
    saveUsers: function(usersArray) {
        localStorage.setItem(this._usersKey, JSON.stringify(usersArray));
    },
    getCurrentUserId: function() {
        return localStorage.getItem(this._currentUserKey);
    },
    setCurrentUserId: function(userId) {
        if (userId) {
            localStorage.setItem(this._currentUserKey, userId);
        } else {
            localStorage.removeItem(this._currentUserKey);
        }
    },
    getTheme: function() {
        return localStorage.getItem(this._themeKey);
    },
    setTheme: function(theme) {
        localStorage.setItem(this._themeKey, theme);
    },
    getChats: function() {
        const stored = localStorage.getItem(this._chatsKey);
        return stored ? JSON.parse(stored) : {};
    },
    saveChats: function(chatsObject) {
        localStorage.setItem(this._chatsKey, JSON.stringify(chatsObject));
    }
};

// Wait for the DOM to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    let currentUser = null;
    let users = [];
    let swipeQueue = [];
    let currentSwipeUser = null;
    let currentChatUser = null;
    let currentMatchList = []; // For filtering
    let pendingUser = null; // For email verification

    // DOM Elements
    const body = document.body;
    const modeToggleButton = document.getElementById('modeToggle');
    const allPages = document.querySelectorAll('.container');
    const userNameSpan = document.getElementById('userName');
    const typingIndicator = document.getElementById('typingIndicator');

    // --- HELPERS ---
    function getChatId(userId1, userId2) {
        return [userId1, userId2].sort().join('_');
    }

    function formatTimestamp(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function formatLastSeen(isoString) {
        if (!isoString) return 'Offline';
        const date = new Date(isoString);
        const now = new Date();
        const diffSeconds = Math.floor((now - date) / 1000);

        if (diffSeconds < 300) return '🟢 Online'; // 5 mins threshold
        if (diffSeconds < 86400) return `Last seen ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        return `Last seen ${date.toLocaleDateString()}`;
    }

    // --- INITIALIZATION ---
    function initializeApp() {
        // Load users from localStorage or create dummy data
        const storedUsers = DB.getUsers();
        if (storedUsers) {
            users = storedUsers;
        } else {
            // Create some dummy users if none exist
            users = [
                { id: 'u1', password: 'p', name: 'Sara', email: 'sara@example.com', age: 21, gender: 'Female', preference: 'Male', faculty: 'Medical', year: '3', bio: 'Future doctor, love hiking and coffee.', photo: 'https://i.pravatar.cc/300?img=5', interests: ['Movies', 'Travel', 'Food'], likes: ['u2'], passes: [], blocked: [] },
                { id: 'u2', password: 'p', name: 'Nimal', email: 'nimal@example.com', age: 22, gender: 'Male', preference: 'Female', faculty: 'Computer Science', year: '4', bio: 'Code, games, and more code.', photo: 'https://i.pravatar.cc/300?img=12', interests: ['Coding', 'Gaming', 'Music'], likes: ['u1'], passes: [], blocked: [] },
                { id: 'u3', password: 'p', name: 'Ashani', email: 'ashani@example.com', age: 20, gender: 'Female', preference: 'Any', faculty: 'Arts', year: '2', bio: 'Painting my way through life.', photo: 'https://i.pravatar.cc/300?img=9', interests: ['Art', 'Reading', 'Photography'], likes: [], passes: [], blocked: [] },
                { id: 'u4', password: 'p', name: 'Raj', email: 'raj@example.com', age: 23, gender: 'Male', preference: 'Female', faculty: 'Management', year: '4', bio: 'Aspiring entrepreneur. Let\'s connect!', photo: 'https://i.pravatar.cc/300?img=7', interests: ['Sports', 'Fitness', 'Travel'], likes: [], passes: [], blocked: [] },
                { id: 'u5', password: 'p', name: 'Priya', email: 'priya@example.com', age: 22, gender: 'Female', preference: 'Male', faculty: 'Science', year: '3', bio: 'Loves a good workout and a great meal.', photo: 'https://i.pravatar.cc/300?img=25', interests: ['Fitness', 'Food', 'Travel'], likes: [], passes: [], blocked: [] },
                { id: 'u6', password: 'p', name: 'Kavin', email: 'kavin@example.com', age: 24, gender: 'Male', preference: 'Female', faculty: 'Engineering', year: '5', bio: 'Capturing moments and exploring new places.', photo: 'https://i.pravatar.cc/300?img=32', interests: ['Photography', 'Travel', 'Movies'], likes: [], passes: [], blocked: [] },
                { id: 'u7', password: 'p', name: 'Maya', email: 'maya@example.com', age: 19, gender: 'Female', preference: 'Any', faculty: 'Law', year: '1', bio: 'Dancing through deadlines. Music is my escape.', photo: 'https://i.pravatar.cc/300?img=35', interests: ['Dancing', 'Music', 'Reading'], likes: [], passes: [], blocked: [] },
                { id: 'u8', password: 'p', name: 'Liam', email: 'liam@example.com', age: 21, gender: 'Male', preference: 'Female', faculty: 'Humanities', year: '2', bio: 'Bookworm and film buff. Let\'s discuss our favorites.', photo: 'https://i.pravatar.cc/300?img=52', interests: ['Reading', 'Movies', 'Gaming'], likes: [], passes: [], blocked: [] }
            ];
            DB.saveUsers(users);
        }

        // Check for logged-in user
        const currentUserId = DB.getCurrentUserId();
        if (currentUserId) {
            currentUser = users.find(u => u.id === currentUserId);
            if (currentUser) {
                updateMatchNotification();
                currentUser.lastSeen = new Date().toISOString();
                updateAndSaveCurrentUser();
                userNameSpan.textContent = currentUser.name;
                showPage('dashboardPage');
            } else {
                showPage('loginPage');
            }
        } else {
            showPage('loginPage');
        }

        // Dark mode persistence
        if (DB.getTheme() === 'dark') {
            body.classList.add('dark');
            modeToggleButton.textContent = '☀️ Light';
        }
        
        // Set initial background
        const activePage = document.querySelector('.container.active');
        if (activePage) {
            body.style.background = window.getComputedStyle(activePage).background;
        }
    }

    // --- NAVIGATION ---
    window.showPage = (pageId) => {
        allPages.forEach(page => {
            page.classList.remove('active');
        });
        const newPage = document.getElementById(pageId);
        if (newPage) {
            newPage.classList.add('active');
            // Update body background based on the active page
            body.style.background = window.getComputedStyle(newPage).background;
        }
    }

    function updateMatchNotification() {
        const badge = document.getElementById('matchNotificationBadge');
        if (!currentUser || !currentUser.newMatches || currentUser.newMatches.length === 0) {
            badge.style.display = 'none';
            return;
        }

        const newMatchCount = currentUser.newMatches.length;
        badge.textContent = newMatchCount > 9 ? '9+' : newMatchCount;
        badge.style.display = 'flex';
    }

    // --- UI & THEME ---
    modeToggleButton.addEventListener('click', () => {
        body.classList.toggle('dark');
        if (body.classList.contains('dark')) {
            modeToggleButton.textContent = '☀️ Light';
            DB.setTheme('dark');
        } else {
            modeToggleButton.textContent = '🌙 Dark';
            DB.setTheme('light');
        }
        // Re-apply background after theme change
        const activePage = document.querySelector('.container.active');
        if (activePage) {
            body.style.background = window.getComputedStyle(activePage).background;
        }
    });

    // --- AUTHENTICATION ---
    window.login = () => {
        const identifier = document.getElementById('loginIdentifier').value.trim();
        const pass = document.getElementById('loginPass').value;
        const user = users.find(u => (u.email === identifier || u.id === identifier) && u.password === pass);
        if (user) {
            currentUser = user;
            currentUser.lastSeen = new Date().toISOString();
            updateAndSaveCurrentUser();
            DB.setCurrentUserId(user.id);
            userNameSpan.textContent = user.name;
            showPage('dashboardPage');
        } else {
            alert('Invalid credentials. Please check your Email/ID and Password.');
        }
    }

    window.logout = () => {
        currentUser = null;
        DB.setCurrentUserId(null);
        showPage('loginPage');
    }

    window.deleteAccount = () => {
        if (!currentUser) return;

        const confirmation = confirm("Are you sure you want to delete your account? This action is irreversible.");
        if (!confirmation) {
            return;
        }

        const passwordCheck = prompt("Please enter your password to confirm deletion:");
        if (passwordCheck === null) { // User clicked cancel
            return;
        }

        if (passwordCheck !== currentUser.password) {
            alert("Incorrect password. Account deletion cancelled.");
            return;
        }

        // Filter out the current user
        users = users.filter(user => user.id !== currentUser.id);
        DB.saveUsers(users);

        // Also remove any chats involving this user
        const allChats = DB.getChats();
        for (const chatId in allChats) {
            if (chatId.includes(currentUser.id)) {
                delete allChats[chatId];
            }
        }
        DB.saveChats(allChats);

        alert("Your account has been successfully deleted.");
        logout(); // Log out and go to login page
    }

    window.showSettingsPage = () => {
        if (!currentUser) return;
        // Pre-fill current email and clear password fields
        document.getElementById('newEmail').value = currentUser.email || '';
        document.getElementById('currentPass').value = '';
        document.getElementById('newPass').value = '';
        document.getElementById('confirmNewPass').value = '';
        showPage('settingsPage');
    }

    window.saveSettings = () => {
        if (!currentUser) return;

        const currentPass = document.getElementById('currentPass').value;
        const newEmail = document.getElementById('newEmail').value.trim();
        const newPass = document.getElementById('newPass').value;
        const confirmNewPass = document.getElementById('confirmNewPass').value;

        if (!currentPass) {
            alert('Please enter your current password to make changes.');
            return;
        }

        if (currentPass !== currentUser.password) {
            alert('Incorrect current password.');
            return;
        }

        let changesMade = false;

        // --- Update Email ---
        if (newEmail && newEmail !== currentUser.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(newEmail)) {
                alert('Please enter a valid new email address.');
                return;
            }
            if (users.some(u => u.email === newEmail && u.id !== currentUser.id)) {
                alert('This email address is already registered.');
                return;
            }
            currentUser.email = newEmail;
            changesMade = true;
        }

        // --- Update Password ---
        if (newPass) {
            if (newPass !== confirmNewPass) {
                alert('New passwords do not match.');
                return;
            }
            currentUser.password = newPass;
            changesMade = true;
        }

        if (changesMade) {
            updateAndSaveCurrentUser();
            alert('Your settings have been updated successfully.');
            showPage('dashboardPage');
        } else {
            alert('No changes were made.');
        }
    }

    window.forgotPassword = () => {
        const identifier = prompt("Enter your Email or University ID to recover your password:");
        if (identifier) {
            const user = users.find(u => u.email === identifier.trim() || u.id === identifier.trim());
            if (user) {
                alert(`Your password is: ${user.password}`);
            } else {
                alert("User not found.");
            }
        }
    }

    window.signup = () => {
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const age = document.getElementById('age').value;
        const gender = document.getElementById('gender').value;
        const pref = document.getElementById('pref').value;
        const faculty = document.getElementById('faculty').value.trim();
        const year = document.getElementById('year').value;
        const studentID = document.getElementById('studentID').value.trim();
        const password = document.getElementById('password').value;

        if (!name || !email || !age || !faculty || !year || !studentID || !password) {
            alert('Please fill all fields.');
            return;
        }

        // Simple email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address.');
            return;
        }
        if (users.some(u => u.id === studentID)) {
            alert('Student ID already exists.');
            return;
        }

        if (users.some(u => u.email === email)) {
            alert('Email already registered.');
            return;
        }

        // Store user data temporarily
        pendingUser = {
            id: studentID, password, name, email, age, gender, preference: pref, faculty, year,
            bio: '', photo: 'https://i.pravatar.cc/300', interests: [], likes: [], passes: [], blocked: []
        };

        // Go to verification page
        showPage('verificationPage');
    }

    window.verifyCode = () => {
        const code = document.getElementById('verificationCode').value.trim();
        if (code === '123456') { // Demo verification code
            if (pendingUser) {
                users.push(pendingUser);
                DB.saveUsers(users);
                
                // Log in the new user and go to profile setup
                currentUser = pendingUser;
                DB.setCurrentUserId(currentUser.id);
                alert('Signup successful! Please set up your profile.');
                showPage('profilePage');
                pendingUser = null; // Clear pending user
            }
        } else {
            alert('Invalid verification code.');
        }
    }

    // --- PROFILE SETUP ---
    let photoDataUrl = null;
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    const preview = document.getElementById('preview');

    window.startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.style.display = 'block';
        } catch (err) {
            console.error("Error accessing camera: ", err);
            alert('Could not access camera. Please check permissions.');
        }
    }

    window.takePhoto = () => {
        if (!video.srcObject) {
            alert("Camera not started.");
            return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        photoDataUrl = canvas.toDataURL('image/png');
        preview.src = photoDataUrl;
        preview.style.display = 'block';
        video.style.display = 'none';
        // Stop camera stream
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
    }

    window.checkFileSize = () => {
        const file = document.getElementById('upload').files[0];
        if (file && file.size > 2 * 1024 * 1024) { // 2MB
            alert('File is too large. Please select an image under 2MB.');
            document.getElementById('upload').value = ''; // Clear selection
            return;
        }
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                photoDataUrl = e.target.result;
                preview.src = photoDataUrl;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }

    window.saveProfile = () => {
        if (!currentUser) return;
        
        currentUser.bio = document.getElementById('bio').value.trim();
        currentUser.insta = document.getElementById('insta').value.trim();
        
        const interests = [];
        document.querySelectorAll('.interests-grid input[type="checkbox"]:checked').forEach(cb => {
            interests.push(cb.value);
        });
        currentUser.interests = interests;

        if (photoDataUrl) {
            currentUser.photo = photoDataUrl;
        }

        updateAndSaveCurrentUser();
        
        alert('Profile saved!');
        userNameSpan.textContent = currentUser.name;
        showPage('dashboardPage');
    }

    // --- SWIPING ---
    window.startSwipe = () => {
        if (!currentUser) return;
        
        const alreadySwiped = [...currentUser.likes, ...currentUser.passes];
        
        swipeQueue = users.filter(user => {
            if (user.id === currentUser.id) return false;
            if (alreadySwiped.includes(user.id)) return false;

            // New blocking logic
            if (currentUser.blocked && currentUser.blocked.includes(user.id)) return false; // Don't show users I've blocked
            if (user.blocked && user.blocked.includes(currentUser.id)) return false; // Don't show users who have blocked me

            if (currentUser.preference !== 'Any' && currentUser.preference !== user.gender) return false;
            if (user.preference !== 'Any' && user.preference !== currentUser.gender) return false;
            return true;
        });

        showPage('swipePage');
        loadNextSwipeCard();
    }

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
            // Add to new matches for notification
            if (!currentUser.newMatches) {
                currentUser.newMatches = [];
            }
            currentUser.newMatches.push(otherUser.id);
            updateMatchNotification();
        }
        
        updateAndSaveCurrentUser();
        loadNextSwipeCard();
    }

    window.passUser = () => {
        if (!currentSwipeUser || !currentUser) return;
        currentUser.passes.push(currentSwipeUser.id);
        updateAndSaveCurrentUser();
        loadNextSwipeCard();
    }

    function updateAndSaveCurrentUser() {
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = currentUser;
            DB.saveUsers(users);
        }
    }

    // --- MATCHES & CHAT ---
    function renderMatches(matchesToRender) {
        const matchListContainer = document.getElementById('matchList');
        matchListContainer.innerHTML = '';

        if (matchesToRender.length > 0) {
            matchesToRender.forEach(match => {
                const matchCompatibility = calculateCompatibility(currentUser, match);
                const lastSeen = formatLastSeen(match.lastSeen);
                const unreadCount = (currentUser.unreadMessages && currentUser.unreadMessages[match.id]) || 0;
                const unreadBadge = unreadCount > 0 ? `<span class="chat-notification-badge">${unreadCount > 9 ? '9+' : unreadCount}</span>` : '';

                matchListContainer.innerHTML += `
                    <div class="card">
                        ${unreadBadge}
                        <h4>${match.name}</h4>
                        <p class="last-seen">${lastSeen}</p>
                        <p>Compatibility: ${matchCompatibility}%</p>
                        <div class="bar"><div class="fill" style="width:${matchCompatibility}%"></div></div>
                        <button onclick="startChat('${match.id}')" style="margin-top:10px; width: auto; padding: 8px 12px;">Chat</button>
                    </div>
                `;
            });
        } else {
            matchListContainer.innerHTML = `<p>No matches found.</p>`;
        }
    }

    window.filterMatches = () => {
        const searchTerm = document.getElementById('matchSearchInput').value.toLowerCase();
        const filteredMatches = currentMatchList.filter(match => 
            match.name.toLowerCase().includes(searchTerm)
        );
        renderMatches(filteredMatches);
    }

    window.initiateContact = (type) => {
        if (!currentUser || !currentSwipeUser) return;

        const otherUser = users.find(u => u.id === currentSwipeUser.id);
        const isMatch = currentUser.likes.includes(currentSwipeUser.id) && 
                        otherUser && otherUser.likes.includes(currentUser.id);

        if (isMatch) {
            switch (type) {
                case 'chat':
                    startChat(currentSwipeUser.id);
                    break;
                case 'voice':
                    startVoiceCall(currentSwipeUser.id);
                    break;
                case 'video':
                    startVideoCall(currentSwipeUser.id);
                    break;
            }
        } else {
            alert(`You need to match with ${currentSwipeUser.name} to contact them. Press 'Like' to show your interest!`);
        }
    }

    window.showMatches = () => {
        if (!currentUser) return;
        
        // Clear new match notifications when viewing the match list
        if (currentUser.newMatches && currentUser.newMatches.length > 0) {
            currentUser.newMatches = [];
            updateAndSaveCurrentUser();
            updateMatchNotification();
        }

        currentMatchList = users.filter(user => 
            currentUser.likes.includes(user.id) && user.likes.includes(currentUser.id)
        );

        document.getElementById('matchSearchInput').value = '';
        renderMatches(currentMatchList);
        showPage('matchPage');
    }
    
    function calculateCompatibility(user1, user2) {
        const commonInterests = user1.interests.filter(i => user2.interests.includes(i));
        const maxInterests = Math.max(user1.interests.length, user2.interests.length);
        if (maxInterests === 0) return 20; // Base compatibility
        const score = (commonInterests.length / maxInterests) * 100;
        return Math.min(100, Math.round(score) + 20); // Add base and cap at 100
    }

    function createMessageHTML(message) {
        if (!currentUser || !currentChatUser) return '';

        const isCurrentUser = message.senderId === currentUser.id;
        const messageClass = isCurrentUser ? 'sent' : 'received';
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

    window.startChat = (userId) => {
        currentChatUser = users.find(u => u.id === userId);
        if (!currentChatUser || !currentUser) return;

        // Clear unread messages for this chat
        if (currentUser.unreadMessages && currentUser.unreadMessages[userId]) {
            delete currentUser.unreadMessages[userId];
            updateAndSaveCurrentUser();
        }
        
        // Setup header with name and call buttons
        document.getElementById('chatPartnerName').textContent = `${currentChatUser.name}`;
        const callButtonsContainer = document.getElementById('callButtons');
        callButtonsContainer.innerHTML = `
            <button onclick="startVoiceCall('${currentChatUser.id}')" title="Voice Call">📞</button>
            <button onclick="startVideoCall('${currentChatUser.id}')" title="Video Call">📹</button>
            <button class="block-btn" onclick="blockUser('${currentChatUser.id}')" title="Block User">🚫</button>
        `;

        const chatBox = document.getElementById('chatBox');
        chatBox.innerHTML = ''; // Clear the box
        typingIndicator.style.display = 'none'; // Ensure it's hidden

        const chatId = getChatId(currentUser.id, currentChatUser.id);
        const allChats = DB.getChats();
        const chatHistory = allChats[chatId] || [];

        if (chatHistory.length === 0) {
            chatBox.innerHTML = `<p><em>This is the beginning of your conversation with ${currentChatUser.name}.</em></p>`;
        } else {
            chatHistory.forEach(message => {
                chatBox.innerHTML += createMessageHTML(message);
            });
        }
        
        chatBox.scrollTop = chatBox.scrollHeight;
        showPage('chatPage');
    }

    window.sendMessage = () => {
        const chatInput = document.getElementById('chatInput');
        const messageText = chatInput.value.trim();

        if (messageText && currentUser && currentChatUser) {
            const chatId = getChatId(currentUser.id, currentChatUser.id);
            const allChats = DB.getChats();
            if (!allChats[chatId]) {
                allChats[chatId] = [];
            }

            // 1. Add user's message
            const myMessage = {
                senderId: currentUser.id,
                text: messageText,
                timestamp: new Date().toISOString()
            };
            allChats[chatId].push(myMessage);
            DB.saveChats(allChats); // Save after adding user's message

            // 2. Update UI for user's message
            const chatBox = document.getElementById('chatBox');
            if (chatBox.querySelector('em')) { // Remove initial message if it exists
                chatBox.innerHTML = '';
            }
            chatBox.insertAdjacentHTML('beforeend', createMessageHTML(myMessage));
            chatInput.value = '';
            chatBox.scrollTop = chatBox.scrollHeight;
            
            // 3. Show typing indicator and simulate reply
            typingIndicator.style.display = 'block';
            typingIndicator.textContent = `${currentChatUser.name} is typing...`;

            setTimeout(() => {
                typingIndicator.style.display = 'none'; // Hide indicator

                const replyText = "Got it!";
                const replyMessage = { senderId: currentChatUser.id, text: replyText, timestamp: new Date().toISOString() };
                allChats[chatId].push(replyMessage);
                DB.saveChats(allChats); // Save again after adding the reply

                // In this simulation, the reply is "unread" until the user re-enters the chat.
                if (!currentUser.unreadMessages) {
                    currentUser.unreadMessages = {};
                }
                currentUser.unreadMessages[currentChatUser.id] = (currentUser.unreadMessages[currentChatUser.id] || 0) + 1;
                updateAndSaveCurrentUser();

                chatBox.insertAdjacentHTML('beforeend', createMessageHTML(replyMessage));
                chatBox.scrollTop = chatBox.scrollHeight;
            }, 1500);
        }
    }

    window.startVoiceCall = (userId) => {
        const partner = users.find(u => u.id === userId);
        if (!partner) return;
        const overlay = document.getElementById('callOverlay');
        document.getElementById('callPartnerAvatar').src = partner.photo;
        document.getElementById('callStatus').textContent = 'Voice Calling...';
        document.getElementById('callPartnerNameOverlay').textContent = partner.name;
        overlay.style.display = 'flex';
    }

    window.startVideoCall = (userId) => {
        const partner = users.find(u => u.id === userId);
        if (!partner) return;
        const overlay = document.getElementById('callOverlay');
        document.getElementById('callPartnerAvatar').src = partner.photo;
        document.getElementById('callStatus').textContent = 'Video Calling...';
        document.getElementById('callPartnerNameOverlay').textContent = partner.name;
        overlay.style.display = 'flex';
    }

    window.blockUser = (userIdToBlock) => {
        if (!currentUser || !userIdToBlock) return;

        const confirmation = confirm(`Are you sure you want to block this user? You will be unmatched and will no longer see each other.`);
        if (!confirmation) {
            return;
        }

        // Ask if user wants to report as well
        const wantToReport = confirm("Do you also want to report this user to the admins for inappropriate behavior?");
        if (wantToReport) {
            alert("User reported. Thank you for helping keep our community safe.");
        }

        // Add to current user's blocked list
        if (!currentUser.blocked) {
            currentUser.blocked = [];
        }
        if (!currentUser.blocked.includes(userIdToBlock)) {
            currentUser.blocked.push(userIdToBlock);
        }

        // Remove from likes/matches. A block implies un-matching.
        currentUser.likes = currentUser.likes.filter(id => id !== userIdToBlock);
        
        // Also remove the current user from the other person's likes to break the match
        const blockedUser = users.find(u => u.id === userIdToBlock);
        if (blockedUser) {
            blockedUser.likes = blockedUser.likes.filter(id => id !== currentUser.id);
        }

        DB.saveUsers(users); // Save the change to the blocked user
        updateAndSaveCurrentUser(); // Save the change to the current user

        alert("User has been blocked.");
        showMatches(); // Go back to the matches page, which will now be updated.
    }

    window.hangUp = () => {
        document.getElementById('callOverlay').style.display = 'none';
    }


    // --- KICKSTART THE APP ---
    initializeApp();
});