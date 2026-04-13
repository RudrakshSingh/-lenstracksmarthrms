/**
 * Pure merge: role ∪ custom ∪ legacy \ deny
 */
function computeEffectiveSets({
  rolePermissions = [],
  custom_permissions = [],
  permission_denials = [],
  legacyUserPermissions = []
}) {
  const allow = new Set(rolePermissions);
  for (const p of custom_permissions || []) {
    if (p) allow.add(String(p).trim());
  }
  for (const p of legacyUserPermissions || []) {
    if (p) allow.add(String(p).trim());
  }
  const deny = new Set((permission_denials || []).map((p) => String(p).trim()).filter(Boolean));
  const effective = [...allow].filter((p) => !deny.has(p));
  effective.sort();
  return { effective, allow: [...allow].sort(), deny: [...deny].sort() };
}

module.exports = { computeEffectiveSets };
