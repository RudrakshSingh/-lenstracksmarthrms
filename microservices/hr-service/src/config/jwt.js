const jwt = require('jsonwebtoken');
const logger = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET || 'etelios-dev-secret-key-2024';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'etelios-refresh-secret-key-2024';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

// Log warning if using fallback secrets
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.warn('Using fallback JWT secrets. Please set JWT_SECRET and JWT_REFRESH_SECRET in production!');
}

const generateAccessToken = (payload, customExpiry = null) => {
  try {
    const expiry = customExpiry || JWT_EXPIRY;
    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: expiry,
      issuer: 'hrms-backend',
      audience: 'hrms-frontend'
    });
  } catch (error) {
    logger.error('Error generating access token', { error: error.message, userId: payload.userId });
    throw new Error('Token generation failed');
  }
};

const generateRefreshToken = (payload, customExpiry = null) => {
  try {
    const expiry = customExpiry || JWT_REFRESH_EXPIRY;
    return jwt.sign(payload, JWT_REFRESH_SECRET, { 
      expiresIn: expiry,
      issuer: 'hrms-backend',
      audience: 'hrms-frontend'
    });
  } catch (error) {
    logger.error('Error generating refresh token', { error: error.message, userId: payload.userId });
    throw new Error('Refresh token generation failed');
  }
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'hrms-backend',
      audience: 'hrms-frontend'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      logger.error('Error verifying access token', { error: error.message });
      throw new Error('Token verification failed');
    }
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'hrms-backend',
      audience: 'hrms-frontend'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    } else {
      logger.error('Error verifying refresh token', { error: error.message });
      throw new Error('Refresh token verification failed');
    }
  }
};

const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Error decoding token', { error: error.message });
    throw new Error('Token decoding failed');
  }
};

module.exports = {
  JWT_SECRET,
  JWT_EXPIRY,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRY,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken
};