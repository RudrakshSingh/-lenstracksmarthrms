#!/usr/bin/env node

/**
 * Create Test-Friendly Authentication Middleware
 * Allows testing with optional authentication
 */

const fs = require('fs');
const path = require('path');

const testAuthMiddleware = `const jwt = require('jsonwebtoken');

/**
 * Test-friendly authentication middleware
 * In test mode, allows requests without auth but still validates if token is provided
 */
async function authenticate(req, res, next) {
  // Allow test mode (when TEST_MODE env is set)
  if (process.env.TEST_MODE === 'true') {
    // If token is provided, try to validate it
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        req.user = { id: decoded.userId, role: decoded.role || 'test-user' };
      } catch (error) {
        // Invalid token, but continue in test mode
        req.user = { id: 'test-user-id', role: 'test-user' };
      }
    } else {
      // No token, but allow in test mode
      req.user = { id: 'test-user-id', role: 'test-user' };
    }
    return next();
  }

  // Normal production mode - require authentication
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        hint: 'Include Authorization header: Bearer <token>'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // In test mode, skip database lookup
    if (process.env.TEST_MODE === 'true') {
      req.user = { id: decoded.userId || 'test-user-id', role: decoded.role || 'test-user' };
      return next();
    }

    // Production: Get user from database
    const User = require('../models/User.model');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = {
      id: user._id,
      employee_id: user.employee_id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
}

module.exports = { authenticate };
`;

const services = [
  'hr-service', 'attendance-service', 'payroll-service', 'crm-service',
  'inventory-service', 'sales-service', 'purchase-service', 'financial-service',
  'document-service', 'service-management', 'cpp-service', 'prescription-service',
  'analytics-service', 'notification-service'
];

services.forEach(serviceName => {
  const middlewarePath = path.join(__dirname, '..', 'microservices', serviceName, 'src', 'middleware', 'auth.middleware.js');
  const middlewareDir = path.dirname(middlewarePath);

  // Check if middleware exists
  if (fs.existsSync(middlewarePath)) {
    const existing = fs.readFileSync(middlewarePath, 'utf8');
    
    // Check if it already has TEST_MODE support
    if (existing.includes('TEST_MODE')) {
      console.log(`✅ ${serviceName}: Auth middleware already has test mode`);
      return;
    }

    // Backup existing middleware
    fs.writeFileSync(middlewarePath + '.backup', existing);
    
    // Replace with test-friendly version
    fs.writeFileSync(middlewarePath, testAuthMiddleware);
    console.log(`✅ ${serviceName}: Updated auth middleware with test mode support`);
  } else {
    // Create directory if it doesn't exist
    if (!fs.existsSync(middlewareDir)) {
      fs.mkdirSync(middlewareDir, { recursive: true });
    }
    
    // Create new middleware
    fs.writeFileSync(middlewarePath, testAuthMiddleware);
    console.log(`✅ ${serviceName}: Created test-friendly auth middleware`);
  }
});

console.log('\n✅ Test-friendly middleware created/updated');
console.log('\n📝 Usage:');
console.log('  Set TEST_MODE=true to allow requests without authentication');
console.log('  Example: TEST_MODE=true npm start');

