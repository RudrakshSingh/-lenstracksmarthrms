# JTS Service Environment Variables

**Where this runs:** Etelios production is intended for **AWS** (e.g. **EKS/ECS**, **Application Load Balancer** or **Ingress Controller**, **DocumentDB/RDS** or self-managed Mongo). Docker images and ingress rules should be wired there. If your **Git remote** is Azure DevOps (or GitHub), that only hosts source control — it is not the cloud where pods run.

## Tenant isolation (required for production)

- JWT must include a valid Mongo **tenant id** (`tid` / `tenant_id` / `tenantId`). Missing → `403 JTS_TENANT_REQUIRED`.
- If the client sends **`X-Tenant-Id`**, it **must equal** the tenant in the JWT → else `403 JTS_TENANT_HEADER_MISMATCH`.
- Data queries use **`req.user.tenant_id` only**; request bodies cannot switch tenants.
- **`GET /.../catalog/tenants`**: non-platform roles only see their own tenant; **`SUPERADMIN`** / **`ADMIN`** may list all.
- **`POST` / `PATCH /.../catalog/tenants`**: only **`SUPERADMIN`** / **`ADMIN`**. Other roles cannot create or patch arbitrary tenants.

`TEST_MODE=true` skips tenant checks (local tests only — never in production).

## Notifications and AWS

Set the following in your deployment environment:

```bash
NOTIFICATION_PROVIDER_MODE=aws
NOTIFICATION_REALTIME_DISPATCH=true
# Push in-app events to realtime-service (Socket.IO). Set false to disable.
NOTIFICATION_REALTIME_SOCKET=true
# In-cluster URL (port must match realtime Service, e.g. 3017 in etelios-prod)
REALTIME_SERVICE_URL=http://realtime-service:3017

AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
# Optional if using temporary credentials
AWS_SESSION_TOKEN=

SES_FROM_EMAIL=no-reply@etelios.com
# If you created an SES configuration set named "etelios", set it here
SES_CONFIGURATION_SET=etelios
# Optional: only needed in advanced identity/cross-account setups
SES_FROM_EMAIL_IDENTITY_ARN=
SES_REPLY_TO_EMAIL=support@etelios.com
SNS_SMS_SENDER_ID=JTS
SNS_SMS_TYPE=Transactional
```

## IAM permissions required

Attach a policy (or equivalent) allowing:

- `ses:SendEmail`
- `ses:SendRawEmail` (optional but recommended)
- `sns:Publish`

## Recommended runtime setup

- On AWS ECS/EKS/EC2, prefer IAM roles over static keys.
- Keep `NOTIFICATION_REALTIME_DISPATCH=true` for fast delivery.
- Keep dispatcher job enabled for retries and queue draining.

## Task attachments (S3 presign)

Uses the same AWS credentials / region as SES where possible.

```bash
# Bucket for presigned PUT/GET (falls back to AWS_S3_BUCKET / S3_BUCKET_NAME)
JTS_ATTACHMENTS_S3_BUCKET=your-bucket
JTS_ATTACHMENTS_S3_PREFIX=jts-attachments
JTS_ATTACHMENT_UPLOAD_TTL_SEC=900
JTS_ATTACHMENT_DOWNLOAD_TTL_SEC=300
```

Flow: `POST .../attachments/presign-upload` → client **PUT** to `upload_url` → `POST .../attachments` with `file_key` and metadata.

Optional direct signed URLs for UI list/detail:
- `GET .../tasks/:taskId/attachments?include_signed_urls=true`
- `GET .../tasks/:id?include_attachment_signed_urls=true`
- `GET .../tasks?include_attachment_signed_urls=true`

## Attendance integration (timers)

When `ATTENDANCE_SERVICE_URL` is set (e.g. `http://attendance-service:3003`), starting a task timer calls `GET /api/attendance/today` with the **same** `Authorization` header so clock-in status matches the employee in the token.

```bash
ATTENDANCE_SERVICE_URL=http://attendance-service:3003
# Optional: disable remote check and use only JTS-local AttendanceRecord mirror
# JTS_ATTENDANCE_CHECK=false
# Attendance mode:
# strict => require active clock-in, fail with TIMER_004_ATTENDANCE_NOT_ACTIVE
# auto   => if not clocked in, auto create/update today's local attendance row at timer start
# JTS_TIMER_ATTENDANCE_MODE=strict
# Legacy toggle (used when mode is not set): true/false
# JTS_TIMER_AUTO_CLOCKIN=true
```

## Public URL prefix (ingress / MFE)

Attachment links returned in task JSON use this prefix (no host). Match **AWS ALB path rules** or your **Ingress** (`nginx`, ALB Ingress Controller, etc.).

```bash
# Default (local / gateway with /api/jts)
# JTS_PUBLIC_PATH_PREFIX=/api/jts

# Example: ALB or ingress strips /jts and forwards to jts-service
JTS_PUBLIC_PATH_PREFIX=/jts
```

## Verify SES with one API call

`POST /api/v1/notifications/test-email` (auth + role `TENANT_ADMIN` or `COUNTRY_OPS`):

```json
{
  "to_email": "you@example.com",
  "subject": "Optional subject",
  "message": "Optional body"
}
```

Requires `NOTIFICATION_PROVIDER_MODE=aws` and a verified `SES_FROM_EMAIL` (and recipient in sandbox).
