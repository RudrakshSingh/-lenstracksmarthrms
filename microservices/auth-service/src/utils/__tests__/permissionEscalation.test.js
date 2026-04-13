jest.mock('../permissionCache', () => ({
  getRolePermissionsCached: jest.fn().mockResolvedValue(null),
  setRolePermissionsCached: jest.fn().mockResolvedValue(undefined),
  setUserEffectiveCached: jest.fn().mockResolvedValue(undefined),
  invalidateUserPermissionCache: jest.fn().mockResolvedValue(undefined),
  invalidateRolePermissionCache: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../models/Role.model', () => ({
  findOne: jest.fn().mockImplementation((q) => {
    const name = q && q.name;
    const perms =
      name === 'employee'
        ? ['read_users', 'read_attendance']
        : name === 'admin'
          ? ['read_users']
          : [];
    return Promise.resolve({ name, permissions: perms });
  })
}));

const Role = require('../../models/Role.model');
const { assertNoPrivilegeEscalation, previewPrivilegeEscalation } = require('../permissionEscalation');

describe('assertNoPrivilegeEscalation', () => {
  beforeEach(() => {
    Role.findOne.mockClear();
  });

  test('superadmin always allowed', async () => {
    const target = {
      role: 'employee',
      custom_permissions: [],
      permission_denials: [],
      permissions: [],
      toObject() {
        return { role: 'employee', custom_permissions: [], permission_denials: [], permissions: [] };
      }
    };
    await expect(
      assertNoPrivilegeEscalation({
        actorRole: 'superadmin',
        actorEffectivePermissions: [],
        targetUserDoc: target,
        nextCustom: ['read_reports'],
        nextDeny: []
      })
    ).resolves.toBeUndefined();
  });

  test('employee cannot grant permission they do not have', async () => {
    const target = {
      role: 'employee',
      custom_permissions: [],
      permission_denials: [],
      permissions: [],
      toObject() {
        return { role: 'employee', custom_permissions: [], permission_denials: [], permissions: [] };
      }
    };
    await expect(
      assertNoPrivilegeEscalation({
        actorRole: 'employee',
        actorEffectivePermissions: ['read_attendance'],
        targetUserDoc: target,
        nextCustom: ['system_admin'],
        nextDeny: []
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test('preview returns allowed false without throwing', async () => {
    const target = {
      role: 'employee',
      custom_permissions: [],
      permission_denials: [],
      permissions: [],
      toObject() {
        return { role: 'employee', custom_permissions: [], permission_denials: [], permissions: [] };
      }
    };
    const r = await previewPrivilegeEscalation({
      actorRole: 'employee',
      actorEffectivePermissions: ['read_attendance'],
      targetUserDoc: target,
      nextCustom: ['system_admin'],
      nextDeny: []
    });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe('PERMISSION_ESCALATION');
    expect(r.blockingPermission).toBe('system_admin');
  });
});
