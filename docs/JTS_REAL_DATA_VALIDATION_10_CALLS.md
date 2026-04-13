# JTS Real-Data Validation (10 Calls)

Use this checklist on staging/prod to validate JTS end-to-end with real data.

## 0) Setup

```bash
export BASE_URL="https://api.your-domain.com"
export TOKEN="YOUR_JWT"
export TENANT_ID="YOUR_TENANT_OBJECT_ID"
export EMPLOYEE_ID="YOUR_EMPLOYEE_OBJECT_ID"
```

Optional for attachment upload test:

```bash
echo "hello jts" > /tmp/jts-test.txt
```

---

## 1) Health

```bash
curl -sS "$BASE_URL/health"
```

Expect: `status=healthy`.

## 2) Auth + tenant isolation guard

```bash
curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT_ID" "$BASE_URL/api/jts/tasks?page=1&limit=5"
```

Expect: `200` + task list shape.

Negative test (must fail):

```bash
curl -i -sS -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: 000000000000000000000000" "$BASE_URL/api/jts/tasks?page=1&limit=5"
```

Expect: `403` with `JTS_TENANT_HEADER_MISMATCH`.

## 3) List tasks with FE params

```bash
curl -sS -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/jts/tasks?employeeId=$EMPLOYEE_ID&status=IN_PROGRESS&page=1&limit=10"
```

Expect: `data[]`, `total`, `page`, `limit`.

## 4) Create task

```bash
CREATE=$(curl -sS -X POST "$BASE_URL/api/jts/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"JTS Real Data Validation Task",
    "description":"Created by 10-call validation",
    "priority":"MEDIUM",
    "assignedToEmployeeId":"'"$EMPLOYEE_ID"'"
  }')
echo "$CREATE"
```

Capture `TASK_ID` from `data.id`.

## 5) Task detail + signed attachment URL mode

```bash
curl -sS -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/jts/tasks/<TASK_ID>?include_attachment_signed_urls=true"
```

Expect: Task DTO + optional `attachmentSignedUrls`.

## 6) Timer start (attendance mode behavior)

```bash
curl -sS -X POST -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/jts/tasks/<TASK_ID>/timer/start"
```

Expect:
- `200` with timer data, and `attendance` metadata if started, OR
- `400 TIMER_004_ATTENDANCE_NOT_ACTIVE` in strict mode without clock-in.

## 7) Timer pause

```bash
curl -sS -X POST -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/jts/tasks/<TASK_ID>/timer/pause"
```

Expect: `200` + timer with `stoppedAt` and `durationSeconds`.

## 8) Rate task alias

```bash
curl -sS -X POST "$BASE_URL/api/jts/tasks/<TASK_ID>/rate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating":4,"comments":"Validation rating"}'
```

Expect: `201` quality rating row.

## 9) SLA alerts + summary

```bash
curl -sS -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/jts/tasks/sla/alerts?employeeId=$EMPLOYEE_ID&limit=10"
curl -sS -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/jts/tasks/summary/$EMPLOYEE_ID?date=$(date +%F)"
```

Expect: alerts payload + summary payload (`byStatus`, counts).

## 10) Analytics + reviews compat

```bash
curl -sS -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/jts/analytics?timeRange=6months"
curl -sS -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/jts/reviews?limit=20"
```

Expect: populated analytics object (`overall`, `trends`, `byDepartment`) and review DTOs.

---

## Attachment flow quick add-on (recommended)

1. Presign upload:

```bash
UP=$(curl -sS -X POST "$BASE_URL/api/jts/tasks/<TASK_ID>/attachments/presign-upload" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"file_name":"jts-test.txt","mime_type":"text/plain"}')
echo "$UP"
```

2. PUT binary to `upload_url` from response:

```bash
curl -sS -X PUT "<UPLOAD_URL_FROM_RESPONSE>" -H "Content-Type: text/plain" --data-binary @/tmp/jts-test.txt
```

3. Save metadata:

```bash
curl -sS -X POST "$BASE_URL/api/jts/tasks/<TASK_ID>/attachments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_key":"<FILE_KEY_FROM_PRESIGN>",
    "file_name":"jts-test.txt",
    "mime_type":"text/plain",
    "size_bytes":13
  }'
```

4. List with signed URLs:

```bash
curl -sS -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/jts/tasks/<TASK_ID>/attachments?include_signed_urls=true"
```

---

## Pass criteria

- No unexpected `5xx`.
- Auth/tenant mismatch blocked (`403`) as expected.
- Timer behavior matches configured attendance mode.
- Attachments upload + retrieval succeeds.
- Analytics/reviews return non-empty or valid empty structures (not schema errors).
