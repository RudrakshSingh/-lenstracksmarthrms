# 📁 EXACT Files to Change - No Confusion

## 🎯 The Problem

Your code has `localhost:3002` hardcoded. Backend is at `https://98.70.245.87`.

---

## 📝 EXACT Changes Needed

### File 1: api-utils.ts

**Location**: Probably in `lib/api-utils.ts` or `utils/api-utils.ts` or `services/api-utils.ts`

**Search for**:
```typescript
localhost:3002
```

**Change to**:
```typescript
https://98.70.245.87
```

**Example** - Your file probably looks like this:

```typescript
// BEFORE:
const baseURL = 'http://localhost:3002';

export const safeFetch = async (endpoint: string, options?: RequestInit) => {
  const url = `${baseURL}${endpoint}`;
  // ... rest of code
};
```

**Change to**:

```typescript
// AFTER:
const baseURL = 'https://98.70.245.87';

export const safeFetch = async (endpoint: string, options?: RequestInit) => {
  const url = `${baseURL}${endpoint}`;
  // ... rest of code
};
```

---

### File 2: onboarding-api.ts

**Location**: Probably in `services/onboarding-api.ts` or `lib/onboarding-api.ts`

**Line 72** (`createEmployee` function):
```typescript
// BEFORE:
POST http://localhost:3002/api/hr/employees

// AFTER:
POST https://98.70.245.87/api/hr/employees
```

**Line 111** (`updateStatutoryInfo` function):
```typescript
// BEFORE:
PUT http://localhost:3002/api/hr/employees/{id}

// AFTER:
PUT https://98.70.245.87/api/hr/employees/{id}
```

**Line 170** (`assignRole` function):
```typescript
// BEFORE:
POST http://localhost:3002/api/hr/employees/{id}/assign-role

// AFTER:
POST https://98.70.245.87/api/hr/employees/{id}/assign-role
```

**Line 182** (`updateEmployeeStatus` function):
```typescript
// BEFORE:
PATCH http://localhost:3002/api/hr/employees/{id}/status

// AFTER:
PATCH https://98.70.245.87/api/hr/employees/{id}/status
```

---

### File 3: page.tsx (Employees List)

**Location**: `app/employees/page.tsx` or similar

**Line 82** (`fetchEmployees` function):
```typescript
// BEFORE:
GET http://localhost:3002/api/employees?page=1&limit=10

// AFTER:
GET https://98.70.245.87/api/hr/employees?page=1&limit=10
```

**Note**: Add `/hr` to the path!

---

### File 4: page.tsx (Onboarding Step 2)

**Location**: `app/employees/onboarding/step2/page.tsx` or similar

**Line 88** (`fetchDepartments` function):
```typescript
// BEFORE:
GET http://localhost:3002/api/hr/departments

// AFTER:
GET https://98.70.245.87/api/hr/departments
```

**Line 102** (`fetchEmployees` function):
```typescript
// BEFORE:
GET http://localhost:3002/api/employees?status=ACTIVE&limit=1000

// AFTER:
GET https://98.70.245.87/api/hr/employees?status=ACTIVE&limit=1000
```

**Note**: Add `/hr` to the employees path!

---

## 🔍 How to Find These Files

### Method 1: Global Search

Press `Ctrl+Shift+F` (Windows/Linux) or `Cmd+Shift+F` (Mac)

Search for:
```
localhost:3002
```

This will show ALL files with `localhost:3002`. Change ALL of them to `https://98.70.245.87`.

---

### Method 2: Check These Folders

Look in these folders for the files:
```
your-project/
├── lib/
│   └── api-utils.ts ← CHECK THIS
├── utils/
│   └── api-utils.ts ← CHECK THIS
├── services/
│   ├── api-client.ts ← CHECK THIS
│   └── onboarding-api.ts ← CHECK THIS
├── app/
│   └── employees/
│       ├── page.tsx ← CHECK THIS
│       └── onboarding/
│           └── page.tsx ← CHECK THIS
└── .env.local ← CHECK THIS
```

---

## 🛠️ Alternative: Use Find & Replace

### In VS Code or your editor:

1. Press `Ctrl+H` (Windows/Linux) or `Cmd+H` (Mac)
2. **Find**: `localhost:3002`
3. **Replace**: `https://98.70.245.87`
4. Click "Replace All"
5. Save all files
6. **RESTART dev server**

---

## ⚡ Super Quick Command Line Fix

If you're comfortable with terminal:

```bash
# Go to your frontend project directory
cd /path/to/your/frontend

# Find and replace in all TypeScript/JavaScript files
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' 's|localhost:3002|98.70.245.87|g' {} +

# Also check .env files
sed -i '' 's|localhost:3002|98.70.245.87|g' .env.local
sed -i '' 's|http://98.70.245.87|https://98.70.245.87|g' .env.local

# Restart server
npm run dev
```

---

## ✅ After Making Changes

### 1. Restart Server (CRITICAL!)
```bash
Ctrl+C  (stop)
npm run dev  (start)
```

### 2. Check Network Tab

Open browser DevTools (F12) → Network tab

You should see:
```
✅ https://98.70.245.87/api/hr/departments
✅ https://98.70.245.87/api/hr/employees
```

NOT:
```
❌ localhost:3002/api/hr/departments
❌ localhost:3002/api/employees
```

---

## 🎯 The ONLY Two Changes Needed

**Change 1: Host**
```
localhost:3002 → https://98.70.245.87
```

**Change 2: Some Paths**
```
/api/employees → /api/hr/employees
```

**That's it!** Don't overcomplicate it.

---

## 📞 Message for Frontend Developer

**"Your code is calling localhost:3002 which doesn't exist. The backend is at https://98.70.245.87.**

**Do this:**
1. **Search entire project** for `localhost:3002`
2. **Replace ALL** with `https://98.70.245.87`
3. **Search** for `/api/employees`
4. **Replace** with `/api/hr/employees` (but keep `/api/auth/` as is)
5. **Save all files**
6. **RESTART your npm run dev**
7. **Hard refresh browser** (Ctrl+Shift+R)
8. **Test again**

**The backend is live and working. It's just a URL configuration issue on your side."**

---

**STOP EVERYTHING AND DO THIS FIRST. NOTHING ELSE WILL WORK UNTIL YOU CHANGE THE URL!** 🛑

