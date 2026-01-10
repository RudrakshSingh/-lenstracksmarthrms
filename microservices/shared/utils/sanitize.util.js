/**
 * Utility functions for sanitizing user input
 * Prevents injection attacks and ensures data integrity
 */

/**
 * Escapes special regex characters to prevent ReDoS attacks
 * @param {string} string - Input string to escape
 * @returns {string} Escaped string safe for regex
 */
function escapeRegex(string) {
  if (typeof string !== 'string') {
    return '';
  }
  // Escape all special regex characters
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitizes MongoDB query input to prevent NoSQL injection
 * @param {any} input - User input to sanitize
 * @returns {any} Sanitized input
 */
function sanitizeMongoQuery(input) {
  if (input === null || input === undefined) {
    return input;
  }

  // If it's an object, check for MongoDB operators
  if (typeof input === 'object' && !Array.isArray(input)) {
    const sanitized = {};
    for (const key in input) {
      // Block MongoDB operators that could be used for injection
      if (key.startsWith('$')) {
        continue; // Skip MongoDB operators
      }
      sanitized[key] = sanitizeMongoQuery(input[key]);
    }
    return sanitized;
  }

  // If it's an array, sanitize each element
  if (Array.isArray(input)) {
    return input.map(item => sanitizeMongoQuery(item));
  }

  // For strings, remove potential injection patterns
  if (typeof input === 'string') {
    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');
    
    // Limit length to prevent DoS
    if (sanitized.length > 1000) {
      sanitized = sanitized.substring(0, 1000);
    }
    
    return sanitized;
  }

  return input;
}

/**
 * Validates and sanitizes employeeId format
 * @param {string} employeeId - Employee ID to validate
 * @returns {string|null} Sanitized employee ID or null if invalid
 */
function sanitizeEmployeeId(employeeId) {
  if (typeof employeeId !== 'string') {
    return null;
  }

  // Remove whitespace and convert to uppercase
  const sanitized = employeeId.trim().toUpperCase();

  // Validate format: alphanumeric, hyphens, underscores only
  if (!/^[A-Z0-9_-]+$/.test(sanitized)) {
    return null;
  }

  // Limit length
  if (sanitized.length > 50) {
    return null;
  }

  return sanitized;
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
  if (typeof email !== 'string') {
    return false;
  }

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL format
 */
function isValidUrl(url) {
  if (typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates Google Maps URL format
 * @param {string} url - Google Maps URL to validate
 * @returns {boolean} True if valid Google Maps URL
 */
function isValidGoogleMapsUrl(url) {
  if (!isValidUrl(url)) {
    return false;
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check if it's a Google Maps domain
    const validDomains = [
      'maps.google.com',
      'www.google.com',
      'google.com',
      'goo.gl'
    ];
    
    return validDomains.some(domain => hostname.endsWith(domain));
  } catch {
    return false;
  }
}

/**
 * Sanitizes search query for safe regex use
 * @param {string} searchQuery - Search query to sanitize
 * @returns {string|null} Sanitized search query or null if invalid
 */
function sanitizeSearchQuery(searchQuery) {
  if (typeof searchQuery !== 'string') {
    return null;
  }

  // Remove whitespace
  let sanitized = searchQuery.trim();

  // Block if empty
  if (!sanitized) {
    return null;
  }

  // Limit length to prevent ReDoS
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }

  // Escape special regex characters
  sanitized = escapeRegex(sanitized);

  return sanitized;
}

/**
 * Creates a safe RegExp for MongoDB queries
 * @param {string} pattern - Pattern to create regex from
 * @param {string} flags - Regex flags (default: 'i' for case-insensitive)
 * @returns {RegExp|null} Safe RegExp or null if invalid
 */
function createSafeRegex(pattern, flags = 'i') {
  const sanitized = sanitizeSearchQuery(pattern);
  if (!sanitized) {
    return null;
  }

  try {
    return new RegExp(sanitized, flags);
  } catch {
    return null;
  }
}

module.exports = {
  escapeRegex,
  sanitizeMongoQuery,
  sanitizeEmployeeId,
  isValidEmail,
  isValidUrl,
  isValidGoogleMapsUrl,
  sanitizeSearchQuery,
  createSafeRegex
};

