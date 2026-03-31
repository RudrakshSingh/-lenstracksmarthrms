/**
 * Internal routes (Pattern B) — no user JWT; see internalServiceAuth.middleware.js
 * Mount: /api/jts/internal and /jts/internal (ingress parity)
 */
const express = require('express');
const router = express.Router();
const { internalServiceAuth } = require('../middleware/internalServiceAuth.middleware');
const compatCtrl = require('../controllers/hrmsJtsCompat.controller');

router.get('/tenant-analytics', internalServiceAuth, (req, res) => compatCtrl.getAnalytics(req, res));

module.exports = router;
