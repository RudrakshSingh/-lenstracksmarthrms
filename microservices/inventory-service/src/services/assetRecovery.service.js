const Asset = require('../models/Asset.model');
const logger = require('../config/logger');

/**
 * Asset Recovery Service
 * Handles asset recovery operations
 */
class AssetRecoveryService {
  /**
   * Initiate asset recovery process
   * @param {string} assetId - Asset ID
   * @param {Object} recoveryData - Recovery data
   * @param {string} initiatedBy - User ID who initiated recovery
   * @returns {Object} Recovery result
   */
  async initiateRecovery(assetId, recoveryData, initiatedBy) {
    try {
      const asset = await Asset.findById(assetId);
      
      if (!asset) {
        throw new Error('Asset not found');
      }

      if (asset.status !== 'issued') {
        throw new Error('Asset must be issued before recovery can be initiated');
      }

      // Update asset with recovery information
      asset.recovery = {
        status: 'initiated',
        initiated_at: new Date(),
        initiated_by: initiatedBy,
        expected_return_date: recoveryData.expectedReturnDate || new Date(),
        recovery_reason: recoveryData.reason || 'Standard recovery',
        notes: recoveryData.notes || ''
      };

      asset.status = 'recovery_pending';
      await asset.save();

      logger.info('Asset recovery initiated', { assetId, initiatedBy });

      return {
        success: true,
        assetId: asset._id,
        recoveryId: asset.recovery._id,
        status: asset.recovery.status,
        expectedReturnDate: asset.recovery.expected_return_date
      };
    } catch (error) {
      logger.error('Error initiating asset recovery:', error);
      throw error;
    }
  }

  /**
   * Process recovery payment
   * @param {string} assetId - Asset ID
   * @param {Object} paymentData - Payment data
   * @param {string} processedBy - User ID who processed payment
   * @returns {Object} Payment processing result
   */
  async processRecoveryPayment(assetId, paymentData, processedBy) {
    try {
      const asset = await Asset.findById(assetId);
      
      if (!asset) {
        throw new Error('Asset not found');
      }

      if (!asset.recovery || asset.recovery.status !== 'initiated') {
        throw new Error('Recovery must be initiated before processing payment');
      }

      // Update recovery with payment information
      asset.recovery.payment = {
        amount: paymentData.amount || 0,
        payment_method: paymentData.paymentMethod || 'cash',
        payment_date: new Date(),
        processed_by: processedBy,
        transaction_id: paymentData.transactionId || '',
        notes: paymentData.notes || ''
      };

      asset.recovery.status = 'payment_processed';
      await asset.save();

      logger.info('Asset recovery payment processed', { assetId, processedBy, amount: paymentData.amount });

      return {
        success: true,
        assetId: asset._id,
        paymentAmount: asset.recovery.payment.amount,
        paymentDate: asset.recovery.payment.payment_date
      };
    } catch (error) {
      logger.error('Error processing recovery payment:', error);
      throw error;
    }
  }

  /**
   * Cancel recovery process
   * @param {string} assetId - Asset ID
   * @param {string} reason - Cancellation reason
   * @param {string} cancelledBy - User ID who cancelled recovery
   * @returns {Object} Cancellation result
   */
  async cancelRecovery(assetId, reason, cancelledBy) {
    try {
      const asset = await Asset.findById(assetId);
      
      if (!asset) {
        throw new Error('Asset not found');
      }

      if (!asset.recovery) {
        throw new Error('No recovery process found for this asset');
      }

      // Update recovery with cancellation information
      asset.recovery.status = 'cancelled';
      asset.recovery.cancelled_at = new Date();
      asset.recovery.cancelled_by = cancelledBy;
      asset.recovery.cancellation_reason = reason || 'Recovery cancelled';

      // Revert asset status
      asset.status = 'issued';
      await asset.save();

      logger.info('Asset recovery cancelled', { assetId, cancelledBy, reason });

      return {
        success: true,
        assetId: asset._id,
        status: asset.recovery.status,
        cancelledAt: asset.recovery.cancelled_at
      };
    } catch (error) {
      logger.error('Error cancelling recovery:', error);
      throw error;
    }
  }

  /**
   * Get recovery statistics
   * @returns {Object} Recovery statistics
   */
  async getRecoveryStatistics() {
    try {
      const totalRecoveries = await Asset.countDocuments({
        'recovery.status': { $exists: true }
      });

      const initiatedRecoveries = await Asset.countDocuments({
        'recovery.status': 'initiated'
      });

      const paymentProcessed = await Asset.countDocuments({
        'recovery.status': 'payment_processed'
      });

      const completedRecoveries = await Asset.countDocuments({
        'recovery.status': 'completed'
      });

      const cancelledRecoveries = await Asset.countDocuments({
        'recovery.status': 'cancelled'
      });

      // Calculate total recovery amount
      const assetsWithPayment = await Asset.find({
        'recovery.payment.amount': { $exists: true }
      });

      const totalRecoveryAmount = assetsWithPayment.reduce((sum, asset) => {
        return sum + (asset.recovery.payment?.amount || 0);
      }, 0);

      return {
        total: totalRecoveries,
        initiated: initiatedRecoveries,
        payment_processed: paymentProcessed,
        completed: completedRecoveries,
        cancelled: cancelledRecoveries,
        total_recovery_amount: totalRecoveryAmount
      };
    } catch (error) {
      logger.error('Error getting recovery statistics:', error);
      throw error;
    }
  }
}

module.exports = new AssetRecoveryService();

