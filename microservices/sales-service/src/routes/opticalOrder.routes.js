const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/opticalOrderController');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/customer/:customerId',   requirePermission('view_optical_orders'), ctrl.byCustomer);
router.get('/',                       requirePermission('view_optical_orders'), ctrl.list);
router.get('/:id',                    requirePermission('view_optical_orders'), ctrl.get);
router.post('/',                      requirePermission('create_optical_orders'), ctrl.create);
router.patch('/:id/status',           requirePermission('update_optical_orders'), ctrl.updateStatus);
router.patch('/:id/payment',          requirePermission('update_optical_orders'), ctrl.addPayment);
router.patch('/:id/cancel',           requirePermission('update_optical_orders'), ctrl.cancel);

module.exports = router;
