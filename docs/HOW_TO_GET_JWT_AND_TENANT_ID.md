# How to get JWT (`TOKEN`) and tenant id (`TENANT_ID`)

I can’t fetch these for you automatically — they come from **your** auth service after a real login.

## 1) Login (auth-service)

Gateway or auth base URL + path:

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "user@lenstrack.com", "password": "your-password" }
```

`email` can be replaced with `emailOrEmployeeId` if you log in with employee code.

### Example with `curl`

```bash
AUTH_BASE="https://YOUR_GATEWAY_OR_AUTH_HOST"   # e.g. https://api.etelios.com

RESP=$(curl -sS -X POST "$AUTH_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}')

echo "$RESP" | jq .
```

## 2) Read `accessToken` and tenant id from the response

Auth returns something like:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "...",
    "user": {
      "tenantId": "64abc...",
      "employee_id": "...",
      ...
    }
  }
}
```

Extract with `jq`:

```bash
export TOKEN=$(echo "$RESP" | jq -r '.data.accessToken')
export TENANT_ID=$(echo "$RESP" | jq -r '.data.user.tenantId // .data.user.tenant_id // empty')
echo "TOKEN length: ${#TOKEN}"
echo "TENANT_ID: $TENANT_ID"
```

Use **`TENANT_ID`** as `X-Tenant-Id` when you send that header — it **must match** the tenant inside the JWT (JTS enforces this).

## 3) Optional: read claims from the JWT (no verify)

Payload is the **middle** segment of `eyJ...` (base64url). Quick decode:

```bash
node -e "
const t=process.argv[1];
const p=JSON.parse(Buffer.from(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'),'base64').toString());
console.log(p);
" "$TOKEN"
```

Look for `tenantId` (auth-service puts this in the token).

## 4) Call JTS with real data

```bash
export BASE_URL="https://YOUR_GATEWAY"   # must resolve in DNS — not literal ...

curl -i -sS \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID" \
  "$BASE_URL/api/jts/tasks?page=1&limit=5"
```

## 5) If JTS returns `401 Invalid token`

**Auth and JTS must use the same `JWT_SECRET`** (and compatible signing) in that environment.  
If secrets differ, login succeeds but JTS rejects the token.

- Auth: `microservices/auth-service` → `JWT_SECRET`
- JTS: `microservices/jts-service` → `JWT_SECRET` or `JTS_JWT_SECRET`

## 6) If JTS returns `403 JTS_TENANT_REQUIRED`

The JWT must include a **Mongo ObjectId** tenant (claim `tenantId` / `tid` / `tenant_id`).  
Fix the user record in auth DB or token issuer so `tenantId` is set.

---

After you have real `BASE_URL`, `TOKEN`, and `TENANT_ID`, use:  
`docs/JTS_REAL_DATA_VALIDATION_10_CALLS.md` for the full checklist.
