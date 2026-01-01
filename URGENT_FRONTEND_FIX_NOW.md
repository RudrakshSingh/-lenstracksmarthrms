# 🚨 URGENT: 2-Minute Fix to Connect Frontend to Backend

## ❌ Current Problem
Your frontend is calling `localhost:3002` but the backend is on Azure at `98.70.245.87`.

---

## ✅ 2-MINUTE FIX

### Step 1: Find the api-utils.ts File (10 seconds)

Look for a file named:
- `api-utils.ts`
- `api-client.ts`  
- `http-client.ts`
- Or similar in `lib/`, `utils/`, or `services/` folder

**This is the file causing all the errors!**

---

### Step 2: Find This Line (10 seconds)

Search for `localhost:3002` in that file. You'll find something like:

```typescript
const baseURL = 'http://localhost:3002';
// OR
const API_BASE_URL = 'http://localhost:3002';
// OR
baseURL: 'http://localhost:3002'
```

---

### Step 3: Change It (5 seconds)

```typescript
// ❌ DELETE THIS:
const baseURL = 'http://localhost:3002';

// ✅ REPLACE WITH THIS:
const baseURL = 'https://98.70.245.87';
```

**IMPORTANT**: Use `https://` (not `http://`)

---

### Step 4: Save the File (1 second)

Press Ctrl+S (Windows/Linux) or Cmd+S (Mac)

---

### Step 5: RESTART Development Server (30 seconds)

**CRITICAL STEP - DO NOT SKIP!**

```bash
# In your terminal where npm run dev is running:
# 1. Stop the server: Press Ctrl+C
# 2. Wait 2 seconds
# 3. Start again:
npm run dev
```

---

### Step 6: Hard Refresh Browser (5 seconds)

```bash
# Press:
Ctrl + Shift + R  (Windows/Linux)
# OR
Cmd + Shift + R  (Mac)
```

---

### Step 7: Accept SSL Certificate (10 seconds)

1. Open new tab
2. Go to: `https://98.70.245.87`
3. Click "Advanced"
4. Click "Proceed to 98.70.245.87 (unsafe)"
5. Close tab

---

### Step 8: Test (10 seconds)

Go back to your app and try the onboarding again.

---

## ✅ Verify It's Fixed

Open browser console (F12) and check the Network tab:

**Before (Wrong)**:
```
❌ localhost:3002/api/hr/departments
```

**After (Correct)**:
```
✅ 98.70.245.87/api/hr/departments
```

---

## 🎯 If You Can't Find api-utils.ts

### Alternative: Check .env File

Look for these files in your project root:
- `.env`
- `.env.local`
- `.env.development`

Find and change:

```bash
# ❌ DELETE:
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002

# ✅ ADD:
NEXT_PUBLIC_API_BASE_URL=https://98.70.245.87
```

Then **RESTART** the server!

---

## 🆘 Still Not Working?

### Test if backend is reachable:

Open browser console (F12) and run:

```javascript
fetch('https://98.70.245.87/api/hr/status')
  .then(res => res.json())
  .then(data => console.log('✅ BACKEND WORKS:', data))
  .catch(err => console.error('❌ ERROR:', err));
```

If this shows "✅ BACKEND WORKS", then your configuration is the problem.

---

## 📋 Complete Checklist

```
⬜ 1. Find api-utils.ts file
⬜ 2. Change localhost:3002 to https://98.70.245.87
⬜ 3. Save file (Ctrl+S)
⬜ 4. STOP dev server (Ctrl+C)
⬜ 5. START dev server (npm run dev)
⬜ 6. Hard refresh browser (Ctrl+Shift+R)
⬜ 7. Accept SSL certificate at https://98.70.245.87
⬜ 8. Test onboarding
⬜ 9. Check Network tab shows 98.70.245.87
```

---

## 🎯 Expected Result

After fixing, you should see in Network tab:

```
✅ https://98.70.245.87/api/auth/mock-login - 200 OK
✅ https://98.70.245.87/api/hr/departments - 200 OK
✅ https://98.70.245.87/api/hr/employees - 200 OK
```

**NOT:**
```
❌ localhost:3002/api/hr/departments - 503
❌ localhost:3002/api/employees - 503
```

---

## ⏱️ This Should Take 2 MINUTES

1. Find file: 10 seconds
2. Change URL: 5 seconds
3. Save: 1 second
4. Restart: 30 seconds
5. Refresh: 5 seconds
6. Accept cert: 10 seconds
7. Test: 10 seconds

**Total: ~2 minutes**

---

**THE BACKEND IS WORKING. YOU JUST NEED TO POINT YOUR FRONTEND TO THE RIGHT URL!** 🎯

