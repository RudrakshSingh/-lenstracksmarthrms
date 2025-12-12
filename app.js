#!/usr/bin/env node

/**
 * Main Entry Point for Etelios API Gateway
 * 
 * This file is a wrapper that loads the actual server from src/server.js
 * It ensures proper error handling and environment setup
 */

// Load environment variables from .env in development
try {
  require('dotenv').config();
} catch (err) {
  // dotenv not available in production, that's okay
}

// Set default port to 3000 (not 8080)
if (!process.env.PORT && !process.env.WEBSITES_PORT) {
  process.env.PORT = '3000';
}

// Log startup info
console.log('='.repeat(60));
console.log('🚀 Etelios API Gateway - Starting...');
console.log(`📡 Port: ${process.env.PORT || process.env.WEBSITES_PORT || 3000}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📁 Entry point: app.js -> src/server.js`);
console.log('='.repeat(60));

// Load and start the actual server
try {
  // Import the server (this will start it)
  require('./src/server.js');
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

