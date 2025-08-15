#!/usr/bin/env node

// Direct server starter for port 5000
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting BetMC on port 5000...');

// Set environment to force port 5000
process.env.PORT = '5000';

// Kill any existing servers
const killExisting = spawn('pkill', ['-f', 'server.js'], { stdio: 'inherit' });

killExisting.on('close', () => {
  // Start the main server
  const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname),
    env: { ...process.env, PORT: '5000' }
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
});