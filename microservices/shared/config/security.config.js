const crypto = require('crypto');
const logger = require('./logger');

class SecurityConfig {
  constructor() {
    this.config = {
      // Authentication settings
      auth: {
        jwtSecret: process.env.JWT_SECRET || this.generateSecureKey(64),
        jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || this.generateSecureKey(64),
        jwtExpiry: process.env.JWT_EXPIRY || '15m',
        jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
        sessionSecret: process.env.SESSION_SECRET || this.generateSecureKey(64),
        maxLoginAttempts: parseInt(process.env.LOGIN_ATTEMPTS_LIMIT) || 5,
        lockoutDuration: parseInt(process.env.LOGIN_LOCKOUT_DURATION_MS) || 900000,
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumbers: true,
        passwordRequireSpecialChars: true,
        passwordHistoryCount: 5
      },

      // Rate limiting settings
      rateLimiting: {
        auth: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 5, // 5 attempts per window
          skipSuccessfulRequests: true
        },
        api: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 100, // 100 requests per window
          skipSuccessfulRequests: false
        },
        strict: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 10, // 10 requests per window
          skipSuccessfulRequests: false
        },
        upload: {
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 10, // 10 uploads per hour
          skipSuccessfulRequests: false
        }
      },

      // Security headers
      headers: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            workerSrc: ["'self'"],
            manifestSrc: ["'self'"],
            upgradeInsecureRequests: []
          }
        },
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true
        },
        referrerPolicy: 'strict-origin-when-cross-origin'
      },

      // CORS settings - defaults to allow all origins for frontend compatibility
      cors: {
        origin: process.env.CORS_ORIGIN === '*' 
          ? '*' 
          : (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : '*'),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-CSRF-Token', 'X-Request-ID'],
        maxAge: 86400 // 24 hours
      },

      // Encryption settings
      encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16,
        tagLength: 16,
        saltRounds: 12,
        masterKey: process.env.ENCRYPTION_MASTER_KEY || this.generateSecureKey(64)
      },

      // File upload security
      fileUpload: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        scanForMalware: true,
        quarantineSuspicious: true
      },

      // IP filtering
      ipFiltering: {
        allowedIPs: process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',') : [],
        blockedIPs: process.env.BLOCKED_IPS ? process.env.BLOCKED_IPS.split(',') : [],
        enableGeoBlocking: false,
        blockedCountries: []
      },

      // Session security
      session: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        rolling: true,
        resave: false,
        saveUninitialized: false
      },

      // Audit logging
      audit: {
        logAllRequests: true,
        logSensitiveData: false,
        logFailedAttempts: true,
        logSuccessfulLogins: true,
        logDataAccess: true,
        logAdminActions: true,
        retentionDays: 365
      },

      // Security monitoring
      monitoring: {
        enableIntrusionDetection: true,
        enableAnomalyDetection: true,
        enableBruteForceDetection: true,
        enableSuspiciousActivityDetection: true,
        alertThresholds: {
          failedLogins: 5,
          suspiciousIPs: 3,
          dataAccessAnomalies: 10
        }
      },

      // Database security
      database: {
        encryptSensitiveFields: true,
        auditAllQueries: false,
        enableQueryLogging: false,
        connectionEncryption: true,
        backupEncryption: true
      },

      // API security
      api: {
        enableApiKeyAuth: false,
        enableOAuth: false,
        enableBasicAuth: false,
        enableTokenAuth: true,
        enableRateLimiting: true,
        enableRequestValidation: true,
        enableResponseSanitization: true
      }
    };

    this.validateConfig();
  }

  // Generate secure random key
  generateSecureKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Validate configuration
  validateConfig() {
    const errors = [];

    // Validate JWT secrets
    if (!this.config.auth.jwtSecret || this.config.auth.jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long');
    }

    if (!this.config.auth.jwtRefreshSecret || this.config.auth.jwtRefreshSecret.length < 32) {
      errors.push('JWT_REFRESH_SECRET must be at least 32 characters long');
    }

    // Validate encryption key
    if (!this.config.encryption.masterKey || this.config.encryption.masterKey.length < 32) {
      errors.push('ENCRYPTION_MASTER_KEY must be at least 32 characters long');
    }

    // Validate CORS origins
    if (this.config.cors.origin.length === 0) {
      errors.push('At least one CORS origin must be configured');
    }

    // Validate rate limiting
    if (this.config.rateLimiting.auth.max < 1) {
      errors.push('Auth rate limit max must be at least 1');
    }

    if (errors.length > 0) {
      logger.error('Security configuration validation failed', { errors });
      throw new Error(`Security configuration errors: ${errors.join(', ')}`);
    }

    logger.info('Security configuration validated successfully');
  }

  // Get configuration value
  get(key) {
    return key.split('.').reduce((obj, k) => obj && obj[k], this.config);
  }

  // Update configuration value
  set(key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, k) => obj[k] = obj[k] || {}, this.config);
    target[lastKey] = value;
  }

  // Get all configuration
  getAll() {
    return this.config;
  }

  // Check if feature is enabled
  isEnabled(feature) {
    return this.get(feature) === true;
  }

  // Get security recommendations
  getSecurityRecommendations() {
    const recommendations = [];

    // Check for weak passwords
    if (this.config.auth.passwordMinLength < 12) {
      recommendations.push('Consider increasing minimum password length to 12 characters');
    }

    // Check for short JWT expiry
    if (this.config.auth.jwtExpiry === '15m') {
      recommendations.push('Consider reducing JWT expiry time for better security');
    }

    // Check for missing encryption
    if (!this.config.encryption.masterKey) {
      recommendations.push('Set ENCRYPTION_MASTER_KEY for data encryption');
    }

    // Check for missing IP filtering
    if (this.config.ipFiltering.allowedIPs.length === 0 && process.env.NODE_ENV === 'production') {
      recommendations.push('Consider implementing IP whitelisting for production');
    }

    // Check for missing audit logging
    if (!this.config.audit.logAllRequests) {
      recommendations.push('Enable comprehensive audit logging for security monitoring');
    }

    return recommendations;
  }

  // Generate security report
  generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      configuration: this.config,
      recommendations: this.getSecurityRecommendations(),
      securityScore: this.calculateSecurityScore()
    };

    return report;
  }

  // Calculate security score
  calculateSecurityScore() {
    let score = 0;
    let maxScore = 0;

    // Authentication security (25 points)
    maxScore += 25;
    if (this.config.auth.jwtSecret && this.config.auth.jwtSecret.length >= 32) score += 5;
    if (this.config.auth.jwtRefreshSecret && this.config.auth.jwtRefreshSecret.length >= 32) score += 5;
    if (this.config.auth.maxLoginAttempts <= 5) score += 5;
    if (this.config.auth.passwordMinLength >= 8) score += 5;
    if (this.config.auth.passwordRequireUppercase) score += 2.5;
    if (this.config.auth.passwordRequireLowercase) score += 2.5;

    // Rate limiting (20 points)
    maxScore += 20;
    if (this.config.rateLimiting.auth.max <= 5) score += 5;
    if (this.config.rateLimiting.api.max <= 100) score += 5;
    if (this.config.rateLimiting.strict.max <= 10) score += 5;
    if (this.config.rateLimiting.upload.max <= 10) score += 5;

    // Encryption (20 points)
    maxScore += 20;
    if (this.config.encryption.masterKey && this.config.encryption.masterKey.length >= 32) score += 10;
    if (this.config.encryption.saltRounds >= 12) score += 5;
    if (this.config.database.encryptSensitiveFields) score += 5;

    // Headers (15 points)
    maxScore += 15;
    if (this.config.headers.contentSecurityPolicy) score += 5;
    if (this.config.headers.hsts.maxAge >= 31536000) score += 5;
    if (this.config.headers.referrerPolicy === 'strict-origin-when-cross-origin') score += 5;

    // Audit logging (10 points)
    maxScore += 10;
    if (this.config.audit.logAllRequests) score += 2.5;
    if (this.config.audit.logFailedAttempts) score += 2.5;
    if (this.config.audit.logDataAccess) score += 2.5;
    if (this.config.audit.logAdminActions) score += 2.5;

    // Monitoring (10 points)
    maxScore += 10;
    if (this.config.monitoring.enableIntrusionDetection) score += 2.5;
    if (this.config.monitoring.enableAnomalyDetection) score += 2.5;
    if (this.config.monitoring.enableBruteForceDetection) score += 2.5;
    if (this.config.monitoring.enableSuspiciousActivityDetection) score += 2.5;

    return Math.round((score / maxScore) * 100);
  }
}

// Create singleton instance
const securityConfig = new SecurityConfig();

module.exports = securityConfig;
