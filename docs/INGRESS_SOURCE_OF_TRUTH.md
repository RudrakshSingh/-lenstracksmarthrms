# Ingress Source of Truth (Production)

## Environment
- Namespace: `etelios-prod`
- Ingress Name: `etelios-ingress`
- Host: `api.etelios.com`
- ALB DNS: `k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com`

## Canonical Route Mapping
- `/health` -> `auth-service:3001`
- `/api/auth` -> `auth-service:3001`
- `/api/hr` -> `hr-service:3002`
- `/api/time-tracking` -> `hr-service:3002`
- `/api/performance` -> `hr-service:3002`
- `/api/attendance` -> `attendance-service:80`
- `/api/payroll` -> `payroll-service:3004`
- `/api/tenant` -> `tenant-registry-service:3020`
- `/api/tenants` -> `tenant-registry-service:3020`
- `/api/platform` -> `tenant-registry-service:3020`
- `/api/admin` -> `tenant-registry-service:3020`

## Rules
1. Any ingress route change requires update to this file.
2. Service port and ingress backend port must be consistent.
3. Use production namespace state as authoritative over legacy manifests.

## Validation Commands
- `kubectl -n etelios-prod get ingress etelios-ingress -o yaml`
- `kubectl -n etelios-prod describe ingress etelios-ingress`
- `kubectl -n etelios-prod get svc`
