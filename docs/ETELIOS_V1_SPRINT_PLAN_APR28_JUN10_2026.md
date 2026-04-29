# Etelios Enterprise V1 — Single-Developer Sprint Plan
## April 28 → June 10, 2026 (44 Working Days · 6 Sprints)

**Prepared:** Apr 28, 2026  
**Scope:** Backend microservices (Node.js/Express/MongoDB). Frontend (Next.js at app.etelios.com) is a separate repo — frontend implementation for new modules requires an additional 2–4 weeks post Jun 10.  
**Stack:** Node.js ≥22 · Express · MongoDB/Mongoose · Redis · Kafka · Kong · EKS/K8s  
**Codebase baseline:** ~1,994 files · 20+ microservices · 89 controllers · 197 models

---

## 1. Executive Summary

Etelios Enterprise V1 requires 23 distinct modules. The current codebase has strong coverage for the HR/People Engine (HRMS, Attendance, Leave, Payroll, JTS) but is **missing the entire optical business vertical** — the core differentiator. This plan closes all gaps by June 10, 2026.

| Category | Count |
|---|---|
| Already built (strong) | 6 |
| Partially built (needs completion) | 8 |
| Missing — must build from scratch | 14 |
| **Total V1 modules** | **23** (per Final V1 Module Lock) |

---

## 2. Complete Gap Analysis

### 2A. Modules Already Built (Strong Coverage)

| Module | Evidence in Codebase |
|---|---|
| HRMS — Employee Lifecycle | `hr-service`: employee master, onboarding, transfers, FnF, roster, performance |
| Attendance & Leave | `attendance-service`: clock-in/out, geofencing, violations; `hr-service`: leave management |
| Payroll | `payroll-service`: salary, deductions, workflow, compliance, payslip PDF, payroll-run engine |
| JTS Execution Engine | `jts-service`: tasks, SLA, escalation, timers, collaboration, self-tasks, performance jobs |
| Auth / RBAC | `auth-service`: JWT, role enums, permission catalog, tenant isolation, emergency lock |
| Tenant Management (basic) | `tenant-management-service` + `tenant-registry-service`: tenant CRUD, billing model, subscription |

### 2B. Modules Partially Built — Gaps Identified

| Module | What Exists | What's Missing |
|---|---|---|
| Platform Tenant Mgmt / UpCapto Super Admin | Tenant CRUD, audit log model | Strict data-isolation middleware (super admin cannot access tenant business data); time-bound support-access grant model; every action audit-logged to separate immutable log |
| Admin Control Engine | Role enums (admin, hr, manager, store, accountant, finance…) | Store Admin granular scopes (only their store's sales/staff/stock); Dept Admin scopes (HR/Accounts/Payroll/Lab/Inventory per department) |
| CRM — Customer Profile | `crm-service`: customer model, campaigns, loyalty, wallet | Customer prescription history link; order history link; complaint history link; due/udhari history on profile |
| Billing / Sales (generic POS) | `sales-service`: POS controller, coupon, discount | Optical-specific order (prescription + frame + lens + CL selection + delivery date); GST invoice vs non-GST invoice; partial payment; due/udhari creation on partial payment |
| Inventory Core | `inventory-service`: stock controller, product master, reorder rules, stock transfer | Optical category separation (frames, lenses, CL, accessories, solutions); barcode/QR per product unit; audit system; dead stock detection |
| Financial V1 (basic) | `financial-service`: P&L, expenses, ledger, TDS, payroll-posting bridge | Cash/bank deposit verification flow; customer due/udhari tracking; damage-to-finance bridge; complaint service cost posting |
| GST & Taxation | `financial-service`: HSN model exists | Multi-state GSTIN management; category GST + HSN master with inheritance; CGST+SGST vs IGST logic; GST-included vs GST-extra; input tax credit; stock transfer invoice |
| Reports & Monitoring | `analytics-service`: generic dashboard, expiry reports | Optical-specific reports: lens power-wise stock, vendor scorecard, lab delay, QC rejection, breakage value, audit mismatch, GST liability, basic P&L |

### 2C. Modules Missing — Build from Scratch

| # | Module | V1 Requirement |
|---|---|---|
| 1 | **Lens Master** | Brand, product type, vision type, index, coating, power/CYL/axis/ADD range, GST %, HSN code, vendor mapping; full CRUD |
| 2 | **Contact Lens Master** | Brand, power/CYL/axis, base curve, diameter, modality, expiry date, batch number, vendor mapping; full CRUD |
| 3 | **Optical Order Management** | Prescription + frame + lens + CL selection; delivery date; order status; payment status; link to CRM customer; link to store |
| 4 | **Stock vs RX Order Logic** | During order: check power/index/coating availability; if available → reserve/deduct; if unavailable → PendingRXRequirement; if partial → use stock + create pending |
| 5 | **Pending / Negative Requirement Logic** | PendingRXRequirement model → auto-generate VendorOrder; inward entry closes pending requirement; stock accuracy restored |
| 6 | **Vendor Inward Validation** | InwardEntry per lens received; validate: correct / wrong-power / damaged / scratched / coating-issue / wrong-product; accept as stock OR trigger return |
| 7 | **Vendor Return System** | VendorReturn model; status: return-required → replacement-pending → replacement-received; vendor score updated on each event |
| 8 | **Breakage / Loss Entry** | BreakageEntry: type (broke-fitting/wrong-cut/handling-damage/missing/scratched/coating/vendor-defect); links to product, optical order, staff, cost; approval required; finance impact |
| 9 | **Lab & Delivery Engine** | LabOrder linked to optical order; stages: lens-available → fitting → QC → packing → dispatch → store-received → customer-delivered; SLA per stage; auto JTS on breach |
| 10 | **Barcode / QR System** | Unique barcode + QR per product unit; generate endpoint; scan/lookup API; fast audit scan mode |
| 11 | **Audit System** | AuditAssignment (daily/cycle/monthly/HO/surprise); scan-item API; system vs physical count comparison; mismatch report; mismatch → JTS task; stock correction approval-gated |
| 12 | **Dead Stock Protection** | Detect slow-moving (no sale in N days) and dead stock; stuck inventory by store; transfer-opportunity suggestion; clearance flag |
| 13 | **Store Damage & Loss Control** | DamageEntry: type (frame/sunglass/lens/CL/mishandling/trial/storage); photo upload; stock blocked; auditor review; approve/reject/fine; stock adjustment; finance impact |
| 14 | **Cash / Bank Deposit Verification** | StoreDeposit model: store, date, daily cash sales, deposited amount, mode, bank, UTR, receipt upload; status: pending-verification; auto JTS task for Accounts; verify/reject; finance updated after verification |
| 15 | **Customer Due / Udhari** | CustomerDue model: customer, order, bill amount, paid amount, due amount, due date, approved-by, recovery status; reminder log (WhatsApp/SMS/call/email); overdue → JTS |
| 16 | **Complaint & After-Sales Engine** | Complaint model: type, order ref, prescription, product, customer history; review flow; approve/reject/partial-charge; replacement order trigger; old item return tracking; service cost → finance |

---

## 3. JTS Auto-Task Triggers Required for V1

All 10 must be wired by end of Week 5 (Day 34 is the verification audit day).

| # | Trigger Event | JTS Task Type | Assigned To | Sprint Week |
|---|---|---|---|---|
| 1 | Store submits cash deposit entry | Cash Deposit Verification | Accounts Team | Week 4 |
| 2 | Audit scan mismatch detected | Stock Mismatch Investigation | Store Admin / Auditor | Week 3 |
| 3 | Vendor inward — wrong/damaged lens flagged | Vendor Return Follow-up | Purchase / Accounts | Week 2 |
| 4 | Damage entry approved with fine | Fine Recovery & Payroll Deduction | HR / Finance | Week 5 |
| 5 | Complaint raised by store | Complaint Review | Customer Service Admin | Week 4 |
| 6 | Vendor return replacement overdue | Vendor Replacement Follow-up | Purchase Manager | Week 2 |
| 7 | Expense approval pending | Expense Approval | Store Admin / Finance | Week 4 |
| 8 | Payroll run initiated (HR submit stage) | Payroll Approval | Finance / Superadmin | **Already built** |
| 9 | Customer due overdue past due date | Due Recovery Follow-up | Store Admin / Accounts | Week 4 |
| 10 | RX vendor order — no inward after SLA days | RX Order Follow-up | Purchase Manager | Week 2 |

---

## 4. Sprint Plan — Weekly Overview

| Sprint | Dates | Focus Theme | Key Deliverables |
|---|---|---|---|
| **Week 1** | Apr 28 – May 3 | Foundation + Optical Core | Super Admin isolation · Lens Master · CL Master · Optical Order · GST Billing |
| **Week 2** | May 4 – May 10 | Inventory + Vendor Flow | Stock vs RX logic · Inward validation · Vendor return · Barcode/QR · Store damage |
| **Week 3** | May 11 – May 17 | Audit + Lab + Breakage | Audit system → JTS · Dead stock · Lab workflow · Lab SLA · Breakage/loss entry |
| **Week 4** | May 18 – May 24 | Finance + GST + Complaint | Cash deposit → JTS · Due/udhari · Multi-state GSTIN · GST calc · Complaint engine |
| **Week 5** | May 25 – May 31 | Bridges + Reporting | Damage→Finance · Complaint→Finance · All optical reports · JTS auto-task audit |
| **Week 6** | Jun 1 – Jun 7 | E2E Testing + Hardening | 4 E2E flow tests · Kong routes · OpenAPI docs · K8s manifests · Bug-fix buffer |
| **Final Push** | Jun 8 – Jun 10 | Delivery & Monitoring | K8s prod deploy · Monitoring alerts · Final smoke test · Handoff notes |

---

## 5. Detailed Daily Plan

### WEEK 1: Apr 28 – May 3 — Foundation + Optical Core

**Focus:** Security hardening, Lens/Contact Lens Masters, Optical Order, GST Billing

---

**Day 1 — Monday Apr 28**  
**Task:** UpCapto Super Admin strict enforcement  
**Services:** `auth-service`, `tenant-management-service`  
**Details:**
- Add `superAdminDataIsolation` middleware: super admin requests MUST NOT receive tenant business data (sales, inventory, payroll, finance, GST, customer, employee operational records) in response payloads
- Build `SupportAccessGrant` model: `{ tenantId, grantedBy (tenant admin), grantedTo (super admin user id), expiresAt, scope: ['finance'|'payroll'|'general'], createdAt, revokedAt }`
- Add `requireSupportAccess(scope)` middleware that checks active, non-expired grant before allowing super admin to read tenant data
- Finance/payroll/GST/customer data: add `requireExtraApproval` flag to grant (tenant admin must mark these scopes explicitly)
- All super admin actions on tenant data (even reads) go to a separate `SuperAdminActionLog` collection (immutable)
- Store/Department Admin: extend `shellRoutePermissions.js` in shared package — add `store-admin` role permissions scoped to `storeId` and `dept-admin` role permissions scoped to `departmentId`

---

**Day 2 — Tuesday Apr 29**  
**Task:** Lens Master CRUD  
**Service:** `inventory-service` (new `lens.routes.js` + `lensMaster.controller.js` + `LensMaster.model.js`)  
**Schema:**
```js
{
  brand: String, // e.g. "Essilor", "Zeiss", "Hoya"
  productType: String, // SV, BF, Progressive, Office, Occupational
  visionType: String, // single-vision, bifocal, progressive, reading, photochromic, sunglass, etc.
  index: Number, // 1.5, 1.56, 1.6, 1.67, 1.74
  coating: [String], // AR, HMC, SHMC, BlueBlock, Photochromic, etc.
  powerRange: { min: Number, max: Number, step: Number }, // e.g. -20 to +12, step 0.25
  cylRange: { min: Number, max: Number, step: Number },
  axisRange: { min: Number, max: Number },
  addRange: { min: Number, max: Number, step: Number },
  gstPercent: Number, // 0, 5, 12, 18
  hsnCode: String,
  vendorMapping: [{ vendorId: ObjectId, vendorSku: String, costPrice: Number }],
  isActive: Boolean,
  tenantId: ObjectId
}
```
**APIs:**
- `POST /api/inventory/lens-master` — create
- `GET /api/inventory/lens-master` — list with filters (brand, visionType, index, coating)
- `GET /api/inventory/lens-master/:id` — get by id
- `PUT /api/inventory/lens-master/:id` — update
- `DELETE /api/inventory/lens-master/:id` — soft delete (isActive: false)
- `GET /api/inventory/lens-master/check-stock` — check if a specific power/index/coating is in stock (used during order)

---

**Day 3 — Wednesday Apr 30**  
**Task:** Contact Lens Master CRUD  
**Service:** `prescription-service` (upgrade existing `ContactLensPlan` stub) OR `inventory-service`  
**Schema:**
```js
{
  brand: String, // "Acuvue", "Freshlook", "Biofinity", etc.
  power: Number,
  cyl: Number, // for toric lenses
  axis: Number, // for toric lenses
  baseCurve: Number, // 8.3, 8.5, 8.6, 8.7, 8.8
  diameter: Number, // 14.0, 14.2, 14.5
  modality: String, // daily, fortnightly, monthly, quarterly, yearly
  packSize: Number, // 1, 6, 30
  gstPercent: Number,
  hsnCode: String,
  vendorMapping: [{ vendorId: ObjectId, costPrice: Number, expiryMonths: Number }],
  batchTracking: Boolean, // whether to track batch + expiry per unit
  isActive: Boolean,
  tenantId: ObjectId
}
```
**APIs:** Full CRUD + stock-check endpoint (same pattern as Lens Master)

---

**Day 4 — Thursday May 1**  
**Task:** Optical Order schema + base model  
**Service:** `sales-service` (new `opticalOrder.routes.js`, `opticalOrderController.js`, `OpticalOrder.model.js`)  
**Schema:**
```js
{
  orderNo: String, // auto-generated
  customerId: ObjectId, // CRM customer
  storeId: ObjectId,
  tenantId: ObjectId,
  prescriptionId: ObjectId, // linked prescription from prescription-service
  items: [{
    type: String, // frame, lens, contactLens, accessory, case, solution
    productId: ObjectId,
    qty: Number,
    unitPrice: Number,
    discount: Number,
    gstPercent: Number,
    hsnCode: String,
    // for lens orders:
    lensSpec: { eye: 'right'|'left', sph: Number, cyl: Number, axis: Number, add: Number, pd: Number },
    stockStatus: String, // reserved, rx-pending, partial
  }],
  deliveryDate: Date,
  orderStatus: String, // draft, confirmed, lens-ordered, in-lab, dispatched, delivered, cancelled
  paymentStatus: String, // unpaid, partial, paid
  billAmount: Number,
  paidAmount: Number,
  dueAmount: Number,
  gstInvoice: Boolean,
  invoiceNo: String,
  createdBy: ObjectId,
  labOrderId: ObjectId, // linked when lab order is created
  notes: String
}
```

---

**Day 5 — Friday May 2**  
**Task:** Optical Order APIs  
**Service:** `sales-service`  
**APIs:**
- `POST /api/sales/optical-orders` — create order; triggers stock-check hook (stub on Day 5, wired on Week 2 Day 1)
- `GET /api/sales/optical-orders` — list with filters (store, customer, status, date range)
- `GET /api/sales/optical-orders/:id` — get order with full item detail
- `PATCH /api/sales/optical-orders/:id/status` — update order status
- `PATCH /api/sales/optical-orders/:id/cancel` — cancel order (with stock release logic)
- `GET /api/sales/optical-orders/customer/:customerId` — order history for CRM

---

**Day 6 — Saturday May 3**  
**Task:** GST billing on order  
**Services:** `sales-service`, `financial-service`  
**Details:**
- Generate GST invoice vs non-GST invoice based on customer GST mode
- GST per line item (inherited from lens/CL/frame category — wired when Category GST master is built in Week 4; use placeholder for now)
- Partial payment: `paidAmount < billAmount` → create `CustomerDue` stub record (fully built in Week 4)
- Payment modes: CASH / CARD / UPI / BANK / SPLIT (multiple modes on one bill)
- Invoice number: `INV-{storeCode}-{YYYYMMDD}-{seq}` format
- Integrate with `financial-service`: POST revenue entry on confirmed + paid order

---

### WEEK 2: May 4 – May 10 — Inventory + Vendor Flow + Barcode + Store Damage

**Focus:** Complete the optical inventory engine — make every order check stock, create vendor orders, and track damage.

---

**Day 7 — Monday May 4**  
**Task:** Stock vs RX Order Logic  
**Services:** `inventory-service`, `sales-service`  
**Details:**
- New function `checkAndReserveStock(lensSpec, qty, storeId)`:
  1. Search `LensStock` by `{ power, cyl, axis, index, coating, storeId }`
  2. If `availableQty >= qty`: reserve → update `reservedQty` → return `{ status: 'reserved', stockId }`
  3. If `availableQty === 0`: create `PendingRXRequirement` → return `{ status: 'rx-pending', requirementId }`
  4. If `0 < availableQty < qty`: reserve what's available + create `PendingRXRequirement` for the shortfall → return `{ status: 'partial', stockId, requirementId }`
- Call this function in `POST /api/sales/optical-orders` for every lens/CL line item
- `PendingRXRequirement` model: `{ orderId, lensSpec, qty, qtyFromStock, qtyPending, status: 'open'|'vendor-ordered'|'partially-received'|'closed', vendorOrderId, tenantId }`

---

**Day 8 — Tuesday May 5**  
**Task:** Pending / Negative Requirement → Vendor Order  
**Services:** `purchase-service`, `inventory-service`  
**Details:**
- Cron/worker (or triggered): aggregate open `PendingRXRequirements` by vendor → auto-generate `VendorRXOrder` per vendor
- `VendorRXOrder` model: `{ vendorId, items: [{ requirementIds[], lensSpec, qtyOrdered }], status: 'sent'|'acknowledged'|'partially-received'|'closed', sentAt, expectedDelivery, tenantId }`
- `POST /api/purchase/rx-orders` — manual trigger or view
- `PATCH /api/purchase/rx-orders/:id/acknowledge` — vendor acknowledged
- When all items received: close `VendorRXOrder` and close linked `PendingRXRequirements`
- Stock accuracy: `availableQty = physicalQty - reservedQty`

---

**Day 9 — Wednesday May 6**  
**Task:** Vendor Inward Validation  
**Service:** `purchase-service`  
**Details:**
- `InwardEntry` model: `{ vendorRXOrderId, items: [{ lensSpec, qtyReceived, qtyAccepted, validationResult: 'correct'|'wrong-power'|'damaged'|'scratched'|'coating-issue'|'wrong-product', rejectedQty, returnRequired: Boolean, notes, photo: String }], receivedBy, receivedAt, storeId, tenantId }`
- `POST /api/purchase/inward` — create inward entry
- On inward: for accepted qty → add to `LensStock` (update `physicalQty`) → close corresponding `PendingRXRequirement` qty → update order status to lens-inward-received if all pending closed
- For rejected qty → if `returnRequired: true` → auto-create `VendorReturn` record (built on Day 10)
- `GET /api/purchase/inward` — list inward entries; `GET /api/purchase/inward/:id` — detail

---

**Day 10 — Thursday May 7**  
**Task:** Vendor Return System  
**Service:** `purchase-service`  
**Details:**
- `VendorReturn` model: `{ vendorId, inwardEntryId, items: [{ lensSpec, qty, rejectionReason, photos: [String] }], status: 'return-required'|'returned-to-vendor'|'replacement-pending'|'replacement-received'|'credit-note-received', returnDate, replacementReceivedDate, tenantId }`
- `VendorScore` model: `{ vendorId, month: String, totalOrders: Number, correctDeliveries: Number, wrongPower: Number, damaged: Number, delayedOrders: Number, score: Number, tenantId }` — updated on each inward/return event
- APIs:
  - `GET /api/purchase/vendor-returns` — list returns
  - `PATCH /api/purchase/vendor-returns/:id/status` — update return status
  - `GET /api/purchase/vendor-score/:vendorId` — vendor scorecard
  - `GET /api/purchase/vendor-score` — all vendor scores for period

---

**Day 11 — Friday May 8**  
**Task:** Barcode / QR System  
**Service:** `inventory-service`  
**Details:**
- Every product unit in `LensStock`, `FrameStock`, `AccessoryStock` etc. gets a unique barcode (`ITF-14` or `CODE128`) and QR code (URL-encoded: `etelios://scan/{productType}/{productId}/{unitId}`)
- `POST /api/inventory/barcode/generate` — generate barcode + QR for a product (or batch generate for multiple units)
- `GET /api/inventory/scan/:code` — scan endpoint: returns full product details, current stock status, location (store), reservation status
- `POST /api/inventory/audit/scan` — fast audit scan: record scanned unit against current audit session
- Store barcode as `barcodeData: String` and QR data URL as `qrDataUrl: String` on product unit record
- Return barcode image as base64 in response for printing

---

**Day 12 — Saturday May 9**  
**Task:** Store Damage & Loss Control  
**Service:** `inventory-service`  
**Details:**
- `DamageEntry` model: `{ storeId, type: 'frame-damage'|'sunglass-damage'|'lens-damage'|'cl-damage'|'mishandling'|'customer-trial'|'storage-damage'|'wear-tear', productId, productType, qty, description, photos: [String], reportedBy, reportedAt, auditorId, reviewStatus: 'pending'|'under-review'|'approved'|'rejected', fineDecision: 'no-fine'|'fine-applied'|'vendor-claim', fineAmount: Number, fineAppliedTo: ObjectId (employee), stockStatus: 'blocked'|'written-off'|'returned-to-vendor', financeImpact: Boolean, tenantId }`
- On creation: `stockStatus = 'blocked'` — stock blocked immediately; deducted from available but not yet written off
- `POST /api/inventory/damage` — create damage entry; upload photos
- `PATCH /api/inventory/damage/:id/review` — auditor review (approve/reject/fine decision)
- On approve: `stockStatus = 'written-off'`; if fine → create pending payroll deduction link; post finance expense (bridged in Week 5)
- On reject: `stockStatus = null` — stock unblocked

---

**Day 13 — Sunday May 10**  
**Task:** Buffer + Integration  
**Activities:**
- Review Week 2 deliverables
- Fix any blockers in stock-check logic
- Write unit tests for `checkAndReserveStock()` edge cases (concurrent reservations)
- Verify `PendingRXRequirement` lifecycle: open → vendor-ordered → partially-received → closed
- Push all Week 2 code to staging

---

### WEEK 3: May 11 – May 17 — Audit System + Dead Stock + Lab Engine + Breakage

---

**Day 14 — Monday May 11**  
**Task:** Audit System Part 1 — Assignment + Scan + Mismatch  
**Service:** `inventory-service`  
**Details:**
- `AuditSession` model: `{ type: 'daily'|'cycle'|'monthly'|'ho-auditor'|'surprise', storeId, departmentId, assignedTo: [ObjectId], startDate, endDate, status: 'assigned'|'in-progress'|'completed'|'pending-review', tenantId }`
- `AuditScanRecord` model: `{ auditSessionId, productId, productType, barcode, scannedQty, systemQty, mismatch: Boolean, mismatchQty: Number, notes: String, scannedBy, scannedAt }`
- APIs:
  - `POST /api/inventory/audits` — create audit session (assign to store/auditor)
  - `POST /api/inventory/audits/:sessionId/scan` — record a scan; auto-calculate mismatch vs system qty
  - `GET /api/inventory/audits/:sessionId/mismatches` — list all mismatches for this session
  - `POST /api/inventory/audits/:sessionId/complete` — mark scan phase complete → trigger mismatch report

---

**Day 15 — Tuesday May 12**  
**Task:** Audit System Part 2 — JTS integration + Stock Correction  
**Services:** `inventory-service`, `jts-service`  
**Details:**
- On `complete` of audit session with mismatches: auto-create JTS task for each mismatch batch (`type: 'stock-mismatch-investigation'`, `priority: 'high'`, assigned to store manager)
- `StockCorrection` model: `{ auditSessionId, mismatchId, correctionType: 'increase'|'decrease', qty, reason, approvedBy, approvedAt, jtsTaskId }`
- `POST /api/inventory/stock-corrections` — propose correction (approval-gated)
- `PATCH /api/inventory/stock-corrections/:id/approve` — stock updated in `LensStock`/`FrameStock` only after approval
- `PATCH /api/inventory/stock-corrections/:id/reject` — investigation continues
- Photo evidence: allow auditor to upload photo for each mismatch

---

**Day 16 — Wednesday May 13**  
**Task:** Dead Stock Protection  
**Services:** `analytics-service` / `inventory-service`  
**Details:**
- Scheduled job (daily cron): scan all stock; flag products with `lastSaleDate` older than configurable threshold (default: 90 days for lenses, 60 days for frames)
- `DeadStockFlag` model: `{ productId, productType, storeId, flaggedAt, lastSaleDate, daysSinceLastSale, currentQty, estimatedValue, suggestion: 'transfer'|'clearance'|'discount-sale'|'return-to-vendor', transferTargetStoreId }`
- `GET /api/analytics/dead-stock?storeId=&type=` — dead stock report for store or company
- `GET /api/analytics/slow-moving?storeId=&days=` — slow-moving report
- `POST /api/inventory/dead-stock/:id/clearance` — mark product for clearance sale (applies to all stores)
- Identify transfer opportunities: store A has dead stock + store B has 0 qty of same SKU → suggest transfer

---

**Day 17 — Thursday May 14**  
**Task:** Lab & Delivery Engine — Part 1  
**Service:** Extend `sales-service` with `lab.routes.js` + `labController.js` + `LabOrder.model.js` (avoid new microservice to reduce deployment risk)  
**Schema:**
```js
{
  opticalOrderId: ObjectId, // parent order
  storeId: ObjectId,
  tenantId: ObjectId,
  currentStage: String, // lens-available | fitting | qc | packing | dispatch | store-received | customer-delivered | rework | cancelled
  stages: [{
    stage: String,
    startedAt: Date,
    completedAt: Date,
    completedBy: ObjectId,
    slaDurationHours: Number,
    breached: Boolean,
    notes: String,
    photos: [String]
  }],
  assignedTechnician: ObjectId,
  fittingBreakageEntry: ObjectId, // link if breakage occurred during fitting
  qcRejectionReason: String,
  reworkCount: Number,
  dispatchDate: Date,
  deliveryDate: Date,
  customerDeliveredAt: Date
}
```
**APIs:**
- `POST /api/sales/lab-orders` — create lab order (auto-created when optical order is confirmed + lens available/inward)
- `PATCH /api/sales/lab-orders/:id/stage` — advance to next stage; auto-check SLA; if breached → auto-create JTS task
- `GET /api/sales/lab-orders` — list (filter by stage, store, date)
- `GET /api/sales/lab-orders/:id` — detail with full stage history

---

**Day 18 — Friday May 15**  
**Task:** Lab & Delivery Engine — Part 2  
**Service:** `sales-service` (lab routes)  
**Details:**
- QC rejection: `PATCH /api/sales/lab-orders/:id/qc-reject` — reject with reason; increment `reworkCount`; revert to fitting stage; notify technician
- Rework flow: re-enter fitting stage; if rework count > 2 → auto-create JTS escalation task
- Lab delay SLA: per-stage SLA configured per tenant (e.g. fitting: 4h, QC: 2h, dispatch: 1h); `isBreached(stage, startedAt, slaDuration)` helper; auto JTS on breach
- Vendor delay flag: if `lab order` awaiting lens inward for > configured SLA hours → flag `vendorDelay: true` on `VendorRXOrder` → auto JTS task (Vendor Return Follow-up)
- Delivery confirmation: `PATCH /api/sales/lab-orders/:id/delivered` — update `customerDeliveredAt`; update optical order `orderStatus: 'delivered'`

---

**Day 19 — Saturday May 16**  
**Task:** Breakage / Loss Entry  
**Service:** `inventory-service`  
**Details:**
- `BreakageEntry` model: `{ type: 'broke-during-fitting'|'wrong-cut'|'handling-damage'|'missing'|'scratched'|'coating-issue'|'vendor-defect', productId, opticalOrderId (optional), labOrderId (optional), staffId, stage: String (where in process), qty: Number, costPerUnit: Number, totalCost: Number, photos: [String], description: String, approvalStatus: 'pending'|'approved'|'rejected', approvedBy, financeImpact: Boolean, vendorDefectClaim: Boolean, tenantId }`
- `POST /api/inventory/breakage` — create entry; auto-deduct from stock (status: blocked until approval)
- `PATCH /api/inventory/breakage/:id/approve` — stock written off; finance impact flagged; if vendor defect → create `VendorReturn` entry
- Breakage during fitting: auto-create new LabOrder line item for replacement lens; check stock again
- `GET /api/inventory/breakage?storeId=&staffId=&type=&dateFrom=&dateTo=` — breakage report

---

**Day 20 — Sunday May 17**  
**Task:** Buffer + Integration  
**Activities:**
- Wire breakage → JTS approval task
- Wire lab stage changes → realtime events via `realtime-service` (broadcast to store dashboard)
- Test complete audit flow: assign → scan → mismatch → JTS task created
- Test breakage during fitting → replacement LabOrder created → stock checked again
- Push all Week 3 to staging

---

### WEEK 4: May 18 – May 24 — Finance Engine + GST + Cash Deposit + Due/Udhari + Complaint

---

**Day 21 — Monday May 18**  
**Task:** Cash / Bank Deposit Verification — Part 1  
**Service:** `financial-service`  
**Details:**
- `StoreDeposit` model: `{ storeId, tenantId, date: Date, dailyCashSales: Number, cashDepositedAmount: Number, depositMode: 'cash-at-bank'|'online-transfer'|'cash-pickup', bankName: String, accountNumber: String, utrReference: String, depositDate: Date, depositedBy: ObjectId, receiptUrl: String, verificationStatus: 'pending'|'verified'|'rejected'|'discrepancy', verifiedBy: ObjectId, verifiedAt: Date, discrepancyAmount: Number, jtsTaskId: ObjectId, notes: String }`
- `POST /api/financial/deposits` — store submits deposit; `verificationStatus: 'pending'`; **auto-create JTS task** of type `cash-deposit-verification` assigned to Accounts team
- `GET /api/financial/deposits?storeId=&status=&dateFrom=&dateTo=` — list deposits
- `GET /api/financial/deposits/:id` — detail with JTS task status

---

**Day 22 — Tuesday May 19**  
**Task:** Cash / Bank Deposit Verification — Part 2  
**Service:** `financial-service`  
**Details:**
- `PATCH /api/financial/deposits/:id/verify` — Accounts verifies; finance revenue updated; JTS task closed
- `PATCH /api/financial/deposits/:id/reject` — Accounts rejects with reason; JTS task updated with rejection; store gets notification
- `PATCH /api/financial/deposits/:id/discrepancy` — mark discrepancy (submitted amount ≠ verified amount); create follow-up JTS task for store admin to reconcile
- `GET /api/financial/deposits/reconciliation?storeId=&month=` — monthly reconciliation report (total sales vs total deposits verified)
- Finance ledger update: only update cash-received ledger entry after verification (not on submission)

---

**Day 23 — Wednesday May 20**  
**Task:** Customer Due / Udhari  
**Services:** `financial-service`, `crm-service`  
**Details:**
- `CustomerDue` model: `{ customerId, orderId, storeId, tenantId, billAmount: Number, paidAmount: Number, dueAmount: Number, dueDate: Date, approvedBy: ObjectId, recoveryStatus: 'open'|'partial-recovered'|'fully-recovered'|'written-off', reminderLog: [{ channel: 'whatsapp'|'sms'|'call'|'email', sentAt: Date, outcome: String, sentBy: ObjectId }], followUpDate: Date }`
- `POST /api/financial/customer-due` — create due record (auto-called from `POST /api/sales/optical-orders` when `dueAmount > 0` on Day 6)
- `GET /api/financial/customer-due?customerId=&storeId=&status=` — list dues
- `PATCH /api/financial/customer-due/:id/collect` — record payment; update `paidAmount`, `dueAmount`, `recoveryStatus`
- `GET /api/financial/customer-due/aging?storeId=` — aging report: 0-30 days, 31-60 days, 61-90 days, 90+ days
- Add due history to CRM: `GET /api/crm/:customerId/due-history` — pulls from financial-service

---

**Day 24 — Thursday May 21**  
**Task:** Due Reminders + Overdue → JTS  
**Services:** `financial-service`, `notification-service`  
**Details:**
- `POST /api/financial/customer-due/:id/reminder` — log a reminder sent (store owner marks when they called/messaged); record outcome
- Cron: daily overdue check — if `dueDate < today` and `recoveryStatus: 'open'` → create JTS task `due-recovery-follow-up` assigned to store admin; send notification
- `PATCH /api/financial/customer-due/:id/write-off` — write off bad debt; requires Superadmin approval; post to finance as bad-debt expense
- Due summary report: `GET /api/financial/customer-due/summary?storeId=&month=`

---

**Day 25 — Friday May 22**  
**Task:** GST Engine — GSTIN Master + Category GST  
**Service:** `financial-service`  
**Details:**
- `GSTINMaster` model: `{ companyId (tenantId), state: String, gstin: String, legalName: String, address: String, storeIds: [ObjectId], isDefault: Boolean, isActive: Boolean }`
- `CategoryGST` model: `{ categoryName: String, gstPercent: Number, hsnCode: String, taxType: 'CGST+SGST'|'IGST'|'exempt', effectiveFrom: Date, tenantId: ObjectId }` — products/lenses inherit from this
- APIs:
  - `POST/GET/PUT /api/financial/gstin` — GSTIN CRUD
  - `PATCH /api/financial/gstin/:id/stores` — assign stores to a GSTIN
  - `POST/GET/PUT /api/financial/gst-categories` — category GST + HSN master
  - `GET /api/financial/gstin?storeId=` — get GSTIN for a specific store (used during billing)

---

**Day 26 — Saturday May 23**  
**Task:** GST Calculation Logic  
**Service:** `financial-service` (new `gst.utils.js`)  
**Details:**
```js
// gst.utils.js
function calculateGST({ sellingPrice, gstPercent, gstMode, fromStateGSTIN, toStateGSTIN }) {
  const isInterState = getState(fromStateGSTIN) !== getState(toStateGSTIN);
  const gstAmount = sellingPrice * gstPercent / 100;
  if (isInterState) return { igst: gstAmount, cgst: 0, sgst: 0 };
  return { igst: 0, cgst: gstAmount / 2, sgst: gstAmount / 2 };
}

function calculatePurchaseGST({ purchasePrice, vendorGSTIN, buyerGSTIN, gstPercent }) {
  // Returns itc (input tax credit) amount
}
```
- Wire into `POST /api/sales/optical-orders` — compute GST per line item using store GSTIN vs customer state
- Stock Transfer GST: `POST /api/financial/stock-transfer-invoice` — interstate stock transfer between stores on different GSTINs → generate transfer invoice with IGST
- Validate: purchase GST input credit only claimable if `vendorGSTIN` is present and valid

---

**Day 27 — Sunday May 24**  
**Task:** Complaint & After-Sales Engine  
**Service:** Extend `crm-service` with `complaint.routes.js`, `complaintController.js`, `Complaint.model.js`  
**Schema + APIs:**
```js
// Complaint model
{
  complaintNo: String,
  customerId: ObjectId,
  orderId: ObjectId,
  storeId: ObjectId,
  type: 'power-not-comfortable'|'new-doctor-prescription'|'frame-issue'|'sunglass-issue'|'lens-coating-issue'|'cl-discomfort'|'product-defect'|'service-delay',
  description: String,
  photos: [String],
  prescriptionId: ObjectId,
  reviewStatus: 'open'|'under-review'|'resolved'|'rejected',
  decision: 'free-replacement'|'discounted-replacement'|'paid-replacement'|'repair'|'rejected',
  replacementOrderId: ObjectId,
  oldItemReturnStatus: 'pending-return'|'returned'|'not-required',
  serviceCost: Number,
  financePosted: Boolean,
  createdBy: ObjectId,
  resolvedBy: ObjectId,
  tenantId: ObjectId
}
```
- `POST /api/crm/complaints` — raise complaint; link to order + prescription + customer history
- `GET /api/crm/complaints` — list with filters
- `PATCH /api/crm/complaints/:id/review` — CS admin decision (approve/reject/charge/free)
- On approve: auto-create replacement `OpticalOrder` with `type: 'replacement'`; trigger inventory/lens/vendor flow
- On resolve: post `serviceCost` to `financial-service` as service-expense (bridged in Week 5)
- Old item return: track whether replaced item was returned to store

---

### WEEK 5: May 25 – May 31 — Finance Integration Bridges + Optical Reports

---

**Day 28 — Monday May 25**  
**Task:** Damage → Finance Bridge  
**Services:** `financial-service`, `payroll-service`, `inventory-service`  
**Details:**
- When `DamageEntry.reviewStatus` transitions to `'approved'`:
  - POST to `financial-service`: create expense record (`category: 'stock-damage'`, `amount: DamageEntry.qty * product.costPrice`)
  - If `fineDecision: 'vendor-claim'`: create `VendorClaim` flag on the product (triggers `VendorReturn` if not already created)
  - If `fineDecision: 'fine-applied'`: create `PayrollDeductionRequest` linked to `fineAppliedTo` employee in payroll-service
  - Inventory write-off: mark stock as `status: 'written-off'`; update `physicalQty`
  - Finance `InventoryWriteOff` entry: debit stock-damage-expense, credit inventory-asset

---

**Day 29 — Tuesday May 26**  
**Task:** Complaint → Finance Bridge + Replacement Trigger  
**Services:** `financial-service`, `inventory-service`, `purchase-service`  
**Details:**
- When complaint decision = `'free-replacement'` or `'discounted-replacement'`:
  - Trigger `POST /api/sales/optical-orders` for replacement order with `type: 'replacement'`, `complaintId` reference
  - This triggers the full optical order flow (stock check → lab order → delivery)
- When complaint resolved: POST `serviceCost` to `financial-service` as `category: 'complaint-service-expense'`
- If `type: 'product-defect'` and supplier is known: create `VendorClaim` against vendor
- If `type: 'lens-coating-issue'`: also create `VendorReturn` for affected batch (if identifiable from `batchNo`)
- Customer informed: trigger notification via `notification-service`

---

**Day 30 — Wednesday May 27**  
**Task:** Optical Sales Reports  
**Service:** `analytics-service`  
**APIs:**
- `GET /api/analytics/sales/daily?storeId=&date=` — daily sales summary (units, value, GST, non-GST)
- `GET /api/analytics/sales/store?tenantId=&dateFrom=&dateTo=` — store-wise sales comparison
- `GET /api/analytics/sales/category?storeId=&dateFrom=&dateTo=` — sales by product category
- `GET /api/analytics/sales/payment-mode?storeId=&dateFrom=&dateTo=` — cash vs card vs UPI vs bank breakdown
- `GET /api/analytics/due/aging?tenantId=&dateFrom=&dateTo=` — due/udhari aging report (all stores)
- All reports: support export as CSV (add `?export=csv` to any report endpoint)

---

**Day 31 — Thursday May 28**  
**Task:** Inventory & Vendor Reports  
**Service:** `analytics-service`  
**APIs:**
- `GET /api/analytics/inventory/lens-stock?storeId=&index=&brand=` — lens power-wise stock (grouped by brand/index/coating)
- `GET /api/analytics/inventory/cl-stock?storeId=&brand=` — contact lens stock by brand/modality
- `GET /api/analytics/inventory/dead-stock?storeId=` — dead stock summary with estimated value
- `GET /api/analytics/inventory/audit-mismatches?storeId=&month=` — audit mismatch history
- `GET /api/analytics/inventory/damage?storeId=&dateFrom=&dateTo=` — damage report with cost
- `GET /api/analytics/vendor/wrong-power?vendorId=&dateFrom=&dateTo=` — wrong power deliveries
- `GET /api/analytics/vendor/returns?vendorId=` — return summary (pending, completed)
- `GET /api/analytics/vendor/scorecard` — all vendor scorecards for current period

---

**Day 32 — Friday May 29**  
**Task:** Lab + Finance Reports  
**Service:** `analytics-service`, `financial-service`  
**APIs:**
- `GET /api/analytics/lab/pending?storeId=&stage=` — pending orders by stage
- `GET /api/analytics/lab/delay?storeId=&dateFrom=&dateTo=` — SLA breached orders (avg delay per stage)
- `GET /api/analytics/lab/qc-rejections?storeId=&dateFrom=&dateTo=` — QC rejection summary + reasons
- `GET /api/analytics/lab/breakage?storeId=&dateFrom=&dateTo=` — breakage report with cost per type
- `GET /api/financial/reports/store-expense?storeId=&month=` — store expense summary
- `GET /api/financial/reports/deposit-verification?storeId=&month=` — deposit status by store
- `GET /api/financial/reports/gst-liability?tenantId=&month=` — GST liability (CGST/SGST/IGST breakdown)
- `GET /api/financial/reports/pl?tenantId=&month=` — basic P&L (revenue - expenses)

---

**Day 33 — Saturday May 30**  
**Task:** HR/JTS Reports + Analytics Integration  
**Service:** `analytics-service`, `jts-service`  
**APIs:**
- `GET /api/analytics/hr/attendance-payroll?storeId=&month=` — store staff attendance vs payroll (for store managers)
- `GET /api/analytics/jts/task-delay?storeId=&dateFrom=&dateTo=` — JTS task delay + SLA breach by store
- `GET /api/analytics/jts/productivity?staffId=&month=` — staff task completion rate
- `GET /api/analytics/lab/technician-breakage?staffId=&month=` — per-technician breakage rate (for performance review)
- Wire analytics queries to use indexed MongoDB aggregation pipelines; ensure `tenantId` is always in every query

---

**Day 34 — Sunday May 31**  
**Task:** JTS Auto-Task Registry Audit  
**Activity:** Systematically verify all 10 auto-task triggers are wired:
1. Store deposit → JTS ✓ (Day 21)
2. Audit mismatch → JTS ✓ (Day 15)
3. Vendor wrong/damaged → JTS ✓ (Day 10)
4. Damage fine approved → JTS ✓ (Day 28)
5. Complaint raised → JTS (add to Day 27 code if missing)
6. Vendor replacement overdue → cron check (add if missing)
7. Expense approval → verify existing JTS trigger
8. Payroll approval → existing ✓
9. Customer due overdue → JTS ✓ (Day 24)
10. RX order follow-up → cron check ✓ (Day 8)

Fill any gaps; push to staging; run integration smoke test on all 10 triggers.

---

### WEEK 6: Jun 1 – Jun 7 — E2E Integration Tests + API Docs + K8s

---

**Day 35 — Monday Jun 1**  
E2E Flow Test 1: Full Customer Order  
Customer created → prescription entered → frame + lens selected → stock check (reserved or RX vendor order) → billing with GST → lab order created → fitting → QC → dispatch → customer delivery. Verify every status transition, every finance entry, every JTS task where triggered.

**Day 36 — Tuesday Jun 2**  
E2E Flow Test 2: Lens Vendor Flow  
RX vendor order created → lens received with wrong power → vendor return created → replacement pending → replacement received → stock updated → vendor score updated → PendingRXRequirement closed → optical order status updated to lens-available → lab order advanced.

**Day 37 — Wednesday Jun 3**  
E2E Flow Test 3: Damage + Cash Deposit  
Damage entry (lens during fitting) → stock blocked → JTS task → auditor reviews → fine approved → stock written off → finance expense → payroll deduction created. PLUS: store enters cash deposit → JTS task created → accounts verifies → finance ledger updated.

**Day 38 — Thursday Jun 4**  
E2E Flow Test 4: Complaint + Due Recovery  
Complaint raised → CS reviews → free replacement approved → replacement optical order created → new lab order started → service cost posted to finance. PLUS: customer with outstanding due → reminder logged → payment collected → due closed → finance updated.

**Day 39 — Friday Jun 5**  
Kong API Gateway + K8s Update:
- Add routes to `kong.yml` for all new endpoints: `/api/inventory/lens-master`, `/api/inventory/cl-master`, `/api/sales/optical-orders`, `/api/sales/lab-orders`, `/api/purchase/rx-orders`, `/api/purchase/inward`, `/api/purchase/vendor-returns`, `/api/inventory/damage`, `/api/inventory/breakage`, `/api/inventory/audits`, `/api/crm/complaints`, `/api/financial/deposits`, `/api/financial/customer-due`, `/api/financial/gstin`, `/api/financial/gst-categories`
- Update `microservices/shared/utils/shellRoutePermissions.js` with new route-permission mappings
- Update K8s `etelios-prod` manifests if new deployments added (lab routes as extension of sales-service don't require new deployment)
- Update `INGRESS_SOURCE_OF_TRUTH.md` (currently empty at repo root)

**Day 40 — Saturday Jun 6**  
API Documentation:
- Add Swagger/OpenAPI annotations to all new controllers
- Update `docs/BACKEND_CHECKLIST_FRONTEND_INTEGRATION.md` with all new module endpoints
- Update `API_CONTRACT_CANONICAL.md` (currently empty at root) with canonical endpoint list
- Create `docs/OPTICAL_BUSINESS_ENGINE_API_GUIDE.md` — frontend integration guide for lens master, orders, lab, complaints
- Update `docs/FRONTEND_AUTH_AND_ROUTING_COMPLETE_GUIDE.md` with new module routes that need frontend pages

**Day 41 — Sunday Jun 7**  
Bug-Fix Buffer:
- Triage all failures from integration tests (Days 35–38)
- Fix top-priority blockers (stock reservation race condition, GST calculation edge cases, JTS task creation failures)
- Add missing MongoDB indexes (compound indexes for power+index+coating+storeId queries, tenantId on all new collections)
- Performance test: run load test on `/api/sales/optical-orders` (order creation with stock check) — must complete < 500ms

---

### FINAL PUSH: Jun 8 – Jun 10

**Day 42 — Monday Jun 8**  
K8s Production Deploy:
- Update `microservices/docker-compose.yml` with any new environment variables
- Update `k8s/etelios-prod` manifests for changed services (sales-service with lab routes, inventory-service with new routes, financial-service, purchase-service, crm-service)
- Run `build-and-push.sh` for modified services
- Rolling deploy to EKS; health check all services post-deploy

**Day 43 — Tuesday Jun 9**  
Monitoring Hardening:
- `monitoring-service`: replace stubs with real business alerts:
  - Deposit verification pending > 24 hours → alert Finance
  - Lab order stuck in same stage > SLA → alert Lab Manager
  - Vendor return replacement pending > 7 days → alert Purchase Manager
  - Outstanding due > due date by 30 days → alert Store Admin
- Wire realtime-service events for all critical state changes (lab stage, deposit verified, complaint resolved)
- Verify all JTS escalation jobs are running (escalation.job.js, slaMonitor.job.js)

**Day 44 — Wednesday Jun 10 — FINAL DELIVERY CHECKPOINT**  
- Run full V1 module checklist (all 23 modules)
- Run end-to-end smoke test in staging environment
- Fix any last-minute critical bugs
- Update `docs/ETELIOS_V1_SPRINT_PLAN_APR28_JUN10_2026.md` (this document) with completion status
- Prepare handoff notes for frontend team

---

## 6. Module Completion Checklist (Jun 10 Target)

| # | V1 Module | Status on Jun 10 |
|---|---|---|
| 1 | Platform Tenant Management | Complete |
| 2 | Admin Control Engine (Super/Tenant/Store/Dept) | Complete |
| 3 | HRMS | Complete (was already built) |
| 4 | Attendance & Leave | Complete (was already built) |
| 5 | Payroll | Complete (was already built) |
| 6 | JTS Execution Engine | Complete (was already built + 10 new auto-tasks) |
| 7 | CRM | Complete (with prescription/order/due history) |
| 8 | Order Management (Optical) | Complete |
| 9 | Billing / Sales | Complete (with GST billing) |
| 10 | Lens & Contact Lens Control Engine | Complete |
| 11 | Vendor RX Order & Return System | Complete |
| 12 | Lab & Delivery Engine | Complete |
| 13 | Inventory Core | Complete (optical categories) |
| 14 | Barcode / QR System | Complete |
| 15 | Audit System | Complete |
| 16 | Dead Stock Protection | Complete |
| 17 | Store Damage & Loss Control | Complete |
| 18 | Complaint & After-Sales Engine | Complete |
| 19 | Finance V1 | Complete |
| 20 | Cash / Bank Deposit Verification | Complete |
| 21 | Customer Due / Udhari Control | Complete |
| 22 | GST & Taxation Engine | Complete |
| 23 | Reports & Monitoring | Complete |

---

## 7. Strictly Excluded from V1 (Do Not Build Before Jun 10)

| Feature | Reason |
|---|---|
| Full AI Brain / Predictive AI | Requires complete V1 data foundation first |
| ATS (Applicant Tracking System) | HR module covers recruitment basics |
| LMS (Learning Management System) | Training stub exists; full LMS is post-V1 |
| Advanced BI Builder | Standard reports cover V1 needs |
| WhatsApp API Automation | Notification hooks exist; full WA automation is post-V1 |
| Voice / OCR Input | Not a V1 requirement |
| Multi-Industry Templates | Etelios is optical-vertical only in V1 |
| Full Accounting Replacement (Tally) | Finance V1 covers basic P&L + expense |
| Franchise Billing Engine | Post-V1 |
| Native Mobile App (iOS/Android) | API-first; web covers V1 |

---

## 8. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Stock reservation race condition (concurrent orders) | High | Use MongoDB transactions on stock-check + reserve step; add optimistic locking with version field on LensStock |
| GST edge cases (intra/inter-state, GST-inclusive price) | High — compliance | Isolate all GST logic in `gst.utils.js`; comprehensive unit tests on Day 26; get CA validation if possible |
| Lab service architecture (new service vs extension) | Medium | Extend sales-service in Week 3 to avoid new K8s deployment; refactor to own service post-V1 |
| Frontend lag — new modules have no UI by Jun 10 | High | Deliver complete Swagger docs + integration guide by Day 40 (Jun 6); frontend team can parallel-build from API specs |
| Single developer — no slack buffer | Critical | Each week has 1 buffer day (Sun); Week 6 has full buffer day (Jun 7); Jun 8-10 is deploy + smoke only, no new features |
| MongoDB query performance on lens power-wise stock | Medium | Add compound indexes `{ power, cyl, axis, index, coating, storeId, tenantId }` on LensStock on Day 41 |

---

## 9. Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Lab & Delivery service | Extend `sales-service` (new `lab.routes.js`) | Avoid new K8s deployment overhead for V1; lab orders are tightly coupled to optical orders |
| Complaint engine | Extend `crm-service` (new `complaint.routes.js`) | Complaints are CRM events; share customer + order context; promote to own service in V2 |
| GST calculation | New `gst.utils.js` in `financial-service` | Single source of truth; all GST math in one testable module |
| Barcode/QR generation | Server-side in `inventory-service` using existing image libraries | No new service needed; barcodes stored as base64 on product unit record |
| Stock locking | MongoDB transactions (multi-document) | Already using Mongoose 8; transactions prevent overselling |
| Vendor score | Calculated and stored in `VendorScore` model per month | Cheap to query; updated incrementally on each inward/return event |

---

*Document version: 1.0 · Generated by codebase analysis on Apr 28, 2026*  
*Next review: Jun 10, 2026 (delivery checkpoint)*
