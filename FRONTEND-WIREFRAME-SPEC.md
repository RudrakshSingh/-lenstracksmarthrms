### Etelios Frontend Wireframe Specification (Developer-Ready)

This document defines the end-to-end UI wireframes, flows, components, and states for the Etelios web app. It is technology-agnostic (React recommended) and optimized for multi-tenant, microservices-based backend.

---

## Global UX Standards
- **Layout**: Top App Bar (brand, tenant switcher, search, notifications, user menu) + Left Sidebar Navigation (collapsible) + Content Area + Right Context Panel (optional)
- **Themes**: Light/Dark; tenant-brand colors (primary/secondary) pulled from tenant registry
- **Responsiveness**: Desktop ≥1200px, Tablet 768–1199px, Mobile ≤767px
- **State patterns**: Loading, Empty, Success, Error, Offline, No Permission
- **Data tables**: Server-side pagination, column filters, saved views, export CSV/XLSX
- **Forms**: Inline validation, optimistic updates where safe, undo/snackbar for destructive actions
- **RBAC**: Hide-in-UI + guarded routes by `role`/`scope`

---

## Navigation
- Dashboard
- Sales
  - Leads
  - Opportunities
  - Quotes
  - Orders
  - Customers
  - Products & Price Lists
  - Sales Analytics
- Inventory
  - Stock Overview
  - Ageing Report
  - Reservations
  - Dispatch (Pick/Pack/Ship)
  - Transfers
  - Batches & Expiry
- Purchasing, HR, Finance, Documents, Notifications, Analytics, Settings, Admin (as per modules)

---

## 1) Dashboard
- KPIs: Today’s Orders, Open Opportunities, Ageing Risk (90+ days), Near-Expiry Lots, Out-of-Stock SKUs
- Widgets: Sales Funnel, Recent Activities, Alerts (near-expiry, allocation failures), Tasks
- Interactions: Drilldowns to modules; configurable layout per user

Components:
- `KpiCard`, `ChartCard`, `AlertList`, `ActivityTimeline`

---

## 2) Sales Module
### 2.1 Leads List
- Table columns: Lead ID, Name/Company, Source, Owner, Score, Status, Created, Last Activity
- Filters: Owner, Source, Score range, Date, Status
- Actions: Create Lead, Import, Bulk Edit, Assign, Convert
- Right Panel: Lead preview (info, notes, timeline)

Lead Detail
- Tabs: Overview, Activities, Emails, Files, Timeline
- CTA: Convert to Opportunity/Customer; Assign; Add Task/Note

### 2.2 Opportunities
- Board (kanban) + Table views
- Cards: Title, Amount, Close Date, Probability, Owner, Next Step
- Actions: Move stage (drag-drop), Add products, Generate quote

Opportunity Detail
- Tabs: Overview, Products, Stakeholders, Timeline, Files, Emails
- Right Panel: AI assistant (next-best action, email drafts)

### 2.3 Quotes
- List: Quote No, Customer, Amount, Valid Till, Status, Owner
- Detail: Customer, Line Items (SKU, name, qty, price, discount, tax), Terms, Total
- Actions: Send Email, Export PDF, Approve/Reject, Convert to Order

### 2.4 Orders
- List: Order No, Customer, Status (New/Reserved/Picked/Shipped), Amount, Created, Owner
- Detail Tabs: Summary, Lines, Allocation, Shipment, Invoices, Timeline
- Actions: Reserve Stock, Create Shipment, Cancel, Duplicate

### 2.5 Customers
- List: Name, Type, Contacts, Recent Orders, Lifetime Value, Tags
- Detail: Company Profile, Contacts, Addresses, Notes, Orders, Quotes, Files

### 2.6 Products & Price Lists
- Products List: SKU, Name, Category, UOM, Price, Stock, Status
- Product Detail: Images, Specs, Batches (if any), Price Tiers, Related SKUs
- Price Lists: Name, Currency, Effective Dates, Rules, Overrides

### 2.7 Sales Analytics
- Charts: Pipeline by Stage, Win/Loss, Revenue by Product/Region, Rep Performance
- Filters: Date, Team, Region, Product, Tenant

---

## 3) Inventory Module
### 3.1 Stock Overview
- Table: Warehouse, SKU, Name, On Hand, Reserved, Available, Inbound, Age (avg), Near-Expiry flag
- Filters: Warehouse, Category, Stock Status, Tenant
- Actions: Adjustments, Transfers, Export

### 3.2 Ageing Report
- Table Columns: SKU, Name, Warehouse, Lot/Batch, Received Date, Expiry Date (if any), Age (days), Buckets (0–30 / 31–60 / 61–90 / 90+), Qty On Hand, Reserved, Available
- Controls: Bucket thresholds, Include Near-Expiry, Only FEFO-tracked, Group by SKU or Lot
- Row Actions: View Lot, Reserve, Create Transfer, Quarantine
- Empty: “No stock found in selected filters”

Detail Drawer (Lot)
- Metadata: LotId, Received, Expiry, Supplier, Documents
- Movements: Receipts, Reservations, Picks, Adjustments
- AI Hint: “Suggest dispatch plan” (considers FEFO/FIFO and orders)

### 3.3 Reservations
- Table: ReservationId, Order, SKU, Lot(s), Qty, Created, Expires, Status
- Actions: Release, Reallocate, Extend hold

### 3.4 Dispatch (Pick/Pack/Ship)
- Steps: Select Orders → Allocate/Reserve → Pick → Pack → Ship
- Orders Board: New, Reserved, Picking, Packed, Shipped
- Pick Screen (per order):
  - Header: Order info, Ship-to, SLA, Notes
  - Lines Table: SKU, Name, Qty Ordered, Qty Reserved, Allocation (lot-wise), Status
  - Allocation Panel:
    - Policy: FIFO/FEFO (read-only or override by permission)
    - Min Shelf Life (days)
    - Max Lot Splits
    - Suggested Lots: list with Age, Expiry, Qty Available, Distance (if multi-location)
    - Actions: Accept Suggestions, Edit Allocation
  - Validation: Re-check lots on confirm (available, not expired, meets shelf-life)
  - CTAs: Confirm Pick, Mark Short, Print Pick List

- Pack Screen: Packages, Dimensions, Labels, Contents, Photos
- Ship Screen: Carrier, AWB, Tracking, Handover, Ship Confirm

States: Partial pick, Substitution, Shortage, Exception (damaged/expired)

### 3.5 Transfers
- Create Transfer: From Warehouse, To Warehouse, Lines (SKU, qty), Notes
- Transfer Detail: Status (Planned/In Transit/Received), Lots, Documents
- Receiving: Scan lots, verify qty, putaway location; preserve lot metadata

### 3.6 Batches & Expiry
- Batches List: LotId, SKU, Received, Expiry, Qty, Status (OK/Near-Expiry/Expired/Quarantine)
- Actions: Quarantine, Dispose, Rework, Relabel

---

## 4) Admin & Settings
- Tenant Branding: Logo, Colors
- Users & Roles: Invite users, role matrix, fine-grained scopes
- Inventory Policies:
  - Dispatch Policy: FIFO | FEFO per SKU/category
  - Min Shelf Life (days)
  - Max Lot Splits per line
  - Auto-reserve on order create (on/off)
- Integrations: Email (SendGrid), SMS (ACS), Storage, Webhooks
- Feature Flags

---

## 5) Shared UI Components
- Navigation: `TopBar`, `Sidebar`, `Breadcrumbs`, `TenantSwitcher`
- Tables: `DataTable` (virtualized), `ColumnFilters`, `SavedViews`, `ExportButton`
- Forms: `Form`, `Field`, `InlineErrors`, `AutoSaveToggle`
- Feedback: `Toast`, `Snackbar`, `ConfirmDialog`, `EmptyState`
- Media: `Uploader` (Blob), `Image`, `PDFPreview`
- AI: `AiAssistantPanel`, `SuggestionList`, `PromptTemplatePicker`

---

## 6) Wireframe Sketches (ASCII)

Orders → Pick Allocation (FIFO/FEFO)
```
+----------------------------------------------------------------------------------+
| Order #SO-10243             Customer: Acme Pvt Ltd           SLA: Today 6 PM     |
+----------------------------------------------------------------------------------+
| Lines                                                             | Allocation   |
| SKU        Name                Ord  Res  Pick  Status             | Policy: FEFO |
| P-001      Lens A - 1.5        10   10    0    Reserved           | Min Shelf:15 |
| P-002      Frame X             5    3     0    Partially Reserved | Max Splits:3 |
|                                                                    |              |
| [View Allocation]                                                  | Suggestions  |
|                                                                    | Lot  L1  Age:92d  Exp:2025-12-12  Avl:7   [Add 5] |
|                                                                    | Lot  L4  Age:61d  Exp:2026-01-10  Avl:10  [Add 5] |
|                                                                    | -----------------------------------------------  |
|                                                                    | [Accept Suggested]   [Edit]   [Reset]            |
+----------------------------------------------------------------------------------+
| [Confirm Pick]  [Mark Short]  [Print Pick List]                                   |
+----------------------------------------------------------------------------------+
```

Inventory → Ageing Report
```
+----------------------------------------------------------------------------------+
| Filters: Warehouse:[Main]  Policy:[FEFO]  Buckets:[0-30|31-60|61-90|90+]  Search: |
+----------------------------------------------------------------------------------+
| SKU     Name         Lot    Received     Expiry       Age  0-30 31-60 61-90 90+ Avl |
| P-001   Lens A       L1     2025-07-10   2025-12-12    92    -     -     3    7  10 |
| P-001   Lens A       L4     2025-08-10   2026-01-10    61    -     -     10   -  10 |
| P-002   Frame X      L2     2025-09-05   -             35    -     5     -    -   5 |
+----------------------------------------------------------------------------------+
| [Reserve] [Transfer] [Quarantine] [Export]                                         |
+----------------------------------------------------------------------------------+
```

---

## 7) API Integration Notes
- All requests include `Authorization: Bearer <token>` and `X-Tenant-Id` headers
- Pagination params: `page`, `limit`, `sort`, `order`
- Common endpoints used by UI:
  - Inventory
    - GET `/api/inventory/ageing?sku=&warehouse=&buckets=30,60,90&policy=fefo`
    - POST `/api/inventory/allocations/reserve` { orderId, lines[] }
    - POST `/api/inventory/dispatch/confirm` { orderId }
    - POST `/api/inventory/transfers` { from, to, lines[] }
  - Sales
    - GET `/api/sales/orders` | GET `/api/sales/orders/:id`
    - POST `/api/sales/quotes` | POST `/api/sales/orders`
  - Admin
    - GET `/api/tenant/config` (branding, policies)

---

## 8) Permissions Matrix (extract)
- Sales Rep: view/create leads, opportunities, quotes; view orders; request reservation
- Warehouse Picker: view allocations, confirm picks, mark short, print pick list
- Inventory Manager: configure policies, quarantine, approve substitutions, transfers
- Admin: tenant configs, roles, feature flags

---

## 9) Edge Cases & States
- No stock available → suggest alternatives (substitute SKUs) or backorder
- Near-expiry violation → block confirm with rationale; override requires permission
- Concurrency → allocation conflict toast + auto-retry; refresh suggestions
- Offline mode (mobile) for pick list viewing; sync on reconnect

---

## 10) Implementation Checklist (Frontend)
- Routing & guards (RBAC + tenant)
- State management (queries, cache invalidation by tenant)
- Reusable table/forms with server-driven config
- Print-ready pick/pack lists
- Accessibility (WCAG AA), keyboard navigation
- Telemetry hooks (page/time/taps), consent-gated

---

Figma handoff suggestion: create pages matching sections above; name frames `INV-Ageing`, `INV-Dispatch-Pick`, `SALES-Orders-List`, etc. Use component library tokens for quick theming per tenant.
