# JTS notifications — go-live today (email + realtime in-app)

This repo implements **notifications inside `jts-service`**. The separate `notification-service` microservice is **not** required for JTS; it uses SMTP/Nodemailer and is a different path.

## What “realtime” means here

| Channel | Behaviour |
|--------|-----------|
| **Email (SES)** | If `NOTIFICATION_PROVIDER_MODE=aws` and `NOTIFICATION_REALTIME_DISPATCH=true`, email rows are sent **immediately** on `/dispatch` (plus the 1-minute dispatcher retries failed rows). |
| **In-app (DB)** | Notifications are stored in Mongo (`Notification` collection) and listed via `GET /api/v1/notifications/me`. |
| **In-app (WebSocket)** | After insert, JTS calls **realtime-service** `POST /api/events/jts-in-app`. Clients subscribed to the **tenant** room receive `jts:in_app_notification` and should **filter** by `recipient_id` (JTS `Employee._id`) or `recipient_email`. |

## Required environment (`jts-service`)

```bash
# SES email
NOTIFICATION_PROVIDER_MODE=aws
NOTIFICATION_REALTIME_DISPATCH=true
AWS_REGION=ap-south-1
SES_FROM_EMAIL=no-reply@your-verified-domain.com
SES_CONFIGURATION_SET=etelios   # if you created this set in SES

# Optional SES extras
SES_REPLY_TO_EMAIL=support@your-domain.com
SES_FROM_EMAIL_IDENTITY_ARN=     # only if you use advanced identity ARN

# Credentials: prefer IAM role (EKS IRSA / instance profile). Otherwise:
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...

# Realtime in-app push
NOTIFICATION_REALTIME_SOCKET=true   # set to false to disable HTTP→realtime push
REALTIME_SERVICE_URL=http://realtime-service:3017   # use your cluster Service URL + port

# Auth: JWT secret must match the service that signs tokens (usually auth-service)
JWT_SECRET=<same-as-auth-service>

# Redis (optional but recommended for JTS features)
REDIS_URL=redis://redis:6379
```

## Kubernetes (`k8s/etelios-prod/jts-service-deployment.yaml`)

The deployment template includes notification-related env vars. **You must still:**

1. Set **`SES_FROM_EMAIL`** to an identity verified in SES (same region as `AWS_REGION`).
2. Ensure the pod can call AWS SES (**IRSA** or access keys secret).
3. Set **`REALTIME_SERVICE_URL`** to the in-cluster realtime Service (in `etelios-prod`, realtime listens on **3017** — not 3021).
4. Align **`JWT_SECRET`** with auth / gateway.

## Verify (API)

1. `GET /api/v1/notifications/providers/health` — confirms mode, SES account probe, realtime flags.
2. `POST /api/v1/notifications/test-email` — sends one SES message (sandbox: recipient must be verified).

## Frontend (Socket.IO)

1. Connect to **realtime-service** with the same **JWT** as the app (must include `tenantId` / `tenant_id` so the socket joins `tenant:<id>`).
2. Listen for:

`jts:in_app_notification`

3. Show a toast only if:

- `payload.recipient_id === <current user’s JTS Employee _id>` (from your profile / HR/JTS API), **or**
- `payload.recipient_email` matches the logged-in user’s email.

## SES sandbox

Until SES is out of sandbox, **every recipient address** must be verified in SES or mail will fail.
