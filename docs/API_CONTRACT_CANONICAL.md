# API Contract Canonical (v1)

## Rules
1. This is the single source of truth for externally consumed backend routes.
2. Route changes must update this file in same PR.
3. Status code changes must be explicitly documented.

## Auth Service
- `POST /api/auth/login` -> `200`, `400`, `401`
- `GET /api/auth/me` -> `200`, `401`
- `GET /api/auth/health` -> `200`

## HR Service
- `GET /api/hr/health` -> `200`
- `GET /api/hr/employees` -> `200`, `401`, `403`
- `GET /api/hr/employees/:id` -> `200`, `404`, `401`, `403`
- `PUT /api/hr/employees/:id` -> `200`, `400`, `404`, `401`, `403`
- `GET /api/hr/stores` -> `200`, `401`, `403`
- `GET /api/hr/stores/:id` -> `200`, `404`, `401`, `403`
- `POST /api/hr/stores` -> `201`, `400`, `401`, `403`
- `GET /api/hr/departments` -> `200`, `401`, `403`
- `POST /api/hr/departments` -> `201`, `400`, `401`, `403`
- `GET /api/hr/dashboard` -> `200`, `401`, `403`
- `GET /api/hr/dashboard/stats` -> `200`, `401`, `403`
- `GET /api/hr/time-tracking` -> `200`, `401`, `403`

## Attendance Service
- `GET /api/attendance/health` -> `200`
- `POST /api/attendance/clock-in` -> `200`, `400`, `401`, `403`
- `POST /api/attendance/check-out` -> `200`, `400`, `401`, `403`
- `GET /api/attendance/list` -> `200`, `401`, `403`, `404`
- `GET /api/attendance/summary` -> `200`, `401`, `403`, `404`

## Payroll Service
- `GET /api/payroll/health` -> `200`
- `GET /api/payroll` -> `200`, `401`, `403`
- `GET /api/payroll/summary` -> `200`, `401`, `403`, `404`

## Tenant Registry Service
- `GET /api/tenants/health` -> `200`, `504`
- `POST /api/tenants` -> `201`, `400`, `401`, `403`, `500`
- `GET /api/tenant/*` -> domain-dependent
- `GET /api/platform/*` -> domain-dependent
- `GET /api/admin/*` -> domain-dependent

## Contract Notes
1. `404` on some list/summary endpoints currently indicates route drift; normalize in roadmap.
2. `x-tenant-id` is required for tenant-scoped endpoints.
3. JWT tenant claim + header tenant must align.
