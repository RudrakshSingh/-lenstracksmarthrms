# Intern Handout v1 - Service Connection Matrix

| Service | Inputs | Outputs | Depends On | Used By |
|---|---|---|---|---|
| auth-service | `/api/auth/*` requests, user credentials, tenant header/token | JWT tokens, auth user context, auth responses | DocumentDB, secrets/config | Frontend, tenant-registry-service, other services needing auth context |
| hr-service | `/api/hr/*`, `/api/time-tracking/*`, `/api/performance/*`, auth context | Employees, stores, departments, dashboard/time-tracking data | DocumentDB, auth context contract, optional **jts-service** (dashboard task widgets via forwarded JWT) | Frontend, attendance-service, payroll/admin flows |
| attendance-service | `/api/attendance/*`, auth context, GPS/selfie payloads | Clock-in/out records, attendance list/summary, realtime events, optional **jtsTasks** on `/today` | hr-service (employee/store lookup), DocumentDB, realtime-service, optional **jts-service** (`JTS_SERVICE_URL`) | Frontend/mobile, HR dashboards, **jts-service** (timer clock-in check) |
| jts-service | `/api/jts/*`, `/jts/*` (ingress), JWT + `X-Tenant-Id` | Tasks, timers, approvals, catalog, performance, notifications (in-service), attachments (S3) | DocumentDB, Redis (connection; queues are Mongo-backed), **attendance-service** (`/api/attendance/today` for timers), **realtime-service** (in-app socket events), AWS S3/SES/SNS | **HRMS MFE / tasks UI** (primary API consumer), same auth token as rest of HRMS |
| payroll-service | `/api/payroll/*`, auth/tenant context | Payroll records, payroll summaries/reports | DocumentDB, employee/attendance business context | Frontend payroll module, admin/HR users |
| tenant-registry-service | `/api/tenant/*`, `/api/tenants/*`, `/api/platform/*`, `/api/admin/*`, auth context | Tenant create/manage responses, tenant bootstrap outputs | DocumentDB, auth-service flows | Superadmin/admin frontend flows |
| realtime-service | Socket connections, event payloads from domain services | Tenant-scoped websocket broadcasts | Service event producers, socket auth context | Frontend live dashboards, attendance-service |
| analytics-service | Analytics/report requests, domain data inputs | Aggregated metrics/reports | Domain data sources, DocumentDB | Dashboard/report consumers |
| notification-service | Notification trigger requests/events | Notification delivery status/results | Provider/config integrations, DocumentDB/context data | auth/hr/other domain services |
| monitoring-service | Monitoring/health requests | Monitoring status/telemetry responses | Service health/metrics inputs | Internal monitoring consumers |
| document-service | Document API requests, auth context, file payloads | Document metadata, storage references | Storage backend, DocumentDB/config | HR/onboarding and document consumers |
| crm-service | `/api/crm/*` requests | CRM/customer domain responses | CRM data store/config | CRM workflows/frontends |
| inventory-service | `/api/inventory/*` requests | Inventory/stock responses | Inventory data store/config | Inventory, sales, purchase flows |
| sales-service | `/api/sales/*` requests | Sales domain responses | Sales data store/config, inventory/financial business context | Sales workflows/frontends |
| purchase-service | `/api/purchase/*` requests | Purchase/vendor domain responses | Purchase data store/config | Purchase workflows/frontends |
| financial-service | `/api/financial/*` requests | Financial/accounting responses | Financial data store/config | Finance/admin workflows |
| service-management | `/api/service/*` requests | Service-management domain responses | Service-management data store/config | Service admin workflows |
| cpp-service | `/api/cpp/*` requests | CPP domain responses | CPP data store/config | CPP workflows/frontends |
| prescription-service | Prescription route requests | Prescription domain responses | Prescription data store/config | Prescription workflows/frontends |
| tenant-management-service | Tenant-management route requests | Tenant management responses | Tenant domain data/config | Platform/admin flows |
| api-gateway (repo component) | Proxied API requests (env dependent) | Routed/proxied responses | Route registry/config | **Optional** — **not used** in **ingress-only** prod (ALB/Ingress → services directly) |
| shared (library) | Imports from services | Shared utilities/middleware/helpers | N/A (library layer) | Multiple microservices |

## Core Cross-Service Connections
1. Frontend -> Ingress -> auth-service / hr-service / attendance-service / **jts-service** (HRMS tasks) / payroll-service / tenant-registry-service.
2. attendance-service -> hr-service (employee/store resolution).
3. attendance-service -> realtime-service (attendance events).
4. tenant-registry-service -> auth-service (tenant bootstrap/auth flows).
5. Core services -> DocumentDB (tenant-scoped data access).
6. **HRMS + JTS:** The **HRMS / tasks module** calls **jts-service** over HTTP (`/api/jts/...` or `/jts/...` per **Ingress**). jts-service exposes **HRMS MFE–aligned routes** (`hrmsJtsCompat.routes.js`: e.g. `self-tasks`, approvals, tasks, timers). Same **JWT** as auth-service. **hr-service** also calls JTS **server-to-server** for dashboard widgets (`JTS_SERVICE_URL`, `docs/JTS_SERVER_TO_SERVER_INTEGRATION.md`).
7. **Attendance + JTS:** **jts-service** → **attendance-service** `GET /api/attendance/today` when **starting a task timer** (clock-in check). **attendance-service** → **jts-service** `GET /api/jts/tasks/summary/me` on **`GET /api/attendance/today`** for **self** requests (optional **`jtsTasks`** on `data`; see **`ATTENDANCE_JTS_*`** env).
8. **HR + JTS:** **hr-service** → **jts-service** `GET /api/jts/tasks/summary/me` and (for hr/admin) `GET /api/jts/analytics` with the **user’s Bearer token** to fill dashboard **task** widgets (`JTS_SERVICE_URL`).
