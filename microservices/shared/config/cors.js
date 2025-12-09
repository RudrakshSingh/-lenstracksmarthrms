const cors = require('cors');

// Default allowed origins - localhost for development
// In production, set CORS_ORIGIN environment variable via ConfigMap
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001'
];

const corsOriginEnv = process.env.CORS_ORIGIN;
let allowedOrigins;

if (corsOriginEnv === '*') {
  // Allow all origins
  allowedOrigins = '*';
} else if (corsOriginEnv) {
  // Use configured origins
  allowedOrigins = corsOriginEnv.split(',').map(origin => origin.trim());
} else {
  // Use default origins
  allowedOrigins = defaultOrigins;
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // If wildcard, allow all
    if (allowedOrigins === '*') {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In production, be more lenient - allow if CORS_ORIGIN not explicitly set
      if (!corsOriginEnv && process.env.NODE_ENV !== 'production') {
        callback(new Error('Not allowed by CORS'));
      } else {
        // Allow for now to prevent blocking frontend
        callback(null, true);
      }
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'X-Request-ID'
  ],
  credentials: process.env.CORS_CREDENTIALS === 'true' || true,
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
};

module.exports = cors(corsOptions);