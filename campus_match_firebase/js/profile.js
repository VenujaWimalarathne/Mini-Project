/* ===== PROFILE SETUP ===== */

let photoDataUrl = null;

window.startCamera = async () => {
    const video = document.getElementById('camera');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.style.display = 'block';
    } catch (err) {
        console.error('Error accessing camera:', err);
        alert('Could not access camera. Please check permissions.');
    }
};

window.takePhoto = () => {
    const video   = document.getElementById('camera');
    const canvas  = document.getElementById('canvas');
    const preview = document.getElementById('preview');
    const context = canvas.getContext('2d');

    if (!video.srcObject) {
        alert('Camera not started.');
        return;
    }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    photoDataUrl = canvas.toDataURL('image/png');
    preview.src  = photoDataUrl;
    preview.style.display = 'block';
    video.style.display   = 'none';

    // Stop camera stream
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
};

window.checkFileSize = () => {
    const file    = document.getElementById('upload').files[0];
    const preview = document.getElementById('preview');

    if (file && file.size > 2 * 1024 * 1024) {
        alert('File is too large. Please select an image under 2MB.');
        document.getElementById('upload').value = '';
        return;
    }
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            photoDataUrl = e.target.result;
            preview.src  = photoDataUrl;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
};

window.saveProfile = () => {
    if (!currentUser) return;

    currentUser.bio      = document.getElementById('bio').value.trim();
    currentUser.insta    = document.getElementById('insta').value.trim();
    currentUser.facebook = document.getElementById('facebook').value.trim();

    const waRaw = document.getElementById('whatsapp').value.trim();
    if (waRaw && waRaw.length !== 9) {
        alert('Please enter a valid 9-digit Sri Lankan WhatsApp number (after +94).');
        return;
    }
    currentUser.whatsapp = waRaw ? '+94' + waRaw : '';

    const interests = [];
    document.querySelectorAll('.interests-grid input[type="checkbox"]:checked').forEach(cb => {
        interests.push(cb.value);
    });
    currentUser.interests = interests;

    if (photoDataUrl) {
        currentUser.photo = photoDataUrl;
    }

    updateAndSaveCurrentUser();
    showToast('Profile saved ✓');
    document.getElementById('userName').textContent = currentUser.name;
    showPage('dashboardPage');
};
