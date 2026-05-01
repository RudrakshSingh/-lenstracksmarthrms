# ETELIOS ENTERPRISE V1
## Formal Consolidated Sprint & Execution Plan
### Track A (Backend) + Track B (Frontend) — Full Coverage

**Document Version:** 4.0 — Consolidated (Backend v3.0 + Frontend v3.0 merged)  
**Last Updated:** April 30, 2026  
**Dates:** April 28 – June 10, 2026 · 44 Working Days · 6 Sprints · 2 Parallel Tracks  
**Audience:** Engineering Leads · Product Managers · QA · Auditors · New Hires · Full-Stack Developers  
**Backend baseline:** ~1,994 files · 20+ microservices · 89 controllers · 197 models  
**Stack — Track A:** Node.js ≥22 · Express · MongoDB/Mongoose 8 · Redis · Kafka · Kong API Gateway · EKS/K8s  
**Stack — Track B:** Next.js (React) · Frontend Monorepo · BFF pattern · Playwright E2E  

---

## SECTION 1: Executive Overview

### 1.1 Product Principle

Etelios Enterprise V1 is a prescription-led optical retail and chain operating system for the Indian GST context. It enables eyewear stores and chains to run sales, prescriptions, stock, lab work, vendor lens procurement, customer complaints, store audits, damage and loss control, staff and payroll management, cash deposits, customer dues, and tax reporting in a fully connected, traceable system.

**Core rule:** Every important business event must leave a trace — financially, in inventory, and in accountability (usually as a JTS task that someone must complete). V1 is intentionally optical-vertical, not a generic ERP.

### 1.2 Three-Pillar Gap Summary

| Pillar | Status | Priority |
|---|---|---|
| **People & Tasks** (HRMS + JTS) | Strong — multi-tenant, deep HRMS + JTS UX already in place. Matches ENTERPRISE plan people and accountability needs. | Low |
| **Optical Vertical Integration** | Weak — Rx-led order → stock vs RX → vendor → inward → lab → delivery → GST not coherent; some pages show demo data. | **High** |
| **Commercial Honesty** (Entitlements) | Missing — CORE / GROWTH / ENTERPRISE plan flags not implemented as a first-class UI layer; navigation does not respect subscription. | **High** |

### 1.3 Commercial Model — Plan Tiers

Billing is per store per year. Plans differ by feature depth, not by removing survival features from small stores.

| Plan | Target | Key Unlock |
|---|---|---|
| **CORE** | Single-store eyewear retail | POS, Basic CRM, Attendance, Payroll, Basic Reports |
| **GROWTH** | Small chain (2–10 stores) | + Vendor RX, Lab Engine, Barcode/QR, Store Damage, Complaint Engine |
| **ENTERPRISE** | Multi-city chain | + Full GST Engine, Multi-GSTIN, Finance Bridges, Analytics Hub, Audit System, Dead Stock, JTS full |

Per-tenant feature flags must be respected by both UI navigation (Track B) and backend APIs (Track A). Deep links must fail closed with a clear "Not on your plan" message — not a 404 or crash.

---

## SECTION 2: Gap Analysis — Where We Are vs Where V1 Needs Us

### 2A. Consolidated Gap Matrix (23 Modules)

| # | Module | Business Group | Backend Status | Frontend Status | Sprint | Severity |
|---|---|---|---|---|---|---|
| 1 | Platform Tenant Management | Platform | Partial | Partial | S1 | High |
| 2 | Admin Control Engine | Platform | Partial | Partial | S1 | High |
| 3 | HRMS | People | **Strong** | **Strong** | S3 (polish) | Low |
| 4 | Attendance & Leave | People | **Strong** | **Strong** | S3 (polish) | Low |
| 5 | Payroll | People | **Strong** | **Strong** | S5 (polish) | Low |
| 6 | JTS Execution Engine | Execution | **Strong** | **Strong** | S2&S3 (extend) | Low |
| 7 | CRM | Customer & Sale | Partial | Partial | S4 | High |
| 8 | Optical Order Management | Customer & Sale | **Missing** | **Missing** | S1 | High |
| 9 | Billing / Sales | Customer & Sale | Partial | Partial | S1 | High |
| 10 | Lens & CL Masters | Optical Supply | **Missing** | **Missing** | S1 | High |
| 11 | Vendor RX & Return | Optical Supply | **Missing** | **Missing** | S2 | High |
| 12 | Lab & Delivery | Optical Supply | **Missing** | **Missing** | S3 | High |
| 13 | Inventory Core (Optical) | Optical Supply | Partial | Partial | S2 | High |
| 14 | Barcode / QR | Optical Supply | Missing | Missing | S2 | Medium |
| 15 | Audit System | Control & Loss | Partial | Partial | S3 | High |
| 16 | Dead Stock Protection | Control & Loss | Missing | Missing | S3 | Medium |
| 17 | Store Damage & Loss | Control & Loss | **Missing** | **Missing** | S2 | High |
| 18 | Complaint & After-Sales | After-Sales | **Missing** | **Missing** | S4 | High |
| 19 | Finance V1 | Money | Partial | Partial | S5 | High |
| 20 | Cash / Bank Deposit Verify | Money | **Missing** | **Missing** | S4 | High |
| 21 | Customer Due / Udhari | Money | **Missing** | **Missing** | S4 | High |
| 22 | GST & Taxation | Money | Partial | Missing | S4 | High |
| 23 | Reports & Monitoring | Money | Partial | Partial | S5 | Medium |

### 2B. What Exists in Backend (Track A) — Already Built

| Module | Evidence |
|---|---|
| HRMS — Employee Lifecycle | `hr-service`: employee master, onboarding, transfers, FnF, roster, performance |
| Attendance & Leave | `attendance-service`: clock-in/out, geofencing, violations; `hr-service`: leave management |
| Payroll | `payroll-service`: salary, deductions, workflow, compliance, payslip PDF, payroll-run engine |
| JTS Execution Engine | `jts-service`: tasks, SLA, escalation, timers, collaboration, self-tasks, performance jobs |
| Auth / RBAC | `auth-service`: JWT, role enums, permission catalog, tenant isolation, emergency lock |
| Tenant Management (basic) | `tenant-management-service` + `tenant-registry-service`: tenant CRUD, billing model, subscription |

### 2C. What Exists in Backend — Partially Built (Gaps)

| Module | What Exists | What's Missing |
|---|---|---|
| Platform Tenant Mgmt | Tenant CRUD, audit log model | Strict data-isolation middleware; time-bound support-access grant model; immutable super-admin audit log |
| Admin Control Engine | Role enums (admin, hr, manager, store, accountant, finance…) | Store-scoped and dept-scoped permission enforcement; entitlement plan flag on tenant object |
| CRM | `crm-service`: customer model, campaigns, loyalty, wallet | Prescription history link; order history link; complaint history link; due/udhari history tab |
| Billing / Sales | `sales-service`: POS controller, coupon, discount | Optical order (Rx + frame + lens + CL selection + delivery date); GST invoice; partial payment; due creation |
| Inventory Core | `inventory-service`: stock controller, product master, reorder rules | Optical category separation; barcode/QR per unit; audit system; dead stock detection |
| Financial V1 | P&L, expenses, ledger, TDS, payroll-posting bridge | Deposit verification flow; customer due/udhari; damage-to-finance bridge; complaint service cost |
| GST & Taxation | `financial-service`: HSN model | Multi-state GSTIN; category GST + HSN inheritance; CGST/SGST/IGST logic; stock transfer GST |
| Reports | `analytics-service`: generic dashboard, expiry reports | Lens power-wise stock; vendor scorecard; lab delay; QC rejection; breakage value; GST liability |

### 2D. What Does NOT Exist in Frontend (Track B)

| Area | Current State | Required by V1 |
|---|---|---|
| Entitlement gates | None — navigation shows all items regardless of plan | Plan-aware navigation; deep links fail closed with "Not on your plan" for CORE/GROWTH |
| Lens Master UI | None | Full list + create/edit/deactivate screens; BFF wired |
| Contact Lens Master UI | None | Mirror of lens master screens |
| Optical Order UI | None | List + detail + create (Rx capture + frame/lens/CL item selection) |
| Stock status badges | None | Reserved / RX Pending / Partial badges on order line items |
| RX Purchase board | None | Aggregated pending requirements board with vendor linking |
| Vendor Inward screen | None | Per-line validation result chips; photo upload; accept/return action |
| Vendor Returns & Scorecard | None | Returns list with reason; scorecard page with trend chart |
| Barcode/QR UI | None | Generate labels (PDF preview); scan lookup (camera + manual) |
| Damage entry + auditor queue | None | Damage create form; auditor queue table; approve/reject + evidence upload |
| Audit session UX | None | Session create; barcode scan loop; mismatch list; JTS deep-link; correction proposal read-only until approved |
| Lab Kanban | None | Kanban board by stage; role-gated stage transitions; QC reject modal |
| Dead stock report | None | Report table + "Suggest transfer" action |
| Breakage form | None | Form: link to order/lab; staff selection; evidence upload |
| Store deposit form + verification queue | None | Submit form; accounts queue with pending/verified/discrepancy tabs |
| Customer due ledger | None | Dues list; CRM Dues tab; aging chart (0–30/30–60/60–90/90+) |
| GSTIN CRUD | None | GSTIN create/edit; store assignment; category GST rates |
| Complaint workflow | None | Complaint list/detail; decision workflow; replacement order badge |
| Reports hub | None | Daily sales chart; store comparison; category breakdown; payment mode; CSV export |
| Finance line visibility | None | Finance lines tab on approved damage; payroll deduction status badge |

---

## SECTION 3: Architecture & Track Definitions

### 3.1 Two-Codebase Model

| Layer | Technology | Responsibility |
|---|---|---|
| **Track B — Web Apps** | Next.js (React) — Frontend Monorepo | Pages, forms, dashboards, BFF proxies, permission-aware navigation |
| **Track A — Business APIs** | Node.js / Express / MongoDB | Authoritative rules: stock, tax, payroll, task creation, audit logs, tenant isolation |
| **Gateway / Infra** | Kong API Gateway / Kubernetes | Routing, TLS, rate limits, deployment manifests |

### 3.2 Frontend Monorepo Package Structure

| Package | Plain-English Role | Primary Sprint |
|---|---|---|
| `shell` | Main website: menus, dashboards, BFF routes, entitlement-aware navigation | S1 |
| `hrms-mfe` | People operations: employees, attendance, leave, payroll, JTS task queues | S3 (polish) |
| `admin-mfe` | Platform operator console: tenants, billing, security, integrations | S1 |
| `crm-mfe` | Customers & marketing: profiles, campaigns, dues tab, prescription history | S4 |
| `sales-mfe` | Selling: POS, retail flows, prescription capture, optical order entry | S1 |
| `inventory-mfe` | Stock & logistics: products, transfers, warehouse, optical categories, reservations | S2 |
| `financial-mfe` | Finance: ledgers, budgets, tax config, expenses, deposit queue, GST reports | S4 |
| `shared` | Common library: auth helpers, permission helpers, shared UI gates, API clients | S1 (setup) |

### 3.3 BFF (Backend for Frontend) Pattern

Every public browser call MUST go through a Next.js API route (BFF) or have a written exception with CORS justification. BFF responsibilities:
- Attach `Authorization` header from session (browser never holds bearer token)
- Inject `X-Tenant-Id` from session context (browser never constructs this)
- Forward `X-Request-Id` for correlated tracing
- Translate HTTP errors to user-facing error shapes
- Cache plan/entitlement flags (TTL: 5 min) to avoid per-request latency

```
Browser → Next.js API Route (BFF) → Kong → Microservice → MongoDB
                ↓
          Attaches: Authorization, X-Tenant-Id, X-Request-Id
```

### 3.4 Entitlement Model

The shell BFF must expose a single entitlement endpoint for every authenticated session:

```typescript
// GET /api/bff/entitlements
// Response shape:
{
  plan: 'CORE' | 'GROWTH' | 'ENTERPRISE',
  flags: {
    opticalOrders: boolean,     // CORE+
    rxVendorOrders: boolean,    // GROWTH+
    labEngine: boolean,         // GROWTH+
    barcode: boolean,           // GROWTH+
    storeDamage: boolean,       // GROWTH+
    complaintEngine: boolean,   // GROWTH+
    auditSystem: boolean,       // ENTERPRISE
    gstEngine: boolean,         // ENTERPRISE
    multiGSTIN: boolean,        // ENTERPRISE
    financeReports: boolean,    // ENTERPRISE
    analyticsHub: boolean,      // ENTERPRISE
    jtsFullAccess: boolean,     // ENTERPRISE
  },
  warehouse: {
    storeId: string,
    storeName: string,
    tenantId: string,
    role: string,
    permissions: string[]
  }
}
```

Navigation items, route guards, and feature flags must use this shape. Deep links to locked features return a `<PlanGate>` component with a "Not on your plan" message — never a 404 or JS crash.

### 3.5 Identity & Tenant Context Rule

Every business API call must carry:
1. **WHO** the user is — `Authorization: Bearer <JWT>`
2. **WHICH company** they act for — `X-Tenant-Id: <tenantId>`

Cross-tenant data leaks are the highest severity class of bug in SaaS. Backend enforcement is primary control; UI is secondary.

### 3.6 Lab Stage Reconciliation

The backend doc used `lens-available → fitting → QC → packing → dispatch → store-received → customer-delivered`. The frontend doc used `received → cutting → fitting → QC → ready`. **Consolidated canonical stages:**

```
order-confirmed
  → lens-inward (lens received from vendor or reserved from stock)
  → cutting     (lens cut to frame shape — new stage)
  → fitting     (lens fitted to frame)
  → qc          (quality check)
  → packing     (wrapped and ready)
  → dispatched  (sent to store from lab)
  → store-received (store has confirmed receipt)
  → delivered   (customer received)
  → [rework]    (QC rejected — re-enters cutting stage)
  → [cancelled]
```

---

## SECTION 4: Sprint Plan Overview

| Sprint | Dates | Theme | Track A (Backend) Focus | Track B (Frontend) Focus |
|---|---|---|---|---|
| **S1** | Apr 28 – May 3 | Foundation + Optical Core | Security isolation; Lens & CL master APIs; Optical order model & APIs; GST-on-order + partial payment stub | Entitlement types + shell BFF; Lens & CL master screens; Optical order list/detail; Status transitions; Partial payment UX |
| **S2** | May 4 – May 10 | Inventory + Vendor + Barcode + Damage | Stock reservation + RX pending; Vendor RX orders; Inward validation; Vendor return + score; Barcode/QR APIs; Damage entries | Order line badges; RX purchase board; Inward screen + photo upload; Returns list + scorecard; Barcode generate/scan; Damage create + auditor queue |
| **S3** | May 11 – May 17 | Audit + Dead Stock + Lab + Breakage | Audit sessions + scan loop + mismatch → JTS; Dead stock scheduler; Lab order model + QC/rework/vendor delay JTS; Breakage | Audit session UX + mismatch list + JTS deep-link; Dead stock report + transfer suggestion; Lab Kanban; QC reject modal; Breakage form |
| **S4** | May 18 – May 24 | Finance + GST + Deposits + Dues + Complaints | Store deposit + JTS; Customer due + reminder + overdue JTS; GSTIN + category GST; GST calc wired to orders; Complaint engine | Store deposit form + accounts queue; Due ledger + CRM Dues tab + aging chart; GSTIN CRUD; Order composer shows server-computed tax; Complaint list/detail + decision |
| **S5** | May 25 – May 31 | Finance Bridges + Reporting + JTS Audit | Damage→finance/payroll; Complaint→finance; All analytics APIs; HR/JTS endpoints | Finance lines from approved damage; service cost badge; Report hub pages + CSV export; JTS trigger checklist page |
| **S6** | Jun 1 – Jun 10 | E2E Testing + Release Hardening | E2E staging; Kong/ingress production config; API docs; Production manifests; Monitoring | Playwright E2E for 4 flows; permission catalog; build green; Sentry; error boundaries; DoD sign-off |

---

## SECTION 5: Sprint 1 — Foundation + Optical Core
**Dates:** Apr 28 – May 3, 2026  
**Goal:** Establish entitlement infrastructure, optical lens/CL masters, and the optical order shell so no production screen relies on hardcoded demo data from Day 1.  
**Sprint Acceptance Criteria:** A demo tenant can open Lens Master, CL Master, and Optical Orders without seeing hardcoded fake dashboard numbers on those pages. Plan gates work in navigation.

---

### Day 1 — Monday Apr 28

**Track A — Backend: Security Isolation & Support Grant Model**

Services: `auth-service`, `tenant-management-service`

**1. Super Admin Data Isolation Middleware**

Create `middleware/superAdminDataIsolation.js` in `auth-service`:
```javascript
// Blocks super-admin requests from receiving tenant business payloads
module.exports = function superAdminDataIsolation(req, res, next) {
  if (req.user.role === 'upcapto-superadmin') {
    // Tenant business data routes — blocked by default
    const blockedPrefixes = [
      '/api/sales', '/api/inventory', '/api/financial',
      '/api/crm', '/api/hr', '/api/payroll', '/api/purchase'
    ];
    const isBlocked = blockedPrefixes.some(p => req.path.startsWith(p));
    if (isBlocked && !req.supportGrant?.active) {
      return res.status(403).json({
        error: 'SUPERADMIN_DATA_ISOLATION',
        message: 'Super admin requires an active tenant support grant to access business data'
      });
    }
  }
  next();
};
```

**2. SupportAccessGrant Model** in `tenant-management-service`:
```javascript
const SupportAccessGrantSchema = new mongoose.Schema({
  tenantId: { type: ObjectId, required: true },
  grantedBy: { type: ObjectId, required: true }, // tenant admin user
  grantedTo: { type: ObjectId, required: true },  // super admin user
  scope: [{ type: String, enum: ['general', 'finance', 'payroll', 'gst', 'customer'] }],
  requiresExtraApproval: { type: Boolean, default: false }, // true for finance/payroll/gst/customer
  expiresAt: { type: Date, required: true },       // time-bound
  isActive: { type: Boolean, default: true },
  revokedAt: Date,
  revokedBy: ObjectId
}, { timestamps: true });
// Compound index
SupportAccessGrantSchema.index({ tenantId: 1, grantedTo: 1, isActive: 1, expiresAt: 1 });
```

**APIs:**
- `POST /api/admin/v1/support-grants` — tenant admin creates grant (body: `{ superAdminId, scope[], expiresAt }`)
- `DELETE /api/admin/v1/support-grants/:id` — tenant admin revokes grant
- `GET /api/admin/v1/support-grants` — list grants for tenant (paginated)

**3. SuperAdminActionLog** — immutable collection (no update/delete permissions):
```javascript
const SuperAdminActionLogSchema = new mongoose.Schema({
  superAdminUserId: ObjectId,
  tenantId: ObjectId,
  action: String,           // 'READ_SALES_DATA', 'READ_PAYROLL', etc.
  resource: String,
  resourceId: ObjectId,
  grantId: ObjectId,
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now }
});
// No update/delete indexes; append-only
```

**4. Store-Admin & Dept-Admin Scopes** in `microservices/shared/utils/shellRoutePermissions.js`:
- Add `store-admin` role: all existing permissions scoped to `req.user.storeId` — backend middleware validates `req.params.storeId === req.user.storeId`
- Add `dept-admin` role: permissions scoped to `req.user.departmentId`

**5. Entitlement Plan Flag** on tenant object:
- Add `plan: { type: String, enum: ['CORE', 'GROWTH', 'ENTERPRISE'], default: 'CORE' }` to `Tenant` model in `tenant-registry-service`
- Add `featureFlags: { opticalOrders: Boolean, rxVendorOrders: Boolean, labEngine: Boolean, ... }` — defaults derived from plan on tenant create/update

---

**Track B — Frontend: Entitlement Contract + Shell BFF Stub**

Package: `shell` + `shared`

**1. Entitlement types** in `shared/src/types/entitlements.ts`:
```typescript
export type Plan = 'CORE' | 'GROWTH' | 'ENTERPRISE';

export interface FeatureFlags {
  opticalOrders: boolean;
  rxVendorOrders: boolean;
  labEngine: boolean;
  barcode: boolean;
  storeDamage: boolean;
  complaintEngine: boolean;
  auditSystem: boolean;
  gstEngine: boolean;
  multiGSTIN: boolean;
  financeReports: boolean;
  analyticsHub: boolean;
  jtsFullAccess: boolean;
}

export interface EntitlementContext {
  plan: Plan;
  flags: FeatureFlags;
  warehouse: {
    storeId: string;
    storeName: string;
    tenantId: string;
    role: string;
    permissions: string[];
  };
}
```

**2. Shell BFF stub** in `shell/src/app/api/bff/entitlements/route.ts`:
```typescript
export async function GET(req: Request) {
  const session = await getServerSession();
  // Forward to tenant-registry-service; cache 5 min per tenantId
  const data = await fetchWithTenantContext('/api/tenant/entitlements', session);
  return Response.json(data);
}
```

**3. `<PlanGate>` component** in `shared/src/components/PlanGate.tsx`:
```typescript
export function PlanGate({ requires, children }: { requires: keyof FeatureFlags; children: ReactNode }) {
  const { flags } = useEntitlements();
  if (!flags[requires]) {
    return (
      <div className="plan-gate">
        <p>This feature is not available on your current plan.</p>
        <a href="/settings/billing">Upgrade your plan</a>
      </div>
    );
  }
  return <>{children}</>;
}
```

**4. Admin Support Access page** in `admin-mfe/src/app/support-access/page.tsx`:
- Stub page behind `process.env.ENABLE_SUPPORT_ACCESS_UI=true` env flag
- Shows: grant list, grant create form (super admin email, scope checkboxes, expiry date)
- Feature-flagged; not in production navigation yet

**Deliverable check Day 1:** `shell` navigation renders without crashing; entitlement BFF returns `{ plan: 'ENTERPRISE', flags: {...all true}, warehouse: {...} }` from a test tenant.

---

### Day 2 — Tuesday Apr 29

**Track A — Backend: Lens Master CRUD APIs**

Service: `inventory-service` — new files: `src/routes/lens.routes.js`, `src/controllers/lensMaster.controller.js`, `src/models/LensMaster.model.js`

```javascript
// LensMaster.model.js
const LensMasterSchema = new mongoose.Schema({
  brand: { type: String, required: true },
  productType: { type: String, enum: ['SV', 'BF', 'Progressive', 'Office', 'Occupational', 'Sunglass', 'Safety'], required: true },
  visionType: { type: String, enum: ['single-vision', 'bifocal', 'progressive', 'reading', 'photochromic', 'sunglass', 'computer'], required: true },
  index: { type: Number, enum: [1.5, 1.53, 1.56, 1.59, 1.6, 1.67, 1.74], required: true },
  coating: [{ type: String, enum: ['AR', 'HMC', 'SHMC', 'BlueBlock', 'Photochromic', 'Mirror', 'Polarized', 'UV400', 'HardCoat'] }],
  powerRange: {
    sphMin: Number, sphMax: Number, sphStep: { type: Number, default: 0.25 },
    cylMin: Number, cylMax: Number, cylStep: { type: Number, default: 0.25 },
    axisMin: { type: Number, default: 0 }, axisMax: { type: Number, default: 180 },
    addMin: Number, addMax: Number, addStep: { type: Number, default: 0.25 }
  },
  gstPercent: { type: Number, enum: [0, 5, 12, 18], required: true },
  hsnCode: { type: String, required: true },
  vendorMapping: [{
    vendorId: { type: ObjectId, ref: 'Supplier' },
    vendorSku: String,
    costPrice: Number,
    leadTimeDays: Number
  }],
  isActive: { type: Boolean, default: true },
  tenantId: { type: ObjectId, required: true }
}, { timestamps: true });

LensMasterSchema.index({ tenantId: 1, brand: 1, index: 1, visionType: 1, isActive: 1 });
LensMasterSchema.index({ tenantId: 1, hsnCode: 1 });
```

**APIs:**
- `POST   /api/inventory/lens-master` — create; validate brand+index+visionType unique per tenant
- `GET    /api/inventory/lens-master` — list; query params: `?brand=&visionType=&index=&coating=&page=&limit=`
- `GET    /api/inventory/lens-master/:id` — get by id
- `PUT    /api/inventory/lens-master/:id` — full update
- `PATCH  /api/inventory/lens-master/:id/activate` — toggle `isActive`
- `GET    /api/inventory/lens-master/check-stock` — query: `?sph=-2&cyl=-0.5&axis=90&index=1.6&coating=AR&storeId=` — returns `{ available: true, qty: 4, stockId }` or `{ available: false }`

---

**Track B — Frontend: Lens Master Screens**

Package: `inventory-mfe`

**1. Lens master list page** `inventory-mfe/src/app/lens-master/page.tsx`:
- `<DataTable>` with columns: Brand, Type, Vision Type, Index, Coating(s), GST %, HSN, Vendors, Status
- Filter bar: Brand (select), Vision Type (select), Index (select), Active/Inactive toggle
- "Add Lens" button → opens create drawer
- Wraps page in `<PlanGate requires="opticalOrders">`

**2. Lens master create/edit drawer** `inventory-mfe/src/app/lens-master/LensMasterDrawer.tsx`:
- Form fields matching schema: brand (text), productType (select), visionType (select), index (select), coating (multi-select), power ranges (SPH min/max/step, CYL, axis, ADD), GST % (select), HSN code (text with lookup)
- Vendor mapping section: add/remove vendor rows (vendor select, SKU, cost price, lead time)
- Empty state: "No lens master records yet — add your first lens product"
- Error state: API error shown inline, no page crash

**3. BFF proxy** `shell/src/app/api/bff/inventory/lens-master/[[...slug]]/route.ts`:
- Forwards GET/POST/PUT/PATCH to `inventory-service` with tenant context

**Deliverable check Day 2:** Open `/inventory/lens-master` → see empty state or seeded data; click Add → fill form → submit → item appears in list.

---

### Day 3 — Wednesday Apr 30

**Track A — Backend: Contact Lens Master CRUD APIs**

Service: `prescription-service` (upgrade `ContactLensPlan` model) OR `inventory-service` — decision: **use `inventory-service`** for consistency; `prescription-service` keeps clinical Rx data only.

```javascript
// ContactLensMaster.model.js
const ContactLensMasterSchema = new mongoose.Schema({
  brand: { type: String, required: true },
  productSubType: { type: String, enum: ['spherical', 'toric', 'multifocal', 'cosmetic', 'colored'] },
  power: Number,
  cyl: Number,         // for toric
  axis: Number,        // for toric (1–180)
  baseCurve: { type: Number, enum: [8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 9.0] },
  diameter: { type: Number, enum: [13.8, 14.0, 14.2, 14.4, 14.5] },
  modality: { type: String, enum: ['daily', 'fortnightly', 'monthly', 'quarterly', 'yearly'], required: true },
  packSize: { type: Number, enum: [1, 6, 30, 90], required: true },
  gstPercent: { type: Number, enum: [0, 5, 12, 18], required: true },
  hsnCode: { type: String, required: true },
  batchTracking: { type: Boolean, default: true },
  expiryMonthsFromMfg: Number,
  vendorMapping: [{
    vendorId: ObjectId,
    costPrice: Number,
    leadTimeDays: Number
  }],
  isActive: { type: Boolean, default: true },
  tenantId: { type: ObjectId, required: true }
}, { timestamps: true });

ContactLensMasterSchema.index({ tenantId: 1, brand: 1, modality: 1, power: 1, isActive: 1 });
```

**APIs:** Mirror of Lens Master — `POST`, `GET`, `GET/:id`, `PUT/:id`, `PATCH/:id/activate`, `GET/check-stock`

---

**Track B — Frontend: Contact Lens Master Screens**

Package: `inventory-mfe`

**1. CL master list page** `inventory-mfe/src/app/cl-master/page.tsx`:
- Mirror of lens master list; additional columns: Modality, Pack Size, Base Curve, Diameter
- Additional filter: Modality (select), Sub-Type (select)
- Separate route: `/inventory/cl-master`

**2. CL master create/edit drawer** — mirror of lens master drawer with CL-specific fields
- Toric fields (CYL, Axis) show conditionally when `productSubType === 'toric'`
- Multifocal fields (ADD) show when `productSubType === 'multifocal'`

**BFF proxy:** Add CL master to same proxy file as lens master with separate path segment.

**Deliverable check Day 3:** Both `/inventory/lens-master` and `/inventory/cl-master` accessible; create works for both.

---

### Day 4 — Thursday May 1

**Track A — Backend: Optical Order Database Model**

Service: `sales-service` — new files: `src/models/OpticalOrder.model.js`, `src/routes/opticalOrder.routes.js`, `src/controllers/opticalOrderController.js`

```javascript
// OpticalOrder.model.js
const OpticalOrderSchema = new mongoose.Schema({
  orderNo: { type: String, required: true }, // format: ORD-{storeCode}-{YYYYMMDD}-{seq}
  orderType: { type: String, enum: ['new', 'replacement', 'repair', 'trial'], default: 'new' },
  customerId: { type: ObjectId, ref: 'Customer', required: true },
  storeId: { type: ObjectId, required: true },
  tenantId: { type: ObjectId, required: true },
  prescriptionId: ObjectId, // from prescription-service

  items: [{
    lineNo: Number,
    itemType: { type: String, enum: ['frame', 'lens', 'contactLens', 'accessory', 'case', 'solution'] },
    productId: ObjectId,
    productRef: String,      // brand + type summary for display
    qty: { type: Number, default: 1 },
    unitPrice: Number,
    discountPercent: Number,
    discountAmount: Number,
    gstPercent: Number,
    hsnCode: String,
    cgst: Number,
    sgst: Number,
    igst: Number,
    lineTotal: Number,       // after discount + tax

    // For lens lines
    eye: { type: String, enum: ['right', 'left', 'both'] },
    lensSpec: {
      sph: Number, cyl: Number, axis: Number,
      add: Number, pd: Number, prism: Number
    },

    stockStatus: { type: String, enum: ['reserved', 'rx-pending', 'partial', 'in-stock-used', 'inward-received'], default: 'rx-pending' },
    stockId: ObjectId,        // reserved stock record
    requirementId: ObjectId   // PendingRXRequirement if rx-pending
  }],

  deliveryDate: Date,
  promisedDeliveryDate: Date,
  orderStatus: {
    type: String,
    enum: ['draft', 'confirmed', 'lens-inward', 'cutting', 'fitting', 'qc', 'packing', 'dispatched', 'store-received', 'delivered', 'cancelled', 'on-hold'],
    default: 'draft'
  },
  paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },

  billAmount: Number,
  discountTotal: Number,
  taxableAmount: Number,
  gstTotal: Number,
  totalAmount: Number,
  paidAmount: { type: Number, default: 0 },
  dueAmount: Number,

  gstInvoice: { type: Boolean, default: false },
  gstInvoiceNo: String,
  fromGSTIN: String,
  toState: String,

  payments: [{
    amount: Number,
    mode: { type: String, enum: ['cash', 'card', 'upi', 'bank-transfer', 'cheque'] },
    reference: String,
    paidAt: Date,
    receivedBy: ObjectId
  }],

  labOrderId: ObjectId,
  complaintId: ObjectId, // if this is a replacement order
  createdBy: ObjectId,
  confirmedBy: ObjectId,
  notes: String,
  cancellationReason: String
}, { timestamps: true });

OpticalOrderSchema.index({ tenantId: 1, storeId: 1, orderStatus: 1, createdAt: -1 });
OpticalOrderSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });
OpticalOrderSchema.index({ tenantId: 1, orderNo: 1 }, { unique: true });
```

---

**Track B — Frontend: Optical Order List + Routing**

Package: `sales-mfe`

**1. Optical order list page** `sales-mfe/src/app/orders/page.tsx`:
- Table columns: Order No., Customer, Store, Order Type, Status chip, Payment Status chip, Delivery Date, Total, Actions
- Status chips: color-coded (draft=grey, confirmed=blue, cutting=orange, fitting=yellow, qc=purple, dispatched=teal, delivered=green, cancelled=red)
- Filters: Status (multi-select), Store (select), Date range, Order type
- "New Order" button → navigates to `/orders/new`
- Wrap in `<PlanGate requires="opticalOrders">`

**2. Order detail page** `sales-mfe/src/app/orders/[id]/page.tsx`:
- Header section: order meta (no., date, store, customer card link)
- Items section: placeholder sections (lens spec display, stock status badge placeholder — wired in S2)
- Payment section: bill amount, paid, due, payment history
- Status timeline: all stages with timestamps

**3. Order routing** added to `shell` navigation: `/orders` → `sales-mfe` order list

**Deliverable check Day 4:** `/orders` renders; order detail drawer opens without crashing; route is in navigation.

---

### Day 5 — Friday May 2

**Track A — Backend: Optical Order REST APIs (Complete)**

```javascript
// POST /api/sales/optical-orders
// Creates order; runs stock-check stub (returns rx-pending for all lens lines until S2)
router.post('/', auth, checkPlan('opticalOrders'), opticalOrderController.create);

// GET /api/sales/optical-orders
// Query: ?storeId=&customerId=&status=&paymentStatus=&dateFrom=&dateTo=&page=&limit=
router.get('/', auth, opticalOrderController.list);

// GET /api/sales/optical-orders/:id
router.get('/:id', auth, opticalOrderController.getById);

// PATCH /api/sales/optical-orders/:id/status
// Body: { status, notes } — validates allowed transitions
router.patch('/:id/status', auth, opticalOrderController.updateStatus);

// PATCH /api/sales/optical-orders/:id/payment
// Body: { amount, mode, reference }
router.patch('/:id/payment', auth, opticalOrderController.addPayment);

// PATCH /api/sales/optical-orders/:id/cancel
// Body: { reason }
router.patch('/:id/cancel', auth, opticalOrderController.cancel);

// GET /api/sales/optical-orders/customer/:customerId
// Order history for CRM profile
router.get('/customer/:customerId', auth, opticalOrderController.byCustomer);
```

**Status transition validation:**
```javascript
const ALLOWED_TRANSITIONS = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['lens-inward', 'cancelled', 'on-hold'],
  'lens-inward': ['cutting'],
  cutting: ['fitting', 'rework'],
  fitting: ['qc'],
  qc: ['packing', 'cutting'], // cutting = rework
  packing: ['dispatched'],
  dispatched: ['store-received'],
  'store-received': ['delivered'],
  delivered: [],
  cancelled: [],
  'on-hold': ['confirmed', 'cancelled']
};
```

---

**Track B — Frontend: Live Order Create + Status Transitions**

Package: `sales-mfe`

**1. Order create form** `sales-mfe/src/app/orders/new/page.tsx`:
- Step 1: Customer lookup (search by name/phone → create if new)
- Step 2: Prescription capture (SPH, CYL, Axis, ADD, PD for R/L eye) or select existing Rx from history
- Step 3: Item selection — tabs for Frame / Lens / CL / Accessories; lens selector shows lens master catalog
- Step 4: Delivery date picker
- Step 5: Review & confirm

**2. Status transition UI** on order detail:
- "Advance to next stage" button (role-gated: lab staff can move fitting stages; only admin can cancel)
- Confirmation modal for irreversible transitions (cancel, dispatch)

**3. Stock status badge component** `shared/src/components/StockStatusBadge.tsx`:
- Shows `reserved` (green), `rx-pending` (amber), `partial` (blue), `in-stock-used` (grey) — populated from API response
- Stub for S1: always shows `rx-pending` (wired in S2 Day 7)

**Deliverable check Day 5:** Full order create flow works end-to-end with demo data; status can be advanced; cancel works.

---

### Day 6 — Saturday May 3

**Track A — Backend: GST on Order + Partial Payment Stub**

**GST calculation stub** in `sales-service/src/utils/gstCalc.js`:
```javascript
// Stub — full implementation in Sprint 4 Day 26
function computeLineGST({ unitPrice, qty, discountAmount, gstPercent, fromGSTIN, toState }) {
  const taxableAmt = (unitPrice * qty) - discountAmount;
  const gstAmount = taxableAmt * gstPercent / 100;
  // Stub: default to intra-state CGST+SGST until GSTIN master is built (S4)
  return {
    taxableAmount: taxableAmt,
    cgst: gstAmount / 2,
    sgst: gstAmount / 2,
    igst: 0,
    gstTotal: gstAmount,
    lineTotal: taxableAmt + gstAmount
  };
}
```

**Partial payment logic:**
- On `PATCH /api/sales/optical-orders/:id/payment`: calculate `dueAmount = billAmount - newPaidAmount`
- If `dueAmount > 0`: set `paymentStatus: 'partial'`; create a stub `CustomerDue` record (just the data; no reminder/JTS yet — wired S4)
- If `dueAmount === 0`: set `paymentStatus: 'paid'`

**Invoice number generation:**
```javascript
// INV-{STORE_CODE}-{YYYYMMDD}-{4-digit-seq}
// Stored as unique index on OpticalOrder
```

---

**Track B — Frontend: Line-Level Tax Display + Partial Payment UX**

Package: `sales-mfe`, `financial-mfe`

**1. Tax breakdown in order detail:**
- Line items show HSN code, GST %, taxable amount, CGST, SGST (from server response)
- Order footer: Subtotal / Discount / Taxable / CGST / SGST / Total
- "GST Invoice" toggle — calls `PATCH /:id` with `{ gstInvoice: true }` (requires GSTIN on tenant — validation message if not set up)

**2. Partial payment UX:**
- Payment modal: amount field + mode select + reference input
- After submit: "Due balance: ₹ X remaining" banner on order detail
- Due preview section shows: due amount, no due date yet (set in S4 when CustomerDue model is wired)

**Deliverable check Day 6:** A confirmed order shows line-level GST split; adding a partial payment shows updated due balance; GST invoice toggle works.

---

## SECTION 6: Sprint 2 — Inventory + Vendor + Barcode + Damage
**Dates:** May 4 – May 10, 2026  
**Goal:** Wire the full stock-vs-RX decision loop: from order line reservation through vendor purchase, inward validation, returns, barcode label printing, and damage recording.  
**Sprint Acceptance Criteria:** A store user can trace an order line from "RX pending" through vendor purchase to inward receipt; an auditor can approve or reject a damage entry.

---

### Day 7 — Monday May 4

**Track A — Backend: Stock Reservation + RX Pending Model**

Service: `inventory-service`

```javascript
// LensStock.model.js — new model for per-unit optical stock
const LensStockSchema = new mongoose.Schema({
  lensMasterId: { type: ObjectId, ref: 'LensMaster', required: true },
  storeId: ObjectId,
  tenantId: ObjectId,
  sph: Number, cyl: Number, axis: Number,
  index: Number,
  coating: String,
  physicalQty: { type: Number, default: 0 },
  reservedQty: { type: Number, default: 0 },
  // availableQty = physicalQty - reservedQty (virtual)
  barcodeData: String,
  version: { type: Number, default: 0 } // optimistic locking
}, { timestamps: true });

LensStockSchema.index({ tenantId: 1, storeId: 1, sph: 1, cyl: 1, axis: 1, index: 1, coating: 1 }, { unique: true });
```

**Stock check + reservation function** with MongoDB transaction:
```javascript
async function checkAndReserveStock(lensSpec, qty, storeId, tenantId, session) {
  // session = MongoDB ClientSession for transaction
  const stock = await LensStock.findOne({ ...lensSpec, storeId, tenantId }).session(session);
  const available = stock ? stock.physicalQty - stock.reservedQty : 0;

  if (available >= qty) {
    await LensStock.findByIdAndUpdate(stock._id, {
      $inc: { reservedQty: qty, version: 1 }
    }, { session });
    return { status: 'reserved', stockId: stock._id, qtyReserved: qty };
  }

  if (available > 0 && available < qty) {
    await LensStock.findByIdAndUpdate(stock._id, {
      $inc: { reservedQty: available, version: 1 }
    }, { session });
    const pending = await PendingRXRequirement.create([{
      ...lensSpec, storeId, tenantId,
      qtyRequired: qty - available, qtyFromStock: available
    }], { session });
    return { status: 'partial', stockId: stock._id, requirementId: pending[0]._id };
  }

  const pending = await PendingRXRequirement.create([{
    ...lensSpec, storeId, tenantId,
    qtyRequired: qty, qtyFromStock: 0
  }], { session });
  return { status: 'rx-pending', requirementId: pending[0]._id };
}
```

**PendingRXRequirement model:**
```javascript
const PendingRXRequirementSchema = new mongoose.Schema({
  orderId: ObjectId, orderLineNo: Number,
  lensMasterId: ObjectId,
  sph: Number, cyl: Number, axis: Number, index: Number, coating: String,
  qtyRequired: Number, qtyFromStock: Number,
  qtyPending: Number,      // = qtyRequired - qtyFromStock
  status: { type: String, enum: ['open', 'vendor-ordered', 'partially-received', 'closed'], default: 'open' },
  vendorOrderId: ObjectId,
  storeId: ObjectId,
  tenantId: ObjectId
}, { timestamps: true });
```

Wire `checkAndReserveStock` into `POST /api/sales/optical-orders` — run in a MongoDB transaction covering both OpticalOrder creation and stock reservation.

---

**Track B — Frontend: Order Line Stock Status Badges**

Package: `sales-mfe`

**1. Wire stock status badges** — replace Day 5 stubs with live `stockStatus` field from API:
- `reserved` → green chip "In Stock"
- `rx-pending` → amber chip "RX Pending"
- `partial` → blue chip "Partial (N in stock)"
- Each chip links to the stock/requirement detail if user has inventory permission

**2. Order list** — add stock status column showing aggregate:
- All reserved = green dot
- Any rx-pending = amber dot (most common)
- Mix = split dot

**Deliverable check Day 7:** Creating a new order with a lens line shows the correct stock status badge immediately after creation.

---

### Day 8 — Tuesday May 5

**Track A — Backend: Vendor RX Orders API**

Service: `purchase-service`

```javascript
// VendorRXOrder.model.js
const VendorRXOrderSchema = new mongoose.Schema({
  vendorId: { type: ObjectId, ref: 'Supplier', required: true },
  items: [{
    requirementIds: [ObjectId],
    lensMasterId: ObjectId,
    lensSpec: { sph: Number, cyl: Number, axis: Number, index: Number, coating: String },
    qtyOrdered: Number,
    qtyReceived: { type: Number, default: 0 },
    status: { type: String, enum: ['ordered', 'partially-received', 'received', 'cancelled'], default: 'ordered' }
  }],
  status: { type: String, enum: ['draft', 'sent', 'acknowledged', 'partially-received', 'closed', 'cancelled'], default: 'draft' },
  sentAt: Date,
  expectedDelivery: Date,
  acknowledgedAt: Date,
  storeId: ObjectId,
  tenantId: ObjectId,
  notes: String
}, { timestamps: true });
```

**APIs:**
- `POST /api/purchase/rx-orders/aggregate` — aggregate all `open` PendingRXRequirements for a store/vendor; create VendorRXOrder; update Requirement.status to `vendor-ordered`
- `GET /api/purchase/rx-orders` — list with filters: `?vendorId=&status=&storeId=`
- `GET /api/purchase/rx-orders/:id` — detail with linked requirement orders
- `PATCH /api/purchase/rx-orders/:id/send` — mark as sent to vendor; trigger notification
- `PATCH /api/purchase/rx-orders/:id/acknowledge` — vendor acknowledged; set `acknowledgedAt`, `expectedDelivery`

---

**Track B — Frontend: RX Purchase Board**

Package: `inventory-mfe`

**1. RX purchase board** `inventory-mfe/src/app/rx-orders/page.tsx`:
- Two-panel layout: left = pending requirements (grouped by lens spec), right = vendor orders
- "Aggregate & Create PO" button — calls aggregate API per vendor
- VendorRXOrder list: columns = Vendor, Items count, Total Qty, Status, Expected Delivery, Actions
- Each row expandable: shows linked optical orders with customer name

**2. Requirement aggregation view:**
- Group by vendor (from lens master vendorMapping) + power/spec
- Show which optical orders are waiting for each power

**Deliverable check Day 8:** User can see pending RX requirements, click "Aggregate & Create PO", and see a new vendor order created with linked requirements.

---

### Day 9 — Wednesday May 6

**Track A — Backend: Vendor Inward Validation APIs**

Service: `purchase-service`

```javascript
// InwardEntry.model.js
const InwardEntrySchema = new mongoose.Schema({
  vendorRXOrderId: ObjectId,
  vendorId: ObjectId,
  storeId: ObjectId,
  tenantId: ObjectId,
  items: [{
    vendorOrderItemIdx: Number,
    lensMasterId: ObjectId,
    lensSpec: { sph: Number, cyl: Number, axis: Number, index: Number, coating: String },
    qtyOrdered: Number,
    qtyReceived: Number,
    validationResult: {
      type: String,
      enum: ['correct', 'wrong-power', 'damaged', 'scratched', 'coating-issue', 'wrong-product', 'expired'],
      required: true
    },
    qtyAccepted: Number,
    qtyRejected: Number,
    photos: [String], // S3 URLs
    notes: String,
    returnRequired: { type: Boolean, default: false },
    vendorReturnId: ObjectId // auto-created if returnRequired
  }],
  receivedBy: ObjectId,
  receivedAt: { type: Date, default: Date.now },
  overallStatus: { type: String, enum: ['complete', 'partial', 'rejected'], default: 'complete' }
}, { timestamps: true });
```

**APIs:**
- `POST /api/purchase/inward` — create inward entry; for accepted qty → add to LensStock; close linked PendingRXRequirements; for rejected qty → auto-create VendorReturn
- `GET /api/purchase/inward` — list; `GET /api/purchase/inward/:id` — detail
- `PATCH /api/purchase/inward/:id/item/:idx/photo` — upload photo for a line item

---

**Track B — Frontend: Inward Screen**

Package: `inventory-mfe`

**1. Inward entry screen** `inventory-mfe/src/app/inward/new/page.tsx`:
- Select vendor order → line items auto-populated from order
- Per line: "Qty Received" number input, "Validation Result" select (correct/wrong-power/damaged/scratched/coating-issue/wrong-product/expired), "Notes" text
- Photo upload per line (drag-and-drop or camera; calls photo upload BFF)
- Result chips color-coded: correct=green, any rejection reason=red

**2. Inward list** `inventory-mfe/src/app/inward/page.tsx`:
- Columns: Date, Vendor, Items, Accepted, Rejected, Received By

**Deliverable check Day 9:** User can create an inward entry for a vendor order, mark wrong-power on a line, upload a photo, and submit. API correctly updates stock for accepted items.

---

### Day 10 — Thursday May 7

**Track A — Backend: Vendor Return + Vendor Score**

```javascript
// VendorReturn.model.js
const VendorReturnSchema = new mongoose.Schema({
  vendorId: ObjectId,
  inwardEntryId: ObjectId,
  storeId: ObjectId, tenantId: ObjectId,
  items: [{
    lensMasterId: ObjectId,
    lensSpec: { sph: Number, cyl: Number, axis: Number },
    qty: Number,
    rejectionReason: String,
    photos: [String]
  }],
  status: {
    type: String,
    enum: ['return-required', 'returned-to-vendor', 'replacement-pending', 'replacement-received', 'credit-note-received', 'closed'],
    default: 'return-required'
  },
  returnDate: Date,
  replacementExpectedDate: Date,
  replacementReceivedDate: Date,
  creditNoteAmount: Number
}, { timestamps: true });

// VendorScore.model.js — updated on every inward + return event
const VendorScoreSchema = new mongoose.Schema({
  vendorId: ObjectId, tenantId: ObjectId,
  month: String, // 'YYYY-MM'
  totalOrderLines: { type: Number, default: 0 },
  correctDeliveries: { type: Number, default: 0 },
  wrongPower: { type: Number, default: 0 },
  damaged: { type: Number, default: 0 },
  scratched: { type: Number, default: 0 },
  coatingIssue: { type: Number, default: 0 },
  wrongProduct: { type: Number, default: 0 },
  delayedOrders: { type: Number, default: 0 },
  // score = (correctDeliveries / totalOrderLines) * 100
  score: Number
}, { timestamps: true });
```

**APIs:**
- `GET  /api/purchase/vendor-returns` — list; `GET /api/purchase/vendor-returns/:id`
- `PATCH /api/purchase/vendor-returns/:id/status` — update return status; if `replacement-received` → trigger new inward entry
- `GET  /api/purchase/vendor-score` — all vendors for current month
- `GET  /api/purchase/vendor-score/:vendorId` — scorecard with monthly trend

---

**Track B — Frontend: Returns List + Vendor Scorecard**

Package: `inventory-mfe`

**1. Vendor returns list** `inventory-mfe/src/app/vendor-returns/page.tsx`:
- Columns: Date, Vendor, Items, Rejection Reasons, Status chip, Actions
- Status chip: return-required=red, replacement-pending=amber, replacement-received=green

**2. Vendor scorecard page** `inventory-mfe/src/app/vendor-scorecard/page.tsx`:
- Summary table: Vendor Name | Score | Correct % | Wrong Power | Damaged | Delayed | Trend
- Trend shown as simple bar per month (last 3 months)
- Score color: ≥90=green, 70–89=amber, <70=red

**Deliverable check Day 10:** Returns list shows; status can be advanced; vendor scorecard shows calculated scores per vendor.

---

### Day 11 — Friday May 8

**Track A — Backend: Barcode/QR Generation + Scan Lookup**

Service: `inventory-service`

```javascript
// Using 'bwip-js' (already common in Node inventory systems) for barcode generation
// Each product unit in LensStock, FrameStock, CLStock gets a unique code:
// Format: ET-{tenantShortCode}-{productType}-{unitId}
// e.g. ET-TN01-LENS-6475abc...

POST /api/inventory/barcode/generate
// Body: { productType, productId, storeId, qty } — generates for qty units
// Returns: [{ unitId, barcodeData: base64, qrValue: string, printUrl: string }]

GET /api/inventory/scan/:code
// Scans a barcode/QR; returns full product detail + current stock status + location
// Response: { product, lensMaster, stockStatus, storeId, reservedFor, location }

POST /api/inventory/audit/scan
// Body: { auditSessionId, code, scannedQty }
// Records a scan against an audit session (built in Sprint 3)
// Also works as standalone fast-scan: returns product detail without audit session

GET /api/inventory/barcode/print/:productId
// Returns PDF-ready barcode sheet (multiple labels per page)
```

---

**Track B — Frontend: Barcode Generate + Scan UI**

Package: `inventory-mfe`

**1. Barcode generate screen** `inventory-mfe/src/app/barcode/generate/page.tsx`:
- Select product type → search product → specify qty
- Preview: shows barcode + QR code image for first label
- "Print Labels" → opens PDF in new tab (calls `/api/inventory/barcode/print/:productId`)

**2. Scan lookup page** `inventory-mfe/src/app/barcode/scan/page.tsx`:
- Camera scan using `html5-qrcode` library (or `@zxing/browser`)
- Manual entry fallback: text input for barcode string
- Result card: product photo, name, current qty, store, reservation status

**Deliverable check Day 11:** Scan a barcode (or type it manually) → product detail appears; "Print Labels" generates a PDF.

---

### Day 12 — Saturday May 9

**Track A — Backend: Damage Entry + Review Workflow**

Service: `inventory-service`

```javascript
// DamageEntry.model.js
const DamageEntrySchema = new mongoose.Schema({
  storeId: ObjectId, tenantId: ObjectId,
  type: {
    type: String,
    enum: ['frame-damage', 'sunglass-damage', 'lens-damage', 'cl-damage', 'mishandling', 'customer-trial-damage', 'storage-damage', 'wear-and-tear'],
    required: true
  },
  productId: ObjectId,
  productType: { type: String, enum: ['frame', 'lens', 'contactLens', 'accessory'] },
  lensMasterId: ObjectId, // for lens damage
  lensSpec: { sph: Number, cyl: Number, axis: Number, index: Number, coating: String },
  qty: { type: Number, default: 1 },
  estimatedCostPerUnit: Number,
  totalEstimatedCost: Number,
  description: String,
  photos: [String],
  reportedBy: ObjectId,

  // Review
  auditorId: ObjectId,
  reviewStatus: { type: String, enum: ['pending', 'under-review', 'approved', 'rejected'], default: 'pending' },
  reviewedAt: Date,
  reviewNotes: String,

  // Decision
  fineDecision: { type: String, enum: ['no-fine', 'fine-applied', 'vendor-claim', 'insurance-claim'] },
  fineAmount: Number,
  fineAppliedTo: ObjectId, // employee
  vendorClaimId: ObjectId,

  // Stock impact
  stockImpact: { type: String, enum: ['blocked', 'written-off', 'unblocked', 'vendor-return'], default: 'blocked' },
  financePosted: { type: Boolean, default: false },
  financeExpenseId: ObjectId
}, { timestamps: true });

DamageEntrySchema.index({ tenantId: 1, storeId: 1, reviewStatus: 1, createdAt: -1 });
```

**APIs:**
- `POST /api/inventory/damage` — create; set `stockImpact: 'blocked'` immediately (stock blocked)
- `GET /api/inventory/damage` — list; `?storeId=&reviewStatus=&dateFrom=&dateTo=`
- `GET /api/inventory/damage/:id`
- `PATCH /api/inventory/damage/:id/assign-auditor` — assign auditor; status → `under-review`
- `PATCH /api/inventory/damage/:id/approve` — approves; takes `{ fineDecision, fineAmount, fineAppliedTo }`; sets `stockImpact: 'written-off'`; creates finance expense stub
- `PATCH /api/inventory/damage/:id/reject` — rejects; sets `stockImpact: 'unblocked'`; stock available again
- `PATCH /api/inventory/damage/:id/photo` — upload evidence photo (S3)

---

**Track B — Frontend: Damage Create + Auditor Queue**

Package: `inventory-mfe`

**1. Damage report form** `inventory-mfe/src/app/damage/new/page.tsx`:
- Damage type (select), Product type + search, Qty, Description (textarea)
- Photo upload (multi-file, drag-and-drop, preview thumbnails)
- Submit → shows "Pending auditor review" status

**2. Auditor queue** `inventory-mfe/src/app/damage/queue/page.tsx`:
- Table: Date, Reporter, Store, Type, Product, Qty, Estimated Cost, Status, Actions
- "Assign to me" button for auditor to take ownership
- In review: "Approve" / "Reject" buttons; approve opens decision modal

**3. Decision modal:**
- Fine decision radio: No fine / Fine applied / Vendor claim
- If "Fine applied": employee select + fine amount field
- If "Vendor claim": vendor select
- Submit → calls approve API

**Deliverable check Day 12:** Store user creates damage entry; auditor sees it in queue; auditor approves with fine decision; status updates.

---

### Day 13 — Sunday May 10 — Buffer Day

**Track A:** Integration tests: stock reservation race condition (concurrent order creation for same lens spec); vendor inward → requirement closed chain; damage block/unblock  
**Track B:** Smoke test: login → open optical orders → open lens master → create order → scan barcode  
**Both:** Code review of Week 2 work; push to staging; fix any blocker before Sprint 3

---

## SECTION 7: Sprint 3 — Audit + Dead Stock + Lab + Breakage
**Dates:** May 11 – May 17, 2026  
**Goal:** Complete the physical-control and lab-production surfaces.  
**Sprint Acceptance Criteria:** An auditor can create a session, scan items, see mismatches, open a linked JTS task, and propose a correction that is read-only until approved.

---

### Day 14 — Monday May 11

**Track A — Backend: Audit Session + Scan Loop + Mismatch Detection**

Service: `inventory-service`

```javascript
// AuditSession.model.js
const AuditSessionSchema = new mongoose.Schema({
  type: { type: String, enum: ['daily', 'cycle', 'monthly', 'ho-auditor', 'surprise'], required: true },
  storeId: ObjectId, departmentId: ObjectId, tenantId: ObjectId,
  assignedTo: [{ type: ObjectId, ref: 'Employee' }],
  startDate: Date, endDate: Date,
  status: { type: String, enum: ['assigned', 'in-progress', 'scan-complete', 'mismatch-review', 'correction-pending', 'closed'], default: 'assigned' },
  scanProgress: { scanned: Number, total: Number },
  mismatchCount: { type: Number, default: 0 }
}, { timestamps: true });

// AuditScanRecord.model.js
const AuditScanRecordSchema = new mongoose.Schema({
  auditSessionId: ObjectId,
  productId: ObjectId, productType: String,
  barcodeCode: String,
  scannedQty: Number,
  systemQty: Number,
  mismatch: Boolean,
  mismatchQty: Number, // positive = surplus; negative = shortage
  notes: String,
  photos: [String],
  scannedBy: ObjectId,
  scannedAt: { type: Date, default: Date.now }
});
```

**APIs:**
- `POST /api/inventory/audits` — create session
- `POST /api/inventory/audits/:sessionId/scan` — record scan; auto-calculate mismatch; update `scanProgress`
- `GET  /api/inventory/audits/:sessionId/mismatches` — list mismatches
- `POST /api/inventory/audits/:sessionId/complete` — mark scan phase complete; trigger mismatch processing (Day 15)

---

**Track B — Frontend: Audit Session Create + Scan Loop**

Package: `inventory-mfe`

**1. Create audit session** `inventory-mfe/src/app/audits/new/page.tsx`:
- Audit type (select), store (select), assign to (multi-user select), start date/end date

**2. Active audit scan page** `inventory-mfe/src/app/audits/[id]/scan/page.tsx`:
- Camera scan + manual entry (same barcode component as Day 11)
- On scan: live mismatch calculation shows immediately ("Expected: 4, Scanned: 3 — SHORT by 1")
- Progress bar: N items scanned of M expected
- Mismatch list sidebar: items with discrepancy highlighted in red/amber

**Deliverable check Day 14:** Create audit session; scan 3 items; see mismatch for one.

---

### Day 15 — Tuesday May 12

**Track A — Backend: Mismatch → JTS + Stock Correction API**

```javascript
// When POST /api/inventory/audits/:sessionId/complete is called:
// 1. Group all mismatches by severity
// 2. For each mismatch: create a JTS task
async function createMismatchJTSTasks(sessionId) {
  const mismatches = await AuditScanRecord.find({ auditSessionId: sessionId, mismatch: true });
  for (const m of mismatches) {
    await jtsServiceClient.createTask({
      type: 'stock-mismatch-investigation',
      title: `Stock mismatch: ${m.productType} ${m.barcodeCode}`,
      priority: Math.abs(m.mismatchQty) > 5 ? 'high' : 'medium',
      assignedTo: auditSession.storeManagerId,
      linkedEntity: { type: 'audit-scan-record', id: m._id },
      dueDate: addDays(new Date(), 2),
      tenantId: auditSession.tenantId
    });
  }
}

// StockCorrection.model.js
const StockCorrectionSchema = new mongoose.Schema({
  auditSessionId: ObjectId, scanRecordId: ObjectId,
  productId: ObjectId, storeId: ObjectId, tenantId: ObjectId,
  correctionType: { type: String, enum: ['increase', 'decrease'] },
  qty: Number,
  reason: String,
  proposedBy: ObjectId,
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: ObjectId, approvedAt: Date,
  jtsTaskId: ObjectId,
  photos: [String]
});

// POST /api/inventory/stock-corrections — propose correction (read-only until approved)
// PATCH /api/inventory/stock-corrections/:id/approve — applies to LensStock/FrameStock; requires manager role
// PATCH /api/inventory/stock-corrections/:id/reject
```

---

**Track B — Frontend: Mismatch List + JTS Deep-Link + Correction Proposal**

Package: `inventory-mfe`

**1. Mismatch list page** `inventory-mfe/src/app/audits/[id]/mismatches/page.tsx`:
- Table: Product, Expected Qty, Scanned Qty, Difference, Status, JTS Task, Actions
- "Open JTS Task" button → navigates to `/tasks/{jtsTaskId}` in `hrms-mfe` (cross-MFE deep link via URL)

**2. Correction proposal panel:**
- "Propose Correction" button (stores only — read-only until manager approves)
- Once submitted: shows "Pending Approval" badge
- Approved corrections show updated stock immediately

**Deliverable check Day 15:** Complete audit → mismatch JTS tasks created → "Open task" navigates to JTS UI → correction proposal is read-only until approved by manager.

---

### Day 16 — Wednesday May 13

**Track A — Backend: Dead Stock Detection Scheduler**

Service: `analytics-service` / `inventory-service`

```javascript
// Cron: runs daily at 02:00 AM per tenant
// Dead stock: no sale in > 90 days for lenses, > 60 days for frames, > 45 days for CL
async function runDeadStockDetection(tenantId) {
  const thresholds = { lens: 90, frame: 60, contactLens: 45 };
  for (const [type, days] of Object.entries(thresholds)) {
    const cutoff = subDays(new Date(), days);
    const stocks = await getStocksWithNoSaleSince(type, cutoff, tenantId);
    for (const stock of stocks) {
      await DeadStockFlag.findOneAndUpdate(
        { productId: stock.productId, storeId: stock.storeId },
        {
          flaggedAt: new Date(), lastSaleDate: stock.lastSaleDate,
          daysSinceLastSale: stock.daysSinceLastSale,
          currentQty: stock.physicalQty,
          estimatedValue: stock.physicalQty * stock.costPrice,
          suggestion: await suggestAction(stock)
        },
        { upsert: true }
      );
    }
  }
}

// APIs:
// GET /api/analytics/dead-stock?storeId=&type=&minDays=
// GET /api/analytics/slow-moving?storeId=&days=30
// POST /api/inventory/dead-stock/:id/clearance — flag for clearance sale
// GET /api/inventory/dead-stock/transfer-suggestions?storeId= — store A dead + store B 0 qty = suggest transfer
```

---

**Track B — Frontend: Dead Stock Report + Transfer Suggestion**

Package: `inventory-mfe`

**1. Dead stock report** `inventory-mfe/src/app/dead-stock/page.tsx`:
- Table: Product, Store, Qty, Last Sale Date, Days Since Sale, Estimated Value, Suggestion chip
- Suggestion chips: "Transfer" (blue), "Clearance" (amber), "Return to Vendor" (red)
- "Suggest Transfer" action → selects target store → calls transfer suggestion API

**2. Clearance flag action:**
- "Mark Clearance" → sets flag; product appears in clearance section with discount suggestion

**Deliverable check Day 16:** Dead stock report loads; "Suggest Transfer" creates a transfer suggestion.

---

### Day 17 — Thursday May 14

**Track A — Backend: Lab Order Model + Stage API**

Service: `sales-service` — new files `src/routes/lab.routes.js`, `src/controllers/labController.js`, `src/models/LabOrder.model.js`

```javascript
// LabOrder.model.js — Canonical stages (consolidated)
const LabOrderSchema = new mongoose.Schema({
  opticalOrderId: { type: ObjectId, required: true },
  storeId: ObjectId, tenantId: ObjectId,
  currentStage: {
    type: String,
    enum: ['order-confirmed', 'lens-inward', 'cutting', 'fitting', 'qc', 'packing', 'dispatched', 'store-received', 'delivered', 'rework', 'cancelled'],
    default: 'order-confirmed'
  },
  reworkCount: { type: Number, default: 0 },
  stages: [{
    stage: String,
    startedAt: Date,
    completedAt: Date,
    completedBy: ObjectId,
    slaDurationHours: Number,
    slaBreach: Boolean,
    notes: String,
    jtsTaskId: ObjectId // if SLA breached → JTS task created
  }],
  assignedTechnician: ObjectId,
  qcRejectionReason: String,
  vendorDelayFlag: Boolean,
  fittingBreakageEntryId: ObjectId,
  dispatchDate: Date, receivedByStoreAt: Date, deliveredToCustomerAt: Date
}, { timestamps: true });

// SLA config per tenant (stored in tenant settings):
const DEFAULT_SLA_HOURS = {
  'lens-inward': 24, 'cutting': 4, 'fitting': 6, 'qc': 2,
  'packing': 1, 'dispatched': 24, 'store-received': 2
};
```

**APIs:**
- `POST /api/sales/lab-orders` — create (auto-created when optical order reaches `lens-inward`)
- `GET  /api/sales/lab-orders` — list; `?stage=&storeId=&technicianId=&dateFrom=&dateTo=`
- `GET  /api/sales/lab-orders/:id` — detail with full stage history
- `PATCH /api/sales/lab-orders/:id/stage` — advance stage; auto-check SLA; if breach → auto-create JTS task
- `GET  /api/sales/lab-orders/kanban?storeId=` — returns orders grouped by stage for Kanban view

---

**Track B — Frontend: Lab Kanban Board**

Package: `sales-mfe`

**1. Lab Kanban** `sales-mfe/src/app/lab/page.tsx`:
- Columns: Order Confirmed | Lens Inward | Cutting | Fitting | QC | Packing | Dispatched | Delivered
- Each card: order number, customer name, lens spec summary, technician avatar, SLA timer (red if breached)
- Role-gated drag: lab staff can move cards forward; only admin can move backward

**2. Lab card detail** (modal on click):
- Full stage history with timestamps
- Technician assigned
- SLA status per stage
- JTS task badge if SLA breached

**Deliverable check Day 17:** Lab Kanban shows orders grouped by stage; advancing a card calls the stage API.

---

### Day 18 — Friday May 15

**Track A — Backend: QC Reject/Rework + Vendor Delay JTS**

```javascript
// PATCH /api/sales/lab-orders/:id/qc-reject
// Body: { reason, reworkNotes }
// Action: stage → 'rework'; reworkCount++; if reworkCount > 2 → JTS escalation
router.patch('/:id/qc-reject', auth, labController.qcReject);

async function qcReject(req, res) {
  const { reason, reworkNotes } = req.body;
  const order = await LabOrder.findById(req.params.id);
  order.currentStage = 'rework'; // will be moved to cutting on next advance
  order.reworkCount += 1;
  order.qcRejectionReason = reason;
  await order.save();

  if (order.reworkCount > 2) {
    // Create escalation JTS task
    await createJTSTask({ type: 'lab-qc-escalation', priority: 'high', ... });
  }
  // Notify assigned technician
  await notificationService.send({ ... });
}

// Vendor delay detection (cron: every 6 hours)
async function checkVendorDelays(tenantId) {
  const pendingOrders = await PendingRXRequirement.find({
    status: 'vendor-ordered',
    createdAt: { $lt: subHours(new Date(), vendorSLAHours) },
    tenantId
  });
  for (const req of pendingOrders) {
    if (!req.vendorDelayClaimed) {
      await createJTSTask({ type: 'rx-order-follow-up', ... });
      req.vendorDelayClaimed = true;
      await req.save();
    }
  }
}
```

---

**Track B — Frontend: QC Reject Modal + JTS Task Badges**

Package: `sales-mfe`

**1. QC reject modal** (triggered from Kanban QC column card):
- Reason text area, rework notes
- Submit → card moves to "Rework" column

**2. JTS task badge on lab card:**
- If `jtsTaskId` present on any stage: show orange badge "SLA Breach — Task #{id}"
- Click → deep link to `/tasks/{id}`

**3. Rework indicator:**
- If `reworkCount > 0`: amber badge "Rework x{count}" on card

**Deliverable check Day 18:** QC reject modal works; rework count badge shows; JTS task deep-link opens correct task.

---

### Day 19 — Saturday May 16

**Track A — Backend: Breakage Entry Model**

Service: `inventory-service`

```javascript
// BreakageEntry.model.js
const BreakageEntrySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['broke-during-fitting', 'wrong-cut', 'handling-damage', 'missing', 'scratched', 'coating-issue', 'vendor-defect', 'storage-damage'],
    required: true
  },
  lensMasterId: ObjectId,
  lensSpec: { sph: Number, cyl: Number, axis: Number, index: Number, coating: String },
  productType: { type: String, enum: ['lens', 'contactLens', 'frame', 'accessory'] },
  qty: { type: Number, default: 1 },
  costPerUnit: Number,
  totalCost: Number,
  opticalOrderId: ObjectId,
  labOrderId: ObjectId,
  staffId: ObjectId, // person responsible
  stage: String, // which stage of the process
  description: String,
  photos: [String],
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: ObjectId, approvedAt: Date,
  financeImpact: { type: Boolean, default: false },
  financeExpenseId: ObjectId,
  vendorDefectClaim: { type: Boolean, default: false },
  vendorReturnId: ObjectId, // auto-created if vendorDefectClaim
  replacementLabOrderId: ObjectId, // new lab order for replacement lens
  storeId: ObjectId, tenantId: ObjectId
}, { timestamps: true });

// APIs:
// POST /api/inventory/breakage — creates entry; deducts from stock (blocked)
// PATCH /api/inventory/breakage/:id/approve — writes off stock; flags finance; if vendor defect → VendorReturn
// PATCH /api/inventory/breakage/:id/reject — unblocks stock
// GET /api/inventory/breakage?storeId=&staffId=&type=&dateFrom=&dateTo=
```

---

**Track B — Frontend: Breakage Form**

Package: `inventory-mfe`

**1. Breakage create form** `inventory-mfe/src/app/breakage/new/page.tsx`:
- Type (select), link to optical order or lab order (search + select), staff responsible (employee select)
- Lens spec fields (if lens breakage), description, photo upload
- "Which stage did this happen?" — select from lab stages

**2. Breakage list** `inventory-mfe/src/app/breakage/page.tsx`:
- Filterable by type, staff, date range, approval status

**Deliverable check Day 19:** Breakage form submits; appears in list; approve/reject works.

---

### Day 20 — Sunday May 17 — Buffer Day

**Track A:** Wire breakage approval → JTS task creation; integrate lab stage changes with `realtime-service` events  
**Track B:** Document notifications strategy (poll vs WebSocket decision: **use polling every 10s for lab stage updates in V1; WebSocket deferred to post-V1**); wire lab realtime updates  
**Both:** Push Sprint 3 to staging; run smoke test

---

## SECTION 8: Sprint 4 — Finance + GST + Deposits + Dues + Complaints
**Dates:** May 18 – May 24, 2026  
**Goal:** Deliver cash-control and compliance surfaces critical for real stores.  
**Sprint Acceptance Criteria:** A store manager can submit a deposit; an accounts user can verify or flag a discrepancy; a CS rep can open a complaint, make a decision, and link a replacement order.

---

### Day 21 — Monday May 18

**Track A — Backend: Store Deposit Model + JTS Auto-Create**

Service: `financial-service`

```javascript
// StoreDeposit.model.js
const StoreDepositSchema = new mongoose.Schema({
  storeId: ObjectId, tenantId: ObjectId,
  date: { type: Date, required: true },
  dailyCashSales: Number,   // what store claims total cash sales were
  cashDepositedAmount: { type: Number, required: true },
  depositMode: { type: String, enum: ['cash-at-bank', 'online-transfer', 'cash-pickup', 'cheque'], required: true },
  bankName: String,
  accountNumber: String,    // last 4 digits only
  utrReference: String,
  depositDate: Date,
  depositedBy: { type: ObjectId, required: true },
  receiptUrl: String,       // S3 URL of uploaded slip
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected', 'discrepancy'], default: 'pending' },
  verifiedBy: ObjectId, verifiedAt: Date,
  discrepancyAmount: Number, discrepancyNotes: String,
  jtsTaskId: ObjectId,      // auto-created on submission
  financeEntryId: ObjectId  // created only after verification
}, { timestamps: true });

// On POST: auto-create JTS task
async function createDepositVerificationTask(deposit) {
  return jtsServiceClient.createTask({
    type: 'cash-deposit-verification',
    title: `Verify deposit from ${deposit.storeName} — ₹${deposit.cashDepositedAmount}`,
    priority: 'high',
    assignedRole: 'accountant',
    linkedEntity: { type: 'store-deposit', id: deposit._id },
    dueDate: addDays(new Date(), 1),
    tenantId: deposit.tenantId
  });
}

// APIs:
// POST /api/financial/deposits — submit deposit; auto-create JTS
// GET  /api/financial/deposits?storeId=&status=&dateFrom=&dateTo=
// GET  /api/financial/deposits/:id
// PATCH /api/financial/deposits/:id/verify
// PATCH /api/financial/deposits/:id/reject — with reason
// PATCH /api/financial/deposits/:id/discrepancy — with discrepancyAmount + notes
// GET  /api/financial/deposits/reconciliation?storeId=&month= — monthly reconciliation report
```

---

**Track B — Frontend: Store Deposit Form + Accounts Verification Queue**

Package: `financial-mfe`

**1. Store deposit submission form** `financial-mfe/src/app/deposits/new/page.tsx`:
- Date picker, daily cash sales (number), amount deposited (number)
- Deposit mode (radio: cash-at-bank / online / pickup / cheque)
- Conditional fields: Bank name + account last 4 + UTR (if online/cash-at-bank)
- Receipt upload (required)
- Submit → "Submitted for verification" success banner

**2. Accounts verification queue** `financial-mfe/src/app/deposits/verify/page.tsx`:
- Three tabs: Pending / Verified / Discrepancy
- Table: Date, Store, Claimed Sales, Deposited Amount, Mode, UTR, Days Pending, Actions
- "Verify" button + "Discrepancy" button; discrepancy opens modal: discrepancy amount + notes

**3. Monthly reconciliation view** `financial-mfe/src/app/deposits/reconciliation/page.tsx`:
- Store-wise: Total Sales | Total Deposited | Verified | Pending | Discrepancy | Gap

**Deliverable check Day 21:** Store user submits deposit → JTS task visible in accounts queue → accounts user can verify.

---

### Day 22 — Tuesday May 19

**Track A — Backend: Deposit Verify/Reject/Discrepancy Resolution**

- `PATCH /api/financial/deposits/:id/verify` — sets `verificationStatus: 'verified'`; creates finance revenue entry (POST to `/api/financial/ledger`); closes JTS task
- `PATCH /api/financial/deposits/:id/reject` — sets status `rejected`; JTS task updated with rejection notes; notification sent to store
- `PATCH /api/financial/deposits/:id/discrepancy` — status `discrepancy`; creates follow-up JTS task for store admin; `discrepancyAmount` recorded

**Track B — Frontend: Verify Action + Discrepancy Modal**

- Verify action: inline "Are you sure?" confirm → success toast "Finance entry created"
- Discrepancy modal: amount diff field + notes → submit
- Monthly reconciliation summary with gap highlighting (red for discrepancy > 5%)

**Deliverable check Day 22:** Full deposit lifecycle works: submit → verify → finance entry created; OR submit → discrepancy → follow-up JTS task.

---

### Day 23 — Wednesday May 20

**Track A — Backend: Customer Due Records (Creation on Partial Payment)**

Service: `financial-service`

```javascript
// CustomerDue.model.js
const CustomerDueSchema = new mongoose.Schema({
  customerId: { type: ObjectId, required: true },
  orderId: { type: ObjectId, required: true },
  storeId: ObjectId, tenantId: ObjectId,
  billAmount: Number,
  paidAmount: Number,
  dueAmount: { type: Number, required: true },
  dueDate: Date,                    // set by store at time of order
  approvedBy: ObjectId,             // manager who approved the credit
  recoveryStatus: { type: String, enum: ['open', 'partial-recovered', 'fully-recovered', 'written-off'], default: 'open' },
  reminderLog: [{
    channel: { type: String, enum: ['whatsapp', 'sms', 'call', 'email'] },
    sentAt: Date,
    outcome: String,
    sentBy: ObjectId
  }],
  overdueSince: Date,               // set when dueDate < today
  jtsTaskId: ObjectId,              // overdue JTS task
  followUpDate: Date
}, { timestamps: true });

CustomerDueSchema.index({ tenantId: 1, storeId: 1, recoveryStatus: 1, dueDate: 1 });
CustomerDueSchema.index({ tenantId: 1, customerId: 1 });

// Auto-created from optical order partial payment (Day 6 stub → fully wired now)
// APIs:
// POST /api/financial/customer-due — create (called from order payment logic)
// GET  /api/financial/customer-due?customerId=&storeId=&status=&overdue=
// GET  /api/financial/customer-due/:id
// PATCH /api/financial/customer-due/:id/collect — record payment
// GET  /api/financial/customer-due/aging?storeId= — 0-30/30-60/60-90/90+ buckets
// GET  /api/crm/:customerId/dues — CRM: due history for customer (cross-service call)
```

---

**Track B — Frontend: Due Ledger + CRM Dues Tab + Aging Chart**

Package: `financial-mfe`, `crm-mfe`

**1. Due ledger** `financial-mfe/src/app/dues/page.tsx`:
- Table: Customer, Order No., Bill Amount, Paid, Due, Due Date, Days Overdue (red if > 0), Status, Actions
- "Collect Payment" action → amount input modal
- Filters: Status, Store, Overdue only toggle

**2. CRM customer Dues tab** `crm-mfe/src/app/customers/[id]/dues/page.tsx`:
- New tab on customer detail page
- Balance summary: Total Bill | Total Paid | Outstanding Due
- Due history table with reminder log expandable per row

**3. Aging chart** `financial-mfe/src/app/dues/aging/page.tsx`:
- Bar chart: 4 buckets (0–30 / 30–60 / 60–90 / 90+ days) with ₹ value per bucket per store

**Deliverable check Day 23:** Due ledger shows live data; CRM customer Dues tab works; aging chart renders.

---

### Day 24 — Thursday May 21

**Track A — Backend: Reminder Scheduler + Overdue JTS**

```javascript
// Cron: daily 09:00 AM — check all overdue dues
async function processOverdueDues(tenantId) {
  const overdue = await CustomerDue.find({
    tenantId, dueDate: { $lt: new Date() }, recoveryStatus: 'open', jtsTaskId: null
  });
  for (const due of overdue) {
    due.overdueSince = due.dueDate;
    const task = await jtsServiceClient.createTask({
      type: 'due-recovery-follow-up',
      title: `Due recovery: ₹${due.dueAmount} from Customer ${due.customerId}`,
      priority: due.dueAmount > 5000 ? 'high' : 'medium',
      assignedRole: 'store-admin',
      dueDate: addDays(new Date(), 3),
      tenantId
    });
    due.jtsTaskId = task._id;
    await due.save();
  }
}

// POST /api/financial/customer-due/:id/reminder — log a reminder (channel, outcome)
// PATCH /api/financial/customer-due/:id/write-off — requires superadmin approval
```

---

**Track B — Frontend: Reminder Log + Aging Chart**

Package: `financial-mfe`

**1. Reminder log in due detail:**
- Each due has "Add Reminder" button → channel select + outcome text + submit
- History shows: channel icon, date, outcome text, recorded by

**2. Aging chart** (full implementation with real data from Day 24 API):
- Interactive bar chart (Recharts); click bucket → filters due list below
- Total outstanding value per bucket

**Deliverable check Day 24:** Reminder log works; overdue JTS task created for an overdue due in staging.

---

### Day 25 — Friday May 22

**Track A — Backend: GSTIN Master + Category GST Master**

Service: `financial-service`

```javascript
// GSTINMaster.model.js
const GSTINMasterSchema = new mongoose.Schema({
  tenantId: ObjectId,
  state: { type: String, required: true },
  stateCode: String,   // 2-digit state code per Indian GST
  gstin: { type: String, required: true }, // 15-char GSTIN format validated
  legalName: String,
  tradeName: String,
  address: String,
  storeIds: [{ type: ObjectId }], // stores registered under this GSTIN
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

GSTINMasterSchema.index({ tenantId: 1, gstin: 1 }, { unique: true });

// CategoryGST.model.js
const CategoryGSTSchema = new mongoose.Schema({
  tenantId: ObjectId,
  categoryName: { type: String, required: true }, // 'Lens', 'Frame', 'ContactLens', 'Accessory', 'Solution', 'Case'
  gstPercent: { type: Number, enum: [0, 5, 12, 18], required: true },
  hsnCode: { type: String, required: true },
  taxType: { type: String, enum: ['CGST+SGST', 'IGST', 'exempt'] },
  effectiveFrom: Date,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// APIs:
// POST/GET/PUT /api/financial/gstin — GSTIN CRUD
// PATCH /api/financial/gstin/:id/stores — assign/unassign stores
// GET   /api/financial/gstin?storeId= — get GSTIN for a store (used in billing)
// POST/GET/PUT /api/financial/gst-categories — category GST + HSN master
// GET   /api/financial/gst-categories?category= — get GST % and HSN for a category
```

**GSTIN validation:** 15-char regex `[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}`

---

**Track B — Frontend: GSTIN CRUD + Store Assignment + Category GST**

Package: `financial-mfe`

**1. GSTIN management page** `financial-mfe/src/app/gst/gstin/page.tsx`:
- List: State | GSTIN | Legal Name | Stores Assigned | Default | Status
- Add GSTIN form: state (select with state code auto-fill), GSTIN (validated input), legal name, trade name, address
- Assign stores: multi-select checkboxes for stores not yet assigned to another GSTIN in same state

**2. Category GST master** `financial-mfe/src/app/gst/categories/page.tsx`:
- Table: Category | GST % | HSN Code | Tax Type | Effective From
- Editable inline or via drawer

**Deliverable check Day 25:** Admin can add multiple GSTINs (different states); assign stores; set category GST rates.

---

### Day 26 — Saturday May 23

**Track A — Backend: GST Calculation Utilities Wired to Orders**

```javascript
// financial-service/src/utils/gst.utils.js — full implementation
function getStateCode(gstin) {
  return gstin ? gstin.substring(0, 2) : null;
}

function computeLineGST({ unitPrice, qty, discountAmount, gstPercent, fromGSTIN, toStateCode }) {
  const taxableAmt = (unitPrice * qty) - (discountAmount || 0);
  const gstAmount = parseFloat((taxableAmt * gstPercent / 100).toFixed(2));
  const fromStateCode = getStateCode(fromGSTIN);
  const isInterState = fromStateCode && toStateCode && fromStateCode !== toStateCode;

  return {
    taxableAmount: parseFloat(taxableAmt.toFixed(2)),
    cgst: isInterState ? 0 : parseFloat((gstAmount / 2).toFixed(2)),
    sgst: isInterState ? 0 : parseFloat((gstAmount / 2).toFixed(2)),
    igst: isInterState ? gstAmount : 0,
    gstTotal: gstAmount,
    lineTotal: parseFloat((taxableAmt + gstAmount).toFixed(2)),
    taxType: isInterState ? 'IGST' : 'CGST+SGST'
  };
}

// For purchase (input tax credit):
function computePurchaseGST({ purchasePrice, vendorGSTIN, buyerGSTIN, gstPercent }) {
  const taxableAmt = purchasePrice;
  const gstAmount = parseFloat((taxableAmt * gstPercent / 100).toFixed(2));
  const isInterState = getStateCode(vendorGSTIN) !== getStateCode(buyerGSTIN);
  return {
    taxableAmount: taxableAmt,
    inputTaxCredit: gstAmount, // eligible for ITC only if vendorGSTIN valid
    igst: isInterState ? gstAmount : 0,
    cgst: isInterState ? 0 : gstAmount / 2,
    sgst: isInterState ? 0 : gstAmount / 2,
    itcEligible: Boolean(vendorGSTIN && vendorGSTIN.match(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/))
  };
}

// Stock Transfer Invoice:
// POST /api/financial/stock-transfer-invoice
// Body: { fromStoreId, toStoreId, items: [{ productId, qty, value }] }
// System fetches GSTIN for each store; computes IGST if inter-state; generates transfer invoice number
```

**Wire into sales-service:** Replace gstCalc stub (Day 6) with call to financial-service GST utilities.

---

**Track B — Frontend: Order Composer Shows Server-Computed Tax Split + Transfer Invoice**

Package: `sales-mfe`, `financial-mfe`

**1. Order create/edit:** Tax breakdown section now shows real CGST/SGST/IGST from server  
**2. Stock transfer invoice form** `inventory-mfe/src/app/stock-transfer/invoice/page.tsx`:
- From store → To store → items
- Shows computed IGST (if inter-state) before submit

**3. GST summary** visible on order detail: "GSTIN: XX0123... | Tax Type: CGST+SGST | Taxable: ₹X | Tax: ₹Y"

**Deliverable check Day 26:** Create an inter-state order → IGST shown; intra-state → CGST+SGST; stock transfer → transfer invoice with IGST.

---

### Day 27 — Sunday May 24

**Track A + B — Complaint Engine (Both Tracks, Full Day)**

**Track A — Backend: Complaint Model + Approval Workflow**

Service: `crm-service` — new files `src/routes/complaint.routes.js`, `src/controllers/complaintController.js`, `src/models/Complaint.model.js`

```javascript
// Complaint.model.js
const ComplaintSchema = new mongoose.Schema({
  complaintNo: String, // CPL-{STORE}-{YYYYMMDD}-{seq}
  customerId: ObjectId, orderId: ObjectId, storeId: ObjectId, tenantId: ObjectId,
  type: {
    type: String,
    enum: ['power-not-comfortable', 'new-doctor-prescription', 'frame-issue', 'sunglass-issue', 'lens-coating-issue', 'cl-discomfort', 'product-defect', 'service-delay', 'other'],
    required: true
  },
  description: String,
  photos: [String],
  prescriptionId: ObjectId,
  reviewStatus: { type: String, enum: ['open', 'under-review', 'resolved', 'rejected'], default: 'open' },
  decision: { type: String, enum: ['free-replacement', 'discounted-replacement', 'paid-replacement', 'repair', 'rejected'] },
  discountOnReplacement: Number,     // if discounted-replacement
  chargeAmount: Number,              // if paid-replacement
  replacementOrderId: ObjectId,      // auto-created OpticalOrder for replacement
  oldItemReturnStatus: { type: String, enum: ['pending-return', 'returned', 'not-required'], default: 'not-required' },
  serviceCost: Number,
  financePosted: Boolean,
  createdBy: ObjectId, resolvedBy: ObjectId,
  resolvedAt: Date,
  vendorDefect: Boolean,
  vendorClaimId: ObjectId
}, { timestamps: true });

// POST /api/crm/complaints — raise complaint
// GET  /api/crm/complaints — list; ?customerId=&storeId=&reviewStatus=
// GET  /api/crm/complaints/:id — detail with order + prescription + product history
// PATCH /api/crm/complaints/:id/review — assign CS rep; status → under-review
// PATCH /api/crm/complaints/:id/decision — approve/reject/replace decision
//   On approve with replacement: auto-POST to /api/sales/optical-orders with type: 'replacement'
//   On resolve: POST serviceCost to /api/financial/expenses
```

**Track B — Frontend: Complaint List + Detail + Decision Workflow**

Package: `crm-mfe`

**1. Complaint list** `crm-mfe/src/app/complaints/page.tsx`:
- Table: Complaint No., Customer, Type, Order No., Status chip, Created, Resolved, Actions
- Filter by type, status, date range

**2. Complaint detail** `crm-mfe/src/app/complaints/[id]/page.tsx`:
- Customer info card + linked order summary + prescription summary
- Decision workflow panel: "Make Decision" button opens decision modal
- Decision modal: radio (free/discounted/paid/repair/reject), discount % or charge amount fields
- Replacement order badge: once created, shows order number with link

**3. Old item return section:**
- "Mark as Returned" action when replacement delivered

**Deliverable check Day 27:** Complaint raised → CS review → approve with replacement → replacement OpticalOrder auto-created and linked.

---

## SECTION 9: Sprint 5 — Finance Bridges + Reporting + JTS Audit
**Dates:** May 25 – May 31, 2026  
**Goal:** Connect operational events to finance postings; build the reporting hub; verify all 10 JTS auto-triggers.  
**Sprint Acceptance Criteria:** An approved damage entry shows a linked finance line; reports hub shows live data for ≥3 types; all 10 JTS triggers verified with example task IDs in staging.

---

### Day 28 — Monday May 25

**Track A — Backend: Damage → Finance + Payroll Posting**

Service: `financial-service`, `payroll-service`, `inventory-service`

When `DamageEntry.reviewStatus` transitions to `approved`:
```javascript
async function postDamageToFinance(damageEntry) {
  // 1. Create expense record
  const expense = await financialService.createExpense({
    category: 'stock-damage-loss',
    amount: damageEntry.qty * damageEntry.estimatedCostPerUnit,
    storeId: damageEntry.storeId,
    description: `Damage: ${damageEntry.type} — ${damageEntry.productType}`,
    sourceRef: { type: 'damage-entry', id: damageEntry._id },
    gstApplicable: false,
    tenantId: damageEntry.tenantId
  });

  // 2. Inventory write-off
  await LensStock.findByIdAndUpdate(damageEntry.lensMasterId, {
    $inc: { physicalQty: -damageEntry.qty }
  });

  // 3. If vendor claim
  if (damageEntry.fineDecision === 'vendor-claim') {
    await VendorReturn.create({ ...damageEntry.vendorInfo, status: 'return-required' });
  }

  // 4. If fine applied → payroll deduction request
  if (damageEntry.fineDecision === 'fine-applied') {
    await payrollService.createDeductionRequest({
      employeeId: damageEntry.fineAppliedTo,
      amount: damageEntry.fineAmount,
      reason: 'Stock damage fine',
      sourceRef: { type: 'damage-entry', id: damageEntry._id },
      tenantId: damageEntry.tenantId
    });
  }

  damageEntry.financePosted = true;
  damageEntry.financeExpenseId = expense._id;
  await damageEntry.save();
}
```

---

**Track B — Frontend: Finance Lines on Approved Damage + Payroll Deduction Badge**

Package: `inventory-mfe`, `financial-mfe`

**1. Finance tab on damage detail:**
- After approval: "Finance Line" section shows expense ID, amount, category
- "View in Finance" link → navigates to `/financial/expenses/{id}`

**2. Payroll deduction badge:**
- If fine applied: "Payroll Deduction Pending — ₹{amount}" badge with link to payroll deduction request

**Deliverable check Day 28:** Approve a damage entry → finance line appears on damage detail → payroll deduction badge shows.

---

### Day 29 — Tuesday May 26

**Track A — Backend: Complaint → Finance Service Cost + Replacement Cost**

```javascript
// On complaint resolution with replacement:
async function postComplaintToFinance(complaint) {
  // 1. Service cost to finance
  if (complaint.serviceCost > 0) {
    await financialService.createExpense({
      category: 'complaint-service-expense',
      amount: complaint.serviceCost,
      storeId: complaint.storeId,
      sourceRef: { type: 'complaint', id: complaint._id },
      tenantId: complaint.tenantId
    });
  }

  // 2. Replacement order cost (if free replacement — revenue loss)
  if (complaint.decision === 'free-replacement' && complaint.replacementOrderId) {
    const replacementOrder = await OpticalOrder.findById(complaint.replacementOrderId);
    await financialService.createExpense({
      category: 'complaint-free-replacement-cost',
      amount: replacementOrder.totalAmount,
      sourceRef: { type: 'optical-order', id: complaint.replacementOrderId }
    });
  }

  // 3. Vendor defect claim
  if (complaint.vendorDefect) {
    await VendorReturn.create({ ... }); // vendor claim for defective product
  }

  complaint.financePosted = true;
  await complaint.save();
}
```

**Track B:** Service cost badge on complaint detail; "Replacement Cost: ₹X" finance line visible; vendor claim badge if vendor defect.

---

### Day 30 — Wednesday May 27

**Track A + B: Optical Sales Reports**

**APIs (analytics-service):**
- `GET /api/analytics/sales/daily?storeId=&date=` — total units, value, GST, non-GST, payment modes
- `GET /api/analytics/sales/stores?tenantId=&dateFrom=&dateTo=` — store comparison
- `GET /api/analytics/sales/categories?storeId=&dateFrom=&dateTo=` — by product category
- `GET /api/analytics/sales/payment-modes?storeId=&dateFrom=&dateTo=` — cash/card/UPI/bank/split
- All endpoints support `?export=csv` for CSV download

**Frontend — Reports Hub** `financial-mfe/src/app/reports/page.tsx`:
- Tab: Daily Sales → line chart (7-day default); store filter; date range picker
- Tab: Store Comparison → horizontal bar chart (current month)
- Tab: Category Breakdown → pie chart + table
- Tab: Payment Mode → donut chart (cash/card/UPI/bank/split)
- Each tab: "Export CSV" button → calls `?export=csv` → downloads file

---

### Day 31 — Thursday May 28

**Track A + B: Inventory + Vendor Reports**

**APIs:**
- `GET /api/analytics/inventory/lens-power-stock?storeId=&brand=&index=` — power-wise stock table (grouped by power range)
- `GET /api/analytics/inventory/cl-stock?storeId=&brand=&modality=` — CL stock report
- `GET /api/analytics/inventory/dead-stock?storeId=` — dead stock with estimated value
- `GET /api/analytics/inventory/audit-mismatches?storeId=&month=` — mismatch history
- `GET /api/analytics/inventory/damage?storeId=&dateFrom=&dateTo=` — damage report with cost breakdown
- `GET /api/analytics/vendor/scorecard` — all vendors for period
- `GET /api/analytics/vendor/return-pending` — returns pending > N days

**Frontend:** Reports hub new tabs: "Inventory" | "Vendor Scorecard" — with embedded charts and tables; lens power availability heatmap (power on X, CYL on Y, color = qty).

---

### Day 32 — Friday May 29

**Track A + B: Lab + Finance Reports**

**APIs:**
- `GET /api/analytics/lab/pending?storeId=` — pending by stage (Kanban count summary)
- `GET /api/analytics/lab/delay?storeId=&dateFrom=&dateTo=` — SLA breach rate by stage, avg delay hours
- `GET /api/analytics/lab/qc-rejections?storeId=&dateFrom=&dateTo=` — rejection reasons breakdown
- `GET /api/analytics/lab/breakage-value?storeId=&dateFrom=&dateTo=` — breakage cost by type + staff
- `GET /api/financial/reports/gst-liability?tenantId=&month=` — CGST/SGST/IGST breakdown
- `GET /api/financial/reports/pl?tenantId=&month=` — basic P&L: revenue - direct costs - expenses

**Frontend:** Reports hub new tabs: "Lab Performance" | "Finance" — GST liability summary with month selector; P&L line (revenue vs expense trend).

---

### Day 33 — Saturday May 30

**Track A + B: HR/JTS Reports**

**APIs:**
- `GET /api/analytics/hr/attendance-payroll?storeId=&month=` — store staff: attendance % vs payroll cost
- `GET /api/analytics/jts/productivity?storeId=&month=` — task count, avg resolution, SLA breach rate
- `GET /api/analytics/lab/technician-breakage?storeId=&month=` — per-tech breakage rate

**Frontend:** Reports hub tab "HR & JTS" — attendance heatmap; JTS productivity bar chart; technician breakage leaderboard (anonymized for non-admin roles).

---

### Day 34 — Sunday May 31 — JTS Trigger Audit

**Track A: Verify All 10 Auto-Triggers in Staging**

| # | Trigger | Type | Assigned To | Status to Verify |
|---|---|---|---|---|
| 1 | Store deposit submission | `cash-deposit-verification` | Accounts team | JTS task created with deposit ID |
| 2 | Audit mismatch detected | `stock-mismatch-investigation` | Store manager | JTS task created with scan record ID |
| 3 | Vendor inward wrong/damaged | `vendor-return-follow-up` | Purchase manager | JTS task + VendorReturn created |
| 4 | Damage fine approved | `fine-recovery-payroll-deduction` | HR / Finance | Payroll deduction request + JTS task |
| 5 | Complaint raised | `complaint-review` | CS Admin | JTS task created with complaint ID |
| 6 | Vendor replacement overdue (cron) | `vendor-replacement-overdue` | Purchase manager | Cron fires; JTS task in queue |
| 7 | Expense approval pending | `expense-approval` | Store admin / Finance | JTS task on expense create |
| 8 | Payroll run initiated | `payroll-approval` | Finance / Superadmin | **Already built — verify still working** |
| 9 | Customer due overdue (cron) | `due-recovery-follow-up` | Store admin | Cron fires; JTS task with due ID |
| 10 | RX vendor order no inward after SLA | `rx-order-follow-up` | Purchase manager | Cron fires; JTS task with vendor order ID |

**Track B:** Internal JTS trigger checklist page `admin-mfe/src/app/jts-triggers/page.tsx`:
- Maps each trigger → example task ID in staging
- Export as PDF button (for audit evidence)
- Shows last fired timestamp, task ID created, status

---

## SECTION 10: Sprint 6 — E2E Testing + Release Hardening
**Dates:** Jun 1 – Jun 10, 2026  
**Goal:** Green Playwright E2E on four critical user journeys; complete permission audit; deploy to production; sign DoD.  
**Sprint Acceptance Criteria:** All four Playwright flows pass in staging; production build green; DoD §13 checklist signed; any mocked endpoint explicitly documented.

---

### Day 35 — Monday Jun 1

**E2E Flow 1: Full Optical Order → Lab → Finance**

**Track A:** Run full flow in staging:
- `POST /api/sales/optical-orders` with Rx lens → stock check (rx-pending) → `POST /api/purchase/rx-orders/aggregate` → `POST /api/purchase/inward` (correct) → optical order status → `lens-inward` → lab order auto-created → advance through `cutting → fitting → qc → packing → dispatched → store-received → delivered` → finance revenue entry exists

**Track B:** Playwright test `tests/e2e/optical-order-flow.spec.ts`:
```typescript
test('Full optical order lifecycle', async ({ page }) => {
  await page.goto('/orders/new');
  // Step 1: Customer selection
  await page.fill('[data-testid=customer-search]', 'Test Customer');
  // Step 2: Rx capture
  // Step 3: Lens selection from catalog
  // Step 4: Submit → order created
  // Step 5: Navigate to lab Kanban → order visible in 'lens-inward' column
  // Step 6: Advance through stages
  // Step 7: Verify finance line created
  await expect(page.locator('[data-testid=finance-entry-id]')).toBeVisible();
});
```

---

### Day 36 — Tuesday Jun 2

**E2E Flow 2: Vendor Wrong Power → Return → Score Update**

**Track A:** Full staging chain: inward entry → validation result `wrong-power` → VendorReturn auto-created → status → `returned-to-vendor` → `replacement-received` → stock updated → vendor score recalculated

**Track B:** Playwright test `tests/e2e/vendor-wrong-power.spec.ts`:
```typescript
test('Vendor wrong power inward → return → score', async ({ page }) => {
  // Create inward entry with wrong-power on one line
  // Verify VendorReturn auto-created
  // Navigate to vendor scorecard
  // Verify wrongPower count incremented
  await expect(page.locator('[data-testid=vendor-wrong-power-count]')).toContainText('1');
});
```

---

### Day 37 — Wednesday Jun 3

**E2E Flow 3: Damage Approval + Cash Deposit Verification**

**Track A:** Damage entry → stock blocked → auditor approves with fine → finance expense created → payroll deduction request created; PLUS store deposit → JTS task created → accounts verifies → finance ledger entry created.

**Track B:** Playwright test `tests/e2e/damage-and-deposit.spec.ts`:
```typescript
test('Damage approval posts to finance', async ({ page }) => { ... });
test('Store deposit verification creates finance entry', async ({ page }) => { ... });
```

---

### Day 38 — Thursday Jun 4

**E2E Flow 4: Complaint Decision + Due Collection**

**Track A:** Complaint raised → CS review → free replacement approved → replacement order auto-created → service cost posted to finance; PLUS customer due created from partial payment → reminder logged → payment collected → `fully-recovered` status.

**Track B:** Playwright test `tests/e2e/complaint-and-dues.spec.ts`:
```typescript
test('Complaint replacement creates linked order', async ({ page }) => { ... });
test('Due collection marks as recovered', async ({ page }) => { ... });
```

---

### Day 39 — Friday Jun 5

**Track A — Kong/Ingress Production Config**

New routes to add to `microservices/api-gateway/kong.yml`:
```yaml
# Add to existing services
- name: lens-master-routes
  url: http://inventory-service:3010
  routes: [{ paths: ['/api/inventory/lens-master'], methods: [GET, POST, PUT, PATCH] }]

- name: optical-order-routes
  url: http://sales-service:3005
  routes: [{ paths: ['/api/sales/optical-orders', '/api/sales/lab-orders'], methods: [GET, POST, PATCH] }]

# ... add all new route groups for: purchase/rx-orders, purchase/inward, purchase/vendor-returns,
#     inventory/damage, inventory/breakage, inventory/audits, crm/complaints,
#     financial/deposits, financial/customer-due, financial/gstin, financial/gst-categories
```

Update `INGRESS_SOURCE_OF_TRUTH.md` (currently empty at repo root) with canonical route table.

**Track B — Permission Catalog Update**

- Add all new route permissions to `microservices/shared/utils/shellRoutePermissions.js`
- Update permission constants in `shared/src/constants/permissions.ts`
- Run permission check CI step: `npm run check:permissions` — verifies every new route has a corresponding permission in the catalog
- Update `PlanGate` coverage: every new feature flag used in navigation; deep links return "Not on your plan" not 404

---

### Day 40 — Saturday Jun 6

**Track A — API Documentation**

Add Swagger/OpenAPI annotations to all new controllers:
- `lens-master`, `cl-master`, `optical-orders`, `lab-orders`, `rx-orders`, `inward`, `vendor-returns`, `vendor-score`, `barcode`, `damage`, `breakage`, `audits`, `stock-corrections`, `complaints`, `deposits`, `customer-due`, `gstin`, `gst-categories`

Update in docs folder:
- `API_CONTRACT_CANONICAL.md` (currently empty): fill with canonical endpoint list per service
- `docs/BACKEND_CHECKLIST_FRONTEND_INTEGRATION.md`: mark all new endpoints as added
- Create `docs/OPTICAL_BUSINESS_ENGINE_API_GUIDE.md`: frontend integration guide with example request/response payloads for each new endpoint group

**Track B — Minimal Integration README**

- Create `INTEGRATION.md` in frontend monorepo root: BFF pattern rules, tenant context header requirements, entitlement check examples, mock endpoint documentation
- Document: which endpoints are still returning mock data (if any) with target date for each
- Mock data rule enforcement: CI lint check — if `MOCK_ENABLED=true` in any screen component → build warning with issue link

---

### Day 41 — Sunday Jun 7 — Bug-Fix Buffer

**Track A:** Triage failures from E2E runs (Days 35–38); fix top blockers; add missing MongoDB compound indexes; performance test optical order creation endpoint (target: < 500ms including stock check with transaction).

**Track B:** Table render performance (virtualize lists > 100 rows using `react-virtual`); eliminate duplicate BFF calls (add `react-query` deduplication); edge-case form validation (negative prices, zero qty, invalid GSTIN); error boundaries verified on all 8 MFE packages.

---

### Day 42 — Monday Jun 8

**Track A — Production Deploy**

```bash
# Build and push modified services:
./scripts/build-and-push.sh inventory-service sales-service purchase-service financial-service crm-service analytics-service

# Update K8s manifests for each modified service
# Rolling deploy to EKS:
kubectl rollout restart deployment/inventory-service -n etelios-prod
kubectl rollout restart deployment/sales-service -n etelios-prod
# ... repeat for all modified services

# Verify health checks:
kubectl get pods -n etelios-prod
```

**Track B — Production Build Green**

- `npm run build` — zero errors, zero TypeScript errors
- Environment matrix documented: all `NEXT_PUBLIC_*` and server-side env vars per service
- Staging → Production diff reviewed: no staging-only flags leaking to production

---

### Day 43 — Tuesday Jun 9

**Track A — Monitoring Hardening**

Update `monitoring-service` with real business alerts (replace stubs):
- Deposit verification pending > 24h → alert Finance
- Lab order stuck in same stage > SLA hours → alert Lab Manager
- Vendor return replacement pending > 7 days → alert Purchase Manager
- Customer due overdue > 30 days from due date → alert Store Admin
- JTS task unassigned > 4 hours → alert relevant manager

Wire correlated request IDs: every service adds `X-Request-Id` (generated at BFF, forwarded through Kong to all downstream services). Log pattern: `[${requestId}] service=inventory-service action=checkStock`.

**Track B — Error Boundaries + Sentry**

- Add `<ErrorBoundary>` wrapping every major page in all 8 MFE packages
- Sentry: tag every error with `tenantId`, `storeId`, `userId`, `plan` from session context
- Correlated IDs: BFF attaches `X-Request-Id` to upstream calls; frontend logs `requestId` in Sentry breadcrumb

---

### Day 44 — Wednesday Jun 10 — Final Delivery Checkpoint

**Track A Final Checklist:**
- [ ] All 23 modules have durable data models and authoritative APIs with tenant scoping
- [ ] All 10 JTS auto-triggers verified with example task IDs in staging
- [ ] Stock mutations protected by MongoDB transactions
- [ ] Kong gateway routes complete and tested in staging
- [ ] Production K8s manifests updated and deployed
- [ ] Monitoring alerts active in production
- [ ] API documentation complete for all new endpoints
- [ ] `INGRESS_SOURCE_OF_TRUTH.md` filled and accurate
- [ ] `API_CONTRACT_CANONICAL.md` filled and accurate

**Track B Final Checklist:**
- [ ] No production optical screen relies on hardcoded demo numbers for GA features
- [ ] Navigation respects entitlements: deep links fail closed with "Not on your plan"
- [ ] Each major entity has list + detail + create/edit where required
- [ ] BFF exists for every public browser call (or written exception documented)
- [ ] All four Playwright E2E flows pass in staging
- [ ] Any mocked endpoint explicitly documented in `INTEGRATION.md`
- [ ] `npm run build` — zero errors across all 8 packages
- [ ] Error boundaries on all major pages
- [ ] Sentry tagging active with tenantId, storeId, plan
- [ ] DoD §6 checklist signed by lead engineer

---

## SECTION 11: JTS Auto-Task Registry — All 10 Required Triggers

| # | Trigger Event | JTS Task Type | Priority | Assigned Role | SLA | Sprint |
|---|---|---|---|---|---|---|
| 1 | Store submits cash deposit | `cash-deposit-verification` | High | accountant | 24h | S4 D21 |
| 2 | Audit mismatch > 0 qty difference | `stock-mismatch-investigation` | High | store-manager | 48h | S3 D15 |
| 3 | Vendor inward: wrong/damaged/scratched item | `vendor-return-follow-up` | High | purchase-manager | 48h | S2 D10 |
| 4 | Damage fine approved | `fine-recovery-payroll-deduction` | Medium | hr + finance | 72h | S5 D28 |
| 5 | Complaint raised | `complaint-review` | High | cs-admin | 24h | S4 D27 |
| 6 | Vendor replacement pending > 7 days (cron) | `vendor-replacement-overdue` | High | purchase-manager | 24h | S2 D10 |
| 7 | Expense pending approval | `expense-approval` | Medium | store-admin / finance | 48h | S4 D21 |
| 8 | Payroll run HR submit stage | `payroll-approval` | High | finance / superadmin | 24h | **Already built** |
| 9 | Customer due past due date (cron) | `due-recovery-follow-up` | Medium | store-admin | 72h | S4 D24 |
| 10 | RX vendor order no inward after SLA hours | `rx-order-follow-up` | High | purchase-manager | 24h | S2 D8 |

---

## SECTION 12: Definition of Done

### 12.1 Track A (Backend) — Complete when ALL of the following:

- All 23 modules have durable MongoDB data models with `tenantId` on every schema and compound indexes for primary query patterns
- All new APIs return HTTP 400 for missing required fields, HTTP 403 for wrong tenant, HTTP 404 for missing records — no unhandled promise rejections reaching clients
- Ten JTS auto-triggers proven in staging with example task IDs
- Stock mutations (check + reserve) protected against race conditions via MongoDB multi-document transactions
- Kong gateway routes and K8s manifests updated, tested in staging, deployed to production
- Super admin cannot fetch tenant business data without an active time-bound support grant
- Finance entries are created only after deposit verification (not on submission)
- GST calculation isolated in `gst.utils.js` with unit tests covering: intra-state, inter-state, GST-inclusive price, zero-rated, exempt

### 12.2 Track B (Frontend) — Complete when ALL of the following:

- No production optical screen (GA features) relies on hardcoded/mocked demo numbers
- Navigation respects plan entitlements AND role permissions: deep links fail closed with `<PlanGate>` message for locked features — never a 404 or JS error
- Each major entity (optical order, lens master, CL master, vendor return, damage entry, audit session, lab order, breakage, complaint, store deposit, customer due, GSTIN) supports list + detail + create/edit where the business requires it
- BFF exists for each public browser call pattern OR a written exception exists in `INTEGRATION.md` with CORS justification
- All four Playwright E2E flows pass in staging: (1) optical order → lab → finance, (2) vendor wrong power → return → score, (3) damage + deposit, (4) complaint + due
- Error boundaries on all major pages in all 8 MFE packages
- Sentry tags: `tenantId`, `storeId`, `userId`, `plan` on every error event
- `npm run build` zero TypeScript errors across all 8 packages
- Mock data rule: CI lint check fails build if `MOCK_ENABLED=true` in any GA screen
- Accessibility and i18n: explicitly deferred to post-V1 polish window (must be called out in handoff if timelines slip)

### 12.3 "Zero Gap" Scope Definition

| Term | Definition |
|---|---|
| Zero product gap vs V1 module lock | Backend + frontend acceptance criteria per §12.1–12.2 above — all 23 modules API-complete AND UI-navigable |
| Zero UX gap | Not achievable by Jun 10 for a single developer across two repos — treat as post-V1 hardening sprint |
| Zero mock data | All GA features: real API data. Demo/dev seeds are acceptable in staging for E2E tests. |

---

## SECTION 13: Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| **Single developer across two repos** | Critical | Time-box each track strictly per the daily plan; hire/allocate second developer for frontend Track B; if solo, cut Track B polish (animations, responsiveness) not Track A correctness |
| **API schema drift (BE ≠ FE contract)** | High | Weekly OpenAPI diff between `API_CONTRACT_CANONICAL.md` and actual frontend API calls; contract tests at BFF layer; run `npm run check:api-contracts` in CI |
| **Stock reservation race condition** | High | MongoDB multi-document transactions on check + reserve; optimistic locking `version` field on `LensStock`; load test 50 concurrent order creates for same lens spec |
| **GST calculation edge cases** | High (compliance) | Isolate all math in `gst.utils.js`; golden test fixtures for: intra-state standard, inter-state standard, GST-inclusive price, zero-rated (0%), exempt; CA review before production |
| **Mock data outlasting its deadline** | Medium | CI lint check: fails build if `MOCK_ENABLED=true` in GA screen; `INTEGRATION.md` lists all mock endpoints with target dates |
| **Cross-tenant data leak** | Critical | Mandatory `X-Tenant-Id` in every API call; backend middleware validates tenant on every request; `superAdminDataIsolation` middleware blocks business data to platform admins |
| **Optical logic split across MFEs** | Medium | Publish information architecture map (URLs + owning MFE) in `INTEGRATION.md`; shared routing conventions in `shared` package |
| **Lab service — extend vs new service** | Medium | Extend `sales-service` in S3 with `/api/sales/lab-orders`; no new K8s deployment; promote to own service post-V1 |
| **Complaint service — extend vs new** | Low | Extend `crm-service` with `/api/crm/complaints`; share customer + order context naturally |
| **Frontend lag — new modules no UI by Jun 10** | High | Complete Swagger + `OPTICAL_BUSINESS_ENGINE_API_GUIDE.md` by Day 40 (Jun 6); frontend team parallel-builds from API specs |

---

## SECTION 14: Architecture Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Lab & Delivery service location | Extend `sales-service` | Avoid new K8s deployment; lab orders tightly coupled to optical orders; promote to `lab-service` post-V1 |
| Complaint engine location | Extend `crm-service` | Share customer/order context; natural CRM domain; promote to `complaint-service` in V2 |
| GST calculation | `gst.utils.js` in `financial-service` | Single source of truth; pure functions, trivial to unit test; called from `sales-service` via HTTP |
| Barcode generation | Server-side in `inventory-service` | No new service; barcodes stored as base64 on product unit record; `bwip-js` library |
| Stock locking | MongoDB multi-document transactions | Mongoose 8 supports sessions; prevents overselling; tested under concurrent load |
| Vendor score storage | `VendorScore` model per month | Cheap to query; updated incrementally; no aggregation needed at query time |
| Frontend notifications (lab stages) | Short-poll every 10s in V1 | WebSocket deferral: polling is sufficient for lab Kanban at V1 scale; WebSocket added post-V1 |
| BFF auth | JWT in session, not localStorage | Browser never holds bearer token; XSS-resistant; server session holds token; forwarded by BFF |
| Entitlements caching | 5-minute TTL in BFF | Reduces per-request latency to tenant-registry-service; plan changes take effect within 5 min |
| Lab stages canonical order | order-confirmed → lens-inward → cutting → fitting → qc → packing → dispatched → store-received → delivered | Consolidates backend (7-stage) and frontend (5-stage) docs; "cutting" added as distinct stage |

---

## SECTION 15: Strictly Excluded from V1 (Do Not Build Before Jun 10)

| Feature | Reason |
|---|---|
| Full AI Brain / Predictive AI | Requires complete V1 data foundation |
| ATS (Applicant Tracking System) | HR module covers recruitment basics |
| LMS (Learning Management System) | Training stub exists; full LMS is V2 |
| Advanced BI Builder | Standard reports cover V1 needs |
| WhatsApp API Automation | Notification hooks exist; full WA automation is V2 |
| Voice / OCR Input | Not a V1 requirement |
| Multi-Industry Templates | Etelios is optical-vertical only in V1 |
| Full Accounting Replacement (Tally) | Finance V1 covers basic P&L + expense; full accounting is V2 |
| Franchise Billing Engine | Post-V1 |
| Native Mobile App (iOS/Android) | API-first; web covers V1 on mobile browsers |
| WebSocket / Realtime push | Polling sufficient in V1; WebSocket post-V1 |
| Accessibility (WCAG 2.1) | Deferred to post-V1 polish — must be called out in handoff if timelines slip |
| Internationalisation (i18n) | English only in V1 |

---

*Document Version 4.0 — Consolidated Backend + Frontend Sprint Plan*  
*Source documents: Backend Sprint Plan v1.0 (Apr 28, 2026) + Frontend Sprint Plan v3.0 (Apr 30, 2026)*  
*Next scheduled review: Jun 10, 2026 (V1 delivery checkpoint)*
