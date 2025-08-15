const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const archiver = require('archiver');
const unzipper = require('unzipper');
const crypto = require('crypto');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const nodemailer = require('nodemailer');
const youtubeDl = require('youtube-dl-exec');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');

// Server initialization - all anti-sleep systems have been removed

// Binary path detection for Nix environment
const { execSync: execSyncBase } = require('child_process');

function findBinary(name) {
  try {
    return execSyncBase(`which ${name}`, { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn(`Warning: ${name} not found in PATH`);
    return name; // fallback to just the name
  }
}

const FFMPEG_PATH = findBinary('ffmpeg');
const MAGICK_PATH = findBinary('magick');

console.log(`🔧 FFmpeg path: ${FFMPEG_PATH}`);
console.log(`🔧 ImageMagick path: ${MAGICK_PATH}`);

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const upload = multer({ dest: 'uploads/' });

// Progress tracking for SSE
const progressClients = new Map();

// Static files
app.use(express.static('public'));
app.use('/zips', express.static('zips'));
app.use(express.json());

// Admin configuration
let adminConfig = {
  password: null, // null means no password set yet - allow any password
  isFirstLogin: true, // flag to track if this is first setup
  gifUrl: 'https://media.tenor.com/XQu4UfesS_kAAAAC/minecraft-block.gif',
  primaryColor: '#667eea',
  secondaryColor: '#764ba2',
  accentColor: '#f093fb',
  uploadEnabled: true,
  youtubeEnabled: true,
  announcement: ''
};

// Load admin config
const configPath = './config/admin-config.json';
if (fs.existsSync(configPath)) {
  try {
    const loadedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    adminConfig = { ...adminConfig, ...loadedConfig };

    // Check if password is properly set
    if (adminConfig.password && adminConfig.password !== null) {
      adminConfig.isFirstLogin = false;
      console.log('✅ Admin config loaded - รหัสผ่านถูกตั้งค่าแล้ว');
    } else {
      adminConfig.isFirstLogin = true;
      console.log('⚠️ Admin config loaded - ยังไม่ได้ตั้งรหัสผ่าน');
    }
  } catch (error) {
    console.log('❌ Failed to load admin config, using default');
    console.error(error);
  }
} else {
  console.log('🔧 Config file ไม่พบ - รอการตั้งรหัสผ่านครั้งแรก');
}

// Save admin config
function saveAdminConfig() {
  try {
    fs.mkdirSync('./config', { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(adminConfig, null, 2));
  } catch (error) {
    console.error('Failed to save admin config:', error);
  }
}

function generateNamespace() {
  return [...Array(32)].map(() => Math.random().toString(36)[2]).join('');
}

function escapePath(filePath) {
  return `"${filePath.replace(/"/g, '\\"')}"`;
}

const adminSessions = new Set();

// System monitoring data
let systemStats = {
  connectedUsers: 0,
  activeProcesses: 0,
  totalRequests: 0,
  uptime: 0,
  startTime: Date.now()
};

// Advanced Analytics System
let analyticsData = {
  totalUsersToday: 0,
  totalDownloads: 0,
  avgProcessTime: 0,
  systemLoad: 0,
  hourlyUsage: new Array(24).fill(0),
  textureTypes: { youtube: 0, tiktok: 0, upload: 0 },
  userSessions: new Map(),
  activeUsers: new Map(),
  processingQueue: [],
  systemPerformance: {
    cpu: 0,
    memory: 0,
    disk: 0,
    networkUp: 0,
    networkDown: 0
  },
  recentActivity: [],
  processList: []
};

// Rate limiting system
let rateLimitData = {
  ipRequests: new Map(), // IP -> { count, lastReset }
  blockedIPs: new Set(),
  maxRequestsPerHour: 50,
  totalRequestsThisHour: 0
};

// Queue management system
let queueSystem = {
  items: [],
  paused: false,
  maxConcurrent: 3,
  currentProcessing: 0
};

// Event system
let eventSystem = {
  events: [],
  eventConfigPath: './config/events.json'
};

// Load events
if (fs.existsSync(eventSystem.eventConfigPath)) {
  try {
    eventSystem.events = JSON.parse(fs.readFileSync(eventSystem.eventConfigPath, 'utf8'));
    console.log(`✅ Loaded ${eventSystem.events.length} events from ${eventSystem.eventConfigPath}`);
  } catch (error) {
    console.error('❌ Failed to load events:', error);
    eventSystem.events = [];
  }
}

function saveEventSystem() {
  try {
    fs.mkdirSync(path.dirname(eventSystem.eventConfigPath), { recursive: true });
    fs.writeFileSync(eventSystem.eventConfigPath, JSON.stringify(eventSystem.events, null, 2));
  } catch (error) {
    console.error('Failed to save event system:', error);
  }
}

// Helper function to create an event
function createEvent(data) {
  const newEvent = {
    id: crypto.randomUUID(),
    title: data.title || `Event ${Date.now()}`,
    description: data.description || '',
    command: data.command || '',
    isActive: data.isActive === undefined ? true : data.isActive,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  eventSystem.events.push(newEvent);
  saveEventSystem();
  addActivity('event_created', `✨ อีเว้นท์ใหม่ถูกสร้าง: ${newEvent.title} (ID: ${newEvent.id})`);
  return newEvent;
}

// Helper function to execute event commands
function executeEventCommand(command, event = {}) {
  console.log(`🚀 กำลังประมวลผลคำสั่งสำหรับอีเว้นท์ '${event.title}': ${command}`);
  addErrorLog('info', `🚀 Admin Executed Command: "${command}" triggered by Event "${event.title}"`);

  try {
    // Execute the command using execSync for simplicity
    // In a production environment, consider using exec for async operations and better error handling
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' }); // Capture output
    console.log(`✅ คำสั่งสำเร็จ: ${result}`);
    addErrorLog('info', `✅ Command Result: ${result.trim()}`);
    return { success: true, output: result.trim() };
  } catch (error) {
    console.error(`❌ คำสั่งล้มเหลว: ${error.message}`);
    console.error(`Stderr: ${error.stderr}`);
    console.error(`Stdout: ${error.stdout}`);
    addErrorLog('error', `❌ Command Failed: ${error.message}`);
    addErrorLog('error', `Command Stderr: ${error.stderr}`);
    addErrorLog('error', `Command Stdout: ${error.stdout}`);
    throw new Error(`Command execution failed: ${error.message}`);
  }
}

// Helper functions for new systems
function getRateLimitStats() {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  // Clean old entries
  for (const [ip, data] of rateLimitData.ipRequests.entries()) {
    if (now - data.lastReset > oneHour) {
      rateLimitData.ipRequests.delete(ip);
    }
  }

  return {
    totalIPs: rateLimitData.ipRequests.size,
    blockedIPs: rateLimitData.blockedIPs.size,
    requestsPerHour: rateLimitData.totalRequestsThisHour,
    blockedIPsList: Array.from(rateLimitData.blockedIPs).map(ip => ({ address: ip }))
  };
}

function getQueueStats() {
  const avgWaitTime = queueSystem.items.length > 0
    ? Math.round(queueSystem.items.reduce((sum, item) => sum + (Date.now() - item.addedTime), 0) / queueSystem.items.length / 1000)
    : 0;

  return {
    length: queueSystem.items.length,
    processing: queueSystem.currentProcessing,
    avgWaitTime,
    paused: queueSystem.paused,
    items: queueSystem.items.map(item => ({
      id: item.id,
      type: item.type,
      status: item.status,
      startTime: item.addedTime
    }))
  };
}

function isIPBlocked(ip) {
  // Check if IP is blocked
  if (rateLimitData.blockedIPs.has(ip)) {
    return true;
  }

  // Check rate limit
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  if (!rateLimitData.ipRequests.has(ip)) {
    rateLimitData.ipRequests.set(ip, { count: 0, lastReset: now });
  }

  const ipData = rateLimitData.ipRequests.get(ip);

  // Reset counter if more than an hour has passed
  if (now - ipData.lastReset > oneHour) {
    ipData.count = 0;
    ipData.lastReset = now;
  }

  ipData.count++;
  rateLimitData.totalRequestsThisHour++;

  // Block if exceeded limit
  if (ipData.count > rateLimitData.maxRequestsPerHour) {
    rateLimitData.blockedIPs.add(ip);
    addActivity('auto_ip_block', `IP ${ip} auto-blocked for exceeding rate limit`);
    return true;
  }

  return false;
}

// Activity tracking functions
function addActivity(type, description, userId = null) {
  const activity = {
    id: generateNamespace().substring(0, 8),
    type,
    description,
    userId,
    timestamp: Date.now()
  };

  analyticsData.recentActivity.unshift(activity);

  // Keep only last 50 activities
  if (analyticsData.recentActivity.length > 50) {
    analyticsData.recentActivity = analyticsData.recentActivity.slice(0, 50);
  }

  // Emit to admin clients
  io.emit('activity-update', activity);

  addErrorLog('info', `📊 ACTIVITY: ${description}`);
}

function updateUserActivity(socketId, activity) {
  if (analyticsData.activeUsers.has(socketId)) {
    analyticsData.activeUsers.get(socketId).lastActivity = activity;
    analyticsData.activeUsers.get(socketId).timestamp = Date.now();
  }
}

function generateUserId() {
  return 'user_' + Math.random().toString(36).substring(2, 8);
}

// Performance monitoring
function updateSystemPerformance() {
  try {
    // Simulate system performance data (in production, use actual system APIs)
    analyticsData.systemPerformance = {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      networkUp: Math.random() * 1000,
      networkDown: Math.random() * 5000
    };

    analyticsData.systemLoad = analyticsData.systemPerformance.cpu;

    // Update hourly usage
    const currentHour = new Date().getHours();
    analyticsData.hourlyUsage[currentHour]++;

    // Emit to admin
    io.emit('performance-update', analyticsData.systemPerformance);

  } catch (error) {
    console.error('Performance monitoring error:', error);
  }
}

// Start performance monitoring
setInterval(updateSystemPerformance, 5000); // Update every 5 seconds

// Advanced settings system
let advancedSettings = {
  maxConcurrentProcesses: 3,
  defaultVideoQuality: '720',
  emailNotifications: false,
  maxFileSize: 100,
  rateLimitPerIP: 50,
  maxProcessingTime: 10,
  enableIPWhitelist: false,
  blockSuspiciousActivity: false,
  sessionTimeout: 30
};

// Load advanced settings
const advancedSettingsPath = './config/advanced-settings.json';
if (fs.existsSync(advancedSettingsPath)) {
  try {
    advancedSettings = { ...advancedSettings, ...JSON.parse(fs.readFileSync(advancedSettingsPath, 'utf8')) };
  } catch (error) {
    console.log('Using default advanced settings');
  }
}

function saveAdvancedSettings() {
  try {
    fs.mkdirSync('./config', { recursive: true });
    fs.writeFileSync(advancedSettingsPath, JSON.stringify(advancedSettings, null, 2));
  } catch (error) {
    console.error('Failed to save advanced settings:', error);
  }
}

// Error logging system
let errorLogs = [];
const MAX_ERROR_LOGS = 500;

function addErrorLog(level, message) {
  const logEntry = {
    timestamp: Date.now(),
    level: level,
    message: message
  };

  errorLogs.unshift(logEntry);

  if (errorLogs.length > MAX_ERROR_LOGS) {
    errorLogs = errorLogs.slice(0, MAX_ERROR_LOGS);
  }

  // Emit to admin clients if connected
  io.emit('new-error-log', logEntry);
}

// Override console methods to capture ALL console output and send to admin
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

console.log = function(...args) {
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');

  // แสดงใน console ปกติ
  originalConsoleLog.apply(console, args);

  // ส่งไปยัง admin mode
  addErrorLog('info', `🖥️ LOG: ${message}`);
};

console.error = function(...args) {
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');

  // แสดงใน console ปกติ
  originalConsoleError.apply(console, args);

  // ส่งไปยัง admin mode
  addErrorLog('error', `❌ ERROR: ${message}`);
};

console.warn = function(...args) {
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');

  // แสดงใน console ปกติ
  originalConsoleWarn.apply(console, args);

  // ส่งไปยัง admin mode
  addErrorLog('warning', `⚠️ WARN: ${message}`);
};

console.info = function(...args) {
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');

  // แสดงใน console ปกติ
  originalConsoleInfo.apply(console, args);

  // ส่งไปยัง admin mode
  addErrorLog('info', `ℹ️ INFO: ${message}`);
};

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  }
});

async function sendNotificationEmail(email, textureName, downloadUrl) {
  if (!email || !process.env.EMAIL_USER) return;

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `🎮 Texture Pack "${textureName}" พร้อมแล้ว!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">🎉 Texture Pack ของคุณพร้อมแล้ว!</h2>
          <p>สวัสดีครับ!</p>
          <p>Texture Pack "<strong>${textureName}</strong>" ของคุณได้สร้างเสร็จแล้ว</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${downloadUrl}"
               style="background-color: #4CAF50; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 8px; font-weight: bold;">
              📦 ดาวน์โหลดเลย
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">
            หมายเหตุ: ลิงก์นี้จะหมดอายุภายใน 24 ชั่วโมง
          </p>
          <hr>
          <p style="color: #888; font-size: 12px;">
            ขอบคุณที่ใช้บริการ BetMC UI Generator!
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ ส่งอีเมลแจ้งเตือนไปยัง ${email} แล้ว`);
  } catch (error) {
    console.error('❌ ไม่สามารถส่งอีเมลได้:', error);
  }
}

// SSE Progress endpoint
app.get('/progress/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  progressClients.set(sessionId, res);

  req.on('close', () => {
    progressClients.delete(sessionId);
  });
});

// Socket.IO connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  systemStats.connectedUsers++;
  
  // Notify about user joining chat
  io.emit('chat-user-joined', { userId: socket.id });

  // Send current config to new connections
  socket.emit('config-update', {
    gifUrl: adminConfig.gifUrl,
    primaryColor: adminConfig.primaryColor,
    secondaryColor: adminConfig.secondaryColor,
    accentColor: adminConfig.accentColor,
    uploadEnabled: adminConfig.uploadEnabled,
    youtubeEnabled: adminConfig.youtubeEnabled,
    announcement: adminConfig.announcement
  });

  // Debug: Log admin config hash for debugging
  console.log('🔐 Current admin password hash exists:', !!adminConfig.password);
  console.log('🔐 Hash length:', adminConfig.password ? adminConfig.password.length : 0);

  // Admin authentication
  socket.on('admin-login', async (data) => {
    console.log('🔑 Admin login attempt from socket:', socket.id);
    console.log('📦 Login data:', data);

    try {
      // ถ้ายังไม่ได้ตั้งรหัสผ่าน ให้ใส่อะไรก็ได้เข้าได้
      if (adminConfig.isFirstLogin || !adminConfig.password) {
        console.log('🔓 First login - accepting any password');
        adminSessions.add(socket.id);
        socket.emit('admin-login-success');
        socket.emit('admin-config', { ...adminConfig, needPasswordSetup: true });

        // Join admin room for real-time updates
        socket.join('admin-room');
        console.log('🏠 Socket joined admin room (first login)');
      } else {
        // ตรวจสอบรหัสผ่านปกติ
        const isValid = await bcrypt.compare(data.password, adminConfig.password);
        console.log('🔐 Password validation result:', isValid);

        if (isValid) {
          console.log('✅ Admin login successful for socket:', socket.id);
          adminSessions.add(socket.id);
          socket.emit('admin-login-success');
          socket.emit('admin-config', { ...adminConfig, needPasswordSetup: false });

          // Join admin room for real-time updates
          socket.join('admin-room');
          console.log('🏠 Socket joined admin room');
        } else {
          console.log('❌ Admin login failed - wrong password for socket:', socket.id);
          socket.emit('admin-login-failed', { reason: 'Invalid password' });
        }
      }
    } catch (error) {
      console.error('💥 Admin login error:', error);
      socket.emit('admin-login-failed', { reason: 'Server error' });
    }
  });

  // Admin get config (for debugging without password)
  socket.on('admin-get-config', () => {
    console.log('📄 Sending admin config to socket:', socket.id);
    socket.emit('admin-config', adminConfig);
  });

  // Admin config updates
  socket.on('admin-update-config', (data) => {
    if (!adminSessions.has(socket.id)) {
      console.log('❌ Unauthorized config update attempt from', socket.id);
      return;
    }

    console.log('✅ Admin config update:', data); // Debug log

    Object.keys(data).forEach(key => {
      if (key !== 'password' && adminConfig.hasOwnProperty(key)) {
        console.log(`Updating ${key}: ${adminConfig[key]} -> ${data[key]}`);
        adminConfig[key] = data[key];
      }
    });

    saveAdminConfig();

    const configUpdate = {
      gifUrl: adminConfig.gifUrl,
      primaryColor: adminConfig.primaryColor,
      secondaryColor: adminConfig.secondaryColor,
      accentColor: adminConfig.accentColor,
      uploadEnabled: adminConfig.uploadEnabled,
      youtubeEnabled: adminConfig.youtubeEnabled,
      announcement: adminConfig.announcement
    };

    console.log('📡 Broadcasting config update:', configUpdate);

    // Broadcast to all clients
    io.emit('config-update', configUpdate);

    // Send confirmation back to admin
    socket.emit('config-update-success', configUpdate);
  });

  // Password setup for first time
  socket.on('admin-setup-password', async (data) => {
    if (!adminSessions.has(socket.id)) return;

    try {
      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      adminConfig.password = hashedPassword;
      adminConfig.isFirstLogin = false;
      saveAdminConfig();
      console.log('🔒 รหัสผ่านถูกตั้งค่าเรียบร้อยแล้ว');
      socket.emit('password-setup-success');
    } catch (error) {
      console.error('❌ Password setup failed:', error);
      socket.emit('password-setup-failed');
    }
  });

  // Password change (for existing password)
  socket.on('admin-change-password', async (data) => {
    if (!adminSessions.has(socket.id)) return;

    try {
      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      adminConfig.password = hashedPassword;
      saveAdminConfig();
      socket.emit('password-changed');
    } catch (error) {
      socket.emit('password-change-failed');
    }
  });

  // Progress tracking
  socket.on('join-progress', (sessionId) => {
    console.log(`🔗 Client ${socket.id} joined progress room: progress-${sessionId}`);
    socket.join(`progress-${sessionId}`);

    // Send initial progress to confirm connection
    socket.emit('progress-update', {
      step: 0,
      progress: 0,
      message: 'เชื่อมต่อแล้ว รอการประมวลผล...',
      timeLeft: null
    });
  });

  // File management handlers
  socket.on('admin-get-file-stats', async () => {
    if (!adminSessions.has(socket.id)) return;

    try {
      const stats = await getFileStats();
      socket.emit('file-stats-update', stats);
    } catch (error) {
      addErrorLog('error', `Failed to get file stats: ${error.message}`);
      socket.emit('error', 'Failed to get file statistics');
    }
  });

  socket.on('admin-cleanup-files', async () => {
    if (!adminSessions.has(socket.id)) return;

    try {
      systemStats.activeProcesses++;
      addErrorLog('info', '🚀 Admin เริ่มล้างไฟล์เก่าด้วยตนเอง...');
      const result = await performFileCleanup();
      socket.emit('cleanup-completed', result);
      addErrorLog('success', `✅ การล้างไฟล์สำเร็จ: ${result.message}`);
      systemStats.activeProcesses--;
    } catch (error) {
      addErrorLog('error', `❌ การล้างไฟล์ล้มเหลว: ${error.message}`);
      socket.emit('cleanup-failed', { error: error.message });
      systemStats.activeProcesses--;
    }
  });

  socket.on('admin-emergency-cleanup', async () => {
    if (!adminSessions.has(socket.id)) return;

    try {
      systemStats.activeProcesses++;
      const result = await performEmergencyCleanup();
      socket.emit('emergency-cleanup-completed', result);
      systemStats.activeProcesses--;
    } catch (error) {
      addErrorLog('error', `Emergency cleanup failed: ${error.message}`);
      socket.emit('error', 'Emergency cleanup failed');
      systemStats.activeProcesses--;
    }
  });

  // System monitoring handlers
  socket.on('admin-get-system-stats', () => {
    if (!adminSessions.has(socket.id)) return;

    systemStats.uptime = Math.floor((Date.now() - systemStats.startTime) / 1000);
    systemStats.connectedUsers = io.engine.clientsCount;
    socket.emit('system-stats-update', systemStats);
  });

  // Error log handlers
  socket.on('admin-get-error-logs', () => {
    if (!adminSessions.has(socket.id)) return;
    socket.emit('error-logs-update', errorLogs);
  });

  socket.on('admin-clear-error-logs', () => {
    if (!adminSessions.has(socket.id)) return;
    errorLogs = [];
    socket.emit('error-logs-cleared');
  });

  // Backup & Restore handlers
  socket.on('admin-create-backup', (options) => {
    if (!adminSessions.has(socket.id)) return;

    try {
      const backupData = {
        timestamp: Date.now(),
        version: '1.0',
        data: {}
      };

      if (options.includeConfig) {
        backupData.data.config = adminConfig;
        backupData.data.advancedSettings = advancedSettings;
      }

      if (options.includeAnalytics) {
        backupData.data.analytics = {
          totalUsersToday: analyticsData.totalUsersToday,
          totalDownloads: analyticsData.totalDownloads,
          hourlyUsage: analyticsData.hourlyUsage,
          textureTypes: analyticsData.textureTypes
        };
      }

      if (options.includeLogs) {
        backupData.data.errorLogs = errorLogs.slice(0, 100); // Last 100 logs
      }

      socket.emit('backup-created', backupData);
      addActivity('backup_created', 'System backup created by admin');

    } catch (error) {
      addErrorLog('error', `Backup creation failed: ${error.message}`);
      socket.emit('backup-restore-failed', { message: error.message });
    }
  });

  socket.on('admin-restore-backup', (backupData) => {
    if (!adminSessions.has(socket.id)) return;

    try {
      if (backupData.data.config) {
        adminConfig = { ...adminConfig, ...backupData.data.config };
        saveAdminConfig();
      }

      if (backupData.data.advancedSettings) {
        advancedSettings = { ...advancedSettings, ...backupData.data.advancedSettings };
        saveAdvancedSettings();
      }

      if (backupData.data.analytics) {
        Object.assign(analyticsData, backupData.data.analytics);
      }

      if (backupData.data.errorLogs) {
        errorLogs = backupData.data.errorLogs;
      }

      socket.emit('backup-restored');
      addActivity('backup_restored', 'System backup restored by admin');

      // Broadcast config updates
      io.emit('config-update', {
        gifUrl: adminConfig.gifUrl,
        primaryColor: adminCconfigr,
        secondaryColor: adminConfig.secondaryColor,
        accentColor: adminConfig.accentColor,
        uploadEnabled: adminConfig.uploadEnabled,
        youtubeEnabled: adminConfig.youtubeEnabled,
        announcement: adminConfig.announcement
      });

    } catch (error) {
      addErrorLog('error', `Backup restore failed: ${error.message}`);
      socket.emit('backup-restore-failed', { message: error.message });
    }
  });

  // Rate limiting handlers
  socket.on('admin-block-ip', (data) => {
    if (!adminSessions.has(socket.id)) return;

    rateLimitData.blockedIPs.add(data.ip);
    socket.emit('ip-blocked');
    addActivity('ip_blocked', `IP ${data.ip} blocked by admin`);
  });

  socket.on('admin-unblock-ip', (data) => {
    if (!adminSessions.has(socket.id)) return;

    rateLimitData.blockedIPs.delete(data.ip);
    socket.emit('rate-limit-stats', getRateLimitStats());
    addActivity('ip_unblocked', `IP ${data.ip} unblocked by admin`);
  });

  socket.on('admin-get-rate-limit-stats', () => {
    if (!adminSessions.has(socket.id)) return;
    socket.emit('rate-limit-stats', getRateLimitStats());
  });

  // Queue management handlers
  socket.on('admin-pause-queue', () => {
    if (!adminSessions.has(socket.id)) return;
    queueSystem.paused = true;
    socket.emit('queue-paused');
    addActivity('queue_paused', 'Processing queue paused by admin');
  });

  socket.on('admin-resume-queue', () => {
    if (!adminSessions.has(socket.id)) return;
    queueSystem.paused = false;
    socket.emit('queue-resumed');
    addActivity('queue_resumed', 'Processing queue resumed by admin');
  });

  socket.on('admin-clear-queue', () => {
    if (!adminSessions.has(socket.id)) return;

    queueSystem.items = [];
    socket.emit('queue-cleared');
    addActivity('queue_cleared', 'Processing queue cleared by admin');
  });

  socket.on('admin-cancel-queue-item', (data) => {
    if (!adminSessions.has(socket.id)) return;

    queueSystem.items = queueSystem.items.filter(item => item.id !== data.id);
    socket.emit('queue-stats', getQueueStats());
    addActivity('queue_item_cancelled', `Queue item ${data.id} cancelled by admin`);
  });

  // Event management handlers
  socket.on('admin-create-event', (data) => {
    if (!adminSessions.has(socket.id)) return;

    try {
      const event = createEvent(data);
      socket.emit('event-created', event);
      // [Added] Broadcast new event for real-time notifications
      io.emit('new-event', event);

      // Execute event command if provided
      if (data.command) {
        executeEventCommand(data.command, event);
      }
    } catch (error) {
      socket.emit('event-create-failed', { error: error.message });
    }
  });

  socket.on('admin-get-events', () => {
    if (!adminSessions.has(socket.id)) return;
    socket.emit('events-list', eventSystem.events);
  });

  socket.on('admin-delete-event', (data) => {
    if (!adminSessions.has(socket.id)) return;

    eventSystem.events = eventSystem.events.filter(e => e.id !== data.eventId);
    saveEventSystem();

    io.emit('event-deleted', data.eventId);
    socket.emit('event-deleted-success');
    addActivity('event_deleted', `🗑️ ลบอีเว้นท์ ID: ${data.eventId}`);
    // [Added] Notify clients with a simple event message
    io.emit('new-event', { title: `ลบอีเว้นท์แล้ว (ID: ${data.eventId})` });
  });

  socket.on('admin-toggle-event', (data) => {
    if (!adminSessions.has(socket.id)) return;

    const event = eventSystem.events.find(e => e.id === data.eventId);
    if (event) {
      event.isActive = data.active;
      saveEventSystem();

      io.emit('event-toggled', { eventId: data.eventId, active: data.active });
      socket.emit('event-toggled-success');
      addActivity('event_toggled', `🔄 อีเว้นท์ ${event.title} ${data.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}`);
      // [Added] Notify clients with a simple event message
      io.emit('new-event', { title: `${event.title} ${data.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}` });
    }
  });

  socket.on('admin-execute-command', (data) => {
    if (!adminSessions.has(socket.id)) return;

    try {
      executeEventCommand(data.command, { title: 'Manual Command' });
      socket.emit('command-executed', { success: true });
    } catch (error) {
      socket.emit('command-executed', { success: false, error: error.message });
    }
  });

  // Chat System Events
  socket.on('chat-message', (messageData) => {
    console.log('💬 Chat message from user:', socket.id);
    
    // Broadcast to all connected clients including admin
    io.emit('chat-message', {
      ...messageData,
      timestamp: Date.now()
    });
    
    // Also send to admin room specifically
    io.to('admin-room').emit('chat-message', {
      ...messageData,
      timestamp: Date.now()
    });
  });

  socket.on('admin-chat-message', (messageData) => {
    console.log('💬 Chat message from admin:', socket.id);
    
    // Only admins can send admin messages
    if (adminSessions.has(socket.id)) {
      // Broadcast to all connected clients
      io.emit('admin-chat-message', {
        ...messageData,
        timestamp: Date.now()
      });
    }
  });

  // New Chat System - Admin Broadcast
  socket.on('admin-chat-broadcast', (chatData) => {
    console.log('📢 Admin broadcasting message:', chatData);
    
    // Only admins can broadcast
    if (adminSessions.has(socket.id)) {
      // Broadcast to all main page users (not admin room)
      socket.broadcast.emit('admin-chat-broadcast', {
        message: chatData.message,
        timestamp: Date.now()
      });
      
      // Log for admin history
      console.log(`Admin broadcast: ${chatData.message}`);
    }
  });

  // Media Control Events
  socket.on('media-play', (mediaData) => {
    console.log('🎵 Media play request from admin:', socket.id);
    
    // Only admins can control media
    if (adminSessions.has(socket.id)) {
      console.log('📺 Broadcasting media play to all clients:', mediaData);
      
      // Broadcast to all connected clients except admin
      socket.broadcast.emit('media-play', mediaData);
      
      // Update status in admin
      socket.emit('media-control-status', {
        action: 'play',
        media: mediaData
      });
    }
  });

  socket.on('media-pause', () => {
    console.log('⏸️ Media pause request from admin:', socket.id);
    
    if (adminSessions.has(socket.id)) {
      socket.broadcast.emit('media-pause');
      socket.emit('media-control-status', { action: 'pause' });
    }
  });

  socket.on('media-stop', () => {
    console.log('⏹️ Media stop request from admin:', socket.id);
    
    if (adminSessions.has(socket.id)) {
      socket.broadcast.emit('media-stop');
      socket.emit('media-control-status', { action: 'stop' });
    }
  });

  socket.on('media-volume', (volumeData) => {
    console.log('🔊 Media volume change from admin:', socket.id, volumeData);
    
    if (adminSessions.has(socket.id)) {
      socket.broadcast.emit('media-volume', volumeData);
    }
  });

  socket.on('disconnect', () => {
    adminSessions.delete(socket.id);
    systemStats.connectedUsers = Math.max(0, systemStats.connectedUsers - 1);
    console.log('Client disconnected:', socket.id);
    
    // Notify about user leaving chat
    io.emit('chat-user-left', { userId: socket.id });
  });
});

// File management functions
async function getFileStats() {
  const stats = {
    uploadFiles: 0,
    outputFiles: 0,
    zipFiles: 0,
    diskUsage: 0,
    recentActivity: []
  };

  try {
    // Count upload files
    if (fs.existsSync('uploads')) {
      const uploadFiles = fs.readdirSync('uploads');
      stats.uploadFiles = uploadFiles.length;

      // Calculate disk usage for uploads
      for (const file of uploadFiles) {
        const filePath = path.join('uploads', file);
        try {
          const stat = fs.statSync(filePath);
          stats.diskUsage += stat.size;

          // Add to recent activity if modified in last hour
          if (Date.now() - stat.mtime.getTime() < 3600000) {
            stats.recentActivity.push({
              time: stat.mtime.getTime(),
              message: `Upload: ${file} (${formatBytes(stat.size)})`
            });
          }
        } catch (err) {
          console.warn(`Could not stat file: ${filePath}`);
        }
      }
    }

    // Count output files
    if (fs.existsSync('output')) {
      const countOutputFiles = (dir) => {
        let count = 0;
        try {
          const items = fs.readdirSync(dir);
          for (const item of items) {
            const itemPath = path.join(dir, item);
            const stat = fs.statSync(itemPath);
            if (stat.isDirectory()) {
              count += countOutputFiles(itemPath);
            } else {
              count++;
              stats.diskUsage += stat.size;

              // Add to recent activity if modified in last hour
              if (Date.now() - stat.mtime.getTime() < 3600000) {
                stats.recentActivity.push({
                  time: stat.mtime.getTime(),
                  message: `Output: ${item} (${formatBytes(stat.size)})`
                });
              }
            }
          }
        } catch (err) {
          console.warn(`Could not read directory: ${dir}`);
        }
        return count;
      };
      stats.outputFiles = countOutputFiles('output');
    }

    // Count zip files
    if (fs.existsSync('zips')) {
      const zipFiles = fs.readdirSync('zips').filter(file => file.endsWith('.zip'));
      stats.zipFiles = zipFiles.length;

      for (const file of zipFiles) {
        const filePath = path.join('zips', file);
        try {
          const stat = fs.statSync(filePath);
          stats.diskUsage += stat.size;

          // Add to recent activity if modified in last hour
          if (Date.now() - stat.mtime.getTime() < 3600000) {
            stats.recentActivity.push({
              time: stat.mtime.getTime(),
              message: `Zip created: ${file} (${formatBytes(stat.size)})`
            });
          }
        } catch (err) {
          console.warn(`Could not stat zip file: ${filePath}`);
        }
      }
    }

    // Sort recent activity by time (newest first)
    stats.recentActivity.sort((a, b) => b.time - a.time);

  } catch (error) {
    addErrorLog('error', `Error getting file stats: ${error.message}`);
    throw error;
  }

  return stats;
}

async function performFileCleanup() {
  const cleaner = require('./cleaner');
  let cleanedFiles = 0;
  let freedSpace = 0;

  try {
    // Run standard cleanup
    const beforeStats = await getFileStats();

    // Run manual cleanup by cleaning old files
    await performManualCleanup();

    const afterStats = await getFileStats();
    cleanedFiles = (beforeStats.uploadFiles + beforeStats.outputFiles + beforeStats.zipFiles) -
                   (afterStats.uploadFiles + afterStats.outputFiles + afterStats.zipFiles);
    freedSpace = beforeStats.diskUsage - afterStats.diskUsage;

    addErrorLog('info', `Cleanup completed: ${cleanedFiles} files removed, ${formatBytes(freedSpace)} freed`);

    return {
      success: true,
      message: `${cleanedFiles} files cleaned, ${formatBytes(freedSpace)} freed`,
      cleanedFiles,
      freedSpace
    };
  } catch (error) {
    addErrorLog('error', `Cleanup failed: ${error.message}`);
    throw error;
  }
}

async function performEmergencyCleanup() {
  const cleaner = require('./cleaner');
  let cleanedFiles = 0;
  let freedSpace = 0;

  try {
    const beforeStats = await getFileStats();

    // Run emergency cleanup
    if (cleaner && cleaner.emergencyCleanup) {
      await cleaner.emergencyCleanup();
    }

    const afterStats = await getFileStats();
    cleanedFiles = (beforeStats.uploadFiles + beforeStats.outputFiles + beforeStats.zipFiles) -
                   (afterStats.uploadFiles + afterStats.outputFiles + afterStats.zipFiles);
    freedSpace = beforeStats.diskUsage - afterStats.diskUsage;

    addErrorLog('warning', `Emergency cleanup completed: ${cleanedFiles} files removed, ${formatBytes(freedSpace)} freed`);

    return {
      success: true,
      message: `${cleanedFiles} files emergency cleaned, ${formatBytes(freedSpace)} freed`,
      cleanedFiles,
      freedSpace
    };
  } catch (error) {
    addErrorLog('error', `Emergency cleanup failed: ${error.message}`);
    throw error;
  }
}

// Manual cleanup function with real-time admin updates
async function performManualCleanup() {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000; // 1 hour in ms
  const oneDay = 24 * 60 * 60 * 1000; // 1 day in ms

  let deletedCount = 0;
  let freedSpace = 0;

  // Send initial cleanup status to admin
  addErrorLog('info', '🧹 เริ่มต้นการล้างไฟล์เก่า...');

  try {
    // Clean uploads older than 1 hour
    addErrorLog('info', '📁 กำลังตรวจสอบโฟลเดอร์ uploads...');
    if (fs.existsSync('uploads')) {
      const files = fs.readdirSync('uploads');
      addErrorLog('info', `พบไฟล์ใน uploads: ${files.length} ไฟล์`);

      for (const file of files) {
        const filePath = path.join('uploads', file);
        try {
          const stats = fs.statSync(filePath);
          const fileAge = now - stats.mtime.getTime();
          const fileSize = stats.size;

          if (fileAge > oneHour) {
            fs.unlinkSync(filePath);
            deletedCount++;
            freedSpace += fileSize;
            addErrorLog('info', `🗑️ ลบไฟล์: ${file} (${formatBytes(fileSize)}, อายุ ${Math.round(fileAge / (60 * 1000))} นาที)`);
          } else {
            addErrorLog('info', `⏳ เก็บไฟล์: ${file} (อายุ ${Math.round(fileAge / (60 * 1000))} นาที)`);
          }
        } catch (err) {
          addErrorLog('error', `❌ ไม่สามารถเข้าถึงไฟล์: ${file} - ${err.message}`);
        }
      }
    } else {
      addErrorLog('info', '📁 ไม่พบโฟลเดอร์ uploads');
    }

    // Clean output files older than 1 day
    addErrorLog('info', '📁 กำลังตรวจสอบโฟลเดอร์ output...');
    if (fs.existsSync('output')) {
      const dirs = fs.readdirSync('output');
      addErrorLog('info', `พบโฟลเดอร์ใน output: ${dirs.length} โฟลเดอร์`);

      for (const dir of dirs) {
        const dirPath = path.join('output', dir);
        try {
          const stats = fs.statSync(dirPath);
          const dirAge = now - stats.mtime.getTime();

          if (stats.isDirectory() && dirAge > oneDay) {
            // Calculate directory size before deletion
            const dirSize = getDirSize(dirPath);
            fs.rmSync(dirPath, { recursive: true, force: true });
            deletedCount++;
            freedSpace += dirSize;
            addErrorLog('info', `🗑️ ลบโฟลเดอร์: ${dir} (${formatBytes(dirSize)}, อายุ ${Math.round(dirAge / (24 * 60 * 60 * 1000))} วัน)`);
          } else {
            addErrorLog('info', `⏳ เก็บโฟลเดอร์: ${dir} (อายุ ${Math.round(dirAge / (24 * 60 * 60 * 1000))} วัน)`);
          }
        } catch (err) {
          addErrorLog('error', `❌ ไม่สามารถเข้าถึงโฟลเดอร์: ${dir} - ${err.message}`);
        }
      }
    } else {
      addErrorLog('info', '📁 ไม่พบโฟลเดอร์ output');
    }

    // Clean zip files older than 1 day
    addErrorLog('info', '📁 กำลังตรวจสอบโฟลเดอร์ zips...');
    if (fs.existsSync('zips')) {
      const files = fs.readdirSync('zips').filter(file => file.endsWith('.zip'));
      addErrorLog('info', `พบไฟล์ ZIP: ${files.length} ไฟล์`);

      for (const file of files) {
        const filePath = path.join('zips', file);
        try {
          const stats = fs.statSync(filePath);
          const fileAge = now - stats.mtime.getTime();
          const fileSize = stats.size;

          if (fileAge > oneDay) {
            fs.unlinkSync(filePath);
            deletedCount++;
            freedSpace += fileSize;
            addErrorLog('info', `🗑️ ลบไฟล์: ${file} (${formatBytes(fileSize)}, อายุ ${Math.round(fileAge / (24 * 60 * 60 * 1000))} วัน)`);
          } else {
            addErrorLog('info', `⏳ เก็บไฟล์: ${file} (อายุ ${Math.round(fileAge / (24 * 60 * 60 * 1000))} วัน)`);
          }
        } catch (err) {
          addErrorLog('error', `❌ ไม่สามารถเข้าถึงไฟล์: ${file} - ${err.message}`);
        }
      }
    } else {
      addErrorLog('info', '📁 ไม่พบโฟลเดอร์ zips');
    }

    const finalMessage = `✅ การล้างไฟล์เสร็จสิ้น: ลบ ${deletedCount} รายการ, ประหยัดพื้นที่ ${formatBytes(freedSpace)}`;
    console.log(finalMessage);
    addErrorLog('success', finalMessage);

    return deletedCount;

  } catch (error) {
    const errorMessage = `❌ เกิดข้อผิดพลาดในการล้างไฟล์: ${error.message}`;
    console.error(errorMessage);
    addErrorLog('error', errorMessage);
    throw error;
  }
}

// Helper function to calculate directory size
function getDirSize(dirPath) {
  let totalSize = 0;
  try {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) {
        totalSize += getDirSize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (err) {
    // Ignore errors when calculating size
  }
  return totalSize;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function sendProgress(sessionId, step, progress, message, timeLeft = null) {
  const data = { step, progress, message, timeLeft };

  console.log(`📊 Progress for ${sessionId}: ${progress}% - ${message}`);

  // ส่งข้อมูล progress ไปยัง admin mode ด้วย
  addErrorLog('info', `📊 PROGRESS [${sessionId.substring(0,8)}]: ${progress}% - ${message}${timeLeft ? ` (${timeLeft})` : ''}`);

  // Send via Socket.IO
  io.to(`progress-${sessionId}`).emit('progress-update', data);

  // Send via SSE
  const client = progressClients.get(sessionId);
  if (client) {
    try {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('❌ SSE write error:', error);
      progressClients.delete(sessionId);
    }
  }
}

// YouTube download functions
async function downloadYouTubeVideo(videoId, outputPath, quality = '720') {
  try {
    let format;
    switch (quality) {
      case '480':
        // เลือกคุณภาพ 480p แบบมีความชัดสูงสุด
        format = 'best[height>=480][height<=480]/best[height<=480]';
        break;
      case '720':
        // เลือกคุณภาพ 720p แบบมีความชัดสูงสุด
        format = 'best[height>=720][height<=720]/best[height<=720]';
        break;
      case '1080':
        // เลือกคุณภาพ 1080p แบบมีความชัดสูงสุด พร้อม bitrate สูง
        format = 'best[height>=1080][height<=1080]/best[height<=1080]';
        break;
      case 'best':
        // เลือกคุณภาพสูงสุดที่มีอยู่โดยไม่จำกัดความละเอียด
        format = 'best[vcodec!=none]/best';
        break;
      default:
        format = 'best[height>=720][height<=720]/best[height<=720]';
    }

    // เพิ่ม options สำหรับคุณภาพที่ดีขึ้น
    const options = {
      format: format,
      output: outputPath,
      // เพิ่ม options เพื่อให้ได้คุณภาพดีที่สุด
      'prefer-free-formats': false,
      'merge-output-format': 'mp4',
      // บังคับใช้ codecs ที่มีคุณภาพสูง
      'format-sort': 'res,fps,vcodec:h264,acodec:aac,vbr,abr',
      // ให้ความสำคัญกับ bitrate และความละเอียดสูง
      'format-sort-force': true,
      // เลือก format ที่มี video และ audio คุณภาพดี
      'prefer-merged': true
    };

    await youtubeDl(`https://www.youtube.com/watch?v=${videoId}`, options);
  } catch (error) {
    throw new Error('ไม่สามารถดาวน์โหลดวิดีโอจาก YouTube ได้');
  }
}

async function downloadYouTubeAudio(videoId, outputPath) {
  try {
    await youtubeDl(`https://www.youtube.com/watch?v=${videoId}`, {
      format: 'bestaudio[ext=m4a]',
      output: outputPath
    });
  } catch (error) {
    throw new Error('ไม่สามารถดาวน์โหลดเสียงจาก YouTube ได้');
  }
}

// TikTok download functions
async function downloadTikTokVideo(url, outputPath, quality = 'best') {
  try {
    // Use the same TikTok API library that works for info extraction
    const Tiktok = await import("@tobyg74/tiktok-api-dl");
    let result;

    try {
      result = await Tiktok.default.Downloader(url, { version: "v2" });
    } catch (error) {
      console.log("TikTok v2 failed, trying v1:", error.message);
      result = await Tiktok.default.Downloader(url, { version: "v1" });
    }

    if (!result || result.status !== "success") {
      throw new Error(`Failed to get TikTok video data: ${result?.message || 'Unknown error'}`);
    }

    const data = result.result;
    let videoUrl;

    // Select video URL based on quality preference
    if (data?.video?.playAddr && data.video.playAddr.length > 0) {
      videoUrl = data.video.playAddr[0];
    } else if (data?.video?.downloadAddr && data.video.downloadAddr.length > 0) {
      videoUrl = data.video.downloadAddr[0];
    } else {
      throw new Error('No video download URL found');
    }

    console.log(`📥 Downloading TikTok video from: ${videoUrl}`);

    // Download the video file using fetch
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
    }

    // Write the video to file
    const buffer = await response.buffer();
    fs.writeFileSync(outputPath, buffer);

    console.log(`✅ TikTok video downloaded successfully to: ${outputPath}`);

  } catch (error) {
    console.error('TikTok download error:', error);
    throw new Error('ไม่สามารถดาวน์โหลดวิดีโอจาก TikTok ได้');
  }
}

async function downloadTikTokAudio(url, outputPath) {
  try {
    // Use the same TikTok API library that works for info extraction
    const Tiktok = await import("@tobyg74/tiktok-api-dl");
    let result;

    try {
      result = await Tiktok.default.Downloader(url, { version: "v2" });
    } catch (error) {
      console.log("TikTok v2 failed, trying v1:", error.message);
      result = await Tiktok.default.Downloader(url, { version: "v1" });
    }

    if (!result || result.status !== "success") {
      throw new Error(`Failed to get TikTok audio data: ${result?.message || 'Unknown error'}`);
    }

    const data = result.result;
    let audioUrl;

    // Get audio URL
    if (data?.music?.playUrl && data.music.playUrl.length > 0) {
      audioUrl = data.music.playUrl[0];
    } else {
      throw new Error('No audio download URL found');
    }

    console.log(`📥 Downloading TikTok audio from: ${audioUrl}`);

    // Download the audio file using fetch
    const response = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
    }

    // Write the audio to file
    const buffer = await response.buffer();
    fs.writeFileSync(outputPath, buffer);

    console.log(`✅ TikTok audio downloaded successfully to: ${outputPath}`);

  } catch (error) {
    console.error('TikTok audio download error:', error);
    throw new Error('ไม่สามารถดาวน์โหลดเสียงจาก TikTok ได้');
  }
}

// Extract TikTok video ID from URL
function extractTikTokId(url) {
  if (!url) return null;

  // Handle various TikTok URL formats including vt.tiktok.com
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/t\/([A-Za-z0-9]+)/,
    /(?:https?:\/\/)?vm\.tiktok\.com\/([A-Za-z0-9]+)/,
    /(?:https?:\/\/)?vt\.tiktok\.com\/([A-Za-z0-9]+)/,
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/v\/(\d+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// Media upload endpoint for admin
app.post('/api/upload-media', upload.single('mediaFile'), (req, res) => {
  try {
    const file = req.file;
    const type = req.body.type || 'video';
    
    if (!file) {
      return res.status(400).json({ success: false, error: 'ไม่มีไฟล์ที่อัปโหลด' });
    }
    
    // Check file type
    const allowedTypes = {
      video: ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/quicktime'],
      audio: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac']
    };
    
    const typeCategory = type === 'video' ? 'video' : 'audio';
    if (!allowedTypes[typeCategory].includes(file.mimetype)) {
      // ลบไฟล์ที่ไม่รองรับ
      fs.unlinkSync(file.path);
      return res.status(400).json({ 
        success: false, 
        error: `ไฟล์ประเภท ${file.mimetype} ไม่รองรับ` 
      });
    }
    
    // สร้าง URL สำหรับเข้าถึงไฟล์
    const fileUrl = `/uploads/${file.filename}`;
    
    console.log(`📁 Admin media file uploaded: ${file.filename} (${file.mimetype})`);
    addErrorLog('info', `📁 Admin uploaded media: ${file.originalname} (${file.mimetype})`);
    
    res.json({
      success: true,
      fileUrl: fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype
    });
    
  } catch (error) {
    console.error('Error uploading media file:', error);
    addErrorLog('error', `Media upload failed: ${error.message}`);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการอัปโหลด' });
  }
});

// Main upload endpoint
app.post('/upload', upload.fields([
  { name: 'video' },
  { name: 'audio' },
  { name: 'icon' }
]), async (req, res) => {
  systemStats.totalRequests++;

  if (!adminConfig.uploadEnabled && !adminConfig.youtubeEnabled) {
    addErrorLog('warning', 'Upload attempt rejected: Service disabled');
    return res.status(403).json({ error: 'Service temporarily disabled' });
  }

  const sessionId = generateNamespace();

  try {
    const fps = parseFloat(req.body.fps);
    const quality = parseInt(req.body.quality);
    const textureName = req.body.textureName || 'Custom Texture';
    const userEmail = req.body.email;
    const youtubeVideoId = req.body.youtubeVideoId;
    const youtubeQuality = req.body.youtubeQuality || '720';
    const useYoutubeAudio = req.body.useYoutubeAudio === 'true';
    const youtubeAudioId = req.body.youtubeAudioId;

    // TikTok parameters
    const tiktokUrl = req.body.tiktokUrl;
    const tiktokQuality = req.body.tiktokQuality || 'best';
    const useTiktokAudio = req.body.useTiktokAudio === 'true';
    const tiktokAudioUrl = req.body.tiktokAudioUrl;

    if (isNaN(fps) || isNaN(quality)) {
      return res.status(400).json({ error: 'Invalid fps or quality value' });
    }

    // Check if YouTube is disabled but YouTube ID provided
    if (!adminConfig.youtubeEnabled && youtubeVideoId) {
      return res.status(403).json({ error: 'YouTube downloads are currently disabled' });
    }

    // Check if TikTok URL provided but YouTube disabled (using same setting for now)
    if (!adminConfig.youtubeEnabled && tiktokUrl) {
      return res.status(403).json({ error: 'TikTok downloads are currently disabled' });
    }

    // Check if upload is disabled but files provided
    if (!adminConfig.uploadEnabled && req.files.video) {
      return res.status(403).json({ error: 'File uploads are currently disabled' });
    }

    res.json({ sessionId });

    const namespace = generateNamespace();
    const outputDir = path.join('output', namespace);
    const frameDir = path.join(outputDir, 'subpacks/1080/betmc_background/betmc_background_frame');
    fs.mkdirSync(frameDir, { recursive: true });

    sendProgress(sessionId, 1, 5, 'เริ่มต้นการประมวลผล...');

    let videoPath;
    let audioPath;

    // YouTube video handling
    if (youtubeVideoId && adminConfig.youtubeEnabled) {
      sendProgress(sessionId, 2, 10, `กำลังดาวน์โหลดวิดีโอจาก YouTube (${youtubeQuality}p)...`);
      const downloadPath = path.join('uploads', `${namespace}_youtube.%(ext)s`);
      await downloadYouTubeVideo(youtubeVideoId, downloadPath, youtubeQuality);

      const videoFiles = fs.readdirSync('uploads').filter(f => f.startsWith(`${namespace}_youtube.`));
      if (videoFiles.length === 0) {
        throw new Error('ไม่สามารถดาวน์โหลดวิดีโอจาก YouTube ได้');
      }
      videoPath = path.join('uploads', videoFiles[0]);

      if (useYoutubeAudio) {
        sendProgress(sessionId, 2, 12, 'กำลังดาวน์โหลดเสียงจาก YouTube...');
        const audioDownloadPath = path.join('uploads', `${namespace}_audio.%(ext)s`);
        await downloadYouTubeAudio(youtubeVideoId, audioDownloadPath);

        const audioFiles = fs.readdirSync('uploads').filter(f => f.startsWith(`${namespace}_audio.`));
        if (audioFiles.length > 0) {
          audioPath = path.join('uploads', audioFiles[0]);
        }
      }

      if (youtubeAudioId) {
        sendProgress(sessionId, 2, 14, 'กำลังดาวน์โหลดเสียงจาก YouTube...');
        const audioDownloadPath = path.join('uploads', `${namespace}_separate_audio.%(ext)s`);
        await downloadYouTubeAudio(youtubeAudioId, audioDownloadPath);

        const audioFiles = fs.readdirSync('uploads').filter(f => f.startsWith(`${namespace}_separate_audio.`));
        if (audioFiles.length > 0) {
          audioPath = path.join('uploads', audioFiles[0]);
        }
      }
    } else if (tiktokUrl && adminConfig.youtubeEnabled) {
      // TikTok video handling
      sendProgress(sessionId, 2, 10, `กำลังดาวน์โหลดวิดีโอจาก TikTok (${tiktokQuality})...`);
      const downloadPath = path.join('uploads', `${namespace}_tiktok.mp4`);
      await downloadTikTokVideo(tiktokUrl, downloadPath, tiktokQuality);

      if (!fs.existsSync(downloadPath)) {
        throw new Error('ไม่สามารถดาวน์โหลดวิดีโอจาก TikTok ได้');
      }
      videoPath = downloadPath;

      if (useTiktokAudio) {
        sendProgress(sessionId, 2, 12, 'กำลังดาวน์โหลดเสียงจาก TikTok...');
        const audioDownloadPath = path.join('uploads', `${namespace}_tiktok_audio.mp3`);
        await downloadTikTokAudio(tiktokUrl, audioDownloadPath);

        if (fs.existsSync(audioDownloadPath)) {
          audioPath = audioDownloadPath;
        }
      }

      if (tiktokAudioUrl) {
        sendProgress(sessionId, 2, 14, 'กำลังดาวน์โหลดเสียงแยกต่างหากจาก TikTok...');
        const audioDownloadPath = path.join('uploads', `${namespace}_separate_tiktok_audio.mp3`);
        await downloadTikTokAudio(tiktokAudioUrl, audioDownloadPath);

        if (fs.existsSync(audioDownloadPath)) {
          audioPath = audioDownloadPath;
        }
      }
    } else if (req.files.video && adminConfig.uploadEnabled) {
      videoPath = req.files.video[0].path;
    } else {
      throw new Error('กรุณาอัปโหลดไฟล์วิดีโอหรือใส่ URL YouTube/TikTok');
    }

    const finalAudioPath = audioPath || (req.files.audio ? req.files.audio[0].path : null);

    // ประมวลผลวิดีโอด้วย AI เพื่อหาจุดลูปที่เหมาะสม
    sendProgress(sessionId, 3, 10, 'กำลังวิเคราะห์วิดีโอด้วย AI...');
    
    let processedVideoPath = videoPath;
    try {
      // เรียกใช้ Python script สำหรับประมวลผลวิดีโอ
      const pythonScript = `
import sys
sys.path.append('.')
from video_processor import VideoProcessor

processor = VideoProcessor()
processed_path = processor.process_video_for_texture('${videoPath.replace(/\\/g, '\\\\')}', 2, 5)
print(f"PROCESSED_VIDEO_PATH:{processed_path}")
`;
      
      const pythonOutput = execSync(`python3 -c "${pythonScript}"`, { encoding: 'utf8' });
      const match = pythonOutput.match(/PROCESSED_VIDEO_PATH:(.+)/);
      
      if (match) {
        processedVideoPath = match[1].trim();
        sendProgress(sessionId, 3, 12, 'AI วิเคราะห์เสร็จแล้ว - ใช้วิดีโอที่ปรับปรุงแล้ว');
        addErrorLog('info', `🤖 AI processed video: ${processedVideoPath}`);
      } else {
        sendProgress(sessionId, 3, 12, 'ใช้วิดีโอต้นฉบับ - AI processing ข้าม');
        addErrorLog('warning', 'Video processing skipped, using original video');
      }
    } catch (error) {
      sendProgress(sessionId, 3, 12, 'ใช้วิดีโอต้นฉบับ - AI processing ล้มเหลว');
      addErrorLog('warning', `Video processing failed: ${error.message}`);
    }

    sendProgress(sessionId, 3, 15, 'กำลังแยกเฟรมจากวิดีโอ...');
    // ปรับปรุงการแยกเฟรมให้คงคุณภาพสูงสุด
    execSync(`${FFMPEG_PATH} -i ${escapePath(processedVideoPath)} -vf fps=${fps},scale=-1:-1:flags=lanczos -q:v 1 -compression_level 0 ${escapePath(path.join(frameDir, 'betmc_img_%d_frame.png'))}`);

    // Clean up video files
    if ((youtubeVideoId || tiktokUrl) && fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
    if (processedVideoPath !== videoPath && fs.existsSync(processedVideoPath)) {
      fs.unlinkSync(processedVideoPath);
    }

    const frames = fs.readdirSync(frameDir).filter(f => f.endsWith('.png'));
    sendProgress(sessionId, 4, 25, `พบ ${frames.length} เฟรม กำลังบีบอัดรูปภาพ...`);

    const totalFrames = frames.length;
    for (let i = 0; i < frames.length; i++) {
      const file = frames[i];
      const input = path.join(frameDir, file);
      const output = path.join(frameDir, `compressed_${file.replace('.png', '.jpg')}`);
      // ปรับปรุงการบีบอัดรูปภาพให้คงคุณภาพดีขึ้น
      execSync(`${MAGICK_PATH} ${escapePath(input)} -strip -quality ${quality} -sampling-factor 1x1 -colorspace RGB ${escapePath(output)}`);
      fs.unlinkSync(input);

      const progress = 25 + Math.floor((i + 1) / totalFrames * 25);
      const timeLeft = Math.ceil((totalFrames - i - 1) * 0.5);
      sendProgress(sessionId, 4, progress, `บีบอัดเฟรม ${i + 1}/${totalFrames}`, timeLeft);
    }

    sendProgress(sessionId, 5, 50, 'จัดระเบียบไฟล์...');
    fs.readdirSync(frameDir).forEach(file => {
      if (file.startsWith('compressed_')) {
        fs.renameSync(
          path.join(frameDir, file),
          path.join(frameDir, file.replace('compressed_', ''))
        );
      }
    });

    const frame60 = path.join(frameDir, 'betmc_img_60_frame.jpg');
    const staticPatch = path.join(outputDir, 'subpacks/0/betmc_background/betmc_background_static_patch.jpg');
    fs.mkdirSync(path.dirname(staticPatch), { recursive: true });
    if (fs.existsSync(frame60)) {
      fs.copyFileSync(frame60, staticPatch);
    }

    sendProgress(sessionId, 6, 55, 'ดาวน์โหลด manifest.json...');
    const manifestUrl = req.body.manifestUrl || 'https://raw.githubusercontent.com/HEENAO9k/Sounds/main/manifest.json';
    const manifestResponse = await fetch(manifestUrl);
    if (!manifestResponse.ok) throw new Error(`Failed to fetch manifest.json from ${manifestUrl}`);
    const manifestText = await manifestResponse.text();
    const manifest = JSON.parse(manifestText);

    manifest.header.name = textureName;
    manifest.header.uuid = crypto.randomUUID();
    manifest.modules[0].uuid = crypto.randomUUID();

    const manifestPath = path.join(outputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    sendProgress(sessionId, 7, 60, 'ดาวน์โหลดไฟล์เสียง...');
    const soundsZipUrl = req.body.soundsZipUrl || 'https://github.com/HEENAO9k/Sounds/raw/main/sounds.zip';
    const soundsResponse = await fetch(soundsZipUrl);
    if (!soundsResponse.ok) throw new Error(`Failed to fetch sounds.zip from ${soundsZipUrl}`);

    const soundsZipPath = path.join('uploads', `${namespace}_sounds.zip`);
    const soundsZipStream = fs.createWriteStream(soundsZipPath);
    await new Promise((resolve, reject) => {
      soundsResponse.body.pipe(soundsZipStream);
      soundsResponse.body.on('error', reject);
      soundsZipStream.on('finish', resolve);
    });

    sendProgress(sessionId, 8, 65, 'แตกไฟล์เสียง...');
    await fs.createReadStream(soundsZipPath)
      .pipe(unzipper.Extract({ path: path.join(outputDir, 'sounds') }))
      .promise();

    fs.unlinkSync(soundsZipPath);

    if (finalAudioPath) {
      sendProgress(sessionId, 9, 70, useYoutubeAudio || youtubeAudioId ? 'แปลงไฟล์เสียงจาก YouTube...' : 'แปลงไฟล์เสียง...');

      // Generate menu music files (improved audio processing from provided file)
      const audioOutput = path.join(outputDir, 'sounds/music/menu');
      fs.mkdirSync(audioOutput, { recursive: true });
      execSync(`${FFMPEG_PATH} -i ${escapePath(finalAudioPath)} -vn -c:a libvorbis ${escapePath(path.join(audioOutput, 'menu1.ogg'))}`);

      // Create menu2-4.ogg files
      for (let i = 2; i <= 4; i++) {
        fs.copyFileSync(path.join(audioOutput, 'menu1.ogg'), path.join(audioOutput, `menu${i}.ogg`));
      }

      // Also create the original game audio
      const gameAudioDir = path.join(outputDir, 'sounds/music/game/creative');
      fs.mkdirSync(gameAudioDir, { recursive: true });
      execSync(`${FFMPEG_PATH} -i ${escapePath(finalAudioPath)} -c:a libvorbis ${escapePath(path.join(gameAudioDir, 'creative1.ogg'))}`);

      // Clean up downloaded audio files
      if (finalAudioPath.includes('_audio.') || finalAudioPath.includes('_separate_audio.') ||
          finalAudioPath.includes('_tiktok_audio.') || finalAudioPath.includes('_separate_tiktok_audio.')) {
        fs.unlinkSync(finalAudioPath);
      }
    }

    sendProgress(sessionId, 10, 75, 'คัดลอกไฟล์เพิ่มเติม...');
    // Copy icon if uploaded
    if (req.files.icon) {
      const iconPath = path.join(outputDir, 'pack_icon.png');
      execSync(`${MAGICK_PATH} ${escapePath(req.files.icon[0].path)} -resize 128x128 ${escapePath(iconPath)}`);
    }

    sendProgress(sessionId, 11, 80, 'สร้างไฟล์ config...');
    // Create betmc_config files (from provided file)
    const config0 = {
      namespace: 'betmc_config',
      betmc_main_config: {
        $betmc_scr_backround_path: 'betmc_background/betmc_background_static_patch'
      }
    };
    const config1080 = {
      namespace: 'betmc_config',
      betmc_main_config: {
        $use_background_static_customs: false,
        $use_setting_background_static_customs: false,
        $use_background_animation: true,
        $betmc_frame_duration: 1 / fps
      }
    };
    fs.mkdirSync(path.join(outputDir, 'subpacks/0/betmc_config'), { recursive: true });
    fs.mkdirSync(path.join(outputDir, 'subpacks/1080/betmc_config'), { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'subpacks/0/betmc_config/config.json'), JSON.stringify(config0, null, 2));
    fs.writeFileSync(path.join(outputDir, 'subpacks/1080/betmc_config/config.json'), JSON.stringify(config1080, null, 2));

    sendProgress(sessionId, 12, 85, 'สร้างไฟล์ UI...');
    // Create UI files (enhanced UI generation from provided file)
    const frameFiles = fs.readdirSync(frameDir).filter(f => f.endsWith('.jpg'));
    const betmcCommonPath = path.join(outputDir, 'betmc_ui/betmc_common');
    const uiPath = path.join(outputDir, 'ui');
    fs.mkdirSync(betmcCommonPath, { recursive: true });
    fs.mkdirSync(uiPath, { recursive: true });

    // Generate animation frames
    let yBottom = 1500;
    const animFrames = [];
    while (animFrames.length < frameFiles.length) {
      for (let y = 1500; y >= -1400 && animFrames.length < frameFiles.length; y -= 100) {
        animFrames.push({ from: [`${y}%`, `${yBottom}%`] });
      }
      yBottom -= 100;
    }

    // Check if frames exist
    if (animFrames.length === 0) {
      throw new Error('ไม่พบเฟรมวิดีโอ กรุณาอัปโหลดไฟล์วิดีโอที่ถูกต้อง');
    }

    // Create animation JSON
    const animJson = { namespace };
    animJson[`${namespace}.app-js:8:19`] = {
      from: animFrames[0].from,
      to: animFrames[0].from,
      next: `@${namespace}.app-js:8:19-1`,
      anim_type: 'offset',
      duration: 1 / fps
    };

    animFrames.forEach((f, i) => {
      if (i === 0) return;
      const key = `${namespace}.app-js:8:19-${i}`;
      animJson[key] = {
        from: f.from,
        to: f.from,
        next: i + 1 < animFrames.length ? `@${namespace}.app-js:8:19-${i + 1}` : `@${namespace}.app-js:8:19`,
        anim_type: 'offset',
        duration: 1 / fps
      };
    });
    fs.writeFileSync(path.join(betmcCommonPath, `${namespace}.json`), JSON.stringify(animJson, null, 2));

    // Create background common
    const bgCommon = {
      namespace: 'betmc_background',
      'betmc_animation_background_frame@betmc_common.empty_panel': {
        anims: [`@${namespace}.app-js:8:19`],
        controls: [],
        size: ['100%', '100%'],
        offset: `@${namespace}.app-js:8:19`,
        anchor_from: 'center',
        anchor_to: 'center'
      }
    };

    const controls = [];
    const defs = {};
    let x = -1500, y = -1500;

    for (let i = 0; i < frameFiles.length; i++) {
      const key = i > 0 ? `app-js:31:30[${i}]` : 'app-js:31:30';
      const id = crypto.randomUUID().replace(/-/g, '');
      controls.push({ [`${id}@betmc_background.${key}`]: {} });
      defs[key] = {
        type: 'image',
        texture: `betmc_background/betmc_background_frame/betmc_img_${i + 1}_frame`,
        fill: true,
        size: ['100%', '100%'],
        offset: [`${x}%`, `${y}%`]
      };
      x += 100;
      if (x > 1400) {
        x = -1500;
        y += 100;
      }
      if (y > 1400) y = -1500;
    }

    bgCommon['betmc_animation_background_frame@betmc_common.empty_panel'].controls = controls;
    Object.assign(bgCommon, defs);
    fs.writeFileSync(path.join(betmcCommonPath, 'betmc_bg_common.json'), JSON.stringify(bgCommon, null, 2));

    // Create UI defs
    const uiDefs = { ui_defs: [`betmc_ui/betmc_common/${namespace}.json`] };
    fs.writeFileSync(path.join(uiPath, '_ui_defs.json'), JSON.stringify(uiDefs, null, 2));

    sendProgress(sessionId, 13, 90, 'สร้างไฟล์ ZIP...');
    const zipPath = path.join('zips', `${namespace}.zip`);
    fs.mkdirSync('zips', { recursive: true });

    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(outputDir, false);
      archive.finalize();
    });

    sendProgress(sessionId, 14, 100, 'เสร็จสิ้น!', 0);
    fs.rmSync(outputDir, { recursive: true, force: true });

    // Use relative URL so it works through the Flask proxy
    const downloadUrl = `/zips/${namespace}.zip`;

    // For email notifications, we need the full URL
    if (userEmail) {
      const fullDownloadUrl = `${req.protocol}://${req.get('host')}${downloadUrl}`;
      await sendNotificationEmail(userEmail, textureName, fullDownloadUrl);
    }

    // Send download completion via both systems
    console.log(`🎉 Processing completed for ${sessionId}. Download URL: ${downloadUrl}`);

    setTimeout(() => {
      // Socket.IO completion
      const downloadData = {
        downloadUrl,
        textureName,
        namespace
      };

      console.log(`📤 Sending download-ready to progress-${sessionId}:`, downloadData);
      io.to(`progress-${sessionId}`).emit('download-ready', downloadData);

      // Also broadcast to all connected clients as fallback
      io.emit('download-ready', downloadData);

      // SSE completion
      const client = progressClients.get(sessionId);
      if (client) {
        try {
          client.write(`data: ${JSON.stringify({ completed: true, zip: `/zips/${namespace}.zip`, downloadUrl })}\n\n`);
          client.end();
        } catch (error) {
          console.error('❌ SSE completion error:', error);
        }
        progressClients.delete(sessionId);
      }
    }, 1000);

  } catch (error) {
    console.error('Error during processing:', error);
    io.to(`progress-${sessionId}`).emit('error', {
      message: error.message || 'เกิดข้อผิดพลาดในการประมวลผล'
    });
  }
});

// API endpoints
app.get('/api/config', (req, res) => {
  res.json({
    gifUrl: adminConfig.gifUrl,
    primaryColor: adminConfig.primaryColor,
    secondaryColor: adminConfig.secondaryColor,
    accentColor: adminConfig.accentColor,
    uploadEnabled: adminConfig.uploadEnabled,
    youtubeEnabled: adminConfig.youtubeEnabled,
    announcement: adminConfig.announcement
  });
});

// Ping endpoint สำหรับป้องกัน sleep
app.get('/api/ping', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`🏓 Ping received at ${timestamp}`);
  res.json({ 
    status: 'alive', 
    timestamp: timestamp,
    uptime: Math.floor((Date.now() - systemStats.startTime) / 1000),
    connectedUsers: systemStats.connectedUsers
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - systemStats.startTime) / 1000),
    connectedUsers: systemStats.connectedUsers,
    totalRequests: systemStats.totalRequests,
    activeProcesses: systemStats.activeProcesses
  });
});

// Analytics API endpoints
app.get('/api/analytics', (req, res) => {
  res.json({
    totalUsersToday: analyticsData.totalUsersToday,
    totalDownloads: analyticsData.totalDownloads,
    avgProcessTime: analyticsData.avgProcessTime,
    systemLoad: analyticsData.systemLoad,
    hourlyUsage: analyticsData.hourlyUsage,
    textureTypes: analyticsData.textureTypes,
    activeUsersCount: analyticsData.activeUsers.size
  });
});

app.get('/api/performance', (req, res) => {
  res.json(analyticsData.systemPerformance);
});

app.get('/api/active-users', (req, res) => {
  const activeUsersList = Array.from(analyticsData.activeUsers.values());
  res.json(activeUsersList);
});

app.get('/api/recent-activity', (req, res) => {
  res.json(analyticsData.recentActivity);
});

app.get('/api/advanced-settings', (req, res) => {
  res.json(advancedSettings);
});

app.post('/api/advanced-settings', (req, res) => {
  try {
    advancedSettings = { ...advancedSettings, ...req.body };
    saveAdvancedSettings();
    addActivity('settings_change', 'การตั้งค่าขั้นสูงถูกอัพเดต');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// TikTok video info API with real data extraction
app.post('/api/tiktok-info', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('🎬 Extracting TikTok video from:', url);

    // Import TikTok API library dynamically
    const Tiktok = await import("@tobyg74/tiktok-api-dl");
    let result;

    try {
      // Try v2 first, fallback to v1
      result = await Tiktok.default.Downloader(url, { version: "v2" });
    } catch (error) {
      console.log("v2 failed, trying v1:", error.message);
      try {
        result = await Tiktok.default.Downloader(url, { version: "v1" });
      } catch (v1Error) {
        console.log("v1 also failed, using fallback:", v1Error.message);
        // Fallback to basic info extraction
        const videoId = extractTikTokId(url);
        return res.json({
          title: `TikTok Video (${videoId})`,
          thumbnail: "https://p16-sign-sg.tiktokcdn.com/aweme/100x100/tos-alisg-p-0037/default.jpg",
          duration: "ไม่ทราบ",
          uploader: "TikTok User",
          url: url
        });
      }
    }

    if (!result || result.status !== "success") {
      // Fallback if extraction failed
      const videoId = extractTikTokId(url);
      return res.json({
        title: `TikTok Video (${videoId})`,
        thumbnail: "https://p16-sign-sg.tiktokcdn.com/aweme/100x100/tos-alisg-p-0037/default.jpg",
        duration: "ไม่ทราบ",
        uploader: "TikTok User",
        url: url
      });
    }

    const data = result.result;

    // Extract real video information
    const tiktokInfo = {
      title: data?.desc || "TikTok Video",
      thumbnail: data?.video?.cover || data?.author?.avatar || "https://p16-sign-sg.tiktokcdn.com/aweme/100x100/tos-alisg-p-0037/default.jpg",
      duration: data?.video?.duration ? `${data.video.duration}s` : "ไม่ทราบ",
      uploader: data?.author?.nickname || "TikTok User",
      url: url,
      videoUrl: data?.video?.playAddr?.[0] || data?.video?.downloadAddr?.[0] || "",
      audioUrl: data?.music?.playUrl?.[0] || "",
      views: data?.statistics?.playCount || 0,
      likes: data?.statistics?.diggCount || 0
    };

    console.log(`✅ TikTok info extracted: ${tiktokInfo.title} by ${tiktokInfo.uploader}`);
    res.json(tiktokInfo);
    return;

    // Original yt-dlp code (disabled due to version compatibility)
    try {
      const info = await youtubeDl(url, {
        dumpSingleJson: true,
        noWarnings: true
      });

      const videoInfo = {
        title: info.title || info.description || 'TikTok Video',
        thumbnail: info.thumbnail,
        duration: info.duration ? `${Math.floor(info.duration / 60)}:${(info.duration % 60).toString().padStart(2, '0')}` : 'ไม่ทราบ',
        uploader: info.uploader || info.creator || 'TikTok User',
        url: url
      };

      console.log('TikTok info fetched successfully:', videoInfo);
      res.json(videoInfo);

    } catch (ytdlError) {
      console.log('yt-dlp failed, providing basic info:', ytdlError.message);

      // Extract video ID for basic info
      const videoId = extractTikTokId(url);

      // Return basic info when yt-dlp fails
      const basicInfo = {
        title: `TikTok Video${videoId ? ` (${videoId})` : ''}`,
        thumbnail: null, // No thumbnail available
        duration: 'ไม่ทราบ',
        uploader: 'TikTok User',
        url: url,
        note: 'ข้อมูลพื้นฐาน - ไม่สามารถดึงรายละเอียดได้'
      };

      console.log('Returning basic TikTok info:', basicInfo);
      res.json(basicInfo);
    }

  } catch (error) {
    console.error('TikTok API error:', error);
    res.status(500).json({
      error: 'ไม่สามารถดึงข้อมูลวิดีโอ TikTok ได้',
      details: error.message
    });
  }
});

// Socket.IO Connection Monitoring
io.on('connection', (socket) => {
  systemStats.connectedUsers++;
  analyticsData.totalUsersToday++;

  // Add user to active users list
  const userId = generateUserId();
  analyticsData.activeUsers.set(socket.id, {
    id: userId,
    socketId: socket.id,
    joinTime: Date.now(),
    lastActivity: 'เชื่อมต่อเข้าสู่ระบบ',
    timestamp: Date.now()
  });

  console.log(`🔗 ผู้ใช้เชื่อมต่อ: ${socket.id} | รวม: ${systemStats.connectedUsers} คน`);
  addActivity('user_connect', `ผู้ใช้ ${userId} เชื่อมต่อเข้าสู่ระบบ`, userId);

  // Notification for admin login
  if (adminSessions.size === 0) { // Only notify for the first admin connection in a session
    console.log('🎉 Admin logged in! Sending spectacular notification...');
    io.emit('spectacular-notification', {
      title: '🎉 ยินดีต้อนรับแอดมิน!',
      message: 'ผู้ดูแลระบบคนใหม่ได้เข้าสู่ระบบแล้ว',
      gifUrl: adminConfig.gifUrl || 'https://media.tenor.com/XQu4UfesS_kAAAAC/minecraft-block.gif',
      primaryColor: adminConfig.primaryColor || '#667eea',
      secondaryColor: adminConfig.secondaryColor || '#764ba2',
      accentColor: adminConfig.accentColor || '#f093fb'
    });
    addActivity('admin_welcome', 'แอดมินเข้าระบบ - ส่งการแจ้งเตือนสุดอลังการ!');
  }

  // เข้าร่วม admin room หากเป็น admin
  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log(`👨‍💼 Admin เข้าสู่ระบบ: ${socket.id}`);
    addActivity('admin_login', `Admin เข้าสู่ระบบ [${socket.id.substring(0,8)}]`);

    // Send initial analytics data
    socket.emit('analytics-update', {
      totalUsersToday: analyticsData.totalUsersToday,
      totalDownloads: analyticsData.totalDownloads,
      avgProcessTime: analyticsData.avgProcessTime,
      systemLoad: analyticsData.systemLoad,
      hourlyUsage: analyticsData.hourlyUsage,
      textureTypes: analyticsData.textureTypes
    });

    // Send active users
    const activeUsersList = Array.from(analyticsData.activeUsers.values());
    socket.emit('active-users-update', activeUsersList);

    // Send recent activity
    socket.emit('activity-timeline-update', analyticsData.recentActivity);
  });

  // ติดตามการเข้าร่วมห้อง progress
  socket.on('join-progress', (sessionId) => {
    socket.join(`progress-${sessionId}`);
    console.log(`📊 เข้าร่วมติดตาม progress: ${sessionId.substring(0,8)}`);
    updateUserActivity(socket.id, 'ติดตามความคืบหน้า');
  });

  // Admin requests
  socket.on('get-analytics-data', () => {
    if (socket.rooms.has('admin-room')) {
      socket.emit('analytics-update', {
        totalUsersToday: analyticsData.totalUsersToday,
        totalDownloads: analyticsData.totalDownloads,
        avgProcessTime: analyticsData.avgProcessTime,
        systemLoad: analyticsData.systemLoad,
        hourlyUsage: analyticsData.hourlyUsage,
        textureTypes: analyticsData.textureTypes
      });
    }
  });

  socket.on('get-performance-data', () => {
    if (socket.rooms.has('admin-room')) {
      socket.emit('performance-update', analyticsData.systemPerformance);
    }
  });

  socket.on('save-advanced-settings', (settings) => {
    if (socket.rooms.has('admin-room')) {
      try {
        advancedSettings = { ...advancedSettings, ...settings };
        saveAdvancedSettings();
        socket.emit('settings-saved', true);
        addActivity('settings_change', 'การตั้งค่าขั้นสูงถูกอัพเดต');
        console.log('Advanced settings updated:', settings);
      } catch (error) {
        socket.emit('settings-saved', false);
        console.error('Failed to save advanced settings:', error);
      }
    }
  });

  // เมื่อยกเลิกการเชื่อมต่อ
  socket.on('disconnect', (reason) => {
    systemStats.connectedUsers--;

    if (analyticsData.activeUsers.has(socket.id)) {
      const user = analyticsData.activeUsers.get(socket.id);
      addActivity('user_disconnect', `ผู้ใช้ ${user.id} ออกจากระบบ (${reason})`, user.id);
      analyticsData.activeUsers.delete(socket.id);
    }

    console.log(`❌ ผู้ใช้ตัดการเชื่อมต่อ: ${socket.id} | เหตุผล: ${reason} | เหลือ: ${systemStats.connectedUsers} คน`);

    // Update active users list for admin
    const activeUsersList = Array.from(analyticsData.activeUsers.values());
    io.to('admin-room').emit('active-users-update', activeUsersList);
  });

  // ติดตามข้อผิดพลาด socket
  socket.on('error', (error) => {
    console.error(`🔥 Socket Error [${socket.id}]:`, error);
    addActivity('error', `Socket Error: ${error.message}`, socket.id);
  });
});

// Middleware เพื่อติดตาม HTTP requests
app.use((req, res, next) => {
  systemStats.totalRequests++;
  const startTime = Date.now();

  console.log(`🌐 ${req.method} ${req.url} | IP: ${req.ip || req.connection.remoteAddress} | User-Agent: ${req.get('User-Agent')?.substring(0,50)}...`);

  // ติดตามเมื่อ response เสร็จสิ้น
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`✅ ${req.method} ${req.url} | Status: ${res.statusCode} | Duration: ${duration}ms`);
  });

  next();
});

const PORT = 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 BetMC Texture Generator Pro running on port ${PORT}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
  console.log(`📊 System monitoring active - all console output will be sent to admin mode`);
  addErrorLog('success', `🚀 เซิร์ฟเวอร์เริ่มทำงานแล้ว - พอร์ต ${PORT}`);
});