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

        // If we are navigating away from the chat page, stop listening for messages
        if (pageId !== 'chatPage' && unsubscribeChatListener) {
            unsubscribeChatListener();
            unsubscribeChatListener = null;
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
            Theme.set('dark');
        } else {
            modeToggleButton.textContent = '🌙 Dark';
            Theme.set('light');
        }
        // Re-apply background after theme change
        const activePage = document.querySelector('.container.active');
        if (activePage) {
            body.style.background = window.getComputedStyle(activePage).background;
        }
    });

    // --- UI ENHANCEMENTS (Password Strength) ---
    const passwordInput = document.getElementById('password');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');

    function checkPasswordStrength(password) {
        let score = 0;
        if (!password) return 0;
        if (password.length > 7) score++; // Length > 7
        if (/[A-Z]/.test(password)) score++; // Has uppercase
        if (/[0-9]/.test(password)) score++; // Has numbers
        if (/[^A-Za-z0-9]/.test(password)) score++; // Has special character
        return score;
    }

    function updateStrengthIndicator(strength) {
        const strengthLevels = {
            0: { text: '', width: '0%', color: '#ddd' },
            1: { text: 'Weak', width: '25%', color: '#e74c3c' },
            2: { text: 'Medium', width: '50%', color: '#f39c12' },
            3: { text: 'Strong', width: '75%', color: '#f1c40f' },
            4: { text: 'Very Strong', width: '100%', color: '#2ecc71' }
        };
        const level = strengthLevels[strength] || strengthLevels[0];
        
        if (strengthBar) {
            strengthBar.style.width = level.width;
            strengthBar.style.backgroundColor = level.color;
        }
        if (strengthText) {
            strengthText.textContent = level.text;
        }
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            const password = passwordInput.value;
            const strength = checkPasswordStrength(password);
            updateStrengthIndicator(strength);
        });
    }

    window.togglePassword = (icon) => {
        const input = icon.previousElementSibling;
        if (input.type === "password") {
            input.type = "text";
            icon.textContent = "🙈"; // Icon for 'Hide'
        } else {
            input.type = "password";
            icon.textContent = "👁️"; // Icon for 'Show'
        }
    }

    // --- AUTHENTICATION ---
    window.login = async () => {
        const identifier = document.getElementById('loginIdentifier').value.trim();
        const pass = document.getElementById('loginPass').value;
        try {
            await signInWithEmailAndPassword(auth, identifier, pass);
            // onAuthStateChanged will handle the rest
        } catch (error) {
            console.error("Login failed:", error);
            alert(`Login failed: ${error.message}`);
        }
    }

    window.logout = async () => {
        try {
            await signOut(auth);
            // onAuthStateChanged will handle UI changes
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }

    window.deleteAccount = async () => {
        if (!currentUser) return;

        const confirmation = confirm("Are you sure you want to delete your account? This action is irreversible.");
        if (!confirmation) {
            return;
        }

        const password = prompt("For security, please re-enter your password to confirm deletion:");
        if (!password) return;

        try {
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);

            // 1. Delete user's Firestore document
            await deleteDoc(doc(db, "users", user.uid));

            // 2. Delete user from Authentication
            await deleteUser(user);

            alert("Your account has been successfully deleted.");
            // onAuthStateChanged will handle logout

        } catch (error) {
            console.error("Error deleting account:", error);
            alert(`Could not delete account: ${error.message}`);
        }
    }

    window.showSettingsPage = () => {
        if (!currentUser) return;
        // Pre-fill current email and clear password fields
        document.getElementById('newEmail').value = currentUser.profile.email || '';
        document.getElementById('currentPass').value = '';
        document.getElementById('newPass').value = '';
        document.getElementById('confirmNewPass').value = '';
        showPage('settingsPage');
    }

    window.saveSettings = async () => {
        if (!currentUser) return;

        const currentPass = document.getElementById('currentPass').value;
        const newEmail = document.getElementById('newEmail').value.trim();
        const newPass = document.getElementById('newPass').value;
        const confirmNewPass = document.getElementById('confirmNewPass').value;
        const user = auth.currentUser;

        if (!currentPass) {
            alert('Please enter your current password to make changes.');
            return;
        }

        try {
            // First, re-authenticate the user to allow sensitive changes
            const credential = EmailAuthProvider.credential(user.email, currentPass);
            await reauthenticateWithCredential(user, credential);

            let changesMade = false;
            const updates = {};

            // --- Update Email ---
            if (newEmail && newEmail !== user.email) {
                // Firebase handles email validation and uniqueness on the backend
                // await updateEmail(user, newEmail); // This sends a verification link
                updates.email = newEmail;
                changesMade = true;
            }

            // --- Update Password ---
            if (newPass) {
                if (newPass !== confirmNewPass) {
                    alert('New passwords do not match.');
                    return;
                }
                // await updatePassword(user, newPass);
                // For simplicity, we'll just update the Firestore doc if we were storing it there
                // But with Firebase Auth, the password is not stored in Firestore.
                alert("Password updates are complex and not included in this simplified example.");
            }

            if (changesMade) {
                await updateDoc(doc(db, "users", user.uid), updates);
                alert('Your settings have been updated successfully.');
                showPage('dashboardPage');
            } else {
                alert('No changes were made.');
            }
        } catch (error) {
            console.error("Error updating settings:", error);
            alert(`Failed to update settings: ${error.message}`);
        }
    }

    window.forgotPassword = async () => {
        const identifier = prompt("Enter your Email or University ID to recover your password:");
        if (identifier) {
            try {
                await sendPasswordResetEmail(auth, identifier);
                alert(`A password reset link has been sent to ${identifier}.`);
            } catch (error) {
                console.error("Password reset failed:", error);
                alert(`Could not send reset link: ${error.message}`);
            }
        }
    }

    window.signup = async () => {
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const age = document.getElementById('age').value;
        const gender = document.getElementById('gender').value;
        const pref = document.getElementById('pref').value;
        const faculty = document.getElementById('faculty').value.trim();
        const year = document.getElementById('year').value;
        const studentID = document.getElementById('studentID').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!name || !email || !age || !faculty || !year || !studentID || !password || !confirmPassword) {
            alert('Please fill all fields.');
            return;
        }

        // Simple email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address.');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }

        try {
            // 1. Create user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Create user profile document in Firestore
            const userProfile = {
                id: studentID, // Keep your own ID system if you want
                name, email, age, gender, preference: pref, faculty, year,
                bio: '',
                photo: 'https://i.pravatar.cc/300', // Default photo
                interests: [],
                likes: [],
                passes: [],
                blocked: [],
                newMatches: [],
                lastSeen: serverTimestamp()
            };
            await setDoc(doc(db, "users", user.uid), userProfile);

            // 3. Send email verification
            await sendEmailVerification(user);

            // 4. Go to verification page
            document.getElementById('verificationEmail').textContent = email;
            showPage('verificationPage');

        } catch (error) {
            console.error("Signup failed:", error);
            alert(`Signup failed: ${error.message}`);
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

    window.saveProfile = async () => {
        if (!currentUser) return;
        
        try {
            const updates = {
                bio: document.getElementById('bio').value.trim(),
                insta: document.getElementById('insta').value.trim(),
                interests: Array.from(document.querySelectorAll('.interests-grid input:checked')).map(cb => cb.value)
            };

            // If a new photo was taken/uploaded, upload it to Firebase Storage
            if (photoDataUrl) {
                const storageRef = ref(storage, `profile_photos/${currentUser.uid}`);
                const uploadResult = await uploadString(storageRef, photoDataUrl, 'data_url');
                updates.photo = await getDownloadURL(uploadResult.ref);
            }

            // Update the user's document in Firestore
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, updates);

            // Update local currentUser object
            currentUser.profile = { ...currentUser.profile, ...updates };

            alert('Profile saved!');
            userNameSpan.textContent = currentUser.profile.name;
            showPage('dashboardPage');

        } catch (error) {
            console.error("Error saving profile:", error);
            alert(`Could not save profile: ${error.message}`);
        }
    }

    // --- SWIPING ---
    window.startSwipe = async () => {
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
    window.startSwipe = async () => {
        if (!currentUser) return;

        try {
            const alreadySwiped = [...(currentUser.profile.likes || []), ...(currentUser.profile.passes || [])];
            const blockedList = [...(currentUser.profile.blocked || [])];

            const usersCollection = collection(db, "users");
            const allUsersSnapshot = await getDocs(usersCollection);

            const allUsers = allUsersSnapshot.docs.map(d => ({ uid: d.id, ...d.data() }));

            swipeQueue = allUsers.filter(user => {
                if (user.uid === currentUser.uid) return false; // Not me
                if (alreadySwiped.includes(user.uid)) return false; // Not already swiped
                if (blockedList.includes(user.uid)) return false; // Not blocked by me
                if (user.blocked && user.blocked.includes(currentUser.uid)) return false; // Not someone who blocked me
                // Add preference logic here if needed
                return true;
            });

            showPage('swipePage');
            loadNextSwipeCard();
        } catch (error) {
            console.error("Error starting swipe:", error);
            alert("Could not load profiles. Please try again.");
        }
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
            swipeCardContainer.innerHTML = `<p>No more profiles to show. Check back later!</p>`;
            currentSwipeUser = null;
        }
    }
    window.likeUser = async () => {
        if (!currentSwipeUser || !currentUser) return;
        
        try {
            const myRef = doc(db, "users", currentUser.uid);
            const theirRef = doc(db, "users", currentSwipeUser.uid);

            // Add their ID to my 'likes' array
            await updateDoc(myRef, {
                likes: arrayUnion(currentSwipeUser.uid)
            });
            currentUser.profile.likes.push(currentSwipeUser.uid);

            // Check if they have liked me (check for match)
            const theirDoc = await getDoc(theirRef);
            const theirData = theirDoc.data();
            const isMatch = theirData.likes && theirData.likes.includes(currentUser.uid);

            if (isMatch) {
                // It's a match! Update both documents atomically.
                const batch = writeBatch(db);
                batch.update(myRef, { newMatches: arrayUnion(currentSwipeUser.uid) });
                batch.update(theirRef, { newMatches: arrayUnion(currentUser.uid) });
                await batch.commit();

                if (confirm(`It's a match with ${currentSwipeUser.name}!\n\nGo to your matches to start chatting?`)) {
                    showMatches();
                } else {
                    loadNextSwipeCard();
                }
            } else {
                loadNextSwipeCard();
            }
        } catch (error) {
            console.error("Error liking user:", error);
        }
    }

    window.passUser = async () => {
        if (!currentSwipeUser || !currentUser) return;
        const myRef = doc(db, "users", currentUser.uid);
        await updateDoc(myRef, {
            passes: arrayUnion(currentSwipeUser.uid)
        });
        currentUser.profile.passes.push(currentSwipeUser.uid);
        loadNextSwipeCard();
    }

    // --- MATCHES & CHAT ---
    function renderMatches(matchesToRender) {
        const matchListContainer = document.getElementById('matchList');
        matchListContainer.innerHTML = '';

        if (matchesToRender.length > 0) {
            matchesToRender.forEach(match => {
                const matchCompatibility = calculateCompatibility(currentUser.profile, match);
                const lastSeen = formatLastSeen(match.lastSeen);
                const unreadCount = (currentUser.profile.unreadMessages && currentUser.profile.unreadMessages[match.uid]) || 0;
                const unreadBadge = unreadCount > 0 ? `<span class="chat-notification-badge">${unreadCount > 9 ? '9+' : unreadCount}</span>` : '';

                matchListContainer.innerHTML += `
                    <div class="card">
                        ${unreadBadge}
                        <h4>${match.name}</h4>
                        <p class="last-seen">${lastSeen}</p>
                        <p>Compatibility: ${matchCompatibility}%</p>
                        <div class="bar"><div class="fill" style="width:${matchCompatibility}%"></div></div>`
                        <button onclick="startChat('${match.uid}')" style="margin-top:10px; width: auto; padding: 8px 12px;">Chat</button>
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

    window.showMatches = async () => {
        if (!currentUser) return;
        
        try {
            // Clear new match notifications when viewing the match list
            if (currentUser.profile.newMatches && currentUser.profile.newMatches.length > 0) {
                const userRef = doc(db, "users", currentUser.uid);
                await updateDoc(userRef, { newMatches: [] });
                currentUser.profile.newMatches = [];
                updateMatchNotification();
            }

            const myLikes = currentUser.profile.likes || [];
            if (myLikes.length === 0) {
                renderMatches([]);
                showPage('matchPage');
                return;
            }

            // Find users who have liked me
            const q = query(collection(db, "users"), where("likes", "array-contains", currentUser.uid));
            const querySnapshot = await getDocs(q);
            const usersWhoLikeMe = querySnapshot.docs.map(d => d.id);

            // A match is where I have liked them AND they have liked me
            const matchIds = myLikes.filter(id => usersWhoLikeMe.includes(id));

            if (matchIds.length > 0) {
                const matchesQuery = query(collection(db, "users"), where("__name__", "in", matchIds));
                const matchesSnapshot = await getDocs(matchesQuery);
                currentMatchList = matchesSnapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
            } else {
                currentMatchList = [];
            }

            document.getElementById('matchSearchInput').value = '';
            renderMatches(currentMatchList);
            showPage('matchPage');
        } catch (error) {
            console.error("Error showing matches:", error);
        }
    }
    
    function calculateCompatibility(user1, user2) {
        if (!user1.interests || !user2.interests) return 20;
        const commonInterests = user1.interests.filter(i => user2.interests.includes(i));
        const maxInterests = Math.max(user1.interests.length, user2.interests.length);
        if (maxInterests === 0) return 20; // Base compatibility
        const score = (commonInterests.length / maxInterests) * 100;
        return Math.min(100, Math.round(score) + 20); // Add base and cap at 100
    }

    function createMessageHTML(message) {
        if (!currentUser || !currentChatUser) return '';

        const isCurrentUser = message.senderId === currentUser.uid;
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

    window.startChat = async (userId) => {
        const userDoc = await getDoc(doc(db, "users", userId));
        currentChatUser = { uid: userDoc.id, ...userDoc.data() };

        if (!currentChatUser || !currentUser) return;
        
        // Setup header with name and call buttons
        document.getElementById('chatPartnerName').textContent = `${currentChatUser.name}`;
        const callButtonsContainer = document.getElementById('callButtons');
        callButtonsContainer.innerHTML = `
            <button onclick="startVoiceCall('${currentChatUser.uid}')" title="Voice Call">📞</button>
            <button onclick="startVideoCall('${currentChatUser.uid}')" title="Video Call">📹</button>
            <button class="block-btn" onclick="blockUser('${currentChatUser.uid}')" title="Block User">🚫</button>
        `;

        const chatBox = document.getElementById('chatBox');
        chatBox.innerHTML = ''; // Clear the box
        typingIndicator.style.display = 'none'; // Ensure it's hidden

        const chatId = getChatId(currentUser.uid, currentChatUser.uid);
        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, orderBy("timestamp"));

        // Listen for real-time messages
        unsubscribeChatListener = onSnapshot(q, (querySnapshot) => {
            chatBox.innerHTML = '';
            if (querySnapshot.empty) {
                chatBox.innerHTML = `<p><em>This is the beginning of your conversation with ${currentChatUser.name}.</em></p>`;
            } else {
                querySnapshot.forEach((doc) => {
                    const message = doc.data();
                    // Convert Firestore timestamp to JS Date if needed
                    const formattedMessage = {
                        ...message,
                        timestamp: message.timestamp ? message.timestamp.toDate().toISOString() : new Date().toISOString()
                    };
                    chatBox.innerHTML += createMessageHTML(formattedMessage);
                });
            }
            chatBox.scrollTop = chatBox.scrollHeight;
        });

        showPage('chatPage');
    }

    window.sendMessage = async () => {
        const chatInput = document.getElementById('chatInput');
        const messageText = chatInput.value.trim();

        if (messageText && currentUser && currentChatUser) {
            const chatId = getChatId(currentUser.uid, currentChatUser.uid);
            const messagesRef = collection(db, "chats", chatId, "messages");
            await addDoc(messagesRef, {
                senderId: currentUser.uid,
                text: messageText,
                timestamp: serverTimestamp()
            });
            chatInput.value = '';
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

    window.blockUser = async (userIdToBlock) => {
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

        try {
            const myRef = doc(db, "users", currentUser.uid);
            const theirRef = doc(db, "users", userIdToBlock);

            const batch = writeBatch(db);

            // Add them to my blocked list
            batch.update(myRef, { blocked: arrayUnion(userIdToBlock) });
            // Remove them from my likes list
            batch.update(myRef, { likes: arrayRemove(userIdToBlock) });
            // Remove me from their likes list
            batch.update(theirRef, { likes: arrayRemove(currentUser.uid) });

            await batch.commit();

            alert("User has been blocked.");
            showMatches(); // Go back to the matches page, which will now be updated.
        } catch (error) {
            console.error("Error blocking user:", error);
            alert("Failed to block user.");
        }
    }

    window.hangUp = () => {
        document.getElementById('callOverlay').style.display = 'none';
    }

    // --- APP INITIALIZATION & AUTH STATE LISTENER ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in.
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                currentUser = {
                    uid: user.uid,
                    ...user, // auth properties like email
                    profile: userDoc.data() // firestore profile data
                };
                await updateDoc(userDocRef, { lastSeen: serverTimestamp() });
                userNameSpan.textContent = currentUser.profile.name;
                showPage('dashboardPage');
            } else {
                // This case happens if auth user exists but firestore doc was deleted.
                // Treat as a new user needing profile setup.
                showPage('profilePage');
            }
        } else {
            // User is signed out.
            currentUser = null;
            showPage('loginPage');
        }
    });

    // --- THEME INITIALIZATION ---
    if (Theme.get() === 'dark') { body.classList.add('dark'); modeToggleButton.textContent = '☀️ Light'; }
});