jest.mock('axios');
jest.mock('../../config/logger', () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
}));

const axios = require('axios');
const {
  getMyTaskSummary,
  getJtsAnalytics,
  getTaskSummaryForEmployee
} = require('../jtsServiceClient');

describe('jtsServiceClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JTS_SERVICE_URL = 'http://jts-service:3018';
  });

  it('getMyTaskSummary returns parsed body on success', async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, data: { total: 3, inProgress: 1, completed: 2, linked: true } }
    });
    const out = await getMyTaskSummary({
      authorization: 'Bearer t',
      tenantId: '507f1f77bcf86cd799439011'
    });
    expect(out.success).toBe(true);
    expect(out.data.total).toBe(3);
    expect(axios.get).toHaveBeenCalledWith(
      'http://jts-service:3018/api/jts/tasks/summary/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer t',
          'X-Tenant-Id': '507f1f77bcf86cd799439011'
        })
      })
    );
  });

  it('getMyTaskSummary returns null without authorization', async () => {
    const out = await getMyTaskSummary({});
    expect(out).toBeNull();
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('getJtsAnalytics returns null on axios error', async () => {
    axios.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const out = await getJtsAnalytics({ authorization: 'Bearer x', tenantId: 't1' });
    expect(out).toBeNull();
  });

  it('getTaskSummaryForEmployee builds URL with id', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true } });
    await getTaskSummaryForEmployee('507f1f77bcf86cd799439012', {
      authorization: 'Bearer z',
      tenantId: '507f1f77bcf86cd799439011'
    });
    expect(axios.get).toHaveBeenCalledWith(
      'http://jts-service:3018/api/jts/tasks/summary/507f1f77bcf86cd799439012',
      expect.any(Object)
    );
  });
});
