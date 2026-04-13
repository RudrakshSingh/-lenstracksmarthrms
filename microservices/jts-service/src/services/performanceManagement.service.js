const PerformanceMetrics = require('../models/PerformanceMetrics.model');
const PerformanceScore = require('../models/PerformanceScore.model');
const PerformanceReview = require('../models/PerformanceReview.model');
const PerformanceAlert = require('../models/PerformanceAlert.model');
const ReviewGoal = require('../models/ReviewGoal.model');
const ReviewAcknowledgment = require('../models/ReviewAcknowledgment.model');
const performanceCalculator = require('./performanceCalculator.service');

class PerformanceManagementService {
  async listMetrics(tenantId, query) {
    const q = { tenant_id: tenantId, period_type: query.period_type || 'DAILY' };
    if (query.employee_id) q.employee_id = query.employee_id;
    return PerformanceMetrics.find(q).sort({ period_start_date: -1 }).limit(Number(query.limit) || 90);
  }

  async listScores(tenantId, query) {
    const q = { tenant_id: tenantId, period_type: query.period_type || 'DAILY' };
    if (query.employee_id) q.employee_id = query.employee_id;
    return PerformanceScore.find(q).sort({ period_start_date: -1 }).limit(Number(query.limit) || 90);
  }

  async runDailyCalculation(tenantId, employeeId, date) {
    return performanceCalculator.calculateDailyPerformance(tenantId, employeeId, new Date(date));
  }

  async listReviews(tenantId, query) {
    const q = { tenant_id: tenantId };
    if (query.employee_id) q.employee_id = query.employee_id;
    if (query.status) q.status = query.status;
    if (query.reviewPeriodOverlaps && query.reviewPeriodOverlaps.start && query.reviewPeriodOverlaps.end) {
      const { start, end } = query.reviewPeriodOverlaps;
      q.$and = (q.$and || []).concat([
        { review_period_start: { $lte: end } },
        { review_period_end: { $gte: start } }
      ]);
    }
    return PerformanceReview.find(q).sort({ review_period_start: -1 }).limit(Number(query.limit) || 50);
  }

  async createReview(tenantId, body) {
    return PerformanceReview.create({ ...body, tenant_id: tenantId });
  }

  async updateReview(tenantId, id, body) {
    const r = await PerformanceReview.findOneAndUpdate(
      { _id: id, tenant_id: tenantId },
      { $set: body },
      { new: true }
    );
    if (!r) throw new Error('JTS_REVIEW_NOT_FOUND');
    return r;
  }

  async deleteReview(tenantId, id) {
    const r = await PerformanceReview.deleteOne({ _id: id, tenant_id: tenantId });
    if (r.deletedCount === 0) throw new Error('JTS_REVIEW_NOT_FOUND');
    await ReviewGoal.deleteMany({ tenant_id: tenantId, review_id: id });
    await ReviewAcknowledgment.deleteMany({ tenant_id: tenantId, review_id: id });
    return { deleted: true };
  }

  async addReviewGoal(tenantId, reviewId, body) {
    return ReviewGoal.create({
      tenant_id: tenantId,
      review_id: reviewId,
      description: body.description,
      metric_target: body.metric_target,
      due_date: body.due_date
    });
  }

  async listReviewGoals(tenantId, reviewId) {
    return ReviewGoal.find({ tenant_id: tenantId, review_id: reviewId });
  }

  async acknowledgeReview(tenantId, reviewId, employeeId, body) {
    const review = await PerformanceReview.findOne({ _id: reviewId, tenant_id: tenantId });
    if (!review) throw new Error('JTS_REVIEW_NOT_FOUND');
    if (String(review.employee_id) !== String(employeeId)) {
      throw new Error('JTS_REVIEW_ACK_FORBIDDEN');
    }

    const ack = await ReviewAcknowledgment.create({
      tenant_id: tenantId,
      review_id: reviewId,
      employee_id: employeeId,
      comments: body.comments
    });

    await PerformanceReview.findByIdAndUpdate(reviewId, {
      $set: {
        status: 'ACKNOWLEDGED',
        employee_acknowledged_at: new Date()
      }
    });

    return ack;
  }

  async listAlerts(tenantId, query) {
    const q = { tenant_id: tenantId };
    if (query.employee_id) q.employee_id = query.employee_id;
    if (query.severity) q.severity = query.severity;
    if (query.created_at && query.created_at.$gte && query.created_at.$lte) {
      q.created_at = query.created_at;
    }
    return PerformanceAlert.find(q).sort({ created_at: -1 }).limit(Number(query.limit) || 100);
  }

  async createAlert(tenantId, body) {
    return PerformanceAlert.create({ ...body, tenant_id: tenantId });
  }

  async resolveAlert(tenantId, id, body) {
    const a = await PerformanceAlert.findOneAndUpdate(
      { _id: id, tenant_id: tenantId },
      {
        $set: {
          resolved_at: new Date(),
          action_taken: body.action_taken || ''
        }
      },
      { new: true }
    );
    if (!a) throw new Error('JTS_ALERT_NOT_FOUND');
    return a;
  }
}

module.exports = new PerformanceManagementService();
