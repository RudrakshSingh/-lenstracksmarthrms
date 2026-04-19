# Frontend Auth Token Mismatch Guardrails (RBAC/JTS/HR APIs)

**Audience:** Frontend developers  
**Problem this solves:** Same request me different identities bhejna (e.g. `Authorization` token = Admin, cookie token = Manager), jisse RBAC behavior unpredictable lagta hai.

---

## 1) Issue summary (real-world pattern)

A request can accidentally carry:

- `Authorization: Bearer <token-A>`
- `Cookie: access_token=<token-B>`

Agar `token-A` aur `token-B` alag users ke hain, to frontend ek user sochti hai, backend dusre user ke context me execute karta hai.

Result:

- wrong permissions visible,
- unexpected allow/deny,
- “backend bug” jaisa symptom,
- security risk (privileged token leak impact).

---

## 2) Root cause ownership

### Primary
- Frontend/session layer sending mixed auth context.

### Secondary hardening
- Backend should document precedence and optionally reject mixed-identity requests.

---

## 3) Golden rule (must follow)

**One request = one identity source.**

Choose one model per app/runtime:

1. **Bearer-only model** (recommended for SPA/API clients), or
2. **Cookie session-only model** (server-driven auth)

Do not rely on both simultaneously unless they are guaranteed to represent the same user.

---

## 4) Expected precedence contract (backend integration note)

Backend teams usually prioritize:

1. `Authorization` header
2. fallback to cookie token

Frontend must assume `Authorization` wins unless explicitly documented otherwise.

---

## 5) Frontend guardrails checklist

## 5.1 Request construction
- API interceptor me always use a single token source.
- If bearer is present, avoid sending stale auth cookie to same API domain where possible.
- Do not hardcode tokens in dev scripts/tools while browser session is active.

## 5.2 Mismatch detector
- Decode bearer token and cookie token (if both exist).
- Compare at least:
  - `userId`
  - `role`
  - `tenantId`
- If mismatch:
  - block request,
  - clear session,
  - force re-login,
  - show user-safe message.

## 5.3 RBAC debugging telemetry
- Log (dev mode only):
  - request path
  - auth source used (`bearer`/`cookie`)
  - token `userId`/`role`/`tenantId`
- Never log full token string.

## 5.4 Tenant consistency
- Ensure `X-Tenant-Id` matches JWT tenant claim.
- If tenant slug vs ObjectId handling differs across services, normalize before sending.

---

## 6) Recommended frontend error messages

Use clean, non-sensitive messages:

- **Session conflict detected. Please sign in again.**
- **Your login context changed. Reload and retry.**

Avoid exposing raw JWT details in UI.

---

## 7) Example pseudo-logic for interceptor

```ts
const bearer = getBearerToken();
const cookieToken = getCookieToken("access_token");

if (bearer && cookieToken) {
  const a = decodeJwtSafe(bearer);
  const b = decodeJwtSafe(cookieToken);
  const mismatch =
    a?.userId !== b?.userId ||
    a?.role !== b?.role ||
    String(a?.tenantId || "") !== String(b?.tenantId || "");

  if (mismatch) {
    clearAuthState();
    throw new Error("SESSION_TOKEN_MISMATCH");
  }
}

// choose one source only
if (bearer) req.headers.Authorization = `Bearer ${bearer}`;
req.headers["X-Tenant-Id"] = currentTenantId;
```

---

## 8) QA scenarios (must test)

1. Login as admin -> logout -> login as manager in same browser: verify no stale admin bearer remains.
2. Open two tabs, switch account in one tab: verify second tab detects mismatch and refreshes session.
3. Role change by admin mid-session: verify refresh flow updates token claims.
4. API calls to HR/JTS/Permission endpoints all use same identity.

---

## 9) Security response for leaked token in logs/chat

If any raw token is exposed:

1. Rotate/revoke token/session immediately.
2. Invalidate refresh token.
3. Ask user to re-login.
4. Remove token from docs/chats/issues.

---

## 10) Practical conclusion

Most “random RBAC issue” cases are not core backend authorization bugs; they are **frontend identity source conflicts**.  
Fixing token-source discipline and mismatch guards removes a large class of permission bugs across HR, JTS, and finance modules.

---

## 11) Real-case troubleshooting (employee detail 200 vs 404)

### Observed pattern

- `GET /api/hr/employees/69c11ae120e79851a6bffea9` -> `success: true`
- `GET /api/hr/employees/69c136e020e79851a6c0008e` -> `success: false`, `"Employee not found in backend"`

### Correct interpretation

- Endpoint is working (first call proves service path and auth flow are fine).
- Second ID is missing/invalid for current data scope.
- This is **not** a permission denial (`403`) and **not** auth failure (`401`).

### Frontend handling rule

When employee detail returns not found:

1. Show user-safe message: **"Employee not found or no longer available."**
2. Refetch employee list and verify the ID still exists.
3. If not present, navigate back to list and clear stale detail state.
4. Do not classify this as RBAC bug unless status/code explicitly indicates permission error.

### Additional guard (recommended)

If the app sends both bearer + cookie tokens, validate identity match before request; otherwise a valid ID in one session can appear missing in another context.
