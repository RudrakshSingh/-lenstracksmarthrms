const mongoose = require('mongoose');
const { evaluateLeaveRequestForCreate } = require('../leavePolicyEvaluator');

function employeeFixture(overrides = {}) {
  const id = new mongoose.Types.ObjectId();
  return {
    _id: id,
    tenantId: 'acme',
    department: 'HR',
    workLocation: { city: 'Mumbai' },
    doj: new Date('2020-01-01'),
    confirmationDate: new Date('2020-06-01'),
    ...overrides
  };
}

function policyFixture() {
  return {
    tenant_criteria: {
      working_day_calculation: 'CALENDAR_DAYS',
      weekend_definition: 'SAT_SUN',
      allow_leave_on_weekly_off: true,
      allow_leave_on_public_holiday: true
    },
    leave_types: [
      {
        leave_type: 'CL',
        days_per_year: 12,
        medical_certificate_required: false,
        medical_certificate_after_days: 0,
        half_day_allowed: true,
        min_notice_days: 0,
        special_rules: { maxContinuous: 5, active: true }
      }
    ]
  };
}

describe('leavePolicyEvaluator', () => {
  test('half-day requires slot and single day', async () => {
    const Holiday = { find: jest.fn().mockReturnValue({ select: () => ({ lean: jest.fn().mockResolvedValue([]) }) }) };
    const LeaveRequest = { findOne: jest.fn().mockResolvedValue(null) };

    await expect(
      evaluateLeaveRequestForCreate({
        employee: employeeFixture(),
        request: {
          leave_type: 'CL',
          from_date: new Date('2026-04-01'),
          to_date: new Date('2026-04-02'),
          half_day: true,
          half_day_type: 'FIRST_HALF',
          attachments: []
        },
        policy: policyFixture(),
        tenantId: 'acme',
        HolidayModel: Holiday,
        LeaveRequestModel: LeaveRequest
      })
    ).rejects.toMatchObject({ code: 'HALF_DAY_RANGE' });
  });

  test('overlap is rejected', async () => {
    const Holiday = { find: jest.fn().mockReturnValue({ select: () => ({ lean: jest.fn().mockResolvedValue([]) }) }) };
    const LeaveRequest = { findOne: jest.fn().mockResolvedValue({ _id: 'x', status: 'PENDING' }) };

    await expect(
      evaluateLeaveRequestForCreate({
        employee: employeeFixture(),
        request: {
          leave_type: 'CL',
          from_date: new Date('2026-04-01'),
          to_date: new Date('2026-04-01'),
          half_day: false,
          attachments: []
        },
        policy: policyFixture(),
        tenantId: 'acme',
        HolidayModel: Holiday,
        LeaveRequestModel: LeaveRequest
      })
    ).rejects.toMatchObject({ code: 'LEAVE_OVERLAP' });
  });

  test('working-day mode excludes weekends', async () => {
    const Holiday = { find: jest.fn().mockReturnValue({ select: () => ({ lean: jest.fn().mockResolvedValue([]) }) }) };
    const LeaveRequest = { findOne: jest.fn().mockResolvedValue(null) };

    const policy = policyFixture();
    policy.tenant_criteria.working_day_calculation = 'WORKING_DAYS_EX_WEEKENDS_AND_HOLIDAYS';

    // Mon 2026-04-06 to Fri 2026-04-10 => 5 working days
    const r = await evaluateLeaveRequestForCreate({
      employee: employeeFixture(),
      request: {
        leave_type: 'CL',
        from_date: new Date('2026-04-06'),
        to_date: new Date('2026-04-10'),
        half_day: false,
        attachments: []
      },
      policy,
      tenantId: 'acme',
      HolidayModel: Holiday,
      LeaveRequestModel: LeaveRequest
    });
    expect(r.days).toBe(5);
  });
});
