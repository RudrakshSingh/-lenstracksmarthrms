const PREFIX = 'etelios:perm:v1';

function userEffectiveKey(userId, revision) {
  return `${PREFIX}:eff:${String(userId)}:${Number(revision) || 0}`;
}

function userEffectivePattern(userId) {
  return `${PREFIX}:eff:${String(userId)}:*`;
}

function rolePermsKey(roleName) {
  return `${PREFIX}:role:${String(roleName || '').toLowerCase()}`;
}

module.exports = {
  PREFIX,
  userEffectiveKey,
  userEffectivePattern,
  rolePermsKey
};
