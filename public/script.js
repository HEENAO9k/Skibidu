// Socket connection - use relative URL to work with proxy
const socket = io({
  transports: ['websocket', 'polling'],
  timeout: 20000,
  forceNew: true,
  autoConnect: true
});

// Debug socket connection
socket.on('connect', () => {
  console.log('✅ Socket connected successfully');
  console.log('Socket ID:', socket.id);
  showToast('เชื่อมต่อเซิร์ฟเวอร์สำเร็จ', 'success');
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error);
  showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket disconnected:', reason);
  showToast('การเชื่อมต่อขาดหาย', 'warning');
});

// Global variables
let currentSessionId = null;
let currentConfig = {};

// DOM elements
const uploadForm = document.getElementById('upload-form');
const submitBtn = document.getElementById('submitBtn');
const progressModal = document.getElementById('progressModal');
const successModal = document.getElementById('successModal');
const videoPreview = document.getElementById('videoPreview');
const previewGif = document.getElementById('preview-gif');
const announcementBanner = document.getElementById('announcement-banner');
const announcementText = document.getElementById('announcement-text');
const closeAnnouncement = document.getElementById('close-announcement');
const adminBtn = document.getElementById('admin-btn');

// File inputs
const videoInput = document.getElementById('video');
const audioInput = document.getElementById('audio');
const iconInput = document.getElementById('icon');

// YouTube elements
const youtubeUrl = document.getElementById('youtubeUrl');
const loadYoutube = document.getElementById('loadYoutube');
const youtubePreview = document.getElementById('youtubePreview');
const youtubeSection = document.getElementById('youtube-section');
const uploadSection = document.getElementById('upload-section');

// TikTok elements
const tiktokUrl = document.getElementById('tiktokUrl');
const loadTiktok = document.getElementById('loadTiktok');
const tiktokPreview = document.getElementById('tiktokPreview');
const tiktokSection = document.getElementById('tiktok-section');

console.log('TikTok elements check:', { 
  tiktokUrl: !!tiktokUrl, 
  loadTiktok: !!loadTiktok, 
  tiktokPreview: !!tiktokPreview,
  tiktokSection: !!tiktokSection
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  setupEventListeners();
  initializeParticles();
  initializeChatWidget();
  initializeAdminMediaDisplay();
  initializeMediaPlayer();
  registerServiceWorker();
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').catch(function(){});
    });
  }
}

function initializeApp() {
  // Load initial configuration immediately
  fetch('/api/config')
    .then(response => response.json())
    .then(config => {
      currentConfig = config;
      updateUIFromConfig(config);
    })
    .catch(error => console.error('Failed to load config:', error));

  // Load initial configuration via socket
  socket.on('config-update', (config) => {
    currentConfig = config;
    updateUIFromConfig(config);
  });

  // Handle errors
  socket.on('error', (error) => {
    hideProgress();
    showToast(error.message || 'เกิดข้อผิดพลาด', 'error');
  });

  // Handle progress updates
  socket.on('progress-update', (data) => {
    console.log('Progress update:', data);
    updateProgress(data.step, data.progress, data.message, data.timeLeft);
  });

  // Handle download ready
  socket.on('download-ready', (data) => {
    console.log('Download ready:', data);
    hideProgress();
    showSuccessModal(data.downloadUrl, data.textureName);
  });

  // Handle admin login alerts
  socket.on('admin-login-alert', (data) => {
    showAdminLoginAlert(data);
  });

  // Handle various events
  socket.on('global-alert', (data) => {
    showGlobalAlert(data);
  });

  socket.on('maintenance-alert', (data) => {
    showMaintenanceAlert(data);
  });

  socket.on('normal-mode-alert', (data) => {
    showToast(data.message, 'success');
  });

  socket.on('party-mode', (data) => {
    activatePartyMode(data);
  });

  socket.on('hacker-mode', (data) => {
    activateHackerMode(data);
  });

  socket.on('rainbow-mode', (data) => {
    activateRainbowMode(data);
  });

  socket.on('epic-announcement', (data) => {
    showEpicAnnouncement(data);
  });

  socket.on('speed-boost', (data) => {
    showSpeedBoost(data);
  });

  socket.on('server-stats-display', (data) => {
    showServerStats(data);
  });

  socket.on('new-event', (event) => {
    showNewEventNotification(event);
  });

  // Connection events
  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
}

function setupEventListeners() {
  // Form submission
  uploadForm.addEventListener('submit', handleFormSubmit);

  // File input changes
  videoInput.addEventListener('change', () => handleFileChange(videoInput, 'videoDisplay'));
  audioInput.addEventListener('change', () => handleFileChange(audioInput, 'audioDisplay'));
  iconInput.addEventListener('change', () => handleFileChange(iconInput, 'iconDisplay'));

  // Video preview
  videoInput.addEventListener('change', showVideoPreview);

  // YouTube functionality
  if (loadYoutube && youtubeUrl) {
    loadYoutube.addEventListener('click', handleYouTubeLoad);
    youtubeUrl.addEventListener('input', validateYouTubeUrl);
  }
  
  // TikTok functionality
  if (loadTiktok && tiktokUrl) {
    loadTiktok.addEventListener('click', handleTikTokLoad);
    tiktokUrl.addEventListener('input', validateTikTokUrl);
    console.log('TikTok event listeners attached successfully');
    
    // Force enable the button initially
    loadTiktok.disabled = false;
    console.log('TikTok button enabled initially');
  } else {
    console.error('TikTok elements not found:', { loadTiktok, tiktokUrl });
  }

  // Modal controls
  document.getElementById('closeSuccess').addEventListener('click', () => {
    successModal.style.display = 'none';
  });

  // Announcement banner
  closeAnnouncement.addEventListener('click', () => {
    announcementBanner.style.display = 'none';
  });

  // Admin access
  adminBtn.addEventListener('click', () => {
    window.open('/admin.html', '_blank');
  });

  // Click outside modal to close
  window.addEventListener('click', (e) => {
    if (e.target === progressModal) {
      // Don't allow closing progress modal
    }
    if (e.target === successModal) {
      successModal.style.display = 'none';
    }
  });
}

function updateUIFromConfig(config) {
  // Update CSS variables
  document.documentElement.style.setProperty('--primary-color', config.primaryColor);
  document.documentElement.style.setProperty('--secondary-color', config.secondaryColor);
  document.documentElement.style.setProperty('--accent-color', config.accentColor);

  // Update GIF
  if (config.gifUrl && previewGif) {
    previewGif.src = config.gifUrl;
  }

  // Show/hide sections based on config
  if (youtubeSection) {
    youtubeSection.style.display = config.youtubeEnabled ? 'block' : 'none';
  }
  if (tiktokSection) {
    tiktokSection.style.display = config.youtubeEnabled ? 'block' : 'none'; // Use same setting for TikTok
  }
  if (uploadSection) {
    uploadSection.style.display = config.uploadEnabled ? 'block' : 'none';
  }

  // Show announcement
  if (config.announcement && config.announcement.trim()) {
    announcementText.textContent = config.announcement;
    announcementBanner.style.display = 'block';
  } else {
    announcementBanner.style.display = 'none';
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  const formData = new FormData();
  
  // Add form fields
  const fields = ['textureName', 'email', 'fps', 'quality', 'youtubeQuality', 'tiktokQuality'];
  fields.forEach(field => {
    const element = document.getElementById(field);
    if (element && element.value) {
      formData.append(field, element.value);
    }
  });

  // Add YouTube data
  const youtubeVideoId = extractYouTubeId(youtubeUrl.value);
  if (youtubeVideoId) {
    formData.append('youtubeVideoId', youtubeVideoId);
  }

  const useYoutubeAudio = document.getElementById('useYoutubeAudio').checked;
  formData.append('useYoutubeAudio', useYoutubeAudio);

  const youtubeAudioUrl = document.getElementById('youtubeAudioUrl').value;
  const youtubeAudioId = extractYouTubeId(youtubeAudioUrl);
  if (youtubeAudioId) {
    formData.append('youtubeAudioId', youtubeAudioId);
  }

  // Add TikTok data
  const tiktokUrlValue = tiktokUrl.value.trim();
  if (tiktokUrlValue) {
    formData.append('tiktokUrl', tiktokUrlValue);
  }

  const useTiktokAudio = document.getElementById('useTiktokAudio').checked;
  formData.append('useTiktokAudio', useTiktokAudio);

  const tiktokAudioUrlValue = document.getElementById('tiktokAudioUrl').value.trim();
  if (tiktokAudioUrlValue) {
    formData.append('tiktokAudioUrl', tiktokAudioUrlValue);
  }

  // Add files
  if (videoInput.files[0]) {
    formData.append('video', videoInput.files[0]);
  }
  if (audioInput.files[0]) {
    formData.append('audio', audioInput.files[0]);
  }
  if (iconInput.files[0]) {
    formData.append('icon', iconInput.files[0]);
  }

  try {
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'เกิดข้อผิดพลาดในการอัปโหลด');
    }

    currentSessionId = result.sessionId;
    console.log('Got session ID:', currentSessionId, 'Socket connected:', socket.connected);
    
    if (socket.connected) {
      socket.emit('join-progress', currentSessionId);
      showProgress();
    } else {
      showToast('การเชื่อมต่อขาดหาย กำลังพยายามเชื่อมต่อใหม่...', 'warning');
      socket.connect();
      socket.once('connect', () => {
        socket.emit('join-progress', currentSessionId);
        showProgress();
      });
    }

  } catch (error) {
    showToast(error.message, 'error');
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
  }
}

function validateForm() {
  const hasVideo = videoInput.files.length > 0;
  const hasYouTube = youtubeUrl.value.trim() !== '';
  const hasTikTok = tiktokUrl.value.trim() !== '';

  console.log('Form validation:', { hasVideo, hasYouTube, hasTikTok });

  if (!hasVideo && !hasYouTube && !hasTikTok) {
    showToast('กรุณาอัปโหลดไฟล์วิดีโอหรือใส่ URL YouTube/TikTok', 'warning');
    return false;
  }

  if (!currentConfig.uploadEnabled && hasVideo) {
    showToast('ระบบอัปโหลดไฟล์ถูกปิดใช้งานชั่วคราว', 'error');
    return false;
  }

  if (!currentConfig.youtubeEnabled && (hasYouTube || hasTikTok)) {
    showToast('ระบบดาวน์โหลด YouTube/TikTok ถูกปิดใช้งานชั่วคราว', 'error');
    return false;
  }

  const fps = document.getElementById('fps').value;
  const quality = document.getElementById('quality').value;

  if (fps < 10 || fps > 60) {
    showToast('FPS ต้องอยู่ระหว่าง 10-60', 'warning');
    return false;
  }

  if (quality < 30 || quality > 100) {
    showToast('คุณภาพภาพต้องอยู่ระหว่าง 30-100%', 'warning');
    return false;
  }

  return true;
}

function handleFileChange(input, displayId) {
  const display = document.getElementById(displayId);
  const file = input.files[0];

  if (file) {
    display.classList.add('has-file');
    const uploadText = display.querySelector('.upload-text');
    const uploadHint = display.querySelector('.upload-hint');
    
    uploadText.textContent = file.name;
    uploadHint.textContent = `ขนาด: ${formatFileSize(file.size)}`;
  } else {
    display.classList.remove('has-file');
    resetFileDisplay(displayId);
  }
}

function resetFileDisplay(displayId) {
  const display = document.getElementById(displayId);
  const uploadText = display.querySelector('.upload-text');
  const uploadHint = display.querySelector('.upload-hint');
  
  switch (displayId) {
    case 'videoDisplay':
      uploadText.textContent = 'อัปโหลดไฟล์วิดีโอ';
      uploadHint.textContent = 'MP4, AVI, MOV หรือรูปแบบอื่นๆ';
      break;
    case 'audioDisplay':
      uploadText.textContent = 'อัปโหลดไฟล์เสียง';
      uploadHint.textContent = 'MP3, WAV, OGG หรือรูปแบบอื่นๆ';
      break;
    case 'iconDisplay':
      uploadText.textContent = 'อัปโหลดไอคอน';
      uploadHint.textContent = 'PNG, JPG (แนะนำ 128x128px)';
      break;
  }
}

function showVideoPreview() {
  const file = videoInput.files[0];
  if (!file) {
    videoPreview.style.display = 'none';
    return;
  }

  const video = document.getElementById('previewVideo');
  const fileName = document.getElementById('fileName');
  const duration = document.getElementById('duration');
  const dimensions = document.getElementById('dimensions');

  video.src = URL.createObjectURL(file);
  fileName.textContent = file.name;

  video.onloadedmetadata = () => {
    duration.textContent = formatDuration(video.duration);
    dimensions.textContent = `${video.videoWidth} × ${video.videoHeight}`;
    videoPreview.style.display = 'block';
  };
}

async function handleYouTubeLoad() {
  const url = youtubeUrl.value.trim();
  const videoId = extractYouTubeId(url);

  if (!videoId) {
    showToast('กรุณาใส่ URL YouTube ที่ถูกต้อง', 'warning');
    return;
  }

  if (!currentConfig.youtubeEnabled) {
    showToast('ระบบดาวน์โหลด YouTube ถูกปิดใช้งานชั่วคราว', 'error');
    return;
  }

  try {
    loadYoutube.disabled = true;
    loadYoutube.classList.add('loading');

    // Load YouTube video info (mock for demo)
    const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const title = 'YouTube Video'; // In real app, you'd fetch this from YouTube API
    
    document.getElementById('youtubeThumbnail').src = thumbnail;
    document.getElementById('youtubeTitle').textContent = title;
    document.getElementById('youtubeDuration').textContent = 'Loading...';
    
    youtubePreview.style.display = 'block';
    showToast('โหลดวิดีโอ YouTube สำเร็จ', 'success');

  } catch (error) {
    showToast('ไม่สามารถโหลดวิดีโอ YouTube ได้', 'error');
  } finally {
    loadYoutube.disabled = false;
    loadYoutube.classList.remove('loading');
  }
}

function validateYouTubeUrl() {
  const url = youtubeUrl.value.trim();
  const videoId = extractYouTubeId(url);
  
  loadYoutube.disabled = !videoId || !currentConfig.youtubeEnabled;
}

function extractYouTubeId(url) {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// TikTok functions
async function handleTikTokLoad() {
  console.log('TikTok load button clicked');
  const url = tiktokUrl.value.trim();
  
  console.log('TikTok URL value:', url);

  if (!url) {
    showToast('กรุณาใส่ URL TikTok', 'warning');
    return;
  }

  if (!url.includes('tiktok.com')) {
    showToast('กรุณาใส่ URL TikTok ที่ถูกต้อง', 'warning');
    return;
  }

  try {
    loadTiktok.disabled = true;
    loadTiktok.classList.add('loading');
    loadTiktok.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังโหลด...';
    console.log('TikTok loading started');

    // Fetch real video info from backend API
    const response = await fetch('/api/tiktok-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: url })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'ไม่สามารถดึงข้อมูลวิดีโอได้');
    }

    const videoInfo = await response.json();
    console.log('TikTok video info:', videoInfo);
    
    // Update preview with real video info
    const thumbnailImg = document.getElementById('tiktokThumbnail');
    if (videoInfo.thumbnail) {
      thumbnailImg.src = videoInfo.thumbnail;
      thumbnailImg.style.display = 'block';
      thumbnailImg.onerror = () => {
        console.log('Thumbnail failed to load, hiding image');
        thumbnailImg.style.display = 'none';
      };
    } else {
      thumbnailImg.style.display = 'none';
    }
    
    document.getElementById('tiktokTitle').textContent = videoInfo.title || 'TikTok Video';
    document.getElementById('tiktokDuration').textContent = videoInfo.duration || 'ไม่ทราบ';
    
    tiktokPreview.style.display = 'block';
    showToast('โหลดวิดีโอ TikTok สำเร็จ - พร้อมใช้งาน', 'success');
    console.log('TikTok preview shown successfully');

  } catch (error) {
    console.error('TikTok load error:', error);
    showToast(error.message || 'ไม่สามารถโหลดวิดีโอ TikTok ได้', 'error');
  } finally {
    loadTiktok.disabled = false;
    loadTiktok.classList.remove('loading');
    loadTiktok.innerHTML = '<i class="fas fa-download"></i> โหลด';
    console.log('TikTok loading finished');
  }
}

function validateTikTokUrl() {
  const url = tiktokUrl.value.trim();
  const videoId = extractTikTokId(url);
  
  if (loadTiktok) {
    loadTiktok.disabled = !videoId || !currentConfig.youtubeEnabled;
    console.log('TikTok validation:', { url, videoId, disabled: loadTiktok.disabled });
  }
}

function extractTikTokId(url) {
  if (!url) return null;
  
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/t\/([A-Za-z0-9]+)/,
    /(?:https?:\/\/)?vm\.tiktok\.com\/([A-Za-z0-9]+)/,
    /(?:https?:\/\/)?vt\.tiktok\.com\/([A-Za-z0-9]+)/,
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/v\/(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      console.log('TikTok URL matched:', { url, pattern: pattern.toString(), id: match[1] });
      return match[1];
    }
  }
  
  console.log('TikTok URL not matched:', url);
  return null;
}

function showProgress() {
  console.log('Showing progress modal');
  progressModal.style.display = 'block';
  document.body.style.overflow = 'hidden';
  resetProgress();
}

function hideProgress() {
  console.log('Hiding progress modal');
  progressModal.style.display = 'none';
  document.body.style.overflow = '';
  submitBtn.disabled = false;
  submitBtn.classList.remove('loading');
}

function resetProgress() {
  document.getElementById('progressFill').style.width = '0%';
  document.getElementById('progressPercent').textContent = '0%';
  document.getElementById('progressMessage').textContent = 'เริ่มต้นการประมวลผล...';
  document.getElementById('currentStep').textContent = 'ขั้นตอนที่ 1';
  document.getElementById('timeLeft').textContent = '';

  // Reset all steps
  document.querySelectorAll('.step').forEach(step => {
    step.classList.remove('active', 'completed');
  });
}

function updateProgress(step, progress, message, timeLeft) {
  // Update progress bar
  document.getElementById('progressFill').style.width = `${progress}%`;
  document.getElementById('progressPercent').textContent = `${progress}%`;
  document.getElementById('progressMessage').textContent = message;
  document.getElementById('currentStep').textContent = `ขั้นตอนที่ ${step}`;
  
  if (timeLeft) {
    document.getElementById('timeLeft').textContent = `เหลือเวลา: ${timeLeft} วินาที`;
  }

  // Update step indicators
  document.querySelectorAll('.step').forEach((stepEl, index) => {
    const stepNumber = index + 1;
    stepEl.classList.remove('active', 'completed');
    
    if (stepNumber < step) {
      stepEl.classList.add('completed');
    } else if (stepNumber === step) {
      stepEl.classList.add('active');
    }
  });
}

function showSuccessModal(downloadUrl, textureName) {
  console.log('Showing success modal with download URL:', downloadUrl);
  hideProgress();
  
  document.getElementById('downloadTextureName').textContent = textureName || 'Texture Pack';
  document.getElementById('downloadBtn').href = downloadUrl;
  
  successModal.style.display = 'block';
  
  // Auto download after 3 seconds
  setTimeout(() => {
    console.log('Auto-clicking download button');
    document.getElementById('downloadBtn').click();
  }, 3000);
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = getToastIcon(type);
  toast.innerHTML = `
    <i class="${icon}"></i>
    <span>${message}</span>
  `;
  
  const container = document.getElementById('toast-container');
  container.appendChild(toast);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s ease forwards';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 5000);
}

function getToastIcon(type) {
  switch (type) {
    case 'success': return 'fas fa-check-circle';
    case 'error': return 'fas fa-exclamation-circle';
    case 'warning': return 'fas fa-exclamation-triangle';
    default: return 'fas fa-info-circle';
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Admin login alert function
function showAdminLoginAlert(data) {
  // Create full-screen alert overlay
  const alertOverlay = document.createElement('div');
  alertOverlay.id = 'admin-alert-overlay';
  alertOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 0, 0, 0.8);
    z-index: 99999;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    animation: alertFlash 0.5s ease-in-out 3, screenShake 2s ease-in-out;
  `;

  // Add notifications
  data.notifications.forEach((notification, index) => {
    setTimeout(() => {
      const notificationDiv = document.createElement('div');
      notificationDiv.style.cssText = `
        background: linear-gradient(45deg, #ff0000, #ff4444, #ff6666);
        color: white;
        padding: 30px;
        margin: 20px;
        border-radius: 20px;
        text-align: center;
        box-shadow: 0 0 50px rgba(255, 0, 0, 0.8);
        border: 3px solid #fff;
        animation: epicEntry 1s ease-out, epicGlow 2s ease-in-out infinite alternate;
        max-width: 600px;
      `;
      
      notificationDiv.innerHTML = `
        <h1 style="font-size: 2.5rem; margin-bottom: 15px; text-shadow: 0 0 20px #fff;">${notification.title}</h1>
        <p style="font-size: 1.3rem; margin-bottom: 20px;">${notification.message}</p>
        <div style="font-size: 1rem; opacity: 0.8;">Power Level: ${data.adminPowerLevel}</div>
      `;
      
      alertOverlay.appendChild(notificationDiv);
      
      // Play alert sound
      playAlertSound();
      
      // Auto remove after duration
      setTimeout(() => {
        if (notificationDiv.parentNode) {
          notificationDiv.style.animation = 'fadeOut 1s ease-out forwards';
          setTimeout(() => {
            if (notificationDiv.parentNode) {
              notificationDiv.remove();
            }
          }, 1000);
        }
      }, notification.duration);
      
    }, index * 2000);
  });
  
  document.body.appendChild(alertOverlay);
  
  // Remove overlay after all notifications
  setTimeout(() => {
    if (alertOverlay.parentNode) {
      alertOverlay.style.animation = 'fadeOut 2s ease-out forwards';
      setTimeout(() => {
        if (alertOverlay.parentNode) {
          alertOverlay.remove();
        }
      }, 2000);
    }
  }, data.notifications.length * 2000 + 5000);
}

function playAlertSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create epic alert sound
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator1.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator1.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
    oscillator1.frequency.setValueAtTime(600, audioContext.currentTime + 0.4);
    
    oscillator2.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator2.frequency.setValueAtTime(400, audioContext.currentTime + 0.2);
    oscillator2.frequency.setValueAtTime(300, audioContext.currentTime + 0.4);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
    
    oscillator1.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 0.6);
    oscillator2.start(audioContext.currentTime);
    oscillator2.stop(audioContext.currentTime + 0.6);
    
  } catch (error) {
    console.log('Could not play alert sound:', error);
  }
}

function showGlobalAlert(data) {
  const alert = document.createElement('div');
  alert.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(45deg, #ff9800, #ff5722);
    color: white;
    padding: 40px;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 0 50px rgba(255, 152, 0, 0.8);
    z-index: 10000;
    animation: alertPulse 1s ease-in-out infinite;
    max-width: 500px;
  `;
  
  alert.innerHTML = `
    <h2 style="margin-bottom: 15px;">${data.title}</h2>
    <p style="font-size: 1.1rem;">${data.message}</p>
  `;
  
  document.body.appendChild(alert);
  
  setTimeout(() => {
    if (alert.parentNode) {
      alert.remove();
    }
  }, data.duration || 5000);
}

function showMaintenanceAlert(data) {
  const alert = document.createElement('div');
  alert.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    background: linear-gradient(45deg, #9c27b0, #673ab7);
    color: white;
    padding: 20px;
    text-align: center;
    z-index: 10000;
    animation: slideDown 1s ease-out;
  `;
  
  alert.innerHTML = `
    <h3>${data.title}</h3>
    <p>${data.message}</p>
  `;
  
  document.body.appendChild(alert);
}

function activatePartyMode(data) {
  // Add party effects
  const partyOverlay = document.createElement('div');
  partyOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1000;
    animation: rainbowBackground 2s linear infinite;
  `;
  
  // Add confetti
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: absolute;
      width: 10px;
      height: 10px;
      background: hsl(${Math.random() * 360}, 100%, 50%);
      top: -10px;
      left: ${Math.random() * 100}%;
      animation: confettiFall ${3 + Math.random() * 2}s linear infinite;
    `;
    partyOverlay.appendChild(confetti);
  }
  
  document.body.appendChild(partyOverlay);
  
  showToast('🎉 PARTY MODE ACTIVATED! 🎉', 'success');
  
  setTimeout(() => {
    if (partyOverlay.parentNode) {
      partyOverlay.remove();
    }
  }, data.duration);
}

function activateHackerMode(data) {
  // Add matrix rain effect
  const hackerOverlay = document.createElement('div');
  hackerOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    pointer-events: none;
    z-index: 1000;
  `;
  
  // Matrix rain
  const chars = '0123456789ABCDEF';
  for (let i = 0; i < 20; i++) {
    const column = document.createElement('div');
    column.style.cssText = `
      position: absolute;
      top: -100vh;
      left: ${i * 5}%;
      color: #0f0;
      font-family: 'Courier New', monospace;
      font-size: 20px;
      animation: matrixFall ${3 + Math.random() * 3}s linear infinite;
    `;
    
    let text = '';
    for (let j = 0; j < 20; j++) {
      text += chars[Math.floor(Math.random() * chars.length)] + '<br>';
    }
    column.innerHTML = text;
    hackerOverlay.appendChild(column);
  }
  
  document.body.appendChild(hackerOverlay);
  
  showToast('💻 HACKER MODE ACTIVATED! 💻', 'success');
  
  setTimeout(() => {
    if (hackerOverlay.parentNode) {
      hackerOverlay.remove();
    }
  }, data.duration);
}

function activateRainbowMode(data) {
  document.body.style.animation = 'rainbowShift 3s linear infinite';
  showToast('🌈 RAINBOW MODE! 🌈', 'success');
  
  setTimeout(() => {
    document.body.style.animation = '';
  }, data.duration);
}

function showEpicAnnouncement(data) {
  const announcement = document.createElement('div');
  announcement.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(45deg, #667eea, #764ba2);
    color: white;
    padding: 50px;
    border-radius: 25px;
    text-align: center;
    box-shadow: 0 0 100px rgba(102, 126, 234, 0.8);
    z-index: 10000;
    animation: epicScale 2s ease-in-out infinite alternate;
    max-width: 600px;
  `;
  
  announcement.innerHTML = `
    <h1 style="font-size: 3rem; margin-bottom: 20px; text-shadow: 0 0 20px #fff;">${data.title}</h1>
    <p style="font-size: 1.5rem;">${data.message}</p>
  `;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    if (announcement.parentNode) {
      announcement.remove();
    }
  }, data.duration);
}

function showSpeedBoost(data) {
  const speedIndicator = document.createElement('div');
  speedIndicator.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(45deg, #ffeb3b, #ff9800);
    color: #333;
    padding: 15px 25px;
    border-radius: 15px;
    font-weight: bold;
    z-index: 10000;
    animation: speedPulse 1s ease-in-out infinite;
  `;
  
  speedIndicator.innerHTML = '⚡ SPEED BOOST ACTIVE! ⚡';
  document.body.appendChild(speedIndicator);
  
  showToast(data.message, 'success');
  
  setTimeout(() => {
    if (speedIndicator.parentNode) {
      speedIndicator.remove();
    }
  }, data.duration);
}

function showServerStats(data) {
  const statsModal = document.createElement('div');
  statsModal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    color: #0f0;
    padding: 30px;
    border-radius: 15px;
    font-family: 'Courier New', monospace;
    z-index: 10000;
    border: 2px solid #0f0;
    box-shadow: 0 0 30px #0f0;
  `;
  
  statsModal.innerHTML = `
    <h3 style="text-align: center; margin-bottom: 20px;">${data.title}</h3>
    <div>Connected Users: ${data.stats.connectedUsers}</div>
    <div>Active Processes: ${data.stats.activeProcesses}</div>
    <div>Total Requests: ${data.stats.totalRequests}</div>
    <div>Uptime: ${Math.floor(data.stats.uptime / 3600)}h ${Math.floor((data.stats.uptime % 3600) / 60)}m</div>
  `;
  
  document.body.appendChild(statsModal);
  
  setTimeout(() => {
    if (statsModal.parentNode) {
      statsModal.remove();
    }
  }, data.duration);
}

function showNewEventNotification(event) {
  showToast(`🎉 อีเว้นท์ใหม่: ${event.title}`, 'success');
}

// Add additional CSS animations
const adminEffectStyles = document.createElement('style');
adminEffectStyles.textContent = `
  @keyframes alertFlash {
    0%, 100% { background: rgba(255, 0, 0, 0.8); }
    50% { background: rgba(255, 255, 0, 0.8); }
  }
  
  @keyframes screenShake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
    20%, 40%, 60%, 80% { transform: translateX(2px); }
  }
  
  @keyframes epicEntry {
    0% { transform: scale(0) rotate(180deg); opacity: 0; }
    50% { transform: scale(1.2) rotate(0deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  
  @keyframes epicGlow {
    0% { box-shadow: 0 0 50px rgba(255, 0, 0, 0.8); }
    100% { box-shadow: 0 0 100px rgba(255, 255, 0, 1); }
  }
  
  @keyframes fadeOut {
    to { opacity: 0; transform: scale(0.8); }
  }
  
  @keyframes alertPulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-50%, -50%) scale(1.05); }
  }
  
  @keyframes rainbowBackground {
    0% { filter: hue-rotate(0deg); }
    100% { filter: hue-rotate(360deg); }
  }
  
  @keyframes confettiFall {
    to { transform: translateY(100vh) rotate(360deg); }
  }
  
  @keyframes matrixFall {
    to { transform: translateY(100vh); }
  }
  
  @keyframes rainbowShift {
    0% { filter: hue-rotate(0deg); }
    100% { filter: hue-rotate(360deg); }
  }
  
  @keyframes epicScale {
    0% { transform: translate(-50%, -50%) scale(1); }
    100% { transform: translate(-50%, -50%) scale(1.1); }
  }
  
  @keyframes speedPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
`;
document.head.appendChild(adminEffectStyles);

// Add toast slide out animation
const style = document.createElement('style');
style.textContent = `
  @keyframes toastSlideOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
`;
document.head.appendChild(style);

// Chat Banner Functions (แบบประกาศ)
function initializeChatWidget() {
  const chatBanner = document.getElementById('chatBanner');
  const closeChatBanner = document.getElementById('closeChatBanner');
  
  // Close chat banner
  if (closeChatBanner) {
    closeChatBanner.addEventListener('click', () => {
      chatBanner.style.display = 'none';
    });
  }
  
  // Socket events for chat
  socket.on('admin-chat-broadcast', (data) => {
    displayChatBanner(data.message);
  });
}

function displayChatBanner(message) {
  const chatBanner = document.getElementById('chatBanner');
  const chatMessage = document.getElementById('chatMessage');
  
  if (chatBanner && chatMessage) {
    chatMessage.textContent = message;
    chatBanner.style.display = 'block';
    
    // Auto hide after 10 seconds
    setTimeout(() => {
      chatBanner.style.display = 'none';
    }, 10000);
  }
}

// Bottom Media Player Functions  
function initializeAdminMediaDisplay() {
  const closeBottomMedia = document.getElementById('closeBottomMedia');
  const toggleBottomVolume = document.getElementById('toggleBottomVolume');
  
  if (closeBottomMedia) {
    closeBottomMedia.addEventListener('click', () => {
      document.getElementById('bottomMediaPlayer').style.display = 'none';
    });
  }
  
  if (toggleBottomVolume) {
    toggleBottomVolume.addEventListener('click', toggleBottomMediaVolume);
  }
  
  // Socket events for media
  socket.on('media-play', (mediaData) => {
    displayBottomMedia(mediaData);
  });
  
  socket.on('media-stop', () => {
    document.getElementById('bottomMediaPlayer').style.display = 'none';
  });
}

function displayBottomMedia(mediaData) {
  const bottomMediaPlayer = document.getElementById('bottomMediaPlayer');
  const bottomVideoPlayer = document.getElementById('bottomVideoPlayer');
  const bottomAudioPlayer = document.getElementById('bottomAudioPlayer');
  const bottomFilePlayer = document.getElementById('bottomFilePlayer');
  const bottomVideoFrame = document.getElementById('bottomVideoFrame');
  const bottomAudioElement = document.getElementById('bottomAudioElement');
  const bottomAudioSource = document.getElementById('bottomAudioSource');
  const bottomFileVideo = document.getElementById('bottomFileVideo');
  const bottomFileSource = document.getElementById('bottomFileSource');
  const bottomMediaTitle = document.getElementById('bottomMediaTitle');
  
  console.log('Displaying bottom media:', mediaData);
  
  // ซ่อนทุก player ก่อน
  bottomVideoPlayer.style.display = 'none';
  bottomAudioPlayer.style.display = 'none';
  bottomFilePlayer.style.display = 'none';
  
  // ตรวจสอบว่าเป็นไฟล์ที่อัปโหลดหรือ URL
  if (mediaData.isFile) {
    // เป็นไฟล์ที่อัปโหลด
    if (mediaData.type === 'video') {
      bottomFileSource.src = mediaData.url;
      bottomFileVideo.load();
      bottomFilePlayer.style.display = 'block';
      bottomMediaTitle.textContent = 'Admin เล่นไฟล์วิดีโอ';
    } else {
      bottomAudioSource.src = mediaData.url;
      bottomAudioElement.load();
      bottomAudioPlayer.style.display = 'block';
      bottomMediaTitle.textContent = 'Admin เล่นไฟล์เสียง';
    }
  } else {
    // เป็น URL
    const youtubeId = extractYouTubeId(mediaData.url);
    
    if (youtubeId) {
      // YouTube video
      if (mediaData.type === 'video') {
        bottomVideoFrame.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
        bottomVideoPlayer.style.display = 'block';
        bottomMediaTitle.textContent = 'Admin เล่น YouTube Video';
      } else {
        // Audio only - ใช้ YouTube embed แต่ซ่อนวิดีโอ
        bottomVideoFrame.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
        bottomVideoFrame.style.height = '80px';
        bottomVideoPlayer.style.display = 'block';
        bottomMediaTitle.textContent = 'Admin เล่น YouTube Audio';
      }
    } else {
      // Direct media URL
      if (mediaData.type === 'video') {
        bottomVideoFrame.src = mediaData.url;
        bottomVideoPlayer.style.display = 'block';
        bottomMediaTitle.textContent = 'Admin เล่นวิดีโอจาก URL';
      } else {
        bottomAudioSource.src = mediaData.url;
        bottomAudioElement.load();
        bottomAudioPlayer.style.display = 'block';
        bottomMediaTitle.textContent = 'Admin เล่นเสียงจาก URL';
      }
    }
  }
  
  // แสดง player และเลื่อนลงล่าง
  bottomMediaPlayer.style.display = 'block';
  
  // เลื่อนลงล่างสุดอัตโนมัติ
  setTimeout(() => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  }, 300);
}

function toggleBottomMediaVolume() {
  const bottomAudioElement = document.getElementById('bottomAudioElement');
  const bottomFileVideo = document.getElementById('bottomFileVideo');
  const toggleBtn = document.getElementById('toggleBottomVolume');
  const volumeLevel = document.getElementById('bottomVolumeLevel');
  
  // หาองค์ประกอบที่กำลังเล่นอยู่
  let activeElement = null;
  if (bottomAudioElement && bottomAudioElement.closest('#bottomAudioPlayer').style.display !== 'none') {
    activeElement = bottomAudioElement;
  } else if (bottomFileVideo && bottomFileVideo.closest('#bottomFilePlayer').style.display !== 'none') {
    activeElement = bottomFileVideo;
  }
  
  if (activeElement) {
    if (activeElement.muted) {
      activeElement.muted = false;
      toggleBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
      volumeLevel.textContent = Math.round(activeElement.volume * 100) + '%';
    } else {
      activeElement.muted = true;
      toggleBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
      volumeLevel.textContent = '0%';
    }
  }
}

function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}



// Media Player Functions
let backgroundVideo = null;
let backgroundAudio = null;
let isMediaPlaying = false;

function initializeMediaPlayer() {
  const mediaPlayer = document.getElementById('mediaPlayer');
  const backgroundVideo = document.getElementById('backgroundVideo');
  const backgroundAudio = document.getElementById('backgroundAudio');
  const mediaToggle = document.getElementById('mediaToggle');
  
  // Media control events from admin
  socket.on('media-play', (mediaData) => {
    playBackgroundMedia(mediaData);
  });
  
  socket.on('media-pause', () => {
    pauseBackgroundMedia();
  });
  
  socket.on('media-stop', () => {
    stopBackgroundMedia();
  });
  
  socket.on('media-volume', (data) => {
    setMediaVolume(data.volume);
  });
  
  // Media toggle button
  mediaToggle.addEventListener('click', () => {
    if (isMediaPlaying) {
      pauseBackgroundMedia();
    } else {
      resumeBackgroundMedia();
    }
  });
}

function playBackgroundMedia(mediaData) {
  const mediaPlayer = document.getElementById('mediaPlayer');
  const backgroundVideo = document.getElementById('backgroundVideo');
  const backgroundAudio = document.getElementById('backgroundAudio');
  const mediaToggle = document.getElementById('mediaToggle');
  
  // Stop any current media
  stopBackgroundMedia();
  
  // Show media player
  mediaPlayer.style.display = 'block';
  
  if (mediaData.type === 'video') {
    // Play as video
    mediaPlayer.classList.add('video-mode');
    backgroundVideo.style.display = 'block';
    backgroundAudio.style.display = 'none';
    
    // Try to load YouTube URL directly or use embed
    if (mediaData.url.includes('youtube.com') || mediaData.url.includes('youtu.be')) {
      const videoId = extractYouTubeVideoId(mediaData.url);
      if (videoId) {
        backgroundVideo.innerHTML = `
          <iframe 
            width="100%" 
            height="100%" 
            src="https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&mute=0&controls=1&enablejsapi=1&origin=${window.location.origin}" 
            frameborder="0" 
            allow="autoplay; encrypted-media; fullscreen" 
            allowfullscreen>
          </iframe>
        `;
        console.log('🎥 Loading YouTube video:', videoId);
      }
    } else {
      // For direct video files
      backgroundVideo.innerHTML = `<video autoplay loop muted playsinline style="width: 100%; height: 100%; object-fit: cover;"><source src="${mediaData.url}" type="video/mp4"></video>`;
      const video = backgroundVideo.querySelector('video');
      if (video) {
        video.volume = mediaData.volume || 0.5;
        video.muted = false;
      }
    }
  } else {
    // Play as audio only
    mediaPlayer.classList.remove('video-mode');
    backgroundVideo.style.display = 'none';
    backgroundAudio.style.display = 'block';
    
    if (mediaData.url.includes('youtube.com') || mediaData.url.includes('youtu.be')) {
      // For YouTube audio, we'll need a different approach
      showToast('YouTube audio playback requires video mode', 'info');
      return;
    } else {
      backgroundAudio.src = mediaData.url;
      backgroundAudio.volume = mediaData.volume || 0.5;
      backgroundAudio.play().catch(console.error);
    }
  }
  
  isMediaPlaying = true;
  updateMediaToggleIcon(true);
}

function pauseBackgroundMedia() {
  const backgroundVideo = document.getElementById('backgroundVideo');
  const backgroundAudio = document.getElementById('backgroundAudio');
  
  if (backgroundVideo.style.display !== 'none') {
    // Handle iframe or video element
    const iframe = backgroundVideo.querySelector('iframe');
    const video = backgroundVideo.querySelector('video');
    if (iframe) {
      // For YouTube iframe, we can't directly pause, so we'll hide it
      iframe.style.display = 'none';
    } else if (video) {
      video.pause();
    }
  }
  if (backgroundAudio.style.display !== 'none') {
    backgroundAudio.pause();
  }
  
  isMediaPlaying = false;
  updateMediaToggleIcon(false);
}

function resumeBackgroundMedia() {
  const backgroundVideo = document.getElementById('backgroundVideo');
  const backgroundAudio = document.getElementById('backgroundAudio');
  
  if (backgroundVideo.style.display !== 'none') {
    // Handle iframe or video element
    const iframe = backgroundVideo.querySelector('iframe');
    const video = backgroundVideo.querySelector('video');
    if (iframe) {
      iframe.style.display = 'block';
    } else if (video) {
      video.play().catch(console.error);
    }
  }
  if (backgroundAudio.style.display !== 'none') {
    backgroundAudio.play().catch(console.error);
  }
  
  isMediaPlaying = true;
  updateMediaToggleIcon(true);
}

function stopBackgroundMedia() {
  const mediaPlayer = document.getElementById('mediaPlayer');
  const backgroundVideo = document.getElementById('backgroundVideo');
  const backgroundAudio = document.getElementById('backgroundAudio');
  
  // Stop and reset video
  backgroundVideo.pause();
  backgroundVideo.src = '';
  backgroundVideo.innerHTML = '';
  
  // Stop and reset audio
  backgroundAudio.pause();
  backgroundAudio.src = '';
  
  // Hide media player
  mediaPlayer.style.display = 'none';
  mediaPlayer.classList.remove('video-mode');
  
  isMediaPlaying = false;
  updateMediaToggleIcon(false);
}

function setMediaVolume(volume) {
  const backgroundVideo = document.getElementById('backgroundVideo');
  const backgroundAudio = document.getElementById('backgroundAudio');
  
  backgroundVideo.volume = volume;
  backgroundAudio.volume = volume;
}

function updateMediaToggleIcon(isPlaying) {
  const mediaToggle = document.getElementById('mediaToggle');
  const icon = mediaToggle.querySelector('i');
  
  if (isPlaying) {
    icon.className = 'fas fa-volume-up';
  } else {
    icon.className = 'fas fa-volume-mute';
  }
}

function extractYouTubeVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// ========================================================================================
// ENHANCED FEATURES: Search, Theme Toggle, and Notification System
// ========================================================================================

/**
 * Real-time Search System
 * Provides instant search functionality across all UI elements and settings
 */
class SearchSystem {
  constructor() {
    this.searchInput = document.getElementById('global-search');
    this.clearButton = document.getElementById('clear-search');
    this.searchResults = document.getElementById('search-results');
    this.filterButtons = document.querySelectorAll('.filter-btn');
    this.currentFilter = 'all';
    this.searchIndex = this.buildSearchIndex();
    this.debounceTimer = null;
    
    this.initializeSearch();
  }

  /**
   * สร้างดัชนีการค้นหาสำหรับองค์ประกอบต่างๆ ในหน้าเว็บ
   */
  buildSearchIndex() {
    return [
      // การตั้งค่าพื้นฐาน
      {
        id: 'textureName',
        title: 'ชื่อ Texture Pack',
        description: 'ตั้งชื่อสำหรับ Texture Pack ของคุณ',
        category: 'settings',
        icon: 'fas fa-palette',
        element: () => document.getElementById('textureName')
      },
      {
        id: 'email',
        title: 'อีเมลแจ้งเตือน',
        description: 'อีเมลสำหรับรับการแจ้งเตือนเมื่อสร้างเสร็จ',
        category: 'settings',
        icon: 'fas fa-envelope',
        element: () => document.getElementById('email')
      },
      {
        id: 'fps',
        title: 'FPS (เฟรมต่อวินาที)',
        description: 'ตั้งค่าความเร็วของภาพเคลื่อนไหว',
        category: 'options',
        icon: 'fas fa-film',
        element: () => document.getElementById('fps')
      },
      {
        id: 'quality',
        title: 'คุณภาพภาพ',
        description: 'ปรับคุณภาพของภาพที่ส่งออก',
        category: 'options',
        icon: 'fas fa-adjust',
        element: () => document.getElementById('quality')
      },
      // สื่อและไฟล์
      {
        id: 'youtube-section',
        title: 'YouTube Video',
        description: 'โหลดวิดีโอจาก YouTube เพื่อสร้าง Texture',
        category: 'media',
        icon: 'fab fa-youtube',
        element: () => document.getElementById('youtube-section')
      },
      {
        id: 'tiktok-section',
        title: 'TikTok Video',
        description: 'โหลดวิดีโอจาก TikTok เพื่อสร้าง Texture',
        category: 'media',
        icon: 'fab fa-tiktok',
        element: () => document.getElementById('tiktok-section')
      },
      {
        id: 'video',
        title: 'อัปโหลดไฟล์วิดีโอ',
        description: 'อัปโหลดไฟล์วิดีโอจากคอมพิวเตอร์',
        category: 'media',
        icon: 'fas fa-video',
        element: () => document.getElementById('video')
      },
      {
        id: 'audio',
        title: 'อัปโหลดไฟล์เสียง',
        description: 'อัปโหลดไฟล์เสียงแยกต่างหาก',
        category: 'media',
        icon: 'fas fa-music',
        element: () => document.getElementById('audio')
      },
      {
        id: 'icon',
        title: 'ไอคอน Texture Pack',
        description: 'อัปโหลดไอคอนสำหรับ Texture Pack',
        category: 'media',
        icon: 'fas fa-image',
        element: () => document.getElementById('icon')
      },
      // ตัวเลือกขั้นสูง
      {
        id: 'youtubeQuality',
        title: 'คุณภาพ YouTube',
        description: 'เลือกคุณภาพวิดีโอจาก YouTube',
        category: 'options',
        icon: 'fas fa-hd-video',
        element: () => document.getElementById('youtubeQuality')
      },
      {
        id: 'useYoutubeAudio',
        title: 'ใช้เสียงจาก YouTube',
        description: 'รวมเสียงจากวิดีโอ YouTube',
        category: 'options',
        icon: 'fas fa-volume-up',
        element: () => document.getElementById('useYoutubeAudio')
      }
    ];
  }

  /**
   * เริ่มต้นระบบค้นหา
   */
  initializeSearch() {
    // Event listeners สำหรับการค้นหา
    this.searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      this.handleSearch(query);
      
      // แสดง/ซ่อนปุ่มล้าง
      this.clearButton.style.display = query ? 'block' : 'none';
    });

    // ปุ่มล้างการค้นหา
    this.clearButton.addEventListener('click', () => {
      this.clearSearch();
    });

    // ปุ่มกรอง
    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setFilter(e.target.dataset.filter);
      });
    });

    // ปิดผลการค้นหาเมื่อคลิกข้างนอก
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        this.hideResults();
      }
    });

    // แสดงการแนะนำเมื่อโฟกัส
    this.searchInput.addEventListener('focus', () => {
      if (!this.searchInput.value.trim()) {
        this.showSuggestions();
      }
    });
  }

  /**
   * จัดการการค้นหา
   */
  handleSearch(query) {
    // ใช้ debounce เพื่อลดการประมวลผล
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.performSearch(query);
    }, 150);
  }

  /**
   * ดำเนินการค้นหา
   */
  performSearch(query) {
    if (!query) {
      this.hideResults();
      return;
    }

    const results = this.searchIndex.filter(item => {
      // กรองตามหมวดหมู่
      if (this.currentFilter !== 'all' && item.category !== this.currentFilter) {
        return false;
      }

      // ค้นหาในชื่อและคำอธิบาย
      const searchText = `${item.title} ${item.description}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });

    this.displayResults(results, query);
  }

  /**
   * แสดงผลการค้นหา
   */
  displayResults(results, query) {
    if (results.length === 0) {
      this.searchResults.innerHTML = `
        <div class="search-result-item">
          <div class="search-result-icon">
            <i class="fas fa-search"></i>
          </div>
          <div class="search-result-content">
            <div class="search-result-title">ไม่พบผลการค้นหา</div>
            <div class="search-result-description">ลองใช้คำค้นหาอื่น หรือเปลี่ยนหมวดหมู่</div>
          </div>
        </div>
      `;
    } else {
      this.searchResults.innerHTML = results.map(item => `
        <div class="search-result-item" data-target="${item.id}">
          <div class="search-result-icon">
            <i class="${item.icon}"></i>
          </div>
          <div class="search-result-content">
            <div class="search-result-title">${this.highlightText(item.title, query)}</div>
            <div class="search-result-description">${this.highlightText(item.description, query)}</div>
          </div>
          <div class="search-result-category">${this.getCategoryLabel(item.category)}</div>
        </div>
      `).join('');

      // เพิ่ม event listeners สำหรับผลการค้นหา
      this.searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          this.navigateToResult(item.dataset.target);
        });
      });
    }

    this.showResults();
  }

  /**
   * เน้นข้อความที่ตรงกับการค้นหา
   */
  highlightText(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark style="background: var(--primary-color); color: white; padding: 2px 4px; border-radius: 3px;">$1</mark>');
  }

  /**
   * รับป้ายหมวดหมู่
   */
  getCategoryLabel(category) {
    const labels = {
      'settings': 'การตั้งค่า',
      'media': 'สื่อ',
      'options': 'ตัวเลือก'
    };
    return labels[category] || category;
  }

  /**
   * นำทางไปยังผลการค้นหา
   */
  navigateToResult(targetId) {
    const item = this.searchIndex.find(item => item.id === targetId);
    if (!item) return;

    const element = item.element();
    if (!element) return;

    // เลื่อนไปยังองค์ประกอบ
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    // เพิ่มเอฟเฟกต์ highlight
    setTimeout(() => {
      element.classList.add('search-highlight');
      setTimeout(() => {
        element.classList.remove('search-highlight');
      }, 2000);
    }, 500);

    // ซ่อนผลการค้นหา
    this.hideResults();
    
    // โฟกัสองค์ประกอบถ้าเป็น input
    if (element.tagName === 'INPUT' || element.tagName === 'SELECT') {
      setTimeout(() => {
        element.focus();
      }, 1000);
    }

    // แสดงการแจ้งเตือน
    notificationSystem.show('success', 'พบแล้ว!', `นำทางไปยัง "${item.title}" เรียบร้อยแล้ว`);
  }

  /**
   * แสดงคำแนะนำ
   */
  showSuggestions() {
    const suggestions = this.searchIndex
      .filter(item => this.currentFilter === 'all' || item.category === this.currentFilter)
      .slice(0, 5);

    this.searchResults.innerHTML = `
      <div style="padding: 12px 16px; color: var(--text-light); font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <i class="fas fa-lightbulb" style="margin-right: 8px; color: var(--accent-color);"></i>
        คำแนะนำการค้นหา
      </div>
      ${suggestions.map(item => `
        <div class="search-result-item" data-target="${item.id}">
          <div class="search-result-icon">
            <i class="${item.icon}"></i>
          </div>
          <div class="search-result-content">
            <div class="search-result-title">${item.title}</div>
            <div class="search-result-description">${item.description}</div>
          </div>
          <div class="search-result-category">${this.getCategoryLabel(item.category)}</div>
        </div>
      `).join('')}
    `;

    // เพิ่ม event listeners
    this.searchResults.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        this.navigateToResult(item.dataset.target);
      });
    });

    this.showResults();
  }

  /**
   * ตั้งค่าตัวกรอง
   */
  setFilter(filter) {
    this.currentFilter = filter;
    
    // อัปเดต UI ปุ่มกรอง
    this.filterButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    // ค้นหาใหม่ด้วยตัวกรองใหม่
    if (this.searchInput.value.trim()) {
      this.performSearch(this.searchInput.value.trim());
    } else {
      this.showSuggestions();
    }
  }

  /**
   * ล้างการค้นหา
   */
  clearSearch() {
    this.searchInput.value = '';
    this.clearButton.style.display = 'none';
    this.hideResults();
    this.searchInput.focus();
  }

  /**
   * แสดงผลการค้นหา
   */
  showResults() {
    this.searchResults.style.display = 'block';
  }

  /**
   * ซ่อนผลการค้นหา
   */
  hideResults() {
    this.searchResults.style.display = 'none';
  }
}

/**
 * Theme Toggle System
 * จัดการการเปลี่ยนธีมและบันทึกการตั้งค่าผู้ใช้
 */
class ThemeSystem {
  constructor() {
    this.themeToggle = document.getElementById('theme-toggle');
    this.themeLabel = document.querySelector('.theme-label');
    this.currentTheme = this.loadTheme();
    
    this.initializeTheme();
  }

  /**
   * เริ่มต้นระบบธีม
   */
  initializeTheme() {
    // ตั้งค่าธีมเริ่มต้น
    this.applyTheme(this.currentTheme);
    
    // Event listener สำหรับปุ่มเปลี่ยนธีม
    this.themeToggle.addEventListener('click', () => {
      this.toggleTheme();
    });

    // ฟังการเปลี่ยนแปลงธีมจากระบบ
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('user-theme-preference')) {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  /**
   * โหลดธีมจาก localStorage
   */
  loadTheme() {
    const saved = localStorage.getItem('user-theme-preference');
    if (saved) {
      return saved;
    }

    // ตรวจสอบการตั้งค่าระบบ
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'dark'; // ค่าเริ่มต้น
  }

  /**
   * เปลี่ยนธีม
   */
  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    this.saveTheme(newTheme);
    
    // แสดงการแจ้งเตือน
    const themeText = newTheme === 'dark' ? 'โหมดมืด' : 'โหมดสว่าง';
    notificationSystem.show('info', 'เปลี่ยนธีมแล้ว', `เปลี่ยนเป็น${themeText}เรียบร้อยแล้ว`);
  }

  /**
   * ใช้ธีม
   */
  applyTheme(theme) {
    this.currentTheme = theme;
    
    // อัปเดต body class
    document.body.className = document.body.className.replace(/\b(light-mode|dark-mode)\b/g, '');
    document.body.classList.add(`${theme}-mode`);
    
    // อัปเดตป้ายกำกับ
    this.themeLabel.textContent = theme === 'dark' ? 'โหมดมืด' : 'โหมดสว่าง';
    
    // อัปเดตสีของ particles
    if (window.particlesSystem) {
      window.particlesSystem.updateTheme(theme);
    }
  }

  /**
   * บันทึกธีม
   */
  saveTheme(theme) {
    localStorage.setItem('user-theme-preference', theme);
  }
}

/**
 * Notification System
 * ระบบแจ้งเตือนแบบ Real-time
 */
class NotificationSystem {
  constructor() {
    this.container = document.getElementById('notification-container');
    this.notifications = [];
    this.maxNotifications = 5;
    
    this.initializeNotifications();
  }

  /**
   * เริ่มต้นระบบแจ้งเตือน
   */
  initializeNotifications() {
    // ฟังเหตุการณ์จาก Socket.IO
    if (typeof socket !== 'undefined') {
      socket.on('notification', (data) => {
        this.show(data.type, data.title, data.message);
      });

      // แจ้งเตือนเมื่อมีข้อมูลใหม่
      socket.on('new-data-available', (data) => {
        this.show('info', 'ข้อมูลใหม่!', data.message || 'มีข้อมูลใหม่พร้อมใช้งาน');
      });

      // แจ้งเตือนความคืบหน้า
      socket.on('progress-notification', (data) => {
        this.show('info', 'ความคืบหน้า', `${data.step}: ${data.message}`);
      });
    }
  }

  /**
   * แสดงการแจ้งเตือน
   */
  show(type = 'info', title = '', message = '', duration = 5000) {
    // จำกัดจำนวนการแจ้งเตือน
    if (this.notifications.length >= this.maxNotifications) {
      this.removeOldest();
    }

    const notification = this.createNotification(type, title, message, duration);
    this.container.appendChild(notification);
    this.notifications.push(notification);

    // ตั้งเวลาลบอัตโนมัติ
    if (duration > 0) {
      setTimeout(() => {
        this.remove(notification);
      }, duration);
    }

    return notification;
  }

  /**
   * สร้างการแจ้งเตือน
   */
  createNotification(type, title, message, duration) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
      'success': 'fas fa-check-circle',
      'error': 'fas fa-exclamation-circle',
      'warning': 'fas fa-exclamation-triangle',
      'info': 'fas fa-info-circle'
    };

    notification.innerHTML = `
      <div class="notification-header">
        <i class="notification-icon ${icons[type] || icons.info}"></i>
        <div class="notification-title">${title}</div>
        <button class="notification-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
      ${message ? `<div class="notification-message">${message}</div>` : ''}
      ${duration > 0 ? '<div class="notification-progress"></div>' : ''}
    `;

    // Event listener สำหรับปุ่มปิด
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.remove(notification);
    });

    // คลิกเพื่อปิด
    notification.addEventListener('click', (e) => {
      if (e.target === notification || e.target.closest('.notification-header')) {
        this.remove(notification);
      }
    });

    return notification;
  }

  /**
   * ลบการแจ้งเตือน
   */
  remove(notification) {
    if (!notification || !notification.parentNode) return;

    notification.style.animation = 'slideOutNotification 0.3s ease forwards';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      
      const index = this.notifications.indexOf(notification);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    }, 300);
  }

  /**
   * ลบการแจ้งเตือนเก่าสุด
   */
  removeOldest() {
    if (this.notifications.length > 0) {
      this.remove(this.notifications[0]);
    }
  }

  /**
   * ล้างการแจ้งเตือนทั้งหมด
   */
  clear() {
    this.notifications.forEach(notification => {
      this.remove(notification);
    });
  }

  /**
   * แสดงการแจ้งเตือนความสำเร็จ
   */
  success(title, message, duration = 5000) {
    return this.show('success', title, message, duration);
  }

  /**
   * แสดงการแจ้งเตือนข้อผิดพลาด
   */
  error(title, message, duration = 8000) {
    return this.show('error', title, message, duration);
  }

  /**
   * แสดงการแจ้งเตือนคำเตือน
   */
  warning(title, message, duration = 6000) {
    return this.show('warning', title, message, duration);
  }

  /**
   * แสดงการแจ้งเตือนข้อมูล
   */
  info(title, message, duration = 5000) {
    return this.show('info', title, message, duration);
  }
}

/**
 * Enhanced Particles System with Theme Support
 * ปรับปรุงระบบ particles ให้รองรับธีม
 */
function updateParticlesForTheme(theme) {
  if (!window.particlesSystem) return;
  
  const container = document.getElementById('particles-container');
  if (!container) return;

  // กำหนดสีตามธีม
  const colors = theme === 'light' ? 
    ['#4f46e5', '#7c3aed', '#ec4899', '#f59e0b'] : 
    ['#667eea', '#764ba2', '#f093fb', '#4facfe'];

  // อัปเดตสี particles
  container.style.filter = theme === 'light' ? 
    'brightness(0.8) contrast(1.2)' : 
    'brightness(1) contrast(1)';
}

// ========================================================================================
// INITIALIZATION - เริ่มต้นระบบใหม่
// ========================================================================================

// ตัวแปร Global สำหรับระบบใหม่
let searchSystem;
let themeSystem;
let notificationSystem;

// เริ่มต้นระบบเมื่อ DOM โหลดเสร็จ
document.addEventListener('DOMContentLoaded', function() {
  // รอให้ระบบเดิมโหลดเสร็จก่อน
  setTimeout(() => {
    try {
      // เริ่มต้นระบบค้นหา
      searchSystem = new SearchSystem();
      console.log('✅ Search System initialized');

      // เริ่มต้นระบบธีม
      themeSystem = new ThemeSystem();
      console.log('✅ Theme System initialized');

      // เริ่มต้นระบบแจ้งเตือน
      notificationSystem = new NotificationSystem();
      console.log('✅ Notification System initialized');

      // แสดงการแจ้งเตือนต้อนรับ
      setTimeout(() => {
        notificationSystem.success(
          'ระบบพร้อมใช้งาน!', 
          'ฟีเจอร์ใหม่: ค้นหา, เปลี่ยนธีม, และการแจ้งเตือน'
        );
      }, 1000);

      // อัปเดต particles สำหรับธีม
      if (window.particlesSystem) {
        window.particlesSystem.updateTheme = updateParticlesForTheme;
      }

    } catch (error) {
      console.error('❌ Error initializing enhanced features:', error);
    }
  }, 500);
});

// เพิ่ม CSS animation สำหรับการแจ้งเตือนที่หายออก
const style = document.createElement('style');
style.textContent = `
  @keyframes slideOutNotification {
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Export สำหรับการใช้งานจากภายนอก
window.searchSystem = searchSystem;
window.themeSystem = themeSystem;
window.notificationSystem = notificationSystem;

// ========================================================================================
// ENHANCED FILE HANDLING: Drag & Drop and File Validation
// ========================================================================================

/**
 * Enhanced File Drag & Drop System
 * เพิ่มฟังก์ชันการลากและวางไฟล์ที่ปรับปรุงแล้ว
 */
class EnhancedFileHandler {
  constructor() {
    this.fileInputs = {
      video: document.getElementById('video'),
      audio: document.getElementById('audio'),
      icon: document.getElementById('icon')
    };
    
    this.fileDisplays = {
      video: document.getElementById('videoDisplay'),
      audio: document.getElementById('audioDisplay'),
      icon: document.getElementById('iconDisplay')
    };
    
    this.acceptedTypes = {
      video: ['video/mp4', 'video/avi', 'video/mov', 'video/webm', 'video/mkv'],
      audio: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'],
      icon: ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp']
    };
    
    this.maxFileSizes = {
      video: 500 * 1024 * 1024, // 500MB
      audio: 50 * 1024 * 1024,  // 50MB
      icon: 5 * 1024 * 1024     // 5MB
    };
    
    this.initializeDragDrop();
  }

  /**
   * เริ่มต้นระบบ Drag & Drop
   */
  initializeDragDrop() {
    Object.keys(this.fileInputs).forEach(type => {
      const wrapper = this.fileDisplays[type].parentElement;
      
      // เพิ่ม event listeners สำหรับ drag & drop
      wrapper.addEventListener('dragover', (e) => this.handleDragOver(e, type));
      wrapper.addEventListener('dragenter', (e) => this.handleDragEnter(e, type));
      wrapper.addEventListener('dragleave', (e) => this.handleDragLeave(e, type));
      wrapper.addEventListener('drop', (e) => this.handleDrop(e, type));
      
      // เพิ่ม event listeners สำหรับการคลิก
      wrapper.addEventListener('click', () => this.fileInputs[type].click());
      
      // เพิ่ม event listeners สำหรับการเปลี่ยนแปลงไฟล์
      this.fileInputs[type].addEventListener('change', (e) => this.handleFileChange(e, type));
    });
  }

  /**
   * จัดการเหตุการณ์ dragover
   */
  handleDragOver(e, type) {
    e.preventDefault();
    e.stopPropagation();
    const wrapper = this.fileDisplays[type].parentElement;
    wrapper.classList.add('drag-over');
  }

  /**
   * จัดการเหตุการณ์ dragenter
   */
  handleDragEnter(e, type) {
    e.preventDefault();
    e.stopPropagation();
    const wrapper = this.fileDisplays[type].parentElement;
    wrapper.classList.add('drag-over');
  }

  /**
   * จัดการเหตุการณ์ dragleave
   */
  handleDragLeave(e, type) {
    e.preventDefault();
    e.stopPropagation();
    
    // ตรวจสอบว่าเมาส์ยังอยู่ในพื้นที่หรือไม่
    const wrapper = this.fileDisplays[type].parentElement;
    const rect = wrapper.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      wrapper.classList.remove('drag-over');
    }
  }

  /**
   * จัดการเหตุการณ์ drop
   */
  handleDrop(e, type) {
    e.preventDefault();
    e.stopPropagation();
    
    const wrapper = this.fileDisplays[type].parentElement;
    wrapper.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      this.processFile(file, type);
    }
  }

  /**
   * จัดการการเปลี่ยนแปลงไฟล์
   */
  handleFileChange(e, type) {
    const file = e.target.files[0];
    if (file) {
      this.processFile(file, type);
    }
  }

  /**
   * ประมวลผลไฟล์
   */
  processFile(file, type) {
    // ตรวจสอบประเภทไฟล์
    if (!this.acceptedTypes[type].includes(file.type)) {
      notificationSystem.error(
        'ประเภทไฟล์ไม่ถูกต้อง',
        `กรุณาเลือกไฟล์ประเภท: ${this.getAcceptedTypesText(type)}`
      );
      return;
    }

    // ตรวจสอบขนาดไฟล์
    if (file.size > this.maxFileSizes[type]) {
      notificationSystem.error(
        'ไฟล์ใหญ่เกินไป',
        `ขนาดไฟล์ต้องไม่เกิน ${this.formatFileSize(this.maxFileSizes[type])}`
      );
      return;
    }

    // อัปเดต UI
    this.updateFileDisplay(file, type);
    
    // ตั้งค่าไฟล์ให้กับ input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    this.fileInputs[type].files = dataTransfer.files;

    // แสดงการแจ้งเตือนสำเร็จ
    notificationSystem.success(
      'อัปโหลดไฟล์สำเร็จ',
      `${file.name} (${this.formatFileSize(file.size)})`
    );

    // สร้างพรีวิวถ้าเป็นไฟล์วิดีโอหรือรูปภาพ
    if (type === 'video') {
      this.createVideoPreview(file);
    } else if (type === 'icon') {
      this.createImagePreview(file);
    }
  }

  /**
   * อัปเดตการแสดงผลไฟล์
   */
  updateFileDisplay(file, type) {
    const display = this.fileDisplays[type];
    const wrapper = display.parentElement;
    
    // เพิ่ม class สำหรับสถานะที่มีไฟล์
    wrapper.classList.add('has-file');
    
    // อัปเดตเนื้อหา
    display.innerHTML = `
      <div class="file-info">
        <div class="file-icon">
          <i class="fas fa-${this.getFileIcon(type)}"></i>
        </div>
        <div class="file-details">
          <div class="file-name">${file.name}</div>
          <div class="file-size">${this.formatFileSize(file.size)}</div>
          <div class="file-type">${file.type}</div>
        </div>
        <button type="button" class="remove-file" onclick="enhancedFileHandler.removeFile('${type}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  }

  /**
   * สร้างพรีวิววิดีโอ
   */
  createVideoPreview(file) {
    const videoPreview = document.getElementById('videoPreview');
    const previewVideo = document.getElementById('previewVideo');
    const fileName = document.getElementById('fileName');
    const dimensions = document.getElementById('dimensions');
    const duration = document.getElementById('duration');
    
    // สร้าง URL สำหรับไฟล์
    const url = URL.createObjectURL(file);
    previewVideo.src = url;
    
    // อัปเดตข้อมูล
    fileName.textContent = file.name;
    
    // ฟังเหตุการณ์เมื่อวิดีโอโหลดเสร็จ
    previewVideo.addEventListener('loadedmetadata', () => {
      dimensions.textContent = `${previewVideo.videoWidth} x ${previewVideo.videoHeight}`;
      duration.textContent = this.formatDuration(previewVideo.duration);
    });
    
    // แสดงพรีวิว
    videoPreview.style.display = 'block';
    
    // เลื่อนไปยังพรีวิว
    setTimeout(() => {
      videoPreview.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }

  /**
   * สร้างพรีวิวรูปภาพ
   */
  createImagePreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const display = this.fileDisplays.icon;
      const existingPreview = display.querySelector('.image-preview');
      
      if (existingPreview) {
        existingPreview.remove();
      }
      
      const preview = document.createElement('div');
      preview.className = 'image-preview';
      preview.innerHTML = `
        <img src="${e.target.result}" alt="Icon Preview" style="
          max-width: 100px;
          max-height: 100px;
          border-radius: 8px;
          margin-top: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        ">
      `;
      
      display.appendChild(preview);
    };
    
    reader.readAsDataURL(file);
  }

  /**
   * ลบไฟล์
   */
  removeFile(type) {
    const input = this.fileInputs[type];
    const display = this.fileDisplays[type];
    const wrapper = display.parentElement;
    
    // ล้างไฟล์
    input.value = '';
    
    // รีเซ็ต UI
    wrapper.classList.remove('has-file');
    
    // รีเซ็ตเนื้อหา
    const originalContent = {
      video: '<i class="fas fa-cloud-upload-alt"></i><div class="upload-text">อัปโหลดไฟล์วิดีโอ</div><div class="upload-hint">MP4, AVI, MOV หรือรูปแบบอื่นๆ</div>',
      audio: '<i class="fas fa-music"></i><div class="upload-text">อัปโหลดไฟล์เสียง</div><div class="upload-hint">MP3, WAV, OGG หรือรูปแบบอื่นๆ</div>',
      icon: '<i class="fas fa-image"></i><div class="upload-text">อัปโหลดไอคอน</div><div class="upload-hint">PNG, JPG (แนะนำ 128x128px)</div>'
    };
    
    display.innerHTML = originalContent[type];
    
    // ซ่อนพรีวิว
    if (type === 'video') {
      document.getElementById('videoPreview').style.display = 'none';
    }
    
    // แสดงการแจ้งเตือน
    notificationSystem.info('ลบไฟล์แล้ว', 'ไฟล์ถูกลบออกจากการอัปโหลด');
  }

  /**
   * รับข้อความประเภทไฟล์ที่รองรับ
   */
  getAcceptedTypesText(type) {
    const extensions = {
      video: 'MP4, AVI, MOV, WEBM, MKV',
      audio: 'MP3, WAV, OGG, M4A, AAC',
      icon: 'PNG, JPG, JPEG, GIF, WEBP'
    };
    return extensions[type];
  }

  /**
   * รับไอคอนของไฟล์
   */
  getFileIcon(type) {
    const icons = {
      video: 'video',
      audio: 'music',
      icon: 'image'
    };
    return icons[type];
  }

  /**
   * จัดรูปแบบขนาดไฟล์
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * จัดรูปแบบระยะเวลา
   */
  formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// เริ่มต้นระบบ Enhanced File Handler
let enhancedFileHandler;

// รอให้ DOM โหลดเสร็จก่อนเริ่มต้น
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    try {
      enhancedFileHandler = new EnhancedFileHandler();
      console.log('✅ Enhanced File Handler initialized');
    } catch (error) {
      console.error('❌ Error initializing Enhanced File Handler:', error);
    }
  }, 600);
});

// เพิ่มสไตล์สำหรับไฟล์ที่มีการอัปโหลดแล้ว
const fileHandlerStyles = document.createElement('style');
fileHandlerStyles.textContent = `
  .file-input-wrapper.has-file {
    border-color: var(--success-color);
    background: rgba(76, 175, 80, 0.1);
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
  }

  .file-icon {
    font-size: 24px;
    color: var(--success-color);
    min-width: 30px;
  }

  .file-details {
    flex: 1;
  }

  .file-name {
    font-weight: 600;
    color: var(--text-light);
    margin-bottom: 4px;
    font-size: 14px;
  }

  .file-size {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 2px;
  }

  .file-type {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
  }

  .remove-file {
    background: var(--error-color);
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .remove-file:hover {
    background: #d32f2f;
    transform: scale(1.1);
  }

  .drag-over {
    border-color: var(--accent-color) !important;
    background: rgba(240, 147, 251, 0.15) !important;
    transform: scale(1.02) !important;
  }

  .drag-over::after {
    content: 'วางไฟล์ที่นี่';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--accent-color);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 600;
    font-size: 14px;
    z-index: 10;
    pointer-events: none;
  }
`;
document.head.appendChild(fileHandlerStyles);
