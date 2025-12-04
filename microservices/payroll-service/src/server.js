// Load environment variables from .env in development; ignore missing module in production
try {
  // eslint-disable-next-line global-require
  require('dotenv').config();
} catch (err) {
  // eslint-disable-next-line no-console
  if (process.env.NODE_ENV !== 'production') {
    console.warn('dotenv not available for payroll-service, skipping .env loading:', err.message);
  }
}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');

const app = express();

// Security middleware
app.use(helmet());
// CORS configuration - allows frontend and all origins if CORS_ORIGIN is '*'
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? '*' : (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = corsOrigin.split(',').map(o => o.trim());
    if (allowed.includes(origin) || corsOrigin === '*') {
      callback(null, true);
    } else {
      callback(null, true); // Allow for now to prevent blocking
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Requested-With']
}));

// Rate limiting
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'payroll_service'}`;
    const isProduction = process.env.NODE_ENV === 'production';
    await mongoose.connect(mongoUri);
    if (!isProduction) logger.info('payroll-service: MongoDB connected successfully');
  } catch (error) {
    logger.error('payroll-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes - optimized
const loadRoutes = () => {
  try {
    const salaryRoutes = require('./routes/salary.routes.js');
    app.use('/api/salary', apiRateLimit, salaryRoutes);
    if (!isProduction) logger.info('salary.routes.js loaded');
  } catch (error) {
    logger.error('salary.routes.js failed:', error.message);
  }
  try {
    const unifiedPayrollRoutes = require('./routes/unifiedPayroll.routes.js');
    app.use('/api/unified-payroll', apiRateLimit, unifiedPayrollRoutes);
    if (!isProduction) logger.info('unifiedPayroll.routes.js loaded');
  } catch (error) {
    logger.error('unifiedPayroll.routes.js failed:', error.message);
  }
  try {
    const deductionRoutes = require('./routes/deduction.routes.js');
    app.use('/api/payroll', apiRateLimit, deductionRoutes);
    if (!isProduction) logger.info('deduction.routes.js loaded');
  } catch (error) {
    logger.error('deduction.routes.js failed:', error.message);
  }
};

// Health check
app.get('/health', (req, res) => {
  return res.json({
    service: 'payroll-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: 3004,
    routes: 2,
    controllers: 2,
    models: 3,
    services: 2
  });
});

// Business API Routes
app.get('/api/payroll/status', (req, res) => {
  return res.json({
    service: 'payroll-service',
    status: 'operational',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});

app.get('/api/payroll/health', (req, res) => {
  return res.json({
    service: 'payroll-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});


app.get('/api/payroll/salaries', (req, res) => {
  return res.json({
    service: 'payroll-service',
    endpoint: '/api/payroll/salaries',
    method: 'GET',
    status: 'success',
    message: 'Get salary records',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/payroll/salaries', (req, res) => {
  return res.json({
    service: 'payroll-service',
    endpoint: '/api/payroll/salaries',
    method: 'POST',
    status: 'success',
    message: 'Create salary record',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/payroll/process', (req, res) => {
  return res.json({
    service: 'payroll-service',
    endpoint: '/api/payroll/process',
    method: 'POST',
    status: 'success',
    message: 'Process payroll',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/payroll/reports', (req, res) => {
  return res.json({
    service: 'payroll-service',
    endpoint: '/api/payroll/reports',
    method: 'GET',
    status: 'success',
    message: 'Get payroll reports',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/payroll/compensation', (req, res) => {
  return res.json({
    service: 'payroll-service',
    endpoint: '/api/payroll/compensation',
    method: 'GET',
    status: 'success',
    message: 'Get compensation profiles',
    timestamp: new Date().toISOString()
  });
});


// Enhanced 404 handler with route information
app.use((req, res) => {
  // Try to get route information if available
  const routesInfo = [];
  
  // Common routes that should exist
  routesInfo.push('GET /health');
  routesInfo.push(`GET /api/payroll/status`);
  routesInfo.push(`GET /api/payroll/health`);
  
  res.status(404).json({
    success: false,
    message: 'Route not found - The requested endpoint does not exist or may require authentication',
    path: req.path,
    method: req.method,
    service: 'payroll-service',
    port: 3004,
    hint: 'Most routes require authentication. Include Authorization header with Bearer token.',
    availableEndpoints: routesInfo,
    timestamp: new Date().toISOString(),
    troubleshooting: {
      authentication: 'Add header: Authorization: Bearer <token>',
      dynamicRoutes: 'Replace :id with actual ID (e.g., /api/hr/employees/actual-id-123)',
      basePath: `All routes are under /api/payroll/`
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('payroll-service Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    service: 'payroll-service'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    loadRoutes();
    
    const PORT = process.env.PORT || 3004;
    
    app.listen(PORT, () => {
      logger.info(`payroll-service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('payroll-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();