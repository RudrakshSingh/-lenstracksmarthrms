# Lens Management System - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [Prescription Management](#prescription-management)
5. [Contact Lens Plan Management](#contact-lens-plan-management)
6. [Clinical Calculations](#clinical-calculations)
7. [Lab Job Management](#lab-job-management)
8. [Inventory Integration](#inventory-integration)
9. [CPP Policy & Lens Rules](#cpp-policy--lens-rules)
10. [API Endpoints](#api-endpoints)
11. [Data Models](#data-models)
12. [Workflows](#workflows)
13. [Features & Capabilities](#features--capabilities)

---

## Overview

The Lens Management System is a comprehensive solution for managing all aspects of lens-related operations in an optical retail business. It handles both **spectacle lenses** and **contact lenses**, including prescription management, clinical calculations, lab job processing, inventory tracking, and customer engagement through contact lens refill plans.

### Key Capabilities
- **Prescription Management**: Create, update, and manage spectacle and contact lens prescriptions
- **Clinical Calculations**: Automated calculations for near addition, vertex compensation, cylinder transposition, and contact lens mapping
- **Lab Job Processing**: Track lens manufacturing and processing jobs from creation to delivery
- **Contact Lens Plans**: Manage recurring contact lens refill schedules with automated reminders
- **Inventory Integration**: Link prescriptions to product inventory for seamless ordering
- **RxLink System**: Enable prescription-based ordering in POS and e-commerce systems

---

## System Architecture

The Lens Management System is built on a microservices architecture with the following key services:

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway                               │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Prescription │   │  CRM Service │   │ Sales Service │
│   Service    │   │              │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Inventory    │   │ Notification │   │ CPP Service  │
│   Service    │   │   Service    │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
```

### Service Responsibilities

- **Prescription Service**: Core prescription management, clinical calculations, RxLink generation
- **CRM Service**: Contact lens plan management, customer engagement
- **Sales Service**: Lab job creation and tracking, POS integration
- **Inventory Service**: Product master data, lens specifications
- **Notification Service**: Automated reminders for contact lens refills
- **CPP Service**: Lens pricing rules and policy management

---

## Core Components

### 1. Prescription Management Module

Handles creation, validation, and lifecycle management of prescriptions for both spectacle and contact lenses.

**Key Features:**
- Prescription creation with type-specific details
- Prescription signing and immutability
- Validity period calculation
- Audit trail tracking
- RxLink generation for commerce integration

### 2. Clinical Calculations Engine

Automated clinical calculations for optical prescriptions.

**Supported Calculations:**
- Near Addition Calculation
- Cylinder Transposition (Plus/Minus)
- Vertex Distance Compensation
- Spectacle to Contact Lens Mapping
- Prescription Validation

### 3. Contact Lens Plan Manager

Manages recurring contact lens refill schedules with automated reminders.

**Features:**
- Replacement cycle tracking
- Automated refill reminders (20, 15, 7, 1 days before due)
- Brand and product tracking
- Purchase history

### 4. Lab Job Processor

Tracks lens manufacturing and processing jobs.

**Job Types:**
- FRAME
- LENS
- CONTACT_LENS
- SUNGLASSES
- REPAIR
- OTHER

**Status Flow:**
```
PENDING → IN_PROGRESS → READY → DELIVERED
                              ↓
                          CANCELLED
```

### 5. RxLink System

Enables prescription-based ordering in POS and e-commerce systems.

**Features:**
- Prescription linking to orders
- Usage tracking
- Expiry management
- Scope-based access (POS/ECOM)

---

## Prescription Management

### Prescription Types

#### 1. Spectacle Prescription (SPECTACLE)

**Structure:**
```javascript
{
  type: "SPECTACLE",
  distance: {
    r: { sph, cyl, axis, va },
    l: { sph, cyl, axis, va }
  },
  near: { /* calculated or manual */ },
  intermediate: { /* calculated or manual */ },
  add_power: Number,
  pd: { mono_r, mono_l, bin },
  heights: { r, l },
  prism: { r: { h, v, base }, l: { h, v, base } },
  wrap_angle: Number,
  pantoscopic_tilt: Number,
  vertex_distance: Number,
  lens_recommendation: {
    material: "CR39" | "MR8" | "Poly" | "Trivex" | "HiIndex_1.67" | "HiIndex_1.74",
    coatings: ["AR", "Blue", "Photo", "UV", "AntiGlare"]
  }
}
```

**Key Fields:**
- **Distance**: Primary prescription for distance vision
- **Near**: Calculated from distance + add power
- **Intermediate**: Calculated with factor (default 0.6)
- **PD (Pupillary Distance)**: Monocular or binocular measurements
- **Heights**: Segment heights for progressive lenses
- **Prism**: Prismatic correction if needed
- **Lens Recommendation**: Material and coating suggestions

#### 2. Contact Lens Prescription (CONTACT_LENS)

**Structure:**
```javascript
{
  type: "CONTACT_LENS",
  lens_type: "SPHERIC" | "TORIC" | "MULTIFOCAL" | "HIGH_POWER",
  brand: String,
  series: String,
  r: {
    sph: Number,
    cyl: Number,
    axis: Number,
    add: Number | "LOW" | "MED" | "HIGH",
    base_curve: Number,
    diameter: Number,
    k_readings: { k1, k2, axis },
    vertex_distance: Number
  },
  l: { /* same structure */ },
  wear_schedule: "DAILY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY",
  care_solution: String,
  trial_log: [{
    date: Date,
    brand: String,
    bc: Number,
    dia: Number,
    fit_notes: String,
    comfort: Number (1-5),
    va: String
  }],
  next_refill_due_at: Date,
  contraindications: String
}
```

### Prescription Lifecycle

```
DRAFT → SIGNED → ACTIVE → EXPIRED/REPLACED
```

1. **DRAFT**: Prescription can be edited
2. **SIGNED**: Prescription is immutable, RxLink created
3. **ACTIVE**: Valid prescription for use
4. **EXPIRED**: Prescription validity period ended
5. **REPLACED**: Superseded by new prescription

### Prescription Validity

- **Spectacle Prescriptions**: 12 months (default)
- **Contact Lens Prescriptions**: 12 months (default)
- Validity calculated from `rx_date`

---

## Contact Lens Plan Management

### Contact Lens Plan Structure

```javascript
{
  clp_id: String,              // Unique plan ID (e.g., "CLP-000001")
  customer_id: ObjectId,        // Reference to Contact
  store_id: ObjectId,          // Reference to Store
  brand: String,               // Contact lens brand
  product_name: String,        // Product name
  replacement_cycle_days: Number, // 1-365 days
  last_purchase_at: Date,
  next_refill_due_at: Date,
  quantity_per_cycle: Number,
  is_active: Boolean,
  reminder_sent: {
    t20: Boolean,  // 20 days before
    t15: Boolean,  // 15 days before
    t7: Boolean,   // 7 days before
    t1: Boolean    // 1 day before
  }
}
```

### Reminder System

Automated reminders are sent at:
- **T-20**: 20 days before refill due date
- **T-15**: 15 days before refill due date
- **T-7**: 7 days before refill due date
- **T-1**: 1 day before refill due date

### Plan Workflow

1. **Creation**: Plan created when customer purchases contact lenses
2. **Tracking**: System tracks last purchase and calculates next refill date
3. **Reminders**: Automated reminders sent at specified intervals
4. **Refill**: Customer purchases refill, plan updated with new dates
5. **Deactivation**: Plan can be deactivated if customer stops using contact lenses

---

## Clinical Calculations

### 1. Near Addition Calculation

Calculates near and intermediate power from distance prescription and add power.

**Formula:**
```
Near Power = Distance Power + Add Power
Intermediate Power = Distance Power + (Add Power × Factor)
```

**Default Intermediate Factor**: 0.6 (60% of add power)

**Example:**
```javascript
Input:
  distance: { r: { sph: -2.00, cyl: -0.50, axis: 180 } },
  add_power: 2.00

Output:
  near: { r: { sph: 0.00, cyl: -0.50, axis: 180 } },
  intermediate: { r: { sph: -0.80, cyl: -0.50, axis: 180 } }
```

### 2. Cylinder Transposition

Converts between plus and minus cylinder notation.

**Formula:**
```
New Sphere = Old Sphere + Old Cylinder
New Cylinder = -Old Cylinder
New Axis = (Old Axis + 90) % 180
```

**Modes:**
- `PLUS`: Convert minus cyl to plus cyl
- `MINUS`: Convert plus cyl to minus cyl

### 3. Vertex Distance Compensation

Compensates for vertex distance changes in high-power prescriptions.

**Formula:**
```
F_effective = F / (1 - d × F)
```

Where:
- `F` = Original power
- `d` = Vertex distance change in meters

**Application:**
- Only applied for powers ≥ 4.00D
- Critical for contact lens fitting from spectacle prescription

### 4. Spectacle to Contact Lens Mapping

Maps spectacle prescription to contact lens parameters.

**Process:**
1. Apply vertex compensation (default 12mm)
2. Determine lens type based on cylinder:
   - `SPHERIC`: Cylinder < 0.75D
   - `TORIC`: Cylinder ≥ 0.75D
3. Suggest base curve and diameter based on brand/series

**Supported Brands:**
- ACUVUE (OASYS, MOIST)
- DAILIES (TOTAL1, AQUACOMFORT)
- AIR_OPTIX (PLUS)

### 5. Prescription Validation

Validates prescription parameters for safety and accuracy.

**Validation Rules:**
- **Sphere Range**: -20.00D to +15.00D
- **Cylinder Range**: 0 to -8.00D
- **Axis Range**: 0-180 degrees
- **High Power Warning**: Powers ≥ 4.00D
- **High Cylinder Warning**: Cylinder ≥ 2.00D

---

## Lab Job Management

### Lab Job Structure

```javascript
{
  job_number: String,           // Unique job number
  invoice_id: ObjectId,         // Reference to POSInvoice
  customer_id: ObjectId,       // Reference to Customer
  store_id: ObjectId,          // Reference to Store
  prescription_id: ObjectId,   // Reference to Prescription (optional)
  job_type: "FRAME" | "LENS" | "CONTACT_LENS" | "SUNGLASSES" | "REPAIR" | "OTHER",
  status: "PENDING" | "IN_PROGRESS" | "READY" | "DELIVERED" | "CANCELLED",
  estimated_completion: Date,
  actual_completion: Date,
  notes: String
}
```

### Job Creation

Lab jobs are automatically created when:
- Invoice contains lens items
- Prescription is linked to order
- Manual creation via API

### Status Transitions

```
PENDING
  ↓
IN_PROGRESS
  ↓
READY
  ↓
DELIVERED

(Any status can transition to CANCELLED)
```

### Lab Job Workflow

1. **Invoice Creation**: When lens items are added to invoice
2. **Job Creation**: Lab job automatically created
3. **Processing**: Status updated to IN_PROGRESS
4. **Completion**: Status updated to READY when lens is ready
5. **Delivery**: Status updated to DELIVERED when customer receives

---

## Inventory Integration

### Product Master Model

Lenses are tracked in the inventory system through the Product Master model:

```javascript
{
  model_number: String,
  product_type_id: ObjectId,   // Links to ProductType (LENS, CONTACT_LENS, etc.)
  brand_id: ObjectId,
  name: String,
  material_id: ObjectId,        // Lens material
  mrp: Number,
  traits: {
    rx_required: Boolean,      // Requires prescription
    serial_tracking: Boolean,
    batch_expiry: Boolean
  }
}
```

### Lens Materials

Supported lens materials:
- **CR39**: Standard plastic
- **MR8**: Mid-index
- **Poly**: Polycarbonate
- **Trivex**: High-impact resistant
- **HiIndex_1.67**: High-index 1.67
- **HiIndex_1.74**: High-index 1.74

### Lens Coatings

Available coatings:
- **AR**: Anti-reflective
- **Blue**: Blue light blocking
- **Photo**: Photochromic
- **UV**: UV protection
- **AntiGlare**: Anti-glare

---

## CPP Policy & Lens Rules

### CPP Policy Structure

Customer Protection Plan (CPP) policies define lens pricing and claim rules:

```javascript
{
  policy_id: String,
  name: String,
  validity_days: Number,        // 1-1095 days (max 3 years)
  brand_rules: [{
    brand_type: "inhouse" | "international",
    divisor: Number              // 1.0-10.0
  }],
  lens_rule: {
    divisor: Number              // Default 1.75
  },
  exclusions: [
    "contact_lens",
    "sunglasses",
    "loss",
    "theft",
    "misuse",
    "normal_wear"
  ],
  max_claims_per_line: Number,
  rounding_mode: "HALF_UP" | "HALF_DOWN" | "ROUND_UP" | "ROUND_DOWN"
}
```

### Lens Rule Application

The `lens_rule.divisor` is used to calculate claim amounts for lens replacements:
```
Claim Amount = Lens Cost / Divisor
```

**Default Divisor**: 1.75

---

## API Endpoints

### Prescription Endpoints

#### Create Prescription
```
POST /api/prescription-service/prescriptions
Authorization: Bearer <token>
Content-Type: application/json

{
  "customer_id": "ObjectId",
  "store_id": "ObjectId",
  "optometrist_id": "ObjectId",
  "type": "SPECTACLE" | "CONTACT_LENS",
  "visit_reason": "ROUTINE" | "SYMPTOM" | "FOLLOW_UP",
  "spectacle": { /* spectacle details */ },
  "contact_lens": { /* contact lens details */ },
  "notes_clinical": "String",
  "suggestions_for_customer": "String"
}
```

**Required Roles**: `optometrist`, `admin`
**Required Permission**: `prescription:create`

#### Get Prescription by ID
```
GET /api/prescription-service/prescriptions/:rxId
Authorization: Bearer <token>
```

**Required Roles**: `optometrist`, `admin`, `store_manager`, `customer`
**Required Permission**: `prescription:read`

#### Sign Prescription
```
POST /api/prescription-service/prescriptions/:rxId/sign
Authorization: Bearer <token>
Content-Type: application/json

{
  "signature_data": {
    "signature": "base64_image",
    "timestamp": "ISO_date"
  }
}
```

**Required Roles**: `optometrist`, `admin`
**Required Permission**: `prescription:sign`

#### Get Prescriptions by Customer
```
GET /api/prescription-service/prescriptions/customer/:customerId?type=SPECTACLE&status=SIGNED
Authorization: Bearer <token>
```

**Query Parameters:**
- `type`: Filter by prescription type
- `status`: Filter by status
- `from`: Start date filter
- `to`: End date filter

### Clinical Calculation Endpoints

#### Perform Clinical Calculation
```
POST /api/prescription-service/calc/:calculationType
Authorization: Bearer <token>
Content-Type: application/json

{
  "distanceSet": { /* for near_addition */ },
  "addPower": Number,
  "sph": Number,              // for transpose
  "cyl": Number,
  "axis": Number,
  "spectacleRx": { /* for contact_lens_mapping */ },
  "brand": String,
  "series": String
}
```

**Calculation Types:**
- `near_addition`
- `transpose`
- `vertex_compensation`
- `contact_lens_mapping`

**Required Roles**: `optometrist`, `admin`
**Required Permission**: `clinical:calculate`

### Contact Lens Plan Endpoints

#### Create Contact Lens Plan
```
POST /api/crm-service/engagement/contact-lens-plans
Authorization: Bearer <token>
Content-Type: application/json

{
  "clp_id": "CLP-000001",
  "customer_id": "ObjectId",
  "store_id": "ObjectId",
  "brand": "ACUVUE",
  "product_name": "OASYS",
  "replacement_cycle_days": 14,
  "last_purchase_at": "ISO_date",
  "next_refill_due_at": "ISO_date",
  "quantity_per_cycle": 6
}
```

**Required Roles**: `admin`, `store_manager`, `employee`
**Required Permission**: `manage_contact_lens_plans`

### Lab Job Endpoints

#### Create Lab Job
```
POST /api/sales-service/pos/lab-jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "invoice_id": "ObjectId",
  "customer_id": "ObjectId",
  "store_id": "ObjectId",
  "prescription_id": "ObjectId",
  "job_type": "LENS",
  "estimated_completion": "ISO_date",
  "notes": "String"
}
```

#### Get Lab Job
```
GET /api/sales-service/pos/lab-jobs/:id
Authorization: Bearer <token>
```

#### Update Lab Job Status
```
PATCH /api/sales-service/pos/lab-jobs/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "IN_PROGRESS" | "READY" | "DELIVERED" | "CANCELLED",
  "notes": "String"
}
```

### RxLink Endpoints

#### Get RxLinks for Customer
```
GET /api/prescription-service/rxlinks/customer/:customerId?scope=POS
Authorization: Bearer <token>
```

**Query Parameters:**
- `scope`: `POS` or `ECOM`

**Required Roles**: `store_manager`, `admin`, `pos_operator`
**Required Permission**: `rxlink:read`

#### Redeem RxLink
```
POST /api/prescription-service/rxlinks/:rxLinkId/redeem
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "ObjectId",
  "orderReference": "String"
}
```

**Required Roles**: `store_manager`, `admin`, `pos_operator`
**Required Permission**: `rxlink:redeem`

---

## Data Models

### Prescription Model

```javascript
{
  rx_id: String,               // Unique prescription ID
  customer_id: ObjectId,        // Reference to Customer
  store_id: ObjectId,          // Reference to Store
  optometrist_id: ObjectId,    // Reference to Optometrist
  rx_date: Date,               // Prescription date
  type: "SPECTACLE" | "CONTACT_LENS",
  visit_reason: "ROUTINE" | "SYMPTOM" | "FOLLOW_UP",
  valid_until: Date,           // Validity expiry date
  status: "DRAFT" | "SIGNED" | "ACTIVE" | "EXPIRED" | "REPLACED",
  notes_clinical: String,
  suggestions_for_customer: String,
  attachments: [{
    url: String,
    type: "IMAGE" | "PDF" | "TOPOGRAPHY",
    description: String
  }],
  audit_log: [{
    action: String,
    performed_by: ObjectId,
    details: String,
    timestamp: Date
  }],
  created_at: Date,
  updated_at: Date
}
```

### SpectacleRxDetails Model

```javascript
{
  rx_id: ObjectId,              // Reference to Prescription
  distance: {
    r: { sph, cyl, axis, va },
    l: { sph, cyl, axis, va }
  },
  near: { /* same structure */ },
  intermediate: { /* same structure */ },
  add_power: Number,
  pd: {
    mono_r: Number,
    mono_l: Number,
    bin: Number
  },
  heights: {
    r: Number,
    l: Number
  },
  prism: {
    r: { h, v, base },
    l: { h, v, base }
  },
  wrap_angle: Number,
  pantoscopic_tilt: Number,
  vertex_distance: Number,
  lens_recommendation: {
    material: String,
    coatings: [String]
  }
}
```

### ContactLensRxDetails Model

```javascript
{
  rx_id: ObjectId,              // Reference to Prescription
  lens_type: "SPHERIC" | "TORIC" | "MULTIFOCAL" | "HIGH_POWER",
  brand: String,
  series: String,
  r: {
    sph: Number,
    cyl: Number,
    axis: Number,
    add: Number | String,
    base_curve: Number,
    diameter: Number,
    k_readings: { k1, k2, axis },
    vertex_distance: Number
  },
  l: { /* same structure */ },
  wear_schedule: "DAILY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY",
  care_solution: String,
  trial_log: [{
    date: Date,
    brand: String,
    bc: Number,
    dia: Number,
    fit_notes: String,
    comfort: Number,
    va: String
  }],
  next_refill_due_at: Date,
  contraindications: String
}
```

### ContactLensPlan Model

```javascript
{
  clp_id: String,               // Unique plan ID
  customer_id: ObjectId,        // Reference to Contact
  store_id: ObjectId,           // Reference to Store
  brand: String,
  product_name: String,
  replacement_cycle_days: Number, // 1-365
  last_purchase_at: Date,
  next_refill_due_at: Date,
  quantity_per_cycle: Number,
  is_active: Boolean,
  reminder_sent: {
    t20: Boolean,
    t15: Boolean,
    t7: Boolean,
    t1: Boolean
  },
  created_by: ObjectId,
  created_at: Date,
  updated_at: Date
}
```

### LabJob Model

```javascript
{
  job_number: String,           // Unique job number
  invoice_id: ObjectId,         // Reference to POSInvoice
  customer_id: ObjectId,        // Reference to Customer
  store_id: ObjectId,          // Reference to Store
  prescription_id: ObjectId,   // Reference to Prescription
  job_type: "FRAME" | "LENS" | "CONTACT_LENS" | "SUNGLASSES" | "REPAIR" | "OTHER",
  status: "PENDING" | "IN_PROGRESS" | "READY" | "DELIVERED" | "CANCELLED",
  estimated_completion: Date,
  actual_completion: Date,
  notes: String,
  tenantId: String,
  created_by: ObjectId,
  created_at: Date,
  updated_at: Date
}
```

### RxLink Model

```javascript
{
  rx_link_id: String,           // Unique link ID
  customer_id: ObjectId,        // Reference to Customer
  rx_id: ObjectId,             // Reference to Prescription
  scope: "POS" | "ECOM",
  allowed_products: [
    "SPECTACLE_LENS",
    "FRAME",
    "CONTACT_LENS",
    "SUNGLASSES",
    "READING_GLASSES"
  ],
  expiry: Date,
  usage_count: Number,
  max_usage: Number,
  is_active: Boolean,
  created_by: ObjectId,
  created_at: Date,
  updated_at: Date
}
```

---

## Workflows

### Spectacle Prescription Workflow

```
1. Customer Visit
   ↓
2. Optometrist Creates Prescription (DRAFT)
   ↓
3. Enter Distance Prescription
   ↓
4. Calculate Near/Intermediate (if add power provided)
   ↓
5. Enter Measurements (PD, Heights, etc.)
   ↓
6. Add Lens Recommendations
   ↓
7. Optometrist Reviews & Signs Prescription
   ↓
8. Prescription Status: SIGNED
   ↓
9. RxLink Created Automatically
   ↓
10. Customer Can Use RxLink for Ordering
```

### Contact Lens Prescription Workflow

```
1. Customer Visit
   ↓
2. Optometrist Creates Contact Lens Prescription
   ↓
3. Enter Contact Lens Parameters
   - Power (from spectacle or direct)
   - Base Curve & Diameter
   - Brand & Series
   ↓
4. Trial Fitting (if needed)
   - Log trial parameters
   - Record comfort & fit
   ↓
5. Final Prescription Signed
   ↓
6. Contact Lens Plan Created (if recurring)
   ↓
7. Automated Reminders Scheduled
```

### Lab Job Workflow

```
1. Customer Places Order with Lens
   ↓
2. Invoice Created
   ↓
3. Lab Job Automatically Created
   - Job Number Generated
   - Status: PENDING
   - Linked to Invoice & Prescription
   ↓
4. Lab Receives Job
   - Status: IN_PROGRESS
   - Estimated Completion Set
   ↓
5. Lens Processing
   - Lens Cut & Edged
   - Frame Fitting (if applicable)
   ↓
6. Quality Check
   - Status: READY
   ↓
7. Customer Notification
   ↓
8. Delivery/Pickup
   - Status: DELIVERED
```

### Contact Lens Refill Workflow

```
1. Contact Lens Plan Active
   ↓
2. System Calculates Next Refill Date
   ↓
3. Automated Reminders Sent:
   - T-20: 20 days before
   - T-15: 15 days before
   - T-7: 7 days before
   - T-1: 1 day before
   ↓
4. Customer Purchases Refill
   ↓
5. Plan Updated:
   - last_purchase_at updated
   - next_refill_due_at recalculated
   - reminder flags reset
   ↓
6. Cycle Repeats
```

---

## Features & Capabilities

### 1. Prescription Management

- ✅ Create spectacle and contact lens prescriptions
- ✅ Prescription signing with digital signature
- ✅ Prescription validity tracking
- ✅ Prescription history per customer
- ✅ Prescription status management (DRAFT, SIGNED, ACTIVE, EXPIRED, REPLACED)
- ✅ Audit trail for all prescription changes

### 2. Clinical Calculations

- ✅ Near addition calculation
- ✅ Intermediate power calculation
- ✅ Cylinder transposition (Plus/Minus)
- ✅ Vertex distance compensation
- ✅ Spectacle to contact lens mapping
- ✅ Prescription validation
- ✅ High power warnings
- ✅ High cylinder warnings

### 3. Contact Lens Management

- ✅ Contact lens prescription creation
- ✅ Trial fitting log
- ✅ Contact lens plan management
- ✅ Automated refill reminders
- ✅ Replacement cycle tracking
- ✅ Brand and product tracking

### 4. Lab Job Processing

- ✅ Automatic lab job creation from invoices
- ✅ Job status tracking
- ✅ Estimated completion dates
- ✅ Job notes and internal comments
- ✅ Customer lab job history
- ✅ Multi-tenant support

### 5. RxLink System

- ✅ Prescription-based ordering
- ✅ POS and e-commerce integration
- ✅ Usage tracking
- ✅ Expiry management
- ✅ Product type restrictions
- ✅ Multiple usage support

### 6. Integration Capabilities

- ✅ Inventory system integration
- ✅ POS system integration
- ✅ E-commerce integration
- ✅ Notification system integration
- ✅ Customer portal integration
- ✅ Multi-tenant architecture

### 7. Security & Access Control

- ✅ Role-based access control (RBAC)
- ✅ Permission-based operations
- ✅ Tenant isolation
- ✅ Audit logging
- ✅ JWT authentication

### 8. Data Management

- ✅ Prescription data persistence
- ✅ Clinical calculation history
- ✅ Contact lens plan tracking
- ✅ Lab job history
- ✅ Customer prescription history
- ✅ Indexed database queries

---

## Best Practices

### Prescription Creation

1. **Always validate prescription parameters** before saving
2. **Use clinical calculations** for accuracy (near addition, vertex compensation)
3. **Enter complete measurements** (PD, heights) for best lens fitting
4. **Sign prescriptions** only after thorough review
5. **Link prescriptions to orders** using RxLink for traceability

### Contact Lens Plans

1. **Set appropriate replacement cycles** based on lens type
2. **Track purchase history** for accurate refill scheduling
3. **Monitor reminder delivery** to ensure customer engagement
4. **Update plans promptly** after refill purchases

### Lab Jobs

1. **Set realistic completion dates** based on job complexity
2. **Update status promptly** to keep customers informed
3. **Add notes** for special instructions or issues
4. **Link to prescriptions** for complete order history

### Clinical Calculations

1. **Always apply vertex compensation** for high powers (≥4.00D)
2. **Validate results** before using in prescriptions
3. **Document calculation parameters** for audit purposes
4. **Use brand-specific parameters** for contact lens mapping

---

## Troubleshooting

### Common Issues

#### Prescription Not Signing
- **Issue**: Prescription status is not DRAFT
- **Solution**: Only DRAFT prescriptions can be signed. Check current status.

#### Contact Lens Plan Reminders Not Sending
- **Issue**: Reminder flags not reset after purchase
- **Solution**: Ensure plan is updated with new purchase date and reminder flags reset.

#### Lab Job Not Created
- **Issue**: Invoice created but no lab job
- **Solution**: Verify invoice contains lens items and job_type is set correctly.

#### RxLink Expired
- **Issue**: RxLink cannot be redeemed
- **Solution**: Check expiry date and create new RxLink if needed.

#### Clinical Calculation Errors
- **Issue**: Invalid calculation results
- **Solution**: Validate input parameters (sphere, cylinder, axis ranges).

---

## Future Enhancements

### Planned Features

1. **Advanced Lens Recommendations**
   - AI-powered lens material recommendations
   - Personalized coating suggestions

2. **Enhanced Contact Lens Management**
   - Automated trial scheduling
   - Fit assessment tools

3. **Lab Integration**
   - Direct lab system integration
   - Real-time job status updates

4. **Analytics & Reporting**
   - Prescription trends analysis
   - Contact lens refill analytics
   - Lab job performance metrics

5. **Mobile App Integration**
   - Customer prescription access
   - Refill reminders via mobile
   - QR code prescription scanning

---

## Support & Documentation

For additional support:
- **API Documentation**: See individual service documentation
- **Technical Support**: Contact development team
- **Feature Requests**: Submit via project management system

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Maintained By**: Development Team
