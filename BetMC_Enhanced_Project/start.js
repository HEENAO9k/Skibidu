// Simple server starter to avoid port conflicts
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting BetMC Server...');

// Kill any existing processes on port 5000
const killProcess = spawn('pkill', ['-f', 'node.*server.js'], { stdio: 'ignore' });

killProcess.on('close', () => {
  setTimeout(() => {
    // Start the server
    const serverPath = path.join(__dirname, 'server.js');
    const server = spawn('node', [serverPath], {
      stdio: 'inherit',
      detached: false
    });

    server.on('error', (err) => {
      console.error('Failed to start server:', err);
    });

    server.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      server.kill('SIGTERM');
    });
    
    process.on('SIGINT', () => {
      server.kill('SIGINT');
    });
  }, 2000);
});