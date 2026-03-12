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
                { id: 'u1', password: 'p', name: 'Sara', age: 21, gender: 'Female', preference: 'Male', faculty: 'Medical', year: '3', bio: 'Future doctor, love hiking and coffee.', photo: 'https://i.pravatar.cc/300?img=5', interests: ['Movies', 'Travel', 'Food'], likes: ['u2'], passes: [] },
                { id: 'u2', password: 'p', name: 'Nimal', age: 22, gender: 'Male', preference: 'Female', faculty: 'Computer Science', year: '4', bio: 'Code, games, and more code.', photo: 'https://i.pravatar.cc/300?img=12', interests: ['Coding', 'Gaming', 'Music'], likes: ['u1'], passes: [] },
                { id: 'u3', password: 'p', name: 'Ashani', age: 20, gender: 'Female', preference: 'Any', faculty: 'Arts', year: '2', bio: 'Painting my way through life.', photo: 'https://i.pravatar.cc/300?img=9', interests: ['Art', 'Reading', 'Photography'], likes: [], passes: [] },
                { id: 'u4', password: 'p', name: 'Raj', age: 23, gender: 'Male', preference: 'Female', faculty: 'Management', year: '4', bio: 'Aspiring entrepreneur. Let\'s connect!', photo: 'https://i.pravatar.cc/300?img=7', interests: ['Sports', 'Fitness', 'Travel'], likes: [], passes: [] },
                { id: 'u5', password: 'p', name: 'Priya', age: 22, gender: 'Female', preference: 'Male', faculty: 'Science', year: '3', bio: 'Loves a good workout and a great meal.', photo: 'https://i.pravatar.cc/300?img=25', interests: ['Fitness', 'Food', 'Travel'], likes: [], passes: [] },
                { id: 'u6', password: 'p', name: 'Kavin', age: 24, gender: 'Male', preference: 'Female', faculty: 'Engineering', year: '5', bio: 'Capturing moments and exploring new places.', photo: 'https://i.pravatar.cc/300?img=32', interests: ['Photography', 'Travel', 'Movies'], likes: [], passes: [] },
                { id: 'u7', password: 'p', name: 'Maya', age: 19, gender: 'Female', preference: 'Any', faculty: 'Law', year: '1', bio: 'Dancing through deadlines. Music is my escape.', photo: 'https://i.pravatar.cc/300?img=35', interests: ['Dancing', 'Music', 'Reading'], likes: [], passes: [] },
                { id: 'u8', password: 'p', name: 'Liam', age: 21, gender: 'Male', preference: 'Female', faculty: 'Humanities', year: '2', bio: 'Bookworm and film buff. Let\'s discuss our favorites.', photo: 'https://i.pravatar.cc/300?img=52', interests: ['Reading', 'Movies', 'Gaming'], likes: [], passes: [] }
            ];
            DB.saveUsers(users);
        }

        // Check for logged-in user
        const currentUserId = DB.getCurrentUserId();
        if (currentUserId) {
            currentUser = users.find(u => u.id === currentUserId);
            if (currentUser) {
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
        const id = document.getElementById('loginID').value.trim();
        const pass = document.getElementById('loginPass').value;
        const user = users.find(u => u.id === id && u.password === pass);
        if (user) {
            currentUser = user;
            currentUser.lastSeen = new Date().toISOString();
            updateAndSaveCurrentUser();
            DB.setCurrentUserId(user.id);
            userNameSpan.textContent = user.name;
            showPage('dashboardPage');
        } else {
            alert('Invalid Student ID or Password.');
        }
    }

    window.logout = () => {
        currentUser = null;
        DB.setCurrentUserId(null);
        showPage('loginPage');
    }

    window.signup = () => {
        const name = document.getElementById('name').value.trim();
        const age = document.getElementById('age').value;
        const gender = document.getElementById('gender').value;
        const pref = document.getElementById('pref').value;
        const faculty = document.getElementById('faculty').value.trim();
        const year = document.getElementById('year').value;
        const studentID = document.getElementById('studentID').value.trim();
        const password = document.getElementById('password').value;

        if (!name || !age || !faculty || !year || !studentID || !password) {
            alert('Please fill all fields.');
            return;
        }
        if (users.some(u => u.id === studentID)) {
            alert('Student ID already exists.');
            return;
        }

        const newUser = {
            id: studentID, password, name, age, gender, preference: pref, faculty, year,
            bio: '', photo: 'https://i.pravatar.cc/300', interests: [], likes: [], passes: []
        };
        users.push(newUser);
        DB.saveUsers(users);
        
        // Log in the new user and go to profile setup
        currentUser = newUser;
        DB.setCurrentUserId(newUser.id);
        alert('Signup successful! Please set up your profile.');
        showPage('profilePage');
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
    window.showMatches = () => {
        if (!currentUser) return;
        const matchListContainer = document.getElementById('matchList');
        matchListContainer.innerHTML = '';
        
        const myMatches = users.filter(user => 
            currentUser.likes.includes(user.id) && user.likes.includes(currentUser.id)
        );

        if (myMatches.length > 0) {
            myMatches.forEach(match => {
                const matchCompatibility = calculateCompatibility(currentUser, match);
                const lastSeen = formatLastSeen(match.lastSeen);
                matchListContainer.innerHTML += `
                    <div class="card">
                        <h4>${match.name}</h4>
                        <p class="last-seen">${lastSeen}</p>
                        <p>Compatibility: ${matchCompatibility}%</p>
                        <div class="bar"><div class="fill" style="width:${matchCompatibility}%"></div></div>
                        <button onclick="startChat('${match.id}')" style="margin-top:10px; width: auto; padding: 8px 12px;">Chat</button>
                    </div>
                `;
            });
        } else {
            matchListContainer.innerHTML = `<p>No matches yet. Keep swiping!</p>`;
        }
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
        
        // Setup header with name and call buttons
        document.getElementById('chatPartnerName').textContent = `${currentChatUser.name}`;
        const callButtonsContainer = document.getElementById('callButtons');
        callButtonsContainer.innerHTML = `
            <button onclick="startVoiceCall('${currentChatUser.id}')" title="Voice Call">📞</button>
            <button onclick="startVideoCall('${currentChatUser.id}')" title="Video Call">📹</button>
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

    window.hangUp = () => {
        document.getElementById('callOverlay').style.display = 'none';
    }


    // --- KICKSTART THE APP ---
    initializeApp();
});