const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Socket.IO Authentication Middleware
 * Validates JWT token from socket handshake
 */
const authenticateSocket = (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      logger.warn('Socket connection attempt without token', {
        socketId: socket.id,
        ip: socket.handshake.address
      });
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-this';
    const decoded = jwt.verify(token, jwtSecret);

    // Attach user info to socket (align with jts-service JWT: sub = employee id)
    socket.userId = decoded.userId || decoded.sub || decoded._id || decoded.id;
    socket.userEmail = decoded.email;
    socket.userRole = decoded.role;
    socket.tenantId = socket.handshake.auth.tenantId || decoded.tenantId || 'default';

    logger.info('Socket authenticated successfully', {
      socketId: socket.id,
      userId: socket.userId,
      tenantId: socket.tenantId,
      role: socket.userRole
    });

    next();
  } catch (error) {
    logger.error('Socket authentication failed', {
      socketId: socket.id,
      error: error.message
    });
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }
    
    return next(new Error('Authentication failed'));
  }
};

module.exports = { authenticateSocket };

