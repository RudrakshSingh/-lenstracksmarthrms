const axios = require('axios');
const https = require('https');
const http = require('http');
const logger = require('../config/logger');

// Create HTTP agents with connection pooling
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  maxFreeSockets: 5,
  timeout: 5000
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  maxFreeSockets: 5,
  timeout: 5000,
  rejectUnauthorized: false // For development
});

// Create optimized axios instance
const httpClient = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 8000, // Global timeout
  maxRedirects: 3,
  validateStatus: (status) => status < 500, // Don't throw on 4xx errors
});

// Request interceptor for logging
httpClient.interceptors.request.use(
  (config) => {
    const startTime = Date.now();
    config.metadata = { startTime };
    
    logger.debug('HTTP Request', {
      method: config.method?.toUpperCase(),
      url: config.url,
      timeout: config.timeout
    });
    
    return config;
  },
  (error) => {
    logger.error('HTTP Request Error', { error: error.message });
    return Promise.reject(error);
  }
);

// Response interceptor for logging
httpClient.interceptors.response.use(
  (response) => {
    const duration = Date.now() - response.config.metadata.startTime;
    
    logger.debug('HTTP Response', {
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      duration: `${duration}ms`
    });
    
    return response;
  },
  (error) => {
    const duration = error.config?.metadata?.startTime 
      ? Date.now() - error.config.metadata.startTime 
      : 0;
    
    logger.warn('HTTP Response Error', {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      duration: `${duration}ms`,
      error: error.message
    });
    
    return Promise.reject(error);
  }
);

/**
 * Enhanced HTTP client with retry logic
 */
const makeRequest = async (config, retries = 2) => {
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await httpClient(config);
      
      // Log successful request
      if (attempt > 0) {
        logger.info('HTTP request succeeded after retry', {
          url: config.url,
          attempt: attempt + 1,
          status: response.status
        });
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      // Don't retry on 4xx errors (client errors)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        logger.debug('HTTP request failed with client error, not retrying', {
          url: config.url,
          status: error.response.status
        });
        break;
      }
      
      // Don't retry on last attempt
      if (attempt === retries) {
        logger.error('HTTP request failed after all retries', {
          url: config.url,
          attempts: attempt + 1,
          error: error.message
        });
        break;
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      logger.warn('HTTP request failed, retrying', {
        url: config.url,
        attempt: attempt + 1,
        retryIn: `${delay}ms`,
        error: error.message
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Specialized HR service client
 */
const hrServiceClient = {
  get: (url, options = {}, retries = 2) => makeRequest({
    method: 'GET',
    url,
    timeout: 5000,
    ...options
  }, retries),
  
  post: (url, data, options = {}, retries = 2) => makeRequest({
    method: 'POST',
    url,
    data,
    timeout: 8000,
    ...options
  }, retries),
  
  put: (url, data, options = {}, retries = 2) => makeRequest({
    method: 'PUT',
    url,
    data,
    timeout: 8000,
    ...options
  }, retries)
};

module.exports = {
  httpClient,
  makeRequest,
  hrServiceClient
};
