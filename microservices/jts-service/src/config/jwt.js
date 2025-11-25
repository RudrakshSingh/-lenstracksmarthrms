const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.JTS_JWT_SECRET || 'jts-secret-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '15m';
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '7d';

module.exports = {
  JWT_SECRET,
  JWT_EXPIRE,
  JWT_REFRESH_EXPIRE
};

