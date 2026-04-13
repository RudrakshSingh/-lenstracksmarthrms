const { computeEffectiveSets } = require('@etelios/shared/utils/permissionCore');

describe('computeEffectiveSets', () => {
  test('role union custom minus deny plus legacy', () => {
    const { effective } = computeEffectiveSets({
      rolePermissions: ['read_users', 'read_reports'],
      custom_permissions: ['write_users'],
      permission_denials: ['read_reports'],
      legacyUserPermissions: ['export_reports']
    });
    expect(effective.sort()).toEqual(
      ['export_reports', 'read_users', 'write_users'].sort()
    );
  });

  test('deny removes legacy grant', () => {
    const { effective } = computeEffectiveSets({
      rolePermissions: [],
      custom_permissions: [],
      permission_denials: ['read_users'],
      legacyUserPermissions: ['read_users']
    });
    expect(effective).toEqual([]);
  });
});
