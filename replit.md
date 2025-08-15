# BetMC Texture Generator Pro

## Project Overview
A web-based Minecraft texture pack generator with real-time admin controls, YouTube/TikTok integration, and automated file processing. The application creates custom Minecraft texture packs with user-provided content and includes an admin dashboard for managing configurations and monitoring usage.

## Architecture
- **Framework**: Node.js with Express.js (Direct execution)
- **Real-time Communication**: Socket.IO for live updates
- **File Processing**: FFmpeg for video/audio, ImageMagick for images
- **Frontend**: Vanilla JavaScript with Bootstrap CSS
- **Port**: 5000 (Single Node.js server, no proxy)

## Key Features
- Texture pack generation from video/audio files
- YouTube URL integration for content download
- TikTok URL integration for content download
- Real-time progress tracking via WebSockets
- Admin dashboard with authentication
- Email notifications for completed packs
- Automated file cleanup system
- Custom theming and branding controls

## File Structure
```
├── server.js           # Main application server
├── main.js             # Application entry point
├── cleaner.js          # File cleanup service
├── public/             # Static web assets
│   ├── index.html      # Main user interface
│   ├── admin.html      # Admin dashboard
│   ├── script.js       # Client-side logic
│   ├── admin.js        # Admin panel logic
│   └── styles.css      # Application styling
├── uploads/            # Temporary file uploads
├── output/             # Processing workspace
├── zips/               # Generated texture packs
├── config/             # Configuration files
└── temp/               # Temporary processing files
```

## Core Dependencies
- **Express.js 5.1.0**: Web application framework
- **Socket.IO 4.8.1**: Real-time bidirectional communication
- **Multer 2.0.2**: File upload handling
- **Archiver 7.0.1**: ZIP file creation
- **Unzipper 0.12.3**: Archive extraction
- **youtube-dl-exec 3.0.23**: YouTube content download
- **bcrypt 6.0.0**: Password hashing for admin auth
- **node-cron 4.2.1**: Scheduled file cleanup
- **node-fetch 3.3.2**: HTTP client for external requests
- **nodemailer 7.0.5**: Email notifications

## External Services
- **Gmail SMTP**: Email notification delivery
- **YouTube API**: Content download via youtube-dl-exec
- **FFmpeg**: Video/audio processing and conversion
- **ImageMagick**: Image processing and optimization

## Admin Configuration
- Default password: 'man999' (bcrypt hashed)
- Configurable UI themes and colors
- Upload/YouTube feature toggles
- Custom announcement messages
- Real-time configuration updates

## Recent Changes (Aug 10, 2025)
- **MAJOR UI REDESIGN**: Simplified chat and media control system to fix duplicate UI issues
- **Fixed Duplicate Admin UI**: Removed multiple overlapping chat and media control sections
- **New Banner-Style Chat**: Replaced widget chat with notification-style banner system in Thai
- **Simplified Media Controls**: Single media control panel using existing YouTube integration 
- **Admin Media Display**: Added popup media player in main page with YouTube embed support
- **Fixed Socket.IO Events**: Updated event handlers for new chat broadcast system
- **Enhanced Main Page UI**: Added admin media display popup with volume controls
- **Thai Language Integration**: Complete Thai interface for admin chat and media controls
- **Streamlined Admin Panel**: Consolidated all duplicate features into single functional sections
- **Real-time Media Sharing**: Admin can now share YouTube videos/audio to all users
- **Improved User Experience**: Chat messages appear as banners, media opens in elegant popup
- **System Stability**: Fixed multiple JavaScript conflicts from duplicate UI elements

## Fixed Issues (Aug 9, 2025)
- ✅ Fixed progress tracking stuck at 0% by improving Socket.IO connections
- ✅ Fixed download link generation and file serving
- ✅ Added proper logging for debugging progress and download issues
- ✅ Improved Flask proxy for large file downloads with streaming
- ✅ Fixed Socket.IO disconnection handling and reconnection
- ✅ Enhanced error handling and user feedback systems
- 🚀 System now fully functional for texture pack generation and download

## User Preferences
- Language: Thai (ภาษาไทย) 
- Prefers using port 5000 directly for faster loading
- Keep responses concise and technical when needed
- Focus on immediate problem resolution
- Provide clear step-by-step solutions

## Latest Updates (Aug 9, 2025)
### Enhanced Admin Mode with Advanced File Management
- ✅ Successfully moved server to port 5000 as requested
- ✅ Fixed admin toggle functionality for upload/YouTube controls
- ✅ Implemented real file management system showing actual disk usage
- ✅ Added automatic file cleanup with configurable lifetimes
- ✅ Enhanced Socket.IO debugging and error handling
- ✅ Added system monitoring with live statistics
- ✅ Implemented error logging system with real-time updates
- ✅ Added auto-refresh functionality every 30 seconds
- 🔧 Webview still connects to port 3000 but server runs on 5000 successfully

### YouTube Video Quality Enhancement (Aug 9, 2025)
- ✅ Fixed YouTube video quality issues by upgrading download format selection
- ✅ Added "best quality available" option for maximum resolution (4K/1440p support)
- ✅ Improved format-sort parameters for optimal video/audio quality
- ✅ Enhanced FFmpeg frame extraction with lanczos scaling for better image quality
- ✅ Improved ImageMagick compression settings to preserve image sharpness
- ✅ Added codec preferences (H.264 video, AAC audio) for better compatibility
- 🎯 YouTube videos now download in highest available quality instead of being limited to 1080p

### TikTok Integration (Aug 9, 2025)
- ✅ Added complete TikTok video download functionality using yt-dlp
- ✅ Implemented TikTok URL validation and extraction  
- ✅ Added quality options: Best (no watermark), High, Medium, Low
- ✅ Created TikTok UI section matching YouTube design
- ✅ Added TikTok audio download support with separate audio URL option
- ✅ Integrated TikTok processing into existing texture generation pipeline
- ✅ Enhanced file cleanup to handle TikTok downloads
- ✅ Fixed TikTok preview functionality with proper video info display (Aug 10, 2025)
- ✅ TikTok button now works correctly with preview showing video details
- 🎯 TikTok videos download with best quality available and watermark avoidance when possible