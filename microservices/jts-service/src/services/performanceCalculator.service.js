const PerformanceMetrics = require('../models/PerformanceMetrics.model');
const PerformanceScore = require('../models/PerformanceScore.model');
const Task = require('../models/Task.model');
const TaskTimer = require('../models/TaskTimer.model');
const SlaBreachLog = require('../models/SlaBreachLog.model');
const TaskQualityRating = require('../models/TaskQualityRating.model');
const logger = require('../config/logger');

class PerformanceCalculatorService {
  /**
   * Calculate daily performance for an employee
   */
  async calculateDailyPerformance(tenantId, employeeId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Gather metrics
    const metrics = await this.gatherDailyMetrics(tenantId, employeeId, startOfDay, endOfDay);

    // Calculate component scores
    const completionScore = this.calculateCompletionScore(metrics);
    const slaScore = this.calculateSlaScore(metrics);
    const qualityScore = this.calculateQualityScore(metrics);
    const efficiencyScore = this.calculateEfficiencyScore(metrics);
    const reliabilityScore = this.calculateReliabilityScore(metrics);

    // Calculate total
    const total = completionScore + slaScore + qualityScore + efficiencyScore + reliabilityScore;

    // Determine grade and tier
    const grade = this.determineGrade(total);
    const tier = this.determineTier(total);

    // Upsert performance metrics
    await PerformanceMetrics.findOneAndUpdate(
      {
        tenant_id: tenantId,
        employee_id: employeeId,
        period_type: 'DAILY',
        period_start_date: startOfDay
      },
      {
        ...metrics,
        period_end_date: endOfDay
      },
      { upsert: true, new: true }
    );

    // Upsert performance score
    await PerformanceScore.findOneAndUpdate(
      {
        tenant_id: tenantId,
        employee_id: employeeId,
        period_type: 'DAILY',
        period_start_date: startOfDay
      },
      {
        period_end_date: endOfDay,
        completion_score: completionScore,
        sla_score: slaScore,
        quality_score: qualityScore,
        efficiency_score: efficiencyScore,
        reliability_score: reliabilityScore,
        total_performance_score: total,
        performance_grade: grade,
        performance_tier: tier,
        calculated_at: new Date()
      },
      { upsert: true, new: true }
    );

    return { total, grade, tier, scores: { completionScore, slaScore, qualityScore, efficiencyScore, reliabilityScore } };
  }

  /**
   * Gather daily metrics
   */
  async gatherDailyMetrics(tenantId, employeeId, startDate, endDate) {
    // Get tasks
    const tasks = await Task.find({
      tenant_id: tenantId,
      assigned_to_employee_id: employeeId,
      created_at: { $gte: startDate, $lte: endDate }
    });

    const totalAssigned = tasks.length;
    const totalCompleted = tasks.filter(t => t.status === 'COMPLETED').length;
    const totalRejected = tasks.filter(t => t.status === 'REJECTED').length;
    const completionRate = totalAssigned > 0 ? totalCompleted / totalAssigned : 0;

    // SLA compliance
    const tasksWithinSla = tasks.filter(t => {
      if (t.status !== 'COMPLETED') return false;
      return t.completed_at && t.completed_at <= t.due_at;
    }).length;

    const tasksBreachedSla = await SlaBreachLog.countDocuments({
      tenant_id: tenantId,
      employee_id: employeeId,
      created_at: { $gte: startDate, $lte: endDate }
    });

    const slaComplianceRate = totalCompleted > 0 ? tasksWithinSla / totalCompleted : 0;

    // Quality ratings
    const ratings = await TaskQualityRating.find({
      tenant_id: tenantId,
      task_id: { $in: tasks.map(t => t._id) }
    });

    const avgQualityRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.quality_score, 0) / ratings.length
      : 0;

    // Timer usage
    const timers = await TaskTimer.find({
      tenant_id: tenantId,
      employee_id: employeeId,
      started_at: { $gte: startDate, $lte: endDate }
    });

    const totalHoursLogged = timers.reduce((sum, t) => sum + (t.duration_seconds || 0), 0) / 3600;
    const timerUsageRate = totalAssigned > 0 ? timers.length / totalAssigned : 0;

    return {
      completionRate,
      slaComplianceRate,
      avgQualityRating,
      reworkRate: 0.05, // Placeholder
      timerUtilizationRate: timerUsageRate,
      avgCompletionTimeVsBenchmark: 0.9, // Placeholder
      escalationRate: 0.02, // Placeholder
      consistencyScore: 0.95, // Placeholder
      total_tasks_assigned: totalAssigned,
      total_tasks_completed: totalCompleted,
      total_tasks_rejected: totalRejected,
      tasks_within_sla: tasksWithinSla,
      tasks_breached_sla: tasksBreachedSla,
      total_hours_logged: totalHoursLogged
    };
  }

  calculateCompletionScore(metrics) {
    return Math.round(metrics.completionRate * 25);
  }

  calculateSlaScore(metrics) {
    return Math.round(metrics.slaComplianceRate * 30);
  }

  calculateQualityScore(metrics) {
    const base = ((metrics.avgQualityRating - 1) / 4) * 20;
    const reworkPenalty = Math.min(metrics.reworkRate * 50, 5);
    return Math.max(0, base + (5 - reworkPenalty));
  }

  calculateEfficiencyScore(metrics) {
    let timeScore = (2 - metrics.avgCompletionTimeVsBenchmark) * 7.5;
    timeScore = Math.max(0, Math.min(10, timeScore));
    let utilScore = (1 - Math.abs(metrics.timerUtilizationRate - 0.8)) * 5;
    utilScore = Math.max(0, Math.min(5, utilScore));
    return timeScore + utilScore;
  }

  calculateReliabilityScore(metrics) {
    const escPenalty = Math.min(metrics.escalationRate * 50, 2.5);
    const base = metrics.consistencyScore * 5;
    return Math.max(0, Math.min(5, base - escPenalty));
  }

  determineGrade(total) {
    if (total >= 95) return 'A+';
    if (total >= 90) return 'A';
    if (total >= 85) return 'B+';
    if (total >= 80) return 'B';
    if (total >= 75) return 'C+';
    if (total >= 70) return 'C';
    if (total >= 60) return 'D';
    return 'F';
  }

  determineTier(total) {
    if (total >= 90) return 'EXCELLENT';
    if (total >= 80) return 'GOOD';
    if (total >= 70) return 'AVERAGE';
    if (total >= 60) return 'BELOW_AVERAGE';
    return 'POOR';
  }
}

module.exports = new PerformanceCalculatorService();

