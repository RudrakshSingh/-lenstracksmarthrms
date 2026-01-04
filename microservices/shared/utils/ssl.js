/**
 * SSL/TLS Certificate Management Utility
 * Handles loading SSL certificates for HTTPS servers
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load logger with fallback
let logger;
try {
  logger = require('../config/logger');
} catch (error) {
  // Fallback logger if config fails
  logger = {
    info: (...args) => console.log('[INFO]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args)
  };
}

/**
 * Load SSL certificates from file paths or environment variables
 * @returns {Object|null} SSL options object or null if SSL is disabled
 */
function loadSSLCertificates() {
  const enableSSL = process.env.ENABLE_SSL === 'true' || process.env.ENABLE_HTTPS === 'true';
  
  if (!enableSSL) {
    logger.info('SSL/HTTPS is disabled. Set ENABLE_SSL=true to enable.');
    return null;
  }

  // Certificate paths from environment variables
  const certPath = process.env.SSL_CERT_PATH || process.env.SSL_CERTIFICATE_PATH;
  const keyPath = process.env.SSL_KEY_PATH || process.env.SSL_CERTIFICATE_KEY_PATH;
  
  // Default paths for development (self-signed certificates)
  const defaultCertPath = path.join(__dirname, '../../../ssl/cert.pem');
  const defaultKeyPath = path.join(__dirname, '../../../ssl/key.pem');

  let cert, key;

  // Try to load from environment paths first
  if (certPath && keyPath) {
    try {
      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        cert = fs.readFileSync(certPath, 'utf8');
        key = fs.readFileSync(keyPath, 'utf8');
        logger.info(`SSL certificates loaded from: ${certPath} and ${keyPath}`);
      } else {
        logger.warn(`SSL certificate files not found at specified paths: ${certPath}, ${keyPath}`);
      }
    } catch (error) {
      logger.error('Error loading SSL certificates from specified paths:', error.message);
    }
  }

  // Fallback to default paths if not found
  if (!cert || !key) {
    try {
      if (fs.existsSync(defaultCertPath) && fs.existsSync(defaultKeyPath)) {
        cert = fs.readFileSync(defaultCertPath, 'utf8');
        key = fs.readFileSync(defaultKeyPath, 'utf8');
        logger.info(`SSL certificates loaded from default paths: ${defaultCertPath} and ${defaultKeyPath}`);
      } else {
        logger.warn(`SSL certificate files not found at default paths: ${defaultCertPath}, ${defaultKeyPath}`);
        logger.warn('HTTPS will not be available. Generate certificates using scripts/generate-ssl-certs.sh');
        return null;
      }
    } catch (error) {
      logger.error('Error loading SSL certificates from default paths:', error.message);
      return null;
    }
  }

  // SSL options
  const sslOptions = {
    cert,
    key,
    // Security settings
    minVersion: process.env.SSL_MIN_VERSION || 'TLSv1.2',
    maxVersion: process.env.SSL_MAX_VERSION || 'TLSv1.3',
    // Cipher suites (modern, secure)
    ciphers: process.env.SSL_CIPHERS || [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384',
      '!aNULL',
      '!eNULL',
      '!EXPORT',
      '!DES',
      '!RC4',
      '!MD5',
      '!PSK',
      '!SRP',
      '!CAMELLIA'
    ].join(':'),
    honorCipherOrder: true,
    // Reject unauthorized certificates (set to false only for self-signed in development)
    rejectUnauthorized: process.env.SSL_REJECT_UNAUTHORIZED !== 'false',
  };

  // Additional options for production
  if (process.env.NODE_ENV === 'production') {
    sslOptions.secureProtocol = 'TLSv1_2_method';
    sslOptions.rejectUnauthorized = true; // Always reject unauthorized in production
  }

  logger.info('SSL certificates loaded successfully');
  return sslOptions;
}

/**
 * Create HTTPS server with SSL certificates
 * @param {Object} app - Express application
 * @param {Number} port - Port number
 * @param {String} host - Host address (default: '0.0.0.0')
 * @returns {Object} HTTPS server instance
 */
function createHTTPSServer(app, port, host = '0.0.0.0') {
  const sslOptions = loadSSLCertificates();
  
  if (!sslOptions) {
    logger.warn('SSL certificates not available. Falling back to HTTP server.');
    return null;
  }

  try {
    const httpsServer = https.createServer(sslOptions, app);
    
    httpsServer.listen(port, host, () => {
      logger.info(`HTTPS server running on https://${host}:${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    return httpsServer;
  } catch (error) {
    logger.error('Failed to create HTTPS server:', error.message);
    return null;
  }
}

/**
 * Create server (HTTP or HTTPS based on configuration)
 * @param {Object} app - Express application
 * @param {Number} port - Port number
 * @param {String} host - Host address (default: '0.0.0.0')
 * @param {Function} callback - Optional callback function called when server starts listening
 * @returns {Object} Server instance (HTTP or HTTPS)
 */
function createServer(app, port, host = '0.0.0.0', callback) {
  const enableSSL = process.env.ENABLE_SSL === 'true' || process.env.ENABLE_HTTPS === 'true';
  
  if (enableSSL) {
    const sslOptions = loadSSLCertificates();
    if (sslOptions) {
      try {
        const https = require('https');
        const httpsServer = https.createServer(sslOptions, app);
        
        httpsServer.listen(port, host, () => {
          logger.info(`HTTPS server running on https://${host}:${port}`);
          logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
          if (callback) callback();
        });
        
        return httpsServer;
      } catch (error) {
        logger.error('Failed to create HTTPS server:', error.message);
        logger.warn('Falling back to HTTP server due to HTTPS configuration issues');
      }
    } else {
      logger.warn('SSL certificates not available, falling back to HTTP');
    }
  }

  // Default to HTTP
  const http = require('http');
  const server = http.createServer(app);
  
  server.listen(port, host, () => {
    logger.info(`HTTP server running on http://${host}:${port}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    if (callback) callback();
  });

  return server;
}

/**
 * Redirect HTTP to HTTPS middleware
 * @returns {Function} Express middleware
 */
function redirectHTTPToHTTPS() {
  return (req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      return next();
    }
    
    // Redirect HTTP to HTTPS
    const httpsUrl = `https://${req.headers.host}${req.url}`;
    return res.redirect(301, httpsUrl);
  };
}

module.exports = {
  loadSSLCertificates,
  createHTTPSServer,
  createServer,
  redirectHTTPToHTTPS
};

