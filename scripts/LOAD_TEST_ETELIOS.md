# Etelios API load testing

## Why this exists

Cursor / CI sandboxes often **cannot resolve** `api.etelios.com` or block outbound HTTPS. Load numbers must be collected **on your laptop, office network, or a jump host** with DNS + TLS to the real API.

## Prerequisites

- [autocannon](https://github.com/mcollina/autocannon): `npm i -g autocannon`
- A valid **access token** from `POST /api/auth/login` (same tenant as `X-Tenant-Id`)

## Run

```bash
cd /path/to/lenstracksmarthrms
chmod +x scripts/etelios-load-test.sh

export ETELIOS_BASE=https://api.etelios.com
export ETELIOS_TENANT=lenstrack
export ETELIOS_TOKEN='paste_access_token_here'

# optional tuning
export CONNECTIONS=80
export DURATION_SEC=45

./scripts/etelios-load-test.sh
```

## How to read autocannon output

| Field | Meaning |
|--------|--------|
| **Reqs/sec** | Throughput under that concurrency |
| **Latency p50 / p99** | Typical vs tail latency (SLA watch p99) |
| **Errors / timeouts** | Non-2xx or socket timeouts — saturation or gateway limits |
| **2xx vs 4xx/5xx** | 401 = bad token; 403 = tenant mismatch or RBAC; 429 = rate limit |

## Safety

- Default script is **read-only** (GET) except optional clock-in.
- **Do not** set `LOAD_TEST_ALLOW_POST=1` against production unless you accept **fake/real punches** and rate limits.
- Never commit `ETELIOS_TOKEN` or passwords to git.

## What “extensive” means here

The shell script runs **sequential** autocannon phases (different URLs). For a single mega-mix, run multiple terminals or wrap `autocannon` with `-w` workers if you upgrade the script.

## If load looks “low”

- **ALB / Kong** rate limits per IP.
- **Mongo / service** CPU caps in K8s.
- **Cold JWT / permission cache** on auth-bound routes.
- Compare **same route** with `CONNECTIONS=10` vs `100` — if p99 explodes only at high `c`, you found knee of the curve.
