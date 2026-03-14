/* ===== AUTHENTICATION (Firebase edition) ===== */

window.login = async () => {
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const pass = document.getElementById('loginPass').value;
    const user = users.find(u => (u.email === identifier || u.id === identifier) && u.password === pass);
    if (user) {
        currentUser = user;
        currentUser.lastSeen = new Date().toISOString();
        updateAndSaveCurrentUser();
        DB.setCurrentUserId(user.id);
        document.getElementById('userName').textContent = user.name;
        showPage('dashboardPage');
    } else {
        alert('Invalid credentials. Please check your Email/ID and Password.');
    }
};

window.logout = () => {
    currentUser = null;
    DB.setCurrentUserId(null);
    showPage('loginPage');
};

window.forgotPassword = () => {
    const identifier = prompt('Enter your Email or University ID to recover your password:');
    if (identifier) {
        const user = users.find(u => u.email === identifier.trim() || u.id === identifier.trim());
        if (user) {
            alert(`Your password is: ${user.password}`);
        } else {
            alert('User not found.');
        }
    }
};

window.signup = () => {
    const name     = document.getElementById('name').value.trim();
    const email    = document.getElementById('email').value.trim();
    const age      = document.getElementById('age').value;
    const gender   = document.getElementById('gender').value;
    const pref     = document.getElementById('pref').value;
    const faculty  = document.getElementById('faculty').value.trim();
    const year     = document.getElementById('year').value;
    const studentID = document.getElementById('studentID').value.trim();
    const password  = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!name || !email || !age || !faculty || !year || !studentID || !password || !confirmPassword) {
        alert('Please fill all fields.');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { alert('Please enter a valid email address.'); return; }
    if (users.some(u => u.id === studentID)) { alert('Student ID already exists.'); return; }
    if (password !== confirmPassword) { alert('Passwords do not match.'); return; }
    if (users.some(u => u.email === email)) { alert('Email already registered.'); return; }

    pendingUser = {
        id: studentID, password, name, email, age, gender,
        preference: pref, faculty, year,
        bio: '', photo: 'https://i.pravatar.cc/300',
        interests: [], likes: [], passes: [], blocked: []
    };

    showPage('verificationPage');
};

window.verifyCode = async () => {
    if (pendingUser) {
        users.push(pendingUser);
        await DB.saveUser(pendingUser);   // single-doc write for new user
        currentUser = pendingUser;
        DB.setCurrentUserId(currentUser.id);
        alert('Signup successful! Please set up your profile.');
        showPage('profilePage');
        pendingUser = null;
    } else {
        alert('Registration session expired. Please sign up again.');
        showPage('signupPage');
    }
};

window.resendVerification = () => {
    const resendBtn = document.getElementById('resendVerificationBtn');
    if (!resendBtn) return;
    let cooldown = 30;
    resendBtn.disabled = true;
    alert('A new verification link has been sent (simulation).');
    const interval = setInterval(() => {
        cooldown--;
        resendBtn.textContent = `Resend in ${cooldown}s`;
        if (cooldown <= 0) {
            clearInterval(interval);
            resendBtn.disabled = false;
            resendBtn.textContent = 'Resend Link';
        }
    }, 1000);
};

window.deleteAccount = async () => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to delete your account? This action is irreversible.')) return;
    const passwordCheck = prompt('Please enter your password to confirm deletion:');
    if (passwordCheck === null) return;
    if (passwordCheck !== currentUser.password) { alert('Incorrect password. Account deletion cancelled.'); return; }

    const userIdToDelete = currentUser.id;
    users = users.filter(user => user.id !== userIdToDelete);

    users.forEach(user => {
        if (user.likes)       user.likes       = user.likes.filter(id => id !== userIdToDelete);
        if (user.passes)      user.passes      = user.passes.filter(id => id !== userIdToDelete);
        if (user.blocked)     user.blocked     = user.blocked.filter(id => id !== userIdToDelete);
        if (user.newMatches)  user.newMatches  = user.newMatches.filter(id => id !== userIdToDelete);
        if (user.unreadMessages) delete user.unreadMessages[userIdToDelete];
    });

    await DB.deleteUser(userIdToDelete);
    await DB.saveUsers(users);  // update mutual refs in remaining users

    const allChats = await DB.getChats();
    const cleanedChats = {};
    for (const chatId in allChats) {
        if (!chatId.split('_').includes(userIdToDelete)) {
            cleanedChats[chatId] = allChats[chatId];
        }
    }
    await DB.saveChats(cleanedChats);

    alert('Your account has been successfully deleted.');
    window.logout();
};

window.showSettingsPage = () => {
    if (!currentUser) return;
    document.getElementById('newEmail').value = currentUser.email || '';
    document.getElementById('currentPass').value = '';
    document.getElementById('newPass').value = '';
    document.getElementById('confirmNewPass').value = '';
    showPage('settingsPage');
};

window.saveSettings = async () => {
    if (!currentUser) return;

    const currentPass    = document.getElementById('currentPass').value;
    const newEmail       = document.getElementById('newEmail').value.trim();
    const newPass        = document.getElementById('newPass').value;
    const confirmNewPass = document.getElementById('confirmNewPass').value;

    if (!currentPass) { alert('Please enter your current password to make changes.'); return; }
    if (currentPass !== currentUser.password) { alert('Incorrect current password.'); return; }

    let changesMade = false;

    if (newEmail && newEmail !== currentUser.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) { alert('Please enter a valid new email address.'); return; }
        if (users.some(u => u.email === newEmail && u.id !== currentUser.id)) {
            alert('This email address is already registered.'); return;
        }
        currentUser.email = newEmail;
        changesMade = true;
    }

    if (newPass) {
        if (newPass !== confirmNewPass) { alert('New passwords do not match.'); return; }
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
};
