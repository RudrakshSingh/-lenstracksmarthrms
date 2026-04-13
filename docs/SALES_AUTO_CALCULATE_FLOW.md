# 💰 Sales Auto-Calculate और Dashboard Push Flow

**Complete Implementation Guide**

---

## 🎯 Overview

Sales entries **कभी नहीं रुकेंगी**, चाहे geofence violation हो या clock-out हो। Sales automatically calculate होकर HR/Admin dashboard पर push होगी जब:

1. ✅ Employee manually "End Day" button दबाए
2. ✅ Employee manually clock-out करे
3. ✅ Auto clock-out हो (10 hours complete)
4. ❌ **Geofence violation से auto clock-out** - Sales auto-calculate **नहीं होगी** (employee wapas punch-in करके sales add कर सकता है)

---

## 📋 Key Features

### 1. Sales Entries Continue (Geofence Violation पर भी)

```
Employee clocked in → Sales entries add कर रहा है
↓
Geofence violation → Auto clock-out हो गया
↓
❌ Sales entries STOP नहीं होंगी
↓
Employee wapas login करेगा
↓
✅ Sales entries continue हो सकेंगी (same day)
```

**Important:** Sales entry endpoint (`POST /api/sales/daily-entry`) **कभी भी** clock-in status check नहीं करता। Employee logged in है तो sales add कर सकता है।

---

### 2. Auto Sales Calculation Triggers

#### Scenario A: Employee Clicks "End Day" Button

```
Employee clicks "End Day" button
↓
POST /api/sales/employee/end-day
↓
✅ Total sales calculate हो
↓
✅ HR/Admin dashboard पर push हो (automatic)
↓
Employee clock-out कर सकता है
```

#### Scenario B: Employee Manually Clock-Out

```
Employee clicks "Clock Out" button
↓
POST /api/attendance/clock-out
↓
✅ Attendance clock-out हो
↓
✅ Sales auto-calculate हो (background)
↓
✅ HR/Admin dashboard पर push हो (automatic)
```

#### Scenario C: Auto Clock-Out (10 Hours Complete)

```
10 hours complete हो गए
↓
Auto clock-out job runs (every 5 minutes)
↓
✅ Attendance auto clock-out हो
↓
✅ Sales auto-calculate हो (background)
↓
✅ HR/Admin dashboard पर push हो (automatic)
```

#### Scenario D: Geofence Violation Auto Clock-Out

```
Employee geofence के बाहर (10+ minutes grace period)
↓
Geofence violation check job runs (every 2 minutes)
↓
✅ Attendance auto clock-out हो (10 min grace period के बाद)
↓
❌ Sales auto-calculate **नहीं होगी**
↓
Employee wapas punch-in करेगा
↓
✅ Employee sales add कर सकता है (same day)
↓
Sales auto-calculate होगी जब:
  - Employee manually clock-out करे
  - Auto clock-out हो (10 hours)
  - End Day button दबाए
```

---

## 🔧 Implementation Details

### 1. Clock-Out Function (Manual)

**File:** `microservices/attendance-service/src/services/attendance.service.js`

```javascript
// After attendance.save()
await calculateAndPushSalesToDashboard(employeeMongoId, employeeIdString, token);
```

**What it does:**
- Calls sales service to get employee's today sales
- Logs sales summary
- Sales data automatically available in dashboard

---

### 2. Auto Clock-Out Job (10 Hours)

**File:** `microservices/attendance-service/src/jobs/autoClockOut.job.js`

```javascript
// After auto clock-out
const salesResponse = await axios.get(
  `${SALES_SERVICE_URL}/api/sales/employee/today`,
  // ... calculate and log sales
);
```

**What it does:**
- Runs every 5 minutes
- Checks for sessions >= 10 hours
- Auto clock-out करता है
- Sales auto-calculate करता है

---

### 3. Geofence Violation Auto Clock-Out

**File:** `microservices/attendance-service/src/jobs/attendanceScheduler.js`

```javascript
// After geofence violation clock-out
// NOTE: Sales auto-calculate NOT triggered
// Employee can wapas punch-in करके sales add कर सकता है
```

**What it does:**
- Runs every 2 minutes
- Checks for employees outside geofence (10 min grace period expired)
- Auto clock-out करता है (10 min grace period के बाद)
- **Sales auto-calculate नहीं करता**
- **Note:** Sales entries continue - employee wapas punch-in करके sales add कर सकता है

---

### 4. End Day Button

**File:** `microservices/sales-service/src/server.js`

**Endpoint:** `POST /api/sales/employee/end-day`

**What it does:**
- Calculates total sales for today
- Returns summary
- Dashboard automatically fetches this data

---

## 📊 Data Flow

### Sales Entry Flow

```
Employee → POST /api/sales/daily-entry
↓
Sales Service → Save to Database
↓
✅ Sales entry saved (no clock-in check)
↓
Dashboard can fetch anytime
```

### Clock-Out Flow (with Sales Calculation)

```
Clock-Out Triggered
↓
Attendance Service → Clock-out attendance
↓
Sales Service → Calculate today's sales
↓
✅ Sales summary logged
↓
Dashboard Service → Fetches sales automatically
↓
✅ HR/Admin dashboard shows sales
```

---

## 🎨 Frontend Implementation

### Employee Dashboard

```typescript
// Employee can add sales anytime (no clock-in check)
const addSales = async () => {
  await fetch(`${API_BASE}/sales/daily-entry`, {
    method: 'POST',
    body: JSON.stringify(salesData)
  });
};

// End Day Button
const endDay = async () => {
  const result = await fetch(`${API_BASE}/sales/employee/end-day`, {
    method: 'POST'
  });
  // Sales automatically pushed to dashboard
};

// Clock Out Button
const clockOut = async () => {
  await fetch(`${API_BASE}/attendance/clock-out`, {
    method: 'POST'
  });
  // Sales automatically calculated and pushed
};
```

---

## ✅ Testing Checklist

### Sales Continue After Geofence Violation

- [ ] Employee clocked in
- [ ] Employee adds sales entry
- [ ] Employee goes outside geofence
- [ ] Auto clock-out happens (geofence violation)
- [ ] Employee logs back in
- [ ] Employee can still add sales entries (same day)
- [ ] Sales continue to work

### Auto Sales Calculation

- [ ] Manual clock-out → Sales calculated
- [ ] Auto clock-out (10 hours) → Sales calculated
- [ ] Geofence violation clock-out → Sales calculated
- [ ] End Day button → Sales calculated

### Dashboard Push

- [ ] After clock-out → Sales visible in HR/Admin dashboard
- [ ] After auto clock-out → Sales visible in HR/Admin dashboard
- [ ] After End Day → Sales visible in HR/Admin dashboard
- [ ] Dashboard shows correct totals

---

## 🔍 Important Notes

### 1. Sales Entries Never Stop

- Sales entry endpoint **doesn't check clock-in status**
- Employee can add sales anytime (if logged in)
- Geofence violation doesn't block sales entries

### 2. Sales Auto-Calculate on Clock-Out

- **Every clock-out** triggers sales calculation
- Works for manual, auto (10 hours), and geofence violation
- Non-blocking (doesn't fail clock-out if sales calculation fails)

### 3. Dashboard Auto-Update

- Dashboard service fetches sales from sales service
- No manual push needed - automatic
- HR/Admin dashboard shows all employee sales

### 4. Multiple Clock-In/Out Sessions

- Sales are tracked by `employee_id` and `date`
- Multiple sessions in same day → All sales aggregated
- Sales continue across sessions

---

## 📝 Summary

| Scenario | Sales Entries | Auto Calculate | Dashboard Push |
|----------|---------------|----------------|----------------|
| Geofence Violation | ✅ Continue | ❌ **No** | ❌ **No** (Employee wapas punch-in करके sales add कर सकता है) |
| Manual Clock-Out | ✅ Continue | ✅ Yes | ✅ Yes |
| Auto Clock-Out (10h) | ✅ Continue | ✅ Yes | ✅ Yes |
| End Day Button | ✅ Continue | ✅ Yes | ✅ Yes |

**Status:** ✅ Fully Implemented

---

**Last Updated:** March 6, 2026  
**Version:** 1.0.0
