# JTS Notification Service (AWS-Ready)

## What Is Implemented In JTS

JTS now includes a native notification module with:

- In-app notifications (`Notification` collection)
- User channel preferences (`NotificationPreference`)
- Channel queues:
  - `EmailQueue`
  - `SmsQueue`
  - `WebhookLog`
- Background dispatcher job (`notificationDispatcher.job.js`) every 1 minute
- Notification APIs under `/api/v1/notifications`

## API Endpoints

- `GET /api/v1/notifications/me`
- `PATCH /api/v1/notifications/:id/read`
- `PATCH /api/v1/notifications/me/read-all`
- `GET /api/v1/notifications/preferences/me`
- `PUT /api/v1/notifications/preferences/me`
- `POST /api/v1/notifications/dispatch` (manager/admin roles)
- `POST /api/v1/notifications/process-queues` (admin ops roles)

## Current Provider Behavior

- `NOTIFICATION_PROVIDER_MODE=mock` (default):
  - Email/SMS queue items are marked as sent by dispatcher.
- `NOTIFICATION_PROVIDER_MODE!=mock`:
  - Email/SMS are retained with retries/failure until a provider adapter is implemented.
- Webhooks are sent live using HTTP POST via `axios`.

## AWS Mapping (Recommended)

- In-app: keep current MongoDB notifications (no AWS dependency needed)
- Email: Amazon SES
- SMS: Amazon SNS (or AWS End User Messaging SMS)
- Push notifications (future): Amazon SNS mobile push (APNS/FCM)
- Event fan-out (optional): EventBridge -> SQS -> worker

## Suggested Production Architecture

1. JTS creates notification intent and queue records.
2. Worker reads `EmailQueue`/`SmsQueue` pending messages.
3. Worker calls AWS provider:
   - SES for email
   - SNS for SMS
4. Worker updates queue status (`SENT`/`FAILED`) and retry counters.
5. In-app notifications remain immediately available through JTS API.

## Minimal Next Step To Go Live On AWS

1. Add AWS SDK v3 packages:
   - `@aws-sdk/client-sesv2`
   - `@aws-sdk/client-sns`
2. Implement provider adapters in `notification.service.js`.
3. Configure env vars:
   - `NOTIFICATION_PROVIDER_MODE=aws`
   - `AWS_REGION=ap-south-1` (or your region)
   - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (or IAM role in ECS/EKS)
   - `SES_FROM_EMAIL=no-reply@yourdomain.com`
4. Verify SES domain/email identities and SNS SMS permissions.

## Operational Notes

- Keep retries bounded (`max_retries`) to prevent infinite loops.
- Add DLQ table/collection or `FAILED` monitor alerting.
- Enable CloudWatch alarms for queue failures.
- Respect `NotificationPreference` before enqueueing per channel.
