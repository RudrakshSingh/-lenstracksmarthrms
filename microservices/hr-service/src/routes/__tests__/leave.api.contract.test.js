/**
 * Contract smoke tests for leave routes (no real MongoDB).
 * Run: cd microservices/hr-service && npm test -- leave.api.contract
 */

process.env.TEST_MODE = 'true';

jest.mock('../../middleware/auth.middleware', () => {
  const mongoose = require('mongoose');
  return {
    authenticate: (req, res, next) => {
      const id = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
      req.user = {
        _id: id,
        id: id.toString(),
        role: 'HR',
        employeeId: 'EMP001',
        email: 'hr@test.com'
      };
      req.tenantId = 'default';
      next();
    }
  };
});

jest.mock('../../models/User.model', () => ({
  findOne: jest.fn(),
  find: jest.fn()
}));

jest.mock('../../models/LeaveRequest.model', () => ({
  find: jest.fn(() => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([])
  })),
  countDocuments: jest.fn().mockResolvedValue(0),
  findById: jest.fn(() => ({
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(null)
  }))
}));

jest.mock('../../models/LeavePolicy.model', () => ({
  findOne: jest.fn().mockResolvedValue(null)
}));

jest.mock('../../models/LeaveLedger.model', () => ({
  find: jest.fn(() => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([])
  })),
  countDocuments: jest.fn().mockResolvedValue(0)
}));

jest.mock('../../services/leaveManagement.service', () => ({
  getLeavePolicyForEmployee: jest.fn().mockResolvedValue(null),
  getHolidays: jest.fn().mockResolvedValue([]),
  getBlackoutPeriods: jest.fn().mockResolvedValue([]),
  getLeaveWorkflow: jest.fn().mockResolvedValue({}),
  getLeaveReports: jest.fn().mockResolvedValue({}),
  getLeaveNotificationSettings: jest.fn().mockResolvedValue({})
}));

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const User = require('../../models/User.model');
const LeaveRequest = require('../../models/LeaveRequest.model');

describe('Leave APIs (mocked persistence)', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    const leaveRoutes = require('../leave.routes.js');
    app.use('/api/hr', leaveRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const empId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439012');
    User.findOne.mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue({
        _id: empId,
        employeeId: 'EMP001',
        tenantId: 'default'
      })
    }));
    User.find.mockImplementation(() => ({
      select: jest.fn().mockResolvedValue([{ _id: empId }])
    }));
    LeaveRequest.find.mockImplementation(() => ({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([])
    }));
    LeaveRequest.countDocuments.mockResolvedValue(0);
  });

  it('GET /api/hr/leave returns 200 with requests array', async () => {
    const res = await request(app)
      .get('/api/hr/leave')
      .set('X-Tenant-Id', 'default')
      .query({ page: 1, limit: 5 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.requests)).toBe(true);
  });

  it('GET /api/hr/leave-requests returns 200', async () => {
    const res = await request(app)
      .get('/api/hr/leave-requests')
      .set('X-Tenant-Id', 'default');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/hr/leave-requests rejects invalid leave_type', async () => {
    const res = await request(app)
      .post('/api/hr/leave-requests')
      .set('X-Tenant-Id', 'default')
      .send({
        leave_type: 'INVALID',
        from_date: '2026-06-01',
        to_date: '2026-06-02',
        reason: 'test'
      });

    expect(res.status).toBe(400);
  });
});
