const RecruitmentJob = require('../models/RecruitmentJob.model');
const logger = require('../config/logger');
const { sendSuccess, sendError, createPagination, parsePagination } = require('../../../shared/utils/response.util.js');

/**
 * Get recruitment jobs
 * GET /api/hr/recruitment/jobs
 */
const getRecruitmentJobs = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { status, department, jobType } = req.query;

    const query = {};
    if (status) query.status = status;
    if (department) query.department = department;
    if (jobType) query.jobType = jobType;

    const jobs = await RecruitmentJob.find(query)
      .sort({ postedDate: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await RecruitmentJob.countDocuments(query);
    const pagination = createPagination(page, limit, total);

    return sendSuccess(res, jobs, 'Recruitment jobs retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getRecruitmentJobs', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve recruitment jobs', 'Internal server error', 500);
  }
};

module.exports = {
  getRecruitmentJobs
};

