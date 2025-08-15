const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

class FileCleanupService {
  constructor(config = {}) {
    this.config = {
      uploadsDir: config.uploadsDir || 'uploads',
      outputDir: config.outputDir || 'output', 
      zipsDir: config.zipsDir || 'zips',
      tempDir: config.tempDir || 'temp',
      tempFileLifetime: config.tempFileLifetime || 3600, // 1 hour
      outputFileLifetime: config.outputFileLifetime || 86400, // 24 hours
      zipFileLifetime: config.zipFileLifetime || 86400, // 24 hours
      logFileLifetime: config.logFileLifetime || 604800, // 1 week
      cleanupInterval: config.cleanupInterval || 1800, // 30 minutes
      maxDiskUsage: config.maxDiskUsage || 10 * 1024 * 1024 * 1024, // 10GB
      ...config
    };

    this.stats = {
      totalCleaned: 0,
      spaceFree: 0,
      lastCleanup: null,
      errors: []
    };

    this.initialize();
  }

  initialize() {
    console.log('🧹 File Cleanup Service initialized');
    
    // Ensure directories exist
    this.ensureDirectories();
    
    // Start periodic cleanup (every 30 minutes by default)
    this.startPeriodicCleanup();
    
    // Initial cleanup
    this.performCleanup();

    // Handle process termination
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  ensureDirectories() {
    const directories = [
      this.config.uploadsDir,
      this.config.outputDir,
      this.config.zipsDir,
      this.config.tempDir
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  startPeriodicCleanup() {
    // Convert interval from seconds to minutes for cron
    const intervalMinutes = Math.max(1, Math.floor(this.config.cleanupInterval / 60));
    const cronPattern = `*/${intervalMinutes} * * * *`;
    
    cron.schedule(cronPattern, () => {
      this.performCleanup();
    }, {
      scheduled: true,
      timezone: 'Asia/Bangkok'
    });

    console.log(`⏰ Scheduled cleanup every ${intervalMinutes} minutes`);
  }

  async performCleanup() {
    console.log('🧹 Starting cleanup process...');
    const startTime = Date.now();
    let totalFilesRemoved = 0;
    let totalSpaceFreed = 0;

    try {
      // Clean temporary files
      const tempResults = await this.cleanDirectory(this.config.uploadsDir, this.config.tempFileLifetime);
      totalFilesRemoved += tempResults.filesRemoved;
      totalSpaceFreed += tempResults.spaceFreed;

      // Clean output directories
      const outputResults = await this.cleanDirectory(this.config.outputDir, this.config.outputFileLifetime);
      totalFilesRemoved += outputResults.filesRemoved;
      totalSpaceFreed += outputResults.spaceFreed;

      // Clean zip files
      const zipResults = await this.cleanZipFiles();
      totalFilesRemoved += zipResults.filesRemoved;
      totalSpaceFreed += zipResults.spaceFreed;

      // Clean temp directory
      if (fs.existsSync(this.config.tempDir)) {
        const tempDirResults = await this.cleanDirectory(this.config.tempDir, this.config.tempFileLifetime);
        totalFilesRemoved += tempDirResults.filesRemoved;
        totalSpaceFreed += tempDirResults.spaceFreed;
      }

      // Clean orphaned files
      const orphanResults = await this.cleanOrphanedFiles();
      totalFilesRemoved += orphanResults.filesRemoved;
      totalSpaceFreed += orphanResults.spaceFreed;

      // Check disk usage and emergency cleanup if needed
      await this.checkDiskUsage();

      // Update stats
      this.stats.totalCleaned += totalFilesRemoved;
      this.stats.spaceFree += totalSpaceFreed;
      this.stats.lastCleanup = new Date();

      const duration = Date.now() - startTime;
      console.log(`✅ Cleanup completed in ${duration}ms`);
      console.log(`📊 Files removed: ${totalFilesRemoved}, Space freed: ${this.formatBytes(totalSpaceFreed)}`);

    } catch (error) {
      console.error('❌ Cleanup error:', error);
      this.stats.errors.push({
        timestamp: new Date(),
        error: error.message
      });
    }
  }

  async cleanDirectory(dirPath, maxAge) {
    if (!fs.existsSync(dirPath)) {
      return { filesRemoved: 0, spaceFreed: 0 };
    }

    let filesRemoved = 0;
    let spaceFreed = 0;
    const currentTime = Date.now();

    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        
        try {
          const stats = fs.statSync(itemPath);
          const age = (currentTime - stats.mtime.getTime()) / 1000; // Age in seconds

          if (age > maxAge) {
            const size = this.getItemSize(itemPath);
            
            if (stats.isDirectory()) {
              fs.rmSync(itemPath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(itemPath);
            }
            
            filesRemoved++;
            spaceFreed += size;
            console.log(`🗑️  Removed: ${itemPath} (age: ${Math.floor(age/60)}min, size: ${this.formatBytes(size)})`);
          }
        } catch (itemError) {
          console.warn(`⚠️  Could not process ${itemPath}:`, itemError.message);
        }
      }
    } catch (error) {
      console.error(`❌ Error cleaning directory ${dirPath}:`, error);
    }

    return { filesRemoved, spaceFreed };
  }

  async cleanZipFiles() {
    const zipDir = this.config.zipsDir;
    if (!fs.existsSync(zipDir)) {
      return { filesRemoved: 0, spaceFreed: 0 };
    }

    let filesRemoved = 0;
    let spaceFreed = 0;
    const currentTime = Date.now();
    const maxAge = this.config.zipFileLifetime;

    try {
      const zipFiles = fs.readdirSync(zipDir).filter(file => file.endsWith('.zip'));

      for (const zipFile of zipFiles) {
        const zipPath = path.join(zipDir, zipFile);
        
        try {
          const stats = fs.statSync(zipPath);
          const age = (currentTime - stats.mtime.getTime()) / 1000;

          if (age > maxAge) {
            const size = stats.size;
            fs.unlinkSync(zipPath);
            
            filesRemoved++;
            spaceFreed += size;
            console.log(`🗑️  Removed zip: ${zipFile} (age: ${Math.floor(age/60)}min, size: ${this.formatBytes(size)})`);
          }
        } catch (error) {
          console.warn(`⚠️  Could not process zip ${zipFile}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning zip files:', error);
    }

    return { filesRemoved, spaceFreed };
  }

  async cleanOrphanedFiles() {
    let filesRemoved = 0;
    let spaceFreed = 0;

    // Clean files that match temporary patterns
    const patterns = [
      /^temp_.*$/,
      /^tmp_.*$/,
      /.*\.tmp$/,
      /.*_youtube\..*$/,
      /.*_audio\..*$/,
      /.*_separate_audio\..*$/,
      /.*_sounds\.zip$/
    ];

    const directories = [this.config.uploadsDir];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) continue;

      try {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          
          if (patterns.some(pattern => pattern.test(file))) {
            try {
              const stats = fs.statSync(filePath);
              const age = (Date.now() - stats.mtime.getTime()) / 1000;
              
              // Clean orphaned files older than 1 hour
              if (age > 3600) {
                const size = stats.size;
                fs.unlinkSync(filePath);
                
                filesRemoved++;
                spaceFreed += size;
                console.log(`🗑️  Removed orphaned: ${file}`);
              }
            } catch (error) {
              console.warn(`⚠️  Could not process orphaned file ${file}:`, error.message);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error cleaning orphaned files in ${dir}:`, error);
      }
    }

    return { filesRemoved, spaceFreed };
  }

  async checkDiskUsage() {
    try {
      const usage = this.calculateDiskUsage();
      
      if (usage.total > this.config.maxDiskUsage) {
        console.log(`⚠️  Disk usage (${this.formatBytes(usage.total)}) exceeds limit, performing emergency cleanup...`);
        await this.emergencyCleanup();
      }
    } catch (error) {
      console.error('❌ Error checking disk usage:', error);
    }
  }

  async emergencyCleanup() {
    console.log('🚨 Starting emergency cleanup...');
    
    // More aggressive cleanup - reduce file lifetimes by 50%
    const emergencyConfig = {
      tempFileLifetime: this.config.tempFileLifetime * 0.5,
      outputFileLifetime: this.config.outputFileLifetime * 0.5,
      zipFileLifetime: this.config.zipFileLifetime * 0.5
    };

    // Clean with reduced lifetimes
    await this.cleanDirectory(this.config.uploadsDir, emergencyConfig.tempFileLifetime);
    await this.cleanDirectory(this.config.outputDir, emergencyConfig.outputFileLifetime);
    
    // Remove oldest zip files first
    await this.cleanOldestZips(50); // Remove up to 50 oldest zips
    
    console.log('✅ Emergency cleanup completed');
  }

  async cleanOldestZips(maxToRemove) {
    const zipDir = this.config.zipsDir;
    if (!fs.existsSync(zipDir)) return;

    try {
      const zipFiles = fs.readdirSync(zipDir)
        .filter(file => file.endsWith('.zip'))
        .map(file => {
          const filePath = path.join(zipDir, file);
          const stats = fs.statSync(filePath);
          return { file, path: filePath, mtime: stats.mtime, size: stats.size };
        })
        .sort((a, b) => a.mtime - b.mtime); // Sort by modification time (oldest first)

      let removed = 0;
      for (const zipInfo of zipFiles) {
        if (removed >= maxToRemove) break;
        
        try {
          fs.unlinkSync(zipInfo.path);
          removed++;
          console.log(`🗑️  Emergency removed: ${zipInfo.file}`);
        } catch (error) {
          console.warn(`⚠️  Could not remove ${zipInfo.file}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Error in emergency zip cleanup:', error);
    }
  }

  calculateDiskUsage() {
    let total = 0;
    const directories = [
      this.config.uploadsDir,
      this.config.outputDir,
      this.config.zipsDir,
      this.config.tempDir
    ];

    directories.forEach(dir => {
      if (fs.existsSync(dir)) {
        total += this.getDirectorySize(dir);
      }
    });

    return { total };
  }

  getDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        totalSize += this.getItemSize(itemPath);
      }
    } catch (error) {
      console.warn(`⚠️  Could not calculate size for ${dirPath}:`, error.message);
    }
    
    return totalSize;
  }

  getItemSize(itemPath) {
    try {
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        return this.getDirectorySize(itemPath);
      } else {
        return stats.size;
      }
    } catch (error) {
      return 0;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getStats() {
    return {
      ...this.stats,
      diskUsage: this.calculateDiskUsage(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  // Manual cleanup trigger
  async forceCleanup() {
    console.log('🧹 Force cleanup triggered...');
    await this.performCleanup();
  }

  // Clean specific namespace
  async cleanNamespace(namespace) {
    let filesRemoved = 0;
    let spaceFreed = 0;
    
    const directories = [
      this.config.uploadsDir,
      this.config.outputDir,
      this.config.zipsDir
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) continue;
      
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          if (item.includes(namespace)) {
            const itemPath = path.join(dir, item);
            const size = this.getItemSize(itemPath);
            
            if (fs.statSync(itemPath).isDirectory()) {
              fs.rmSync(itemPath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(itemPath);
            }
            
            filesRemoved++;
            spaceFreed += size;
            console.log(`🗑️  Cleaned namespace file: ${item}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error cleaning namespace ${namespace} in ${dir}:`, error);
      }
    }

    return { filesRemoved, spaceFreed };
  }

  shutdown() {
    console.log('🧹 File Cleanup Service shutting down...');
    // Perform final cleanup
    this.performCleanup().then(() => {
      console.log('✅ Cleanup service shutdown complete');
    });
  }
}

// Initialize cleanup service
const cleanupService = new FileCleanupService();

// Export for use in other modules
module.exports = FileCleanupService;

// Graceful process handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
