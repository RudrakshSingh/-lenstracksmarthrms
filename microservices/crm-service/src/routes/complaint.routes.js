const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/complaintController');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/',             requirePermission('view_complaints'),   ctrl.list);
router.get('/:id',          requirePermission('view_complaints'),   ctrl.get);
router.post('/',            requirePermission('create_complaint'),  ctrl.create);
router.patch('/:id/review', requirePermission('manage_complaints'), ctrl.review);
router.patch('/:id/decide', requirePermission('manage_complaints'), ctrl.decide);

module.exports = router;
