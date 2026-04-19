/**
 * Whether to embed `permissions: string[]` in the access JWT.
 *
 * Browsers typically cap cookies at ~4096 bytes per cookie; a large permission
 * catalog in the JWT breaks `Set-Cookie` for access_token.
 *
 * On login/refresh we still:
 * - return full effective permissions on `user` in the JSON body, and
 * - populate Redis via resolveEffectivePermissionsForUser → setUserEffectiveCached (permRev).
 *
 * Opt-in to large JWTs (legacy clients): JWT_INCLUDE_PERMISSIONS_CLAIM=1
 * Explicit omit (same as default): JWT_SKIP_PERMISSIONS_CLAIM=1
 */
function jwtPermissionsPayloadEnabled() {
  if (
    process.env.JWT_INCLUDE_PERMISSIONS_CLAIM === 'true' ||
    process.env.JWT_INCLUDE_PERMISSIONS_CLAIM === '1'
  ) {
    return true;
  }
  if (
    process.env.JWT_SKIP_PERMISSIONS_CLAIM === 'true' ||
    process.env.JWT_SKIP_PERMISSIONS_CLAIM === '1'
  ) {
    return false;
  }
  // Default: omit permissions from JWT (cookie-safe); use Redis + login response.
  return false;
}

module.exports = { jwtPermissionsPayloadEnabled };
