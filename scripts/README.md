# Scripts Directory

This folder is organized for readability.

## Active folders
- `scripts/tests` - API and workflow test scripts.
- `scripts/maintenance` - one-time/repair/fix scripts.
- `scripts/diagnostics` - health/debug/check scripts.
- `scripts/ops` - deploy/start/admin operational scripts.
- `scripts/setup` - environment/cert/secret setup scripts.

## Archived
- `scripts/archive/root-legacy` - old root-level shell scripts moved from repo root.
- `scripts/archive/generated` - generated token/artifact files.

Notes:
- No script was deleted in this cleanup.
- Use `rg --files scripts` to locate scripts quickly.

## API load / stress (Etelios)

- **`scripts/etelios-load-test.sh`** — [autocannon](https://github.com/mcollina/autocannon) against auth health, HR leave reads, attendance `today`/`current`/`check-status`, JTS task list + summary. Requires **`ETELIOS_TOKEN`** and **`ETELIOS_TENANT`**; optional **`LOAD_TEST_ALLOW_POST=1`** enables **POST clock-in** (mutates real data — avoid on prod).
- Details: **`scripts/LOAD_TEST_ETELIOS.md`**.

Run from repo root on a machine that resolves `api.etelios.com`:

```bash
chmod +x scripts/etelios-load-test.sh
export ETELIOS_TOKEN='…'   # from POST /api/auth/login
export ETELIOS_TENANT=lenstrack
./scripts/etelios-load-test.sh
```
