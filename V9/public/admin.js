// Socket connection - use relative URL to work with proxy
const socket = io({
  transports: ['websocket', 'polling'],
  timeout: 20000,
  forceNew: true,
  autoConnect: true
});

// Debug socket connection
socket.on('connect', () => {
  console.log('✅ Socket connected successfully to server');
  console.log('Socket ID:', socket.id);
  showToast('เชื่อมต่อเซิร์ฟเวอร์สำเร็จ (ID: ' + socket.id.substring(0,8) + ')', 'success');
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error);
  console.log('🔄 Trying to reconnect...');
  showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket disconnected:', reason);
  showToast('การเชื่อมต่อขาดหาย', 'warning');
});

// Global variables
let isLoggedIn = false;
let adminConfig = {};

// DOM elements
const loginScreen = document.getElementById('login-screen');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password');

// Admin controls
const gifUrlInput = document.getElementById('gifUrl');
const gifPreview = document.getElementById('gifPreview');
const updateGifBtn = document.getElementById('updateGif');

const primaryColorInput = document.getElementById('primaryColor');
const secondaryColorInput = document.getElementById('secondaryColor');
const accentColorInput = document.getElementById('accentColor');
const updateColorsBtn = document.getElementById('updateColors');

const uploadToggle = document.getElementById('uploadToggle');
const youtubeToggle = document.getElementById('youtubeToggle');
const uploadStatus = document.getElementById('uploadStatus');
const youtubeStatus = document.getElementById('youtubeStatus');

const announcementInput = document.getElementById('announcement');
const updateAnnouncementBtn = document.getElementById('updateAnnouncement');
const clearAnnouncementBtn = document.getElementById('clearAnnouncement');
const announcementPreview = document.getElementById('announcementPreview');

// Chat elements
const chatMessageInput = document.getElementById('chatMessage');
const sendChatMessageBtn = document.getElementById('sendChatMessage');
const clearChatHistoryBtn = document.getElementById('clearChatHistory');
const chatHistory = document.getElementById('chatHistory');

// Media elements 
const mediaUrlInput = document.getElementById('mediaUrl');
const mediaTypeSelect = document.getElementById('mediaType');
const playMediaBtn = document.getElementById('playMedia');
const stopMediaBtn = document.getElementById('stopMedia');
const mediaPreview = document.getElementById('mediaPreview');
const mediaPlaceholder = document.getElementById('mediaPlaceholder');
const mediaIframe = document.getElementById('mediaIframe');

const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const changePasswordBtn = document.getElementById('changePassword');

const logoutBtn = document.getElementById('logout-btn');

// File Management Elements
const refreshFileStatsBtn = document.getElementById('refreshFileStats');
const cleanupOldFilesBtn = document.getElementById('cleanupOldFiles');
const emergencyCleanupBtn = document.getElementById('emergencyCleanup');
const uploadFilesCount = document.getElementById('uploadFiles');
const outputFilesCount = document.getElementById('outputFiles');
const zipFilesCount = document.getElementById('zipFiles');
const diskUsageDisplay = document.getElementById('diskUsage');
const recentActivityList = document.getElementById('recentActivity');

// System Monitor Elements
const refreshSystemStatsBtn = document.getElementById('refreshSystemStats');
const connectedUsersCount = document.getElementById('connectedUsers');
const activeProcessesCount = document.getElementById('activeProcesses');
const totalRequestsCount = document.getElementById('totalRequests');
const uptimeDisplay = document.getElementById('uptime');

// Error Monitoring Elements
const refreshErrorLogsBtn = document.getElementById('refreshErrorLogs');
const clearErrorLogsBtn = document.getElementById('clearErrorLogs');
const errorLogsList = document.getElementById('errorLogsList');

// Statistics elements
const connectedUsersSpan = document.getElementById('connectedUsers');
const activeProcessesSpan = document.getElementById('activeProcesses');
const totalRequestsSpan = document.getElementById('totalRequests');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 DOM loaded, initializing admin panel...');

  initializeAdmin();
  setupEventListeners();
  updateStatistics();
  initializeChatSystem();
  initializeMediaControl();
});

function initializeAdmin() {
  // Faster connection with reduced timeout
  socket.timeout(5000);

  // Show connection status
  socket.on('connect', () => {
    console.log('Socket connected successfully');
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    showToast('ไม่สามารถเชื่อมต่อได้', 'error');
  });

  // Socket event handlers
  socket.on('admin-login-success', () => {
    console.log('🎉 Login successful!');
    isLoggedIn = true;
    
    // Clear the loading state immediately
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
      loginBtn.classList.remove('loading');
      loginBtn.disabled = false;
    }
    
    showAdminPanel();
  });

  // Cache admin config for faster loading
  socket.on('admin-config', (config) => {
    adminConfig = config;
    if (isLoggedIn) {
      applyAdminConfig();
    }
  });

  socket.on('admin-login-failed', (data) => {
    console.log('❌ Login failed:', data);
    
    // Clear the loading state immediately
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
      loginBtn.classList.remove('loading');
      loginBtn.disabled = false;
    }
    
    showToast(data.reason || 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่', 'error');
    passwordInput.value = '';
    passwordInput.focus();
  });

  socket.on('admin-config', (config) => {
    adminConfig = config;
    updateAdminInterface(config);
    
    // ถ้าต้องตั้งรหัสผ่านครั้งแรก
    if (config.needPasswordSetup) {
      console.log('🔧 Need to setup password for first time');
      showPasswordSetupModal();
    }
  });

  socket.on('config-update', (config) => {
    updatePreviewFromConfig(config);
  });

  socket.on('password-setup-success', () => {
    showToast('ตั้งรหัสผ่านสำเร็จ! ครั้งต่อไปใช้รหัสผ่านนี้เข้าสู่ระบบ', 'success');
    
    // ปิด modal
    const modal = document.getElementById('password-setup-modal');
    if (modal) {
      modal.remove();
    }
    
    // อัพเดต config
    adminConfig.needPasswordSetup = false;
  });

  socket.on('password-setup-failed', () => {
    showToast('ไม่สามารถตั้งรหัสผ่านได้', 'error');
    
    const setupBtn = document.getElementById('setupPasswordBtn');
    if (setupBtn) {
      setupBtn.classList.remove('loading');
      setupBtn.innerHTML = '<i class="fas fa-check"></i> ตั้งรหัสผ่าน';
      setupBtn.disabled = false;
    }
  });

  socket.on('password-changed', () => {
    showToast('เปลี่ยนรหัสผ่านสำเร็จ', 'success');
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
  });

  socket.on('password-change-failed', () => {
    showToast('ไม่สามารถเปลี่ยนรหัสผ่านได้', 'error');
  });

  // File Management responses
  socket.on('file-stats-update', (stats) => {
    console.log('Received file stats:', stats);
    updateFileStats(stats);
    showToast('อัปเดตข้อมูลไฟล์แล้ว', 'success');
  });

  socket.on('config-update-success', (config) => {
    console.log('Config update confirmed:', config);
    updateAdminInterface(config);
  });

  socket.on('cleanup-completed', (result) => {
    cleanupOldFilesBtn.classList.remove('loading');
    cleanupOldFilesBtn.innerHTML = '<i class="fas fa-trash"></i> ล้างไฟล์เก่า';
    showToast(`ล้างไฟล์เสร็จแล้ว: ${result.message}`, 'success');
    handleRefreshFileStats(); // Refresh stats after cleanup
  });

  socket.on('cleanup-failed', (error) => {
    cleanupOldFilesBtn.classList.remove('loading');
    cleanupOldFilesBtn.innerHTML = '<i class="fas fa-trash"></i> ล้างไฟล์เก่า';
    showToast(`การล้างไฟล์ล้มเหลว: ${error.error}`, 'error');
  });

  // Real-time console updates
  socket.on('new-error-log', (logEntry) => {
    if (isLoggedIn) {
      addLogToDisplay(logEntry);

      // Auto scroll to latest log if user is viewing error logs
      if (errorLogsList && errorLogsList.scrollHeight - errorLogsList.scrollTop <= errorLogsList.clientHeight + 50) {
        setTimeout(() => {
          errorLogsList.scrollTop = errorLogsList.scrollHeight;
        }, 100);
      }
    }
  });

  socket.on('emergency-cleanup-completed', (result) => {
    emergencyCleanupBtn.classList.remove('loading');
    emergencyCleanupBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ล้างข้อมูลฉุกเฉิน';
    showToast(`ล้างข้อมูลฉุกเฉินเสร็จแล้ว: ${result.message}`, 'success');
    handleRefreshFileStats(); // Refresh stats after cleanup
  });

  // System Monitor responses
  socket.on('system-stats-update', (stats) => {
    updateSystemStats(stats);
  });

  // Error Logs responses
  socket.on('error-logs-update', (logs) => {
    updateErrorLogs(logs);
  });

  socket.on('error-logs-cleared', () => {
    errorLogsList.innerHTML = '<div class="log-item">No errors logged</div>';
    showToast('ล้าง error logs แล้ว', 'success');
  });

  socket.on('disconnect', () => {
    showToast('การเชื่อมต่อขาดหาย', 'warning');
  });

  socket.on('reconnect', () => {
    showToast('เชื่อมต่อใหม่สำเร็จ', 'success');
    // Re-join admin room เมื่อเชื่อมต่อใหม่
    socket.emit('join-admin');
  });

  // Backup & Restore responses
  socket.on('backup-created', (data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    document.getElementById('lastBackupTime').textContent = new Date().toLocaleString('th-TH');
    showToast('สร้าง backup สำเร็จ', 'success');
  });

  socket.on('backup-restored', () => {
    showToast('กู้คืนข้อมูลสำเร็จ กำลังรีโหลดหน้า...', 'success');
    setTimeout(() => {
      location.reload();
    }, 2000);
  });

  socket.on('backup-restore-failed', (error) => {
    showToast(`การกู้คืนล้มเหลว: ${error.message}`, 'error');
  });

  // Rate limiting responses
  socket.on('rate-limit-stats', (data) => {
    document.getElementById('totalIPs').textContent = data.totalIPs || 0;
    document.getElementById('blockedIPs').textContent = data.blockedIPs || 0;
    document.getElementById('requestsPerHour').textContent = data.requestsPerHour || 0;
    
    const blockedList = document.getElementById('blockedIPsList');
    if (data.blockedIPsList && data.blockedIPsList.length > 0) {
      blockedList.innerHTML = data.blockedIPsList.map(ip => `
        <div class="ip-item">
          <span>${ip.address}</span>
          <button onclick="unblockIP('${ip.address}')" class="btn btn-sm btn-success">
            <i class="fas fa-unlock"></i> Unblock
          </button>
        </div>
      `).join('');
    } else {
      blockedList.innerHTML = '<div class="ip-item">No blocked IPs</div>';
    }
  });

  socket.on('ip-blocked', () => {
    handleRefreshRateLimit();
  });

  // Queue management responses
  socket.on('queue-stats', (data) => {
    document.getElementById('queueLength').textContent = data.length || 0;
    document.getElementById('processingCount').textContent = data.processing || 0;
    document.getElementById('avgWaitTime').textContent = `${data.avgWaitTime || 0}s`;
    
    const queueList = document.getElementById('queueList');
    if (data.items && data.items.length > 0) {
      queueList.innerHTML = data.items.map(item => `
        <div class="queue-item">
          <div>
            <strong>${item.type}</strong> - ${item.status}
            <br><small>Started: ${new Date(item.startTime).toLocaleTimeString('th-TH')}</small>
          </div>
          <button onclick="cancelQueueItem('${item.id}')" class="btn btn-sm btn-danger">
            <i class="fas fa-times"></i> Cancel
          </button>
        </div>
      `).join('');
    } else {
      queueList.innerHTML = '<div class="queue-item">No items in queue</div>';
    }
  });

  socket.on('queue-paused', () => {
    document.getElementById('pauseQueue').disabled = true;
    document.getElementById('resumeQueue').disabled = false;
  });

  socket.on('queue-resumed', () => {
    document.getElementById('pauseQueue').disabled = false;
    document.getElementById('resumeQueue').disabled = true;
  });

  socket.on('queue-cleared', () => {
    document.getElementById('queueList').innerHTML = '<div class="queue-item">No items in queue</div>';
    document.getElementById('queueLength').textContent = '0';
  });

  // Event management responses
  socket.on('event-created', (event) => {
    showToast(`🎉 อีเว้นท์ "${event.title}" ถูกสร้างแล้ว!`, 'success');
    loadEventsList();
    clearEventForm();
  });

  socket.on('event-create-failed', (error) => {
    showToast(`ไม่สามารถสร้างอีเว้นท์ได้: ${error.error}`, 'error');
  });

  socket.on('events-list', (events) => {
    updateEventsList(events);
  });

  socket.on('event-deleted-success', () => {
    showToast('ลบอีเว้นท์สำเร็จ', 'success');
    loadEventsList();
  });

  socket.on('event-toggled-success', () => {
    showToast('เปลี่ยนสถานะอีเว้นท์แล้ว', 'success');
    loadEventsList();
  });

  socket.on('command-executed', (result) => {
    if (result.success) {
      showToast('ประมวลผลคำสั่งสำเร็จ! 🎮', 'success');
    } else {
      showToast(`คำสั่งล้มเหลว: ${result.error}`, 'error');
    }
  });

  // เชื่อมต่อเข้า admin room เพื่อรับข้อมูลทั้งหมด
  socket.emit('join-admin');
}

// Global functions for UI interactions
function unblockIP(ip) {
  socket.emit('admin-unblock-ip', { ip });
  showToast(`ยกเลิกการบล็อค IP ${ip}`, 'success');
}

function cancelQueueItem(id) {
  socket.emit('admin-cancel-queue-item', { id });
  showToast('ยกเลิกรายการในคิวแล้ว', 'info');
}

function setupEventListeners() {
  // Login form - prevent default form submission
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleLogin(e);
    return false;
  });

  // GIF management
  updateGifBtn.addEventListener('click', handleGifUpdate);
  gifUrlInput.addEventListener('input', handleGifPreview);

  // Color management
  updateColorsBtn.addEventListener('click', handleColorUpdate);
  primaryColorInput.addEventListener('change', updateColorPreview);
  secondaryColorInput.addEventListener('change', updateColorPreview);
  accentColorInput.addEventListener('change', updateColorPreview);

  // System toggles - Fixed event listeners
  if (uploadToggle) {
    uploadToggle.addEventListener('change', function() {
      handleSystemToggle('upload', uploadToggle.checked);
    });
  }

  if (youtubeToggle) {
    youtubeToggle.addEventListener('change', function() {
      handleSystemToggle('youtube', youtubeToggle.checked);
    });
  }

  // Announcements
  updateAnnouncementBtn.addEventListener('click', handleAnnouncementUpdate);
  clearAnnouncementBtn.addEventListener('click', handleAnnouncementClear);
  announcementInput.addEventListener('input', updateAnnouncementPreview);

  // Password change
  changePasswordBtn.addEventListener('click', handlePasswordChange);

  // Logout
  logoutBtn.addEventListener('click', handleLogout);

  // Added: Admin theme toggle + persistence
  const adminThemeToggle = document.getElementById('adminThemeToggle');
  if (adminThemeToggle) {
    const saved = localStorage.getItem('theme-preference') || 'dark';
    const icon = adminThemeToggle.querySelector('i');
    if (icon) icon.className = saved === 'light' ? 'fas fa-sun' : 'fas fa-moon';
    adminThemeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme-preference', next);
      const icon = adminThemeToggle.querySelector('i');
      if (icon) icon.className = next === 'light' ? 'fas fa-sun' : 'fas fa-moon';
      showToast(next === 'light' ? 'เปิดโหมดสว่าง' : 'เปิดโหมดมืด', 'success');
    });
  }

  // File Management
  refreshFileStatsBtn.addEventListener('click', handleRefreshFileStats);
  cleanupOldFilesBtn.addEventListener('click', handleCleanupOldFiles);
  emergencyCleanupBtn.addEventListener('click', handleEmergencyCleanup);

  // System Monitor
  refreshSystemStatsBtn.addEventListener('click', handleRefreshSystemStats);

  // Error Monitoring
  refreshErrorLogsBtn.addEventListener('click', handleRefreshErrorLogs);
  clearErrorLogsBtn.addEventListener('click', handleClearErrorLogs);

  // Backup & Restore
  const createBackupBtn = document.getElementById('createBackup');
  const selectBackupFileBtn = document.getElementById('selectBackupFile');
  const restoreBackupBtn = document.getElementById('restoreBackup');
  const restoreFileInput = document.getElementById('restoreFile');
  
  if (createBackupBtn) createBackupBtn.addEventListener('click', handleCreateBackup);
  if (selectBackupFileBtn) selectBackupFileBtn.addEventListener('click', () => restoreFileInput.click());
  if (restoreBackupBtn) restoreBackupBtn.addEventListener('click', handleRestoreBackup);
  if (restoreFileInput) restoreFileInput.addEventListener('change', handleBackupFileSelected);

  // Rate Limiting
  const blockIPBtn = document.getElementById('blockIP');
  const refreshRateLimitBtn = document.getElementById('refreshRateLimit');
  
  if (blockIPBtn) blockIPBtn.addEventListener('click', handleBlockIP);
  if (refreshRateLimitBtn) refreshRateLimitBtn.addEventListener('click', handleRefreshRateLimit);

  // Queue Management
  const pauseQueueBtn = document.getElementById('pauseQueue');
  const resumeQueueBtn = document.getElementById('resumeQueue');
  const clearQueueBtn = document.getElementById('clearQueue');
  
  if (pauseQueueBtn) pauseQueueBtn.addEventListener('click', handlePauseQueue);
  if (resumeQueueBtn) resumeQueueBtn.addEventListener('click', handleResumeQueue);
  if (clearQueueBtn) clearQueueBtn.addEventListener('click', handleClearQueue);

  // Event Management
  const createEventBtn = document.getElementById('createEvent');
  if (createEventBtn) createEventBtn.addEventListener('click', handleCreateEvent);

  // Real-time input updates
  setupRealtimeUpdates();

  // Added: attach search listeners for real-time filtering
  const userSearch = document.getElementById('userSearch');
  if (userSearch) userSearch.addEventListener('input', displayActiveUsers);
  const activitySearch = document.getElementById('activitySearch');
  if (activitySearch) activitySearch.addEventListener('input', updateActivityTimeline);
}

function handleLogin(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const password = passwordInput.value.trim();
  console.log('🔑 Attempting admin login');

  if (!password) {
    showToast('กรุณาใส่รหัสผ่าน', 'warning');
    return false;
  }

  // Check socket connection status
  if (!socket.connected) {
    console.error('❌ Socket not connected, attempting to connect...');
    console.log('Socket state:', socket.connected, socket.disconnected);
    showToast('กำลังเชื่อมต่อเซิร์ฟเวอร์...', 'info');
    socket.connect();
    
    // Try again after connection attempt
    setTimeout(() => {
      if (socket.connected) {
        handleLogin();
      } else {
        showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        const loginBtn = document.querySelector('.login-btn');
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
      }
    }, 2000);
    return false;
  }

  // Show loading state
  const loginBtn = document.querySelector('.login-btn');
  loginBtn.classList.add('loading');
  loginBtn.disabled = true;

  console.log('📡 Sending admin-login event...');
  socket.emit('admin-login', { password });

  // Add timeout mechanism
  const loginTimeout = setTimeout(() => {
    console.error('⏰ Login timeout');
    showToast('การเชื่อมต่อล้มเหลว กรุณาลองใหม่', 'error');
    loginBtn.classList.remove('loading');
    loginBtn.disabled = false;
  }, 10000);

  // Clear timeout when we get a response
  const clearLoginTimeout = () => {
    clearTimeout(loginTimeout);
    loginBtn.classList.remove('loading');
    loginBtn.disabled = false;
  };

  socket.once('admin-login-success', clearLoginTimeout);
  socket.once('admin-login-failed', clearLoginTimeout);
  
  return false;
}

function showAdminPanel() {
  // Fast transition without animation delay
  loginScreen.style.display = 'none';
  adminPanel.style.display = 'block';

  // เปิดใช้งาน Admin Mode เอฟเฟค
  enableAdminEffects();

  // Load config immediately if available
  if (Object.keys(adminConfig).length > 0) {
    applyAdminConfig();
  } else {
    loadAdminConfig();
  }

  // Load real file stats immediately
  handleRefreshFileStats();
  handleRefreshSystemStats();

  // Initialize advanced features after login
  setTimeout(() => {
    if (isLoggedIn) {
      initializeAdvancedFeatures();
      loadAdvancedSettings();
      loadEventsList(); // โหลดรายการอีเว้นท์
    }
  }, 1000);

  // Auto-refresh every 30 seconds when logged in
  setInterval(() => {
    if (isLoggedIn) {
      handleRefreshFileStats();
      handleRefreshSystemStats();
    }
  }, 30000);
}

function handleGifUpdate() {
  const gifUrl = gifUrlInput.value.trim();

  if (!gifUrl) {
    showToast('กรุณาใส่ URL ของ GIF', 'warning');
    return;
  }

  if (!isValidUrl(gifUrl)) {
    showToast('URL ไม่ถูกต้อง', 'warning');
    return;
  }

  updateGifBtn.classList.add('loading');

  socket.emit('admin-update-config', { gifUrl });

  setTimeout(() => {
    updateGifBtn.classList.remove('loading');
    showToast('อัปเดต GIF สำเร็จ', 'success');
  }, 1000);
}

function handleGifPreview() {
  const gifUrl = gifUrlInput.value.trim();

  if (gifUrl && isValidUrl(gifUrl)) {
    gifPreview.src = gifUrl;
    gifPreview.style.display = 'block';
    gifPreview.style.animation = 'fadeIn 0.5s ease';
  } else {
    gifPreview.style.display = 'none';
  }
}

function handleColorUpdate() {
  const colors = {
    primaryColor: primaryColorInput.value,
    secondaryColor: secondaryColorInput.value,
    accentColor: accentColorInput.value
  };

  updateColorsBtn.classList.add('loading');

  socket.emit('admin-update-config', colors);

  setTimeout(() => {
    updateColorsBtn.classList.remove('loading');
    showToast('อัปเดตสีสำเร็จ', 'success');
  }, 1000);
}

function updateColorPreview() {
  const primary = primaryColorInput.value;
  const secondary = secondaryColorInput.value;
  const accent = accentColorInput.value;

  // Update CSS variables for preview
  document.documentElement.style.setProperty('--primary-color', primary);
  document.documentElement.style.setProperty('--secondary-color', secondary);
  document.documentElement.style.setProperty('--accent-color', accent);
}

function handleSystemToggle(type, enabled) {
  console.log(`Toggle ${type} to ${enabled}`); // Debug log

  const config = {};

  if (type === 'upload') {
    config.uploadEnabled = enabled;
    showToast(enabled ? 'เปิดใช้งานการอัปโหลดไฟล์แล้ว' : 'ปิดใช้งานการอัปโหลดไฟล์แล้ว', 'success');
  } else if (type === 'youtube') {
    config.youtubeEnabled = enabled;
    showToast(enabled ? 'เปิดใช้งาน YouTube แล้ว' : 'ปิดใช้งาน YouTube แล้ว', 'success');
  }

  console.log('Emitting config:', config); // Debug log
  socket.emit('admin-update-config', config);

  // Update status immediately for better UX
  setTimeout(() => {
    updateSystemStatus();
  }, 100);
}

function updateSystemStatus() {
  if (uploadStatus && uploadToggle) {
    uploadStatus.textContent = uploadToggle.checked ? 'Online' : 'Offline';
    uploadStatus.className = `status-value ${uploadToggle.checked ? 'online' : 'offline'}`;

    // Add animation effect
    uploadStatus.style.transform = 'scale(1.1)';
    setTimeout(() => {
      uploadStatus.style.transform = 'scale(1)';
    }, 200);
  }

  if (youtubeStatus && youtubeToggle) {
    youtubeStatus.textContent = youtubeToggle.checked ? 'Online' : 'Offline';
    youtubeStatus.className = `status-value ${youtubeToggle.checked ? 'online' : 'offline'}`;

    // Add animation effect
    youtubeStatus.style.transform = 'scale(1.1)';
    setTimeout(() => {
      youtubeStatus.style.transform = 'scale(1)';
    }, 200);
  }
}

function handleAnnouncementUpdate() {
  const announcement = announcementInput.value.trim();

  updateAnnouncementBtn.classList.add('loading');

  socket.emit('admin-update-config', { announcement });

  setTimeout(() => {
    updateAnnouncementBtn.classList.remove('loading');
    showToast('ประกาศสำเร็จ', 'success');
  }, 1000);
}

function handleAnnouncementClear() {
  announcementInput.value = '';
  updateAnnouncementPreview();

  socket.emit('admin-update-config', { announcement: '' });
  showToast('ล้างประกาศแล้ว', 'success');
}

function updateAnnouncementPreview() {
  const text = announcementInput.value.trim();
  announcementPreview.textContent = text || 'No announcement';
  announcementPreview.style.fontStyle = text ? 'normal' : 'italic';
}

function showPasswordSetupModal() {
  // สร้าง modal สำหรับตั้งรหัสผ่านครั้งแรก
  const modal = document.createElement('div');
  modal.id = 'password-setup-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    backdrop-filter: blur(10px);
  `;
  
  modal.innerHTML = `
    <div style="
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 40px;
      border: 1px solid var(--glass-border);
      box-shadow: var(--shadow);
      max-width: 400px;
      width: 90%;
      text-align: center;
    ">
      <div style="margin-bottom: 20px;">
        <i class="fas fa-key" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 15px;"></i>
        <h2 style="color: var(--text-light); margin-bottom: 10px;">ตั้งรหัสผ่านครั้งแรก</h2>
        <p style="color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">กรุณาตั้งรหัสผ่านใหม่สำหรับเข้าสู่ระบบครั้งต่อไป</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <input type="password" id="setupPassword" placeholder="รหัสผ่านใหม่" style="
          width: 100%;
          padding: 15px;
          border: 2px solid var(--glass-border);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.9);
          color: var(--text-dark);
          font-size: 1rem;
          margin-bottom: 15px;
        ">
        <input type="password" id="setupPasswordConfirm" placeholder="ยืนยันรหัสผ่าน" style="
          width: 100%;
          padding: 15px;
          border: 2px solid var(--glass-border);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.9);
          color: var(--text-dark);
          font-size: 1rem;
        ">
      </div>
      
      <button id="setupPasswordBtn" style="
        width: 100%;
        padding: 15px;
        background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      ">
        <i class="fas fa-check"></i> ตั้งรหัสผ่าน
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event listener สำหรับปุ่มตั้งรหัสผ่าน
  document.getElementById('setupPasswordBtn').addEventListener('click', handlePasswordSetup);
  
  // Focus ที่ input แรก
  document.getElementById('setupPassword').focus();
}

function handlePasswordSetup() {
  const password = document.getElementById('setupPassword').value.trim();
  const confirmPassword = document.getElementById('setupPasswordConfirm').value.trim();
  
  if (!password || !confirmPassword) {
    showToast('กรุณาใส่รหัสผ่านให้ครบถ้วน', 'warning');
    return;
  }
  
  if (password !== confirmPassword) {
    showToast('รหัสผ่านไม่ตรงกัน', 'warning');
    return;
  }
  
  if (password.length < 6) {
    showToast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'warning');
    return;
  }
  
  const setupBtn = document.getElementById('setupPasswordBtn');
  setupBtn.classList.add('loading');
  setupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังตั้งรหัสผ่าน...';
  setupBtn.disabled = true;
  
  socket.emit('admin-setup-password', { newPassword: password });
}

function handlePasswordChange() {
  const newPassword = newPasswordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();

  if (!newPassword || !confirmPassword) {
    showToast('กรุณาใส่รหัสผ่านให้ครบถ้วน', 'warning');
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast('รหัสผ่านไม่ตรงกัน', 'warning');
    return;
  }

  if (newPassword.length < 6) {
    showToast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'warning');
    return;
  }

  changePasswordBtn.classList.add('loading');

  socket.emit('admin-change-password', { newPassword });

  setTimeout(() => {
    changePasswordBtn.classList.remove('loading');
  }, 2000);
}

function handleLogout() {
  isLoggedIn = false;
  loginScreen.style.display = 'flex';
  adminPanel.style.display = 'none';
  passwordInput.value = '';
  socket.disconnect();
  socket.connect();
  showToast('ออกจากระบบแล้ว', 'success');
}

// File Management Functions
function handleRefreshFileStats() {
  refreshFileStatsBtn.classList.add('loading');
  socket.emit('admin-get-file-stats');

  setTimeout(() => {
    refreshFileStatsBtn.classList.remove('loading');
  }, 1000);
}

function handleCleanupOldFiles() {
  if (!confirm('คุณต้องการล้างไฟล์เก่าหรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) {
    return;
  }

  cleanupOldFilesBtn.classList.add('loading');
  cleanupOldFilesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังล้างไฟล์...';
  socket.emit('admin-cleanup-files');

  showToast('เริ่มล้างไฟล์เก่า กรุณารอสักครู่...', 'info');
}

function handleEmergencyCleanup() {
  if (!confirm('คุณต้องการทำการล้างข้อมูลฉุกเฉินหรือไม่? การดำเนินการนี้จะลบไฟล์จำนวนมาก!')) {
    return;
  }

  emergencyCleanupBtn.classList.add('loading');
  socket.emit('admin-emergency-cleanup');

  showToast('เริ่มล้างข้อมูลฉุกเฉิน...', 'warning');

  setTimeout(() => {
    emergencyCleanupBtn.classList.remove('loading');
  }, 5000);
}

// System Monitor Functions
function handleRefreshSystemStats() {
  refreshSystemStatsBtn.classList.add('loading');
  socket.emit('admin-get-system-stats');

  setTimeout(() => {
    refreshSystemStatsBtn.classList.remove('loading');
  }, 1000);
}

// Error Monitoring Functions
function handleRefreshErrorLogs() {
  refreshErrorLogsBtn.classList.add('loading');
  socket.emit('admin-get-error-logs');

  setTimeout(() => {
    refreshErrorLogsBtn.classList.remove('loading');
  }, 1000);
}

function handleClearErrorLogs() {
  if (!confirm('คุณต้องการล้าง error logs หรือไม่?')) {
    return;
  }

  clearErrorLogsBtn.classList.add('loading');
  socket.emit('admin-clear-error-logs');

  showToast('ล้าง error logs แล้ว', 'success');

  setTimeout(() => {
    clearErrorLogsBtn.classList.remove('loading');
    errorLogsList.innerHTML = '<div class="log-item">No errors logged</div>';
  }, 1000);
}

// Update display functions
function updateFileStats(stats) {
  if (uploadFilesCount) uploadFilesCount.textContent = stats.uploadFiles || 0;
  if (outputFilesCount) outputFilesCount.textContent = stats.outputFiles || 0;
  if (zipFilesCount) zipFilesCount.textContent = stats.zipFiles || 0;
  if (diskUsageDisplay) diskUsageDisplay.textContent = formatBytes(stats.diskUsage || 0);

  // Update recent activity
  if (recentActivityList && stats.recentActivity) {
    recentActivityList.innerHTML = '';
    stats.recentActivity.slice(0, 5).forEach(activity => {
      const activityItem = document.createElement('div');
      activityItem.className = 'activity-item';
      activityItem.innerHTML = `
        <span class="activity-time">${formatTime(activity.time)}</span>
        <span class="activity-message">${activity.message}</span>
      `;
      recentActivityList.appendChild(activityItem);
    });
  }
}

function updateSystemStats(stats) {
  if (connectedUsersCount) connectedUsersCount.textContent = stats.connectedUsers || 0;
  if (activeProcessesCount) activeProcessesCount.textContent = stats.activeProcesses || 0;
  if (totalRequestsCount) totalRequestsCount.textContent = stats.totalRequests || 0;
  if (uptimeDisplay) uptimeDisplay.textContent = formatUptime(stats.uptime || 0);
}

function updateErrorLogs(logs) {
  if (!errorLogsList) return;

  errorLogsList.innerHTML = '';

  if (!logs || logs.length === 0) {
    errorLogsList.innerHTML = '<div class="log-item">No errors logged</div>';
    return;
  }

  logs.slice(0, 20).forEach(log => {
    const logItem = document.createElement('div');
    logItem.className = `log-item ${log.level}`;
    logItem.innerHTML = `
      <span class="log-time">${formatTime(log.timestamp)}</span>
      <span class="log-level">${log.level.toUpperCase()}</span>
      <span class="log-message">${log.message}</span>
    `;
    errorLogsList.appendChild(logItem);
  });
}

// Add single log entry to display (for real-time updates)
function addLogToDisplay(log) {
  if (!errorLogsList) return;

  // Remove "No errors logged" message if it exists
  const noLogsMessage = errorLogsList.querySelector('.log-item');
  if (noLogsMessage && noLogsMessage.textContent === 'No errors logged') {
    errorLogsList.innerHTML = '';
  }

  const logItem = document.createElement('div');
  logItem.className = `log-item ${log.level}`;
  logItem.style.opacity = '0';
  logItem.style.transform = 'translateY(-10px)';
  logItem.innerHTML = `
    <span class="log-time">${formatTime(log.timestamp)}</span>
    <span class="log-level">${log.level.toUpperCase()}</span>
    <span class="log-message">${log.message}</span>
  `;

  // Add to top of list
  errorLogsList.insertBefore(logItem, errorLogsList.firstChild);

  // Animate in
  setTimeout(() => {
    logItem.style.transition = 'all 0.3s ease';
    logItem.style.opacity = '1';
    logItem.style.transform = 'translateY(0)';
  }, 10);

  // Remove excess logs (keep only latest 50 since we're capturing all console output)
  const allLogs = errorLogsList.querySelectorAll('.log-item');
  if (allLogs.length > 50) {
    for (let i = 50; i < allLogs.length; i++) {
      allLogs[i].remove();
    }
  }
}

// Utility functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// Fast config application function
function applyAdminConfig() {
  const config = adminConfig;
  if (!config) return;

  updateAdminInterface(config);
  updateSystemStatus();
}

// Fast config loading without waiting for socket events
function loadAdminConfig() {
  // If already cached, apply immediately
  if (Object.keys(adminConfig).length > 0) {
    applyAdminConfig();
    return;
  }
  // Otherwise request from server
  socket.emit('get-admin-config');
}

function updateAdminInterface(config) {
  console.log('Updating admin interface with config:', config);

  // Update form values quickly
  if (gifUrlInput) gifUrlInput.value = config.gifUrl || '';
  if (primaryColorInput) primaryColorInput.value = config.primaryColor || '#667eea';
  if (secondaryColorInput) secondaryColorInput.value = config.secondaryColor || '#764ba2';
  if (accentColorInput) accentColorInput.value = config.accentColor || '#f093fb';

  if (uploadToggle) {
    uploadToggle.checked = config.uploadEnabled !== false;
    console.log('Upload toggle set to:', uploadToggle.checked);
  }
  if (youtubeToggle) {
    youtubeToggle.checked = config.youtubeEnabled !== false;
    console.log('YouTube toggle set to:', youtubeToggle.checked);
  }

  if (announcementInput) announcementInput.value = config.announcement || '';

  // Update previews
  handleGifPreview();
  updateColorPreview();
  updateSystemStatus();
  updateAnnouncementPreview();
}

function updatePreviewFromConfig(config) {
  // Update color preview
  document.documentElement.style.setProperty('--primary-color', config.primaryColor);
  document.documentElement.style.setProperty('--secondary-color', config.secondaryColor);
  document.documentElement.style.setProperty('--accent-color', config.accentColor);
}

function setupRealtimeUpdates() {
  // Debounced real-time updates for certain inputs
  let colorUpdateTimeout;
  let gifUpdateTimeout;
  let announcementUpdateTimeout;

  [primaryColorInput, secondaryColorInput, accentColorInput].forEach(input => {
    input.addEventListener('change', () => {
      clearTimeout(colorUpdateTimeout);
      colorUpdateTimeout = setTimeout(() => {
        if (isLoggedIn) {
          handleColorUpdate();
        }
      }, 500);
    });
  });

  gifUrlInput.addEventListener('input', () => {
    clearTimeout(gifUpdateTimeout);
    gifUpdateTimeout = setTimeout(() => {
      handleGifPreview();
    }, 300);
  });

  announcementInput.addEventListener('input', () => {
    clearTimeout(announcementUpdateTimeout);
    announcementUpdateTimeout = setTimeout(() => {
      updateAnnouncementPreview();
    }, 200);
  });
}

function updateStatistics() {
  // Mock statistics - in real app, these would come from the server
  let connectedUsers = Math.floor(Math.random() * 50) + 10;
  let activeProcesses = Math.floor(Math.random() * 5);
  let totalRequests = Math.floor(Math.random() * 1000) + 500;

  // Animate counter updates
  animateCounter(connectedUsersSpan, connectedUsers);
  animateCounter(activeProcessesSpan, activeProcesses);
  animateCounter(totalRequestsSpan, totalRequests);

  // Update every 30 seconds
  setTimeout(updateStatistics, 30000);
}

function animateCounter(element, targetValue) {
  const currentValue = parseInt(element.textContent) || 0;
  const increment = Math.ceil((targetValue - currentValue) / 10);

  if (currentValue !== targetValue) {
    element.textContent = Math.max(0, currentValue + increment);
    setTimeout(() => animateCounter(element, targetValue), 100);
  }
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

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

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

// Enhanced visual effects
function addVisualEffects() {
  // Add ripple effect to buttons
  document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
      `;

      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });
}

// Backup & Restore Functions
function handleCreateBackup() {
  const includeConfig = document.getElementById('backupConfig').checked;
  const includeAnalytics = document.getElementById('backupAnalytics').checked;
  const includeLogs = document.getElementById('backupLogs').checked;

  if (!includeConfig && !includeAnalytics && !includeLogs) {
    showToast('กรุณาเลือกข้อมูลที่ต้องการสำรอง', 'warning');
    return;
  }

  const createBackupBtn = document.getElementById('createBackup');
  createBackupBtn.classList.add('loading');
  createBackupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Backup...';

  socket.emit('admin-create-backup', {
    includeConfig,
    includeAnalytics,
    includeLogs
  });

  setTimeout(() => {
    createBackupBtn.classList.remove('loading');
    createBackupBtn.innerHTML = '<i class="fas fa-download"></i> Create & Download Backup';
  }, 3000);
}

function handleBackupFileSelected(event) {
  const file = event.target.files[0];
  const restoreBtn = document.getElementById('restoreBackup');
  
  if (file) {
    restoreBtn.disabled = false;
    restoreBtn.innerHTML = `<i class="fas fa-upload"></i> Restore ${file.name}`;
  } else {
    restoreBtn.disabled = true;
    restoreBtn.innerHTML = '<i class="fas fa-upload"></i> Restore Backup';
  }
}

function handleRestoreBackup() {
  const fileInput = document.getElementById('restoreFile');
  const file = fileInput.files[0];
  
  if (!file) {
    showToast('กรุณาเลือกไฟล์ backup', 'warning');
    return;
  }

  if (!confirm('คุณแน่ใจหรือไม่ที่จะกู้คืนข้อมูล? การดำเนินการนี้จะเขียนทับข้อมูลปัจจุบัน')) {
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const backupData = JSON.parse(e.target.result);
      socket.emit('admin-restore-backup', backupData);
      showToast('เริ่มกู้คืนข้อมูล...', 'info');
    } catch (error) {
      showToast('ไฟล์ backup ไม่ถูกต้อง', 'error');
    }
  };
  reader.readAsText(file);
}

// Rate Limiting Functions
function handleBlockIP() {
  const ipInput = document.getElementById('ipAddress');
  const ip = ipInput.value.trim();
  
  if (!ip) {
    showToast('กรุณาใส่ IP Address', 'warning');
    return;
  }

  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    showToast('รูปแบบ IP Address ไม่ถูกต้อง', 'warning');
    return;
  }

  socket.emit('admin-block-ip', { ip });
  ipInput.value = '';
  showToast(`บล็อค IP ${ip} แล้ว`, 'success');
}

function handleRefreshRateLimit() {
  const refreshBtn = document.getElementById('refreshRateLimit');
  refreshBtn.classList.add('loading');
  socket.emit('admin-get-rate-limit-stats');
  
  setTimeout(() => {
    refreshBtn.classList.remove('loading');
  }, 1000);
}

// Queue Management Functions
function handlePauseQueue() {
  socket.emit('admin-pause-queue');
  const pauseBtn = document.getElementById('pauseQueue');
  const resumeBtn = document.getElementById('resumeQueue');
  
  pauseBtn.disabled = true;
  resumeBtn.disabled = false;
  showToast('หยุดคิวการประมวลผลชั่วคราว', 'info');
}

function handleResumeQueue() {
  socket.emit('admin-resume-queue');
  const pauseBtn = document.getElementById('pauseQueue');
  const resumeBtn = document.getElementById('resumeQueue');
  
  pauseBtn.disabled = false;
  resumeBtn.disabled = true;
  showToast('เริ่มคิวการประมวลผลใหม่', 'success');
}

function handleClearQueue() {
  if (!confirm('คุณแน่ใจหรือไม่ที่จะล้างคิวทั้งหมด? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) {
    return;
  }
  
  socket.emit('admin-clear-queue');
  showToast('ล้างคิวการประมวลผลแล้ว', 'warning');
}

// Event Management Functions
function handleCreateEvent() {
  const title = document.getElementById('eventTitle').value.trim();
  const message = document.getElementById('eventMessage').value.trim();
  const command = document.getElementById('eventCommand').value;
  const duration = parseInt(document.getElementById('eventDuration').value) * 1000;

  if (!title) {
    showToast('กรุณาใส่ชื่อเหตุการณ์', 'warning');
    return;
  }

  const eventData = {
    title,
    message: message || 'No message provided',
    command,
    duration,
    type: command || 'custom'
  };

  document.getElementById('createEvent').classList.add('loading');
  socket.emit('admin-create-event', eventData);

  setTimeout(() => {
    document.getElementById('createEvent').classList.remove('loading');
  }, 2000);
}

function clearEventForm() {
  document.getElementById('eventTitle').value = '';
  document.getElementById('eventMessage').value = '';
  document.getElementById('eventCommand').value = '';
  document.getElementById('eventDuration').value = '10';
}

function loadEventsList() {
  socket.emit('admin-get-events');
}

function updateEventsList(events) {
  const eventsList = document.getElementById('eventsList');
  
  if (!events || events.length === 0) {
    eventsList.innerHTML = '<div class="event-item">No events created</div>';
    return;
  }

  eventsList.innerHTML = events.map(event => `
    <div class="event-item ${event.isActive ? 'active' : 'inactive'}">
      <div class="event-info">
        <strong>${event.title}</strong>
        <div class="event-details">
          <span>Command: ${event.command || 'None'}</span>
          <span>Created: ${new Date(event.createdAt).toLocaleString('th-TH')}</span>
        </div>
      </div>
      <div class="event-actions">
        <button onclick="toggleEvent(${event.id}, ${!event.isActive})" 
                class="btn btn-sm ${event.isActive ? 'btn-warning' : 'btn-success'}">
          ${event.isActive ? 'Disable' : 'Enable'}
        </button>
        <button onclick="deleteEvent(${event.id})" class="btn btn-sm btn-danger">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function toggleEvent(eventId, active) {
  socket.emit('admin-toggle-event', { eventId, active });
}

function deleteEvent(eventId) {
  if (!confirm('คุณแน่ใจหรือไม่ที่จะลบอีเว้นท์นี้?')) {
    return;
  }
  
  socket.emit('admin-delete-event', { eventId });
}

function executeQuickCommand(command) {
  socket.emit('admin-execute-command', { command });
  showToast(`🎮 ประมวลผลคำสั่ง: ${command}`, 'info');
}

// Admin Effects System
function enableAdminEffects() {
  console.log('👑 เปิดใช้งาน ADMIN MODE EFFECTS!');
  
  // เริ่มต้น Power Level Counter
  startPowerLevelAnimation();
  
  // เพิ่ม Matrix Rain Effect
  createMatrixRain();
  
  // เพิ่มเสียงเอฟเฟค (ถ้ามี)
  playAdminSound();
  
  // เปลี่ยนสี cursor
  enableAdminCursor();
  
  // เพิ่ม Particle Effects
  createParticleEffect();
}

function startPowerLevelAnimation() {
  // Power level animation removed
}

function createMatrixRain() {
  const matrix = document.createElement('div');
  matrix.id = 'matrix-rain';
  matrix.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
    opacity: 0.1;
  `;
  
  document.body.appendChild(matrix);
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()';
  
  for (let i = 0; i < 50; i++) {
    const column = document.createElement('div');
    column.style.cssText = `
      position: absolute;
      top: -100vh;
      left: ${Math.random() * 100}%;
      color: #0f0;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      animation: matrixFall ${3 + Math.random() * 5}s linear infinite;
      animation-delay: ${Math.random() * 3}s;
    `;
    
    let text = '';
    for (let j = 0; j < 20; j++) {
      text += chars[Math.floor(Math.random() * chars.length)] + '<br>';
    }
    column.innerHTML = text;
    matrix.appendChild(column);
  }
}

function playAdminSound() {
  // สร้างเสียง beep เท่ ๆ ด้วย Web Audio API
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    console.log('🔊 Admin sound effect played!');
  } catch (error) {
    console.log('🔇 Could not play admin sound:', error);
  }
}

function enableAdminCursor() {
  // Admin cursor effects removed
}

function createParticleEffect() {
  // Particle effects removed
}

// เพิ่ม CSS สำหรับเอฟเฟคใหม่
const adminEffectsStyle = document.createElement('style');
adminEffectsStyle.textContent = `
  @keyframes matrixFall {
    from { transform: translateY(-100vh); }
    to { transform: translateY(100vh); }
  }
  

  
  /* Enhanced button effects for admin */
  .admin-panel .btn:hover {
    box-shadow: 0 0 30px rgba(102, 126, 234, 0.8) !important;
    transform: translateY(-3px) scale(1.05) !important;
  }
  
  .admin-panel .control-card:hover {
    box-shadow: 0 15px 50px rgba(102, 126, 234, 0.3) !important;
    transform: translateY(-5px) !important;
  }
`;
document.head.appendChild(adminEffectsStyle);

// Add ripple and toggle animation CSS
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }

  .status-value {
    transition: all 0.3s ease, transform 0.2s ease;
  }

  .toggle-slider {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .toggle-slider:before {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .backup-section, .restore-section {
    margin-bottom: 20px;
    padding: 15px;
    background: #1e1e1e;
    border-radius: 8px;
    border: 1px solid #333;
  }

  .backup-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 10px 0;
  }

  .backup-options label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #fff;
    font-size: 14px;
  }

  .ip-input-group {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
  }

  .ip-input-group input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #333;
    border-radius: 6px;
    background: #2a2a2a;
    color: #fff;
  }

  .queue-item, .ip-item {
    padding: 10px;
    border-bottom: 1px solid #333;
    color: #fff;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .queue-list, .blocked-ips-list {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #333;
    border-radius: 6px;
    margin-bottom: 15px;
  }
`;
document.head.appendChild(rippleStyle);

// Initialize visual effects when DOM is loaded
document.addEventListener('DOMContentLoaded', addVisualEffects);

// Chat System
let chatUsers = new Set();

function initializeChatSystem() {
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const chatFileBtn = document.getElementById('chatFileBtn');
  const chatFileInput = document.getElementById('chatFileInput');
  const chatMessages = document.getElementById('chatMessages');
  
  // Send message on Enter key
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  
  // Send button click
  chatSendBtn.addEventListener('click', sendChatMessage);
  
  // File upload button
  chatFileBtn.addEventListener('click', () => {
    chatFileInput.click();
  });
  
  // File input change
  chatFileInput.addEventListener('change', handleChatFile);
  
  // Socket events for chat
  socket.on('chat-message', (data) => {
    displayChatMessage(data);
    updateChatUserCount();
  });
  
  socket.on('chat-user-joined', (data) => {
    chatUsers.add(data.userId);
    updateChatUserCount();
  });
  
  socket.on('chat-user-left', (data) => {
    chatUsers.delete(data.userId);
    updateChatUserCount();
  });
}

function sendChatMessage() {
  const chatInput = document.getElementById('chatInput');
  const message = chatInput.value.trim();
  
  if (!message) return;
  
  const messageData = {
    type: 'text',
    content: message,
    sender: 'admin',
    timestamp: Date.now()
  };
  
  socket.emit('admin-chat-message', messageData);
  chatInput.value = '';
  
  // Display locally for admin
  displayChatMessage(messageData);
}

function handleChatFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Create file data URL for preview
  const reader = new FileReader();
  reader.onload = (e) => {
    const messageData = {
      type: 'file',
      content: file.name,
      fileData: e.target.result,
      fileType: file.type,
      sender: 'admin',
      timestamp: Date.now()
    };
    
    socket.emit('admin-chat-message', messageData);
    displayChatMessage(messageData);
  };
  reader.readAsDataURL(file);
  
  // Clear input
  event.target.value = '';
}

function displayChatMessage(messageData) {
  const chatMessages = document.getElementById('chatMessages');
  const messageElement = document.createElement('div');
  messageElement.className = `chat-message ${messageData.sender}`;
  
  const time = new Date(messageData.timestamp).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  let messageContent = '';
  
  if (messageData.type === 'file') {
    const isImage = messageData.fileType.startsWith('image/');
    messageContent = `
      <div class="message-header">${messageData.sender} • ${time}</div>
      <div class="message-content">
        📎 ${messageData.content}
        ${isImage ? `<div class="chat-file-preview"><img src="${messageData.fileData}" alt="Uploaded file"></div>` : ''}
      </div>
    `;
  } else {
    messageContent = `
      <div class="message-header">${messageData.sender} • ${time}</div>
      <div class="message-content">${messageData.content}</div>
    `;
  }
  
  messageElement.innerHTML = messageContent;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateChatUserCount() {
  const chatUserCount = document.getElementById('chatUserCount');
  if (chatUserCount) {
    chatUserCount.textContent = chatUsers.size;
  }
}

// Media Control System
let currentMedia = null;
let mediaType = 'video';

function initializeMediaControl() {
  const mediaUrl = document.getElementById('mediaUrl');
  const mediaType = document.getElementById('mediaType');
  const mediaVolume = document.getElementById('mediaVolume');
  const volumeDisplay = document.getElementById('volumeDisplay');
  const playMedia = document.getElementById('playMedia');
  const pauseMedia = document.getElementById('pauseMedia');
  const stopMedia = document.getElementById('stopMedia');
  const mediaStatus = document.getElementById('mediaStatus');
  
  // Volume control
  mediaVolume.addEventListener('input', (e) => {
    const volume = e.target.value;
    volumeDisplay.textContent = `${volume}%`;
    
    if (currentMedia) {
      socket.emit('media-volume', { volume: volume / 100 });
    }
  });
  
  // Play media
  playMedia.addEventListener('click', () => {
    const url = mediaUrl.value.trim();
    const type = mediaType.value;
    
    if (!url) {
      showToast('กรุณาใส่ URL ของวิดีโอ', 'warning');
      return;
    }
    
    const mediaData = {
      url: url,
      type: type,
      volume: mediaVolume.value / 100
    };
    
    socket.emit('media-play', mediaData);
    updateMediaStatus(`Playing ${type}: ${url}`);
  });
  
  // Pause media
  pauseMedia.addEventListener('click', () => {
    socket.emit('media-pause');
    updateMediaStatus('Media paused');
  });
  
  // Stop media
  stopMedia.addEventListener('click', () => {
    socket.emit('media-stop');
    updateMediaStatus('Media stopped');
    currentMedia = null;
  });
}

function updateMediaStatus(status) {
  const mediaStatus = document.getElementById('mediaStatus');
  mediaStatus.innerHTML = `<p>${status}</p>`;
}

// Advanced Analytics Functions
let analyticsData = {};
let activeUsers = [];
let chartInstances = {};

function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      // Remove active class from all tabs and panels
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      // Add active class to clicked tab and corresponding panel
      btn.classList.add('active');
      const targetPanel = document.getElementById(`${targetTab}-tab`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

function initializeCharts() {
  const hourlyCtx = document.getElementById('hourlyChart');
  const typeCtx = document.getElementById('typeChart');

  if (hourlyCtx && typeof Chart !== 'undefined') {
    chartInstances.hourlyChart = new Chart(hourlyCtx, {
      type: 'line',
      data: {
        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
        datasets: [{
          label: 'การใช้งาน',
          data: new Array(24).fill(0),
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  if (typeCtx && typeof Chart !== 'undefined') {
    chartInstances.typeChart = new Chart(typeCtx, {
      type: 'doughnut',
      data: {
        labels: ['YouTube', 'TikTok', 'Upload'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}

function loadAnalyticsData() {
  fetch('/api/analytics')
    .then(response => response.json())
    .then(data => {
      analyticsData = data;
      updateAnalyticsDisplay();
    })
    .catch(error => console.error('Failed to load analytics:', error));
}

function updateAnalyticsDisplay() {
  // Update metric boxes
  const elements = {
    'totalUsersToday': analyticsData.totalUsersToday || 0,
    'totalDownloads': analyticsData.totalDownloads || 0,
    'avgProcessTime': (analyticsData.avgProcessTime || 0) + 's',
    'systemLoad': Math.round(analyticsData.systemLoad || 0) + '%'
  };

  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });

  // Update trends (simulate for now)
  const trends = {
    'userTrend': '+12%',
    'downloadTrend': '+8%',
    'timeTrend': '-5%',
    'loadTrend': '+3%'
  };

  Object.entries(trends).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });

  // Update charts
  if (chartInstances.hourlyChart) {
    chartInstances.hourlyChart.data.datasets[0].data = analyticsData.hourlyUsage || new Array(24).fill(0);
    chartInstances.hourlyChart.update('none');
  }

  if (chartInstances.typeChart) {
    const types = analyticsData.textureTypes || { youtube: 0, tiktok: 0, upload: 0 };
    chartInstances.typeChart.data.datasets[0].data = [types.youtube, types.tiktok, types.upload];
    chartInstances.typeChart.update('none');
  }
}

function updateActiveUsers() {
  fetch('/api/active-users')
    .then(response => response.json())
    .then(users => {
      activeUsers = users;
      displayActiveUsers();
    })
    .catch(error => console.error('Failed to load active users:', error));
}

function displayActiveUsers() {
  const usersList = document.getElementById('activeUsersList');
  const userCount = document.getElementById('liveUserCount');
  const userSearch = document.getElementById('userSearch');

  if (userCount) {
    userCount.textContent = activeUsers.length;
  }

  // Added: filter users by search query in real-time
  const q = (userSearch && userSearch.value || '').trim().toLowerCase();
  const filtered = q
    ? activeUsers.filter(u => (u.id || '').toLowerCase().includes(q) || (u.lastActivity || '').toLowerCase().includes(q))
    : activeUsers;

  if (usersList) {
    if (filtered.length === 0) {
      usersList.innerHTML = '<div style="text-align: center; color: #aaa; padding: 20px;">ไม่พบผู้ใช้ที่ตรงกับการค้นหา</div>';
    } else {
      usersList.innerHTML = filtered.map(user => `
        <div class="user-item">
          <div class="user-avatar">${(user.id || '').substring(5, 7).toUpperCase()}</div>
          <div class="user-info">
            <div class="name">${user.id || '-'}</div>
            <div class="activity">${user.lastActivity || ''}</div>
          </div>
        </div>
      `).join('');
    }
  }
}

function updateActivityTimeline() {
  fetch('/api/recent-activity')
    .then(response => response.json())
    .then(activities => {
      const timeline = document.querySelector('.timeline-items');
      const activitySearch = document.getElementById('activitySearch');
      if (timeline) {
        const q = (activitySearch && activitySearch.value || '').trim().toLowerCase();
        const list = Array.isArray(activities) ? activities : [];
        const filtered = q
          ? list.filter(a => (a.description || '').toLowerCase().includes(q))
          : list;
        if (filtered.length === 0) {
          timeline.innerHTML = '<div style="text-align: center; color: #aaa; padding: 10px;">ไม่มีกิจกรรม</div>';
        } else {
          timeline.innerHTML = filtered.slice(0, 10).map(activity => `
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <span>${new Date(activity.timestamp).toLocaleTimeString('th-TH')} - ${activity.description}</span>
            </div>
          `).join('');
        }
      }
    })
    .catch(error => console.error('Failed to load activity:', error));
}

function updatePerformanceMetrics() {
  fetch('/api/performance')
    .then(response => response.json())
    .then(performance => {
      // Update progress bars
      const progressElements = [
        { id: 'cpuProgress', value: performance.cpu || 0 },
        { id: 'memoryProgress', value: performance.memory || 0 },
        { id: 'diskProgress', value: performance.disk || 0 }
      ];

      progressElements.forEach(({ id, value }) => {
        const progressEl = document.getElementById(id);
        const percentageEl = document.getElementById(id.replace('Progress', 'Percentage'));
        if (progressEl) progressEl.style.width = `${value}%`;
        if (percentageEl) percentageEl.textContent = `${Math.round(value)}%`;
      });

      // Update network stats
      const networkUp = document.getElementById('networkUp');
      const networkDown = document.getElementById('networkDown');
      if (networkUp) networkUp.textContent = `${Math.round(performance.networkUp || 0)} KB/s`;
      if (networkDown) networkDown.textContent = `${Math.round(performance.networkDown || 0)} KB/s`;

      // Update process list
      const processList = document.getElementById('processList');
      if (processList) {
        processList.innerHTML = `
          <div class="process-item">
            <span class="process-name">Node.js Server</span>
            <span class="process-usage">${Math.round((performance.cpu || 0) * 0.8)}%</span>
          </div>
          <div class="process-item">
            <span class="process-name">FFmpeg</span>
            <span class="process-usage">${Math.round((performance.cpu || 0) * 0.2)}%</span>
          </div>
        `;
      }
    })
    .catch(error => console.error('Failed to load performance:', error));
}

function loadAdvancedSettings() {
  fetch('/api/advanced-settings')
    .then(response => response.json())
    .then(settings => {
      // Load settings into form
      Object.keys(settings).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
          if (element.type === 'checkbox') {
            element.checked = settings[key];
          } else {
            element.value = settings[key];
          }
        }
      });
    })
    .catch(error => console.error('Failed to load advanced settings:', error));
}

function saveAdvancedSettings() {
  const settings = {};

  // Collect all settings from all tabs
  const selectors = [
    '#general-tab input',
    '#general-tab select',
    '#limits-tab input',
    '#security-tab input'
  ];

  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(input => {
      if (input.type === 'checkbox') {
        settings[input.id] = input.checked;
      } else {
        settings[input.id] = input.type === 'number' ? parseInt(input.value) : input.value;
      }
    });
  });

  fetch('/api/advanced-settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(settings)
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      showToast('การตั้งค่าถูกบันทึกแล้ว', 'success');
    } else {
      showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
    }
  })
  .catch(error => {
    console.error('Failed to save settings:', error);
    showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
  });
}

function setupAdvancedEventListeners() {
  // Performance refresh button
  const refreshPerformanceBtn = document.getElementById('refreshPerformance');
  if (refreshPerformanceBtn) {
    refreshPerformanceBtn.addEventListener('click', updatePerformanceMetrics);
  }

  // Advanced settings save button
  const saveAdvancedSettingsBtn = document.getElementById('saveAdvancedSettings');
  if (saveAdvancedSettingsBtn) {
    saveAdvancedSettingsBtn.addEventListener('click', saveAdvancedSettings);
  }
}

function startRealTimeUpdates() {
  // Update analytics every 10 seconds
  setInterval(loadAnalyticsData, 10000);

  // Update active users every 5 seconds
  setInterval(updateActiveUsers, 5000);

  // Update activity timeline every 15 seconds
  setInterval(updateActivityTimeline, 15000);

  // Update performance every 5 seconds
  setInterval(updatePerformanceMetrics, 5000);
}

// Socket.IO event listeners for real-time updates
function setupRealTimeListeners() {
  socket.on('analytics-update', (data) => {
    analyticsData = { ...analyticsData, ...data };
    updateAnalyticsDisplay();
  });

  socket.on('active-users-update', (users) => {
    activeUsers = users;
    displayActiveUsers();
  });

  socket.on('activity-timeline-update', (activities) => {
    const timeline = document.querySelector('.timeline-items');
    const activitySearch = document.getElementById('activitySearch');
    if (timeline) {
      const q = (activitySearch && activitySearch.value || '').trim().toLowerCase();
      const list = Array.isArray(activities) ? activities : [];
      const filtered = q
        ? list.filter(a => (a.description || '').toLowerCase().includes(q))
        : list;
      timeline.innerHTML = filtered.slice(0, 10).map(activity => `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <span>${new Date(activity.timestamp).toLocaleTimeString('th-TH')} - ${activity.description}</span>
        </div>
      `).join('');
    }
  });

  socket.on('activity-update', (activity) => {
    // Add new activity to timeline with live search filter
    const timeline = document.querySelector('.timeline-items');
    const activitySearch = document.getElementById('activitySearch');
    const q = (activitySearch && activitySearch.value || '').trim().toLowerCase();
    if (timeline && timeline.children.length > 0) {
      if (!q || (activity.description || '').toLowerCase().includes(q)) {
        const newItem = document.createElement('div');
        newItem.className = 'timeline-item';
        newItem.innerHTML = `
          <div class="timeline-dot"></div>
          <span>${new Date(activity.timestamp).toLocaleTimeString('th-TH')} - ${activity.description}</span>
        `;
        timeline.insertBefore(newItem, timeline.firstChild);
      }

      // Keep only last 10 items
      while (timeline.children.length > 10) {
        timeline.removeChild(timeline.lastChild);
      }
    }
  });

  socket.on('performance-update', (performance) => {
    // Update performance display in real-time
    const updates = [
      { progress: 'cpuProgress', percentage: 'cpuPercentage', value: performance.cpu },
      { progress: 'memoryProgress', percentage: 'memoryPercentage', value: performance.memory },
      { progress: 'diskProgress', percentage: 'diskPercentage', value: performance.disk }
    ];

    updates.forEach(({ progress, percentage, value }) => {
      const progressEl = document.getElementById(progress);
      const percentageEl = document.getElementById(percentage);
      if (progressEl) progressEl.style.width = `${value || 0}%`;
      if (percentageEl) percentageEl.textContent = `${Math.round(value || 0)}%`;
    });

    const networkUp = document.getElementById('networkUp');
    const networkDown = document.getElementById('networkDown');
    if (networkUp) networkUp.textContent = `${Math.round(performance.networkUp || 0)} KB/s`;
    if (networkDown) networkDown.textContent = `${Math.round(performance.networkDown || 0)} KB/s`;
  });
}

// Initialize advanced features when user logs in successfully
function initializeAdvancedFeatures() {
  // Initialize tab functionality
  setupTabs();

  // Initialize charts if Chart.js is available
  if (typeof Chart !== 'undefined') {
    initializeCharts();
  } else {
    // Load Chart.js dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = () => initializeCharts();
    document.head.appendChild(script);
  }

  // Load analytics data
  loadAnalyticsData();

  // Start real-time updates
  startRealTimeUpdates();

  // Setup advanced event listeners
  setupAdvancedEventListeners();

  // Setup real-time Socket.IO listeners
  setupRealTimeListeners();
}

// === New Chat & Media Functions ===

// Chat Functions
function handleSendChatMessage() {
  const chatMessageInput = document.getElementById('chatMessage');
  const chatHistory = document.getElementById('chatHistory');
  const message = chatMessageInput.value.trim();
  if (!message) return;

  const chatData = {
    type: 'admin-broadcast',
    message: message,
    timestamp: Date.now()
  };

  // Send via socket
  socket.emit('admin-chat-broadcast', chatData);
  
  // Add to local history
  addToChatHistory('Admin', message);
  
  // Clear input
  chatMessageInput.value = '';
  
  showToast('ส่งข้อความแล้ว', 'success');
}

function handleClearChatHistory() {
  const chatHistory = document.getElementById('chatHistory');
  chatHistory.innerHTML = '<div class="chat-item">ยังไม่มีข้อความ</div>';
  showToast('ล้างประวัติแชทแล้ว', 'success');
}

function addToChatHistory(sender, message) {
  const chatHistory = document.getElementById('chatHistory');
  const time = new Date().toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const chatItem = document.createElement('div');
  chatItem.className = 'chat-item';
  chatItem.innerHTML = `
    <div class="time">${time}</div>
    <div class="message"><strong>${sender}:</strong> ${message}</div>
  `;

  if (chatHistory.children[0]?.textContent === 'ยังไม่มีข้อความ') {
    chatHistory.innerHTML = '';
  }

  chatHistory.appendChild(chatItem);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Media Functions
function handleMediaUrlChange() {
  const mediaUrlInput = document.getElementById('mediaUrl');
  const mediaPreview = document.getElementById('mediaPreview');
  const mediaPlaceholder = document.getElementById('mediaPlaceholder');
  const mediaIframe = document.getElementById('mediaIframe');
  const url = mediaUrlInput.value.trim();
  
  if (!url) {
    mediaPreview.style.display = 'none';
    mediaPlaceholder.style.display = 'block';
    return;
  }

  // Check if it's a YouTube URL
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    // Show YouTube preview
    mediaIframe.src = `https://www.youtube.com/embed/${youtubeId}`;
    mediaPreview.style.display = 'block';
    mediaPlaceholder.style.display = 'none';
  } else {
    // For other URLs, show placeholder
    mediaPreview.style.display = 'none';
    mediaPlaceholder.style.display = 'block';
  }
}

function handlePlayMedia() {
  const mediaUrlInput = document.getElementById('mediaUrl');
  const mediaTypeSelect = document.getElementById('mediaType');
  const url = mediaUrlInput.value.trim();
  const type = mediaTypeSelect.value;
  
  if (!url) {
    showToast('กรุณาใส่ URL ก่อน', 'warning');
    return;
  }

  const mediaData = {
    url: url,
    type: type
  };

  // Send to main page
  socket.emit('media-play', mediaData);
  
  showToast(`เล่น${type === 'video' ? 'วิดีโอ' : 'เสียง'}ในหน้าหลักแล้ว`, 'success');
}

function handleStopMedia() {
  socket.emit('media-stop');
  showToast('หยุดมีเดียในหน้าหลักแล้ว', 'success');
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

// File media functions
function handleFileSelection() {
  const mediaFileInput = document.getElementById('mediaFileInput');
  const file = mediaFileInput.files[0];
  
  if (file) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      showToast('ไฟล์ใหญ่เกินไป (สูงสุด 50MB)', 'error');
      mediaFileInput.value = '';
      return;
    }
    
    console.log('Selected file:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
    showToast(`เลือกไฟล์: ${file.name}`, 'success');
  }
}

function handlePlayFileMedia() {
  const mediaFileInput = document.getElementById('mediaFileInput');
  const fileMediaTypeSelect = document.getElementById('fileMediaType');
  const file = mediaFileInput.files[0];
  
  if (!file) {
    showToast('กรุณาเลือกไฟล์ก่อน', 'error');
    return;
  }
  
  const type = fileMediaTypeSelect.value;
  
  // Show upload progress
  const progressContainer = document.getElementById('fileUploadProgress');
  const progressBar = document.getElementById('uploadProgressBar');
  const uploadStatus = document.getElementById('uploadStatus');
  
  progressContainer.style.display = 'block';
  progressBar.style.width = '0%';
  uploadStatus.textContent = 'กำลังอัปโหลด...';
  
  // Create FormData
  const formData = new FormData();
  formData.append('mediaFile', file);
  formData.append('type', type);
  
  // Upload file with progress
  const xhr = new XMLHttpRequest();
  
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const percentComplete = (e.loaded / e.total) * 100;
      progressBar.style.width = percentComplete + '%';
      uploadStatus.textContent = `กำลังอัปโหลด... ${Math.round(percentComplete)}%`;
    }
  });
  
  xhr.addEventListener('load', () => {
    if (xhr.status === 200) {
      const response = JSON.parse(xhr.responseText);
      if (response.success) {
        progressBar.style.width = '100%';
        uploadStatus.textContent = 'อัปโหลดสำเร็จ! กำลังเล่น...';
        
        // Send media data to all users
        const mediaData = {
          url: response.fileUrl,
          type: type,
          isFile: true,
          fileName: file.name
        };
        
        socket.emit('media-play', mediaData);
        showToast(`เล่นไฟล์${type === 'video' ? 'วิดีโอ' : 'เสียง'}ในหน้าหลักแล้ว`, 'success');
        
        setTimeout(() => {
          progressContainer.style.display = 'none';
        }, 2000);
      } else {
        uploadStatus.textContent = 'อัปโหลดล้มเหลว: ' + response.error;
        showToast('อัปโหลดล้มเหลว', 'error');
      }
    } else {
      uploadStatus.textContent = 'เกิดข้อผิดพลาด';
      showToast('เกิดข้อผิดพลาดในการอัปโหลด', 'error');
    }
  });
  
  xhr.addEventListener('error', () => {
    uploadStatus.textContent = 'เกิดข้อผิดพลาด';
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  });
  
  xhr.open('POST', '/api/upload-media');
  xhr.send(formData);
}

function handleClearFileMedia() {
  const mediaFileInput = document.getElementById('mediaFileInput');
  const progressContainer = document.getElementById('fileUploadProgress');
  
  mediaFileInput.value = '';
  progressContainer.style.display = 'none';
  showToast('ล้างไฟล์แล้ว', 'info');
}

// Initialize new event listeners
function initializeNewFeatures() {
  // Chat event listeners
  const sendChatMessageBtn = document.getElementById('sendChatMessage');
  const chatMessageInput = document.getElementById('chatMessage');
  const clearChatHistoryBtn = document.getElementById('clearChatHistory');

  if (sendChatMessageBtn) {
    sendChatMessageBtn.addEventListener('click', handleSendChatMessage);
  }
  
  if (chatMessageInput) {
    chatMessageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendChatMessage();
      }
    });
  }
  
  if (clearChatHistoryBtn) {
    clearChatHistoryBtn.addEventListener('click', handleClearChatHistory);
  }

  // Media event listeners
  const mediaUrlInput = document.getElementById('mediaUrl');
  const playMediaBtn = document.getElementById('playMedia');
  const stopMediaBtn = document.getElementById('stopMedia');
  
  if (mediaUrlInput) {
    mediaUrlInput.addEventListener('input', handleMediaUrlChange);
  }
  
  if (playMediaBtn) {
    playMediaBtn.addEventListener('click', handlePlayMedia);
  }
  
  if (stopMediaBtn) {
    stopMediaBtn.addEventListener('click', handleStopMedia);
  }

  // File upload event listeners
  const playFileMediaBtn = document.getElementById('playFileMedia');
  const clearFileMediaBtn = document.getElementById('clearFileMedia');
  const mediaFileInput = document.getElementById('mediaFileInput');
  
  if (playFileMediaBtn) {
    playFileMediaBtn.addEventListener('click', handlePlayFileMedia);
  }
  
  if (clearFileMediaBtn) {
    clearFileMediaBtn.addEventListener('click', handleClearFileMedia);
  }
  
  if (mediaFileInput) {
    mediaFileInput.addEventListener('change', handleFileSelection);
  }
}

// Call when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNewFeatures);
} else {
  initializeNewFeatures();
}

// [Added] Theme management in Admin with persistence
(function setupAdminTheme(){
  try {
    const saved = localStorage.getItem('admin-theme') || localStorage.getItem('theme') || 'dark';
    applyTheme(saved);
    const btn = document.getElementById('themeToggleAdmin');
    if (btn) {
      btn.addEventListener('click', () => {
        const next = (document.documentElement.dataset.theme === 'dark') ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('admin-theme', next);
        showToast(next === 'dark' ? 'โหมดมืด (Admin)' : 'โหมดสว่าง (Admin)', 'success');
      });
    }
  } catch(e) {}
})();

function applyTheme(mode){
  document.documentElement.dataset.theme = mode;
}

// [Added] Real-time search filters
let userSearchQuery = '';
let activitySearchQuery = '';
let queueSearchQuery = '';
let eventSearchQuery = '';

(function setupRealtimeSearch(){
  const userSearch = document.getElementById('userSearch');
  const activitySearch = document.getElementById('activitySearch');
  const queueSearch = document.getElementById('queueSearch');
  const eventSearch = document.getElementById('eventSearch');

  if (userSearch) userSearch.addEventListener('input', () => { userSearchQuery = userSearch.value.toLowerCase(); displayActiveUsers(); });
  if (activitySearch) activitySearch.addEventListener('input', () => { activitySearchQuery = activitySearch.value.toLowerCase(); updateActivityTimeline(); });
  if (queueSearch) queueSearch.addEventListener('input', () => { queueSearchQuery = queueSearch.value.toLowerCase(); renderQueueList(lastQueueData); });
  if (eventSearch) eventSearch.addEventListener('input', () => { eventSearchQuery = eventSearch.value.toLowerCase(); if (lastEventsList) updateEventsList(lastEventsList); });
})();

// [Added] Keep last datasets for filtering without refetch
let lastQueueData = { items: [] };
let lastEventsList = [];

// Override queue rendering to respect queueSearchQuery
function renderQueueList(data){
  lastQueueData = data || lastQueueData;
  const queueList = document.getElementById('queueList');
  if (!queueList || !lastQueueData.items) return;
  const items = (lastQueueData.items || []).filter(item => {
    const text = `${item.id} ${item.type} ${item.status}`.toLowerCase();
    return !queueSearchQuery || text.includes(queueSearchQuery);
  });
  if (items.length === 0) {
    queueList.innerHTML = '<div class="queue-item">No items in queue</div>';
  } else {
    queueList.innerHTML = items.map(item => `
      <div class="queue-item">
        <div>
          <strong>${item.type}</strong> - ${item.status}
          <br><small>Started: ${new Date(item.startTime).toLocaleTimeString('th-TH')}</small>
        </div>
        <button onclick="cancelQueueItem('${item.id}')" class="btn btn-sm btn-danger">
          <i class="fas fa-times"></i> Cancel
        </button>
      </div>
    `).join('');
  }
}

// Hook queue updates
(function hookQueueUpdates(){
  const originalHandler = socket.listeners('queue-stats')[0];
  socket.off('queue-stats');
  socket.on('queue-stats', (data) => {
    lastQueueData = data || lastQueueData;
    document.getElementById('queueLength').textContent = data.length || 0;
    document.getElementById('processingCount').textContent = data.processing || 0;
    document.getElementById('avgWaitTime').textContent = `${data.avgWaitTime || 0}s`;
    renderQueueList(data);
  });
})();

// Extend displayActiveUsers with filtering
const _displayActiveUsers = displayActiveUsers;
displayActiveUsers = function(){
  const usersList = document.getElementById('activeUsersList');
  const userCount = document.getElementById('liveUserCount');
  const filtered = (activeUsers || []).filter(u => {
    const text = `${u.id} ${u.lastActivity}`.toLowerCase();
    return !userSearchQuery || text.includes(userSearchQuery);
  });
  if (userCount) userCount.textContent = filtered.length;
  if (usersList) {
    usersList.innerHTML = filtered.length === 0 ?
      '<div style="text-align: center; color: #aaa; padding: 20px;">ไม่มีผู้ใช้ออนไลน์</div>' :
      filtered.map(user => `
        <div class="user-item">
          <div class="user-avatar">${user.id.substring(5, 7).toUpperCase()}</div>
          <div class="user-info">
            <div class="name">${user.id}</div>
            <div class="activity">${user.lastActivity}</div>
          </div>
        </div>
      `).join('');
  }
}

// Extend updateActivityTimeline with filtering
const _updateActivityTimeline = updateActivityTimeline;
updateActivityTimeline = function(){
  fetch('/api/recent-activity')
    .then(r => r.json())
    .then(activities => {
      const timeline = document.querySelector('.timeline-items');
      if (!timeline) return;
      const filtered = (activities || []).filter(a => {
        const text = `${a.description || ''}`.toLowerCase();
        return !activitySearchQuery || text.includes(activitySearchQuery);
      });
      if (filtered.length === 0) {
        timeline.innerHTML = '<div style="text-align: center; color: #aaa; padding: 10px;">ไม่มีกิจกรรม</div>';
      } else {
        timeline.innerHTML = filtered.slice(0, 10).map(activity => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <span>${new Date(activity.timestamp).toLocaleTimeString('th-TH')} - ${activity.description}</span>
          </div>
        `).join('');
      }
    })
    .catch(()=>{});
}

// Extend updateEventsList with filtering + count
const _updateEventsList = updateEventsList;
updateEventsList = function(events){
  lastEventsList = events || [];
  const list = document.getElementById('eventsList');
  const countSpan = document.getElementById('eventsCount');
  const filtered = (lastEventsList || []).filter(ev => {
    const text = `${ev.title} ${ev.description || ''} ${ev.command || ''}`.toLowerCase();
    return !eventSearchQuery || text.includes(eventSearchQuery);
  });
  if (countSpan) countSpan.textContent = filtered.length;
  if (!list) return;
  if (filtered.length === 0) {
    list.innerHTML = '<div class="event-item">No events created</div>';
    return;
  }
  list.innerHTML = filtered.map(event => `
    <div class="event-item ${event.isActive ? 'active' : 'inactive'}">
      <div class="event-info">
        <strong>${event.title}</strong>
        <div class="event-details">
          <span>Command: ${event.command || 'None'}</span>
          <span>Created: ${new Date(event.createdAt).toLocaleString('th-TH')}</span>
        </div>
      </div>
      <div class="event-actions">
        <button onclick="toggleEvent('${event.id}', ${!event.isActive})" class="btn btn-sm ${event.isActive ? 'btn-warning' : 'btn-success'}">
          ${event.isActive ? 'Disable' : 'Enable'}
        </button>
        <button onclick="deleteEvent('${event.id}')" class="btn btn-sm btn-danger">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

