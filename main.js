
// This file serves as the entry point for the BetMC Texture Generator
// The actual server logic is in server.js
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting BetMC Texture Generator Pro...');

// Start the main server
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  cwd: path.resolve(__dirname)
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`🛑 Server process exited with code ${code}`);
  if (code !== 0) {
    process.exit(code);
  }
});
