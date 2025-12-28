# Azure Pipeline Not Triggering - Troubleshooting Guide

## 🔍 Common Reasons Why Pipeline Doesn't Trigger

### 1. **Pipeline is Disabled in Azure DevOps UI**
   - Go to Azure DevOps → Pipelines → Your Pipeline
   - Check if pipeline is **enabled** (not paused/disabled)
   - If disabled, click "Run pipeline" or enable continuous integration

### 2. **Wrong Branch**
   - Pipeline only triggers on: `main` or `develop`
   - Check your current branch:
     ```bash
     git branch
     ```
   - If you're on a different branch, merge to `main` or `develop`:
     ```bash
     git checkout main
     git merge your-branch
     git push origin main
     ```

### 3. **Pipeline Set to Manual Trigger Only**
   - In Azure DevOps UI:
     - Go to: Pipelines → Your Pipeline → Edit → Triggers
     - Check "Enable continuous integration"
     - Save the pipeline

### 4. **Path Filters Excluding Your File**
   - Current exclude filters:
     - `*.md` files (excluded)
     - `docs/*` (excluded)
   - `ecosystem.config.js` should NOT be excluded
   - If you changed a `.md` file, it won't trigger

### 5. **Pipeline Not Linked to Repository**
   - Check if pipeline is connected to the correct repository
   - Azure DevOps → Pipelines → Your Pipeline → Edit
   - Verify repository source is correct

### 6. **Service Connection Issues**
   - Pipeline might fail silently if service connections are broken
   - Check: Pipelines → Your Pipeline → Edit → Variables/Service Connections

---

## ✅ Quick Fixes

### Option 1: Manually Trigger the Pipeline
```bash
# In Azure DevOps UI:
1. Go to Pipelines → Your Pipeline
2. Click "Run pipeline"
3. Select branch: main or develop
4. Click "Run"
```

### Option 2: Verify and Push Again
```bash
# Make sure you're on the right branch
git checkout main
git status

# Verify your changes are committed
git log --oneline -5

# Push to trigger pipeline
git push origin main
```

### Option 3: Check Pipeline Status
```bash
# In Azure DevOps:
1. Go to Pipelines → Recent runs
2. Check if there are any failed/queued runs
3. Check if pipeline is paused
```

---

## 🔧 Diagnostic Commands

### Check Your Current Branch
```bash
git branch --show-current
```

### Check Recent Commits
```bash
git log --oneline -5
```

### Check if Changes Are Pushed
```bash
git status
git log origin/main..HEAD  # Shows commits not pushed
```

### Verify File Was Changed
```bash
git diff HEAD~1 ecosystem.config.js
```

---

## 📋 Step-by-Step Verification

### Step 1: Verify Branch
```bash
# Should show: main or develop
git branch --show-current
```

### Step 2: Verify Changes Are Committed
```bash
# Should show: ecosystem.config.js modified
git status
```

### Step 3: Verify Changes Are Pushed
```bash
# Should show: "Your branch is up to date with origin/main"
git status

# OR push explicitly
git push origin main
```

### Step 4: Check Azure DevOps
1. Go to: https://dev.azure.com/{your-org}/{your-project}
2. Navigate to: Pipelines → Your Pipeline
3. Check "Recent" tab for new runs
4. If no runs, check "Runs" tab

### Step 5: Check Pipeline Settings
1. Click "Edit" on your pipeline
2. Go to "Triggers" (three dots menu)
3. Verify:
   - ✅ "Enable continuous integration" is checked
   - ✅ Branch filters include: `main`, `develop`
   - ✅ Path filters don't exclude `ecosystem.config.js`

---

## 🚨 If Pipeline Still Doesn't Trigger

### Force Trigger by Making a Small Change
```bash
# Add a comment to trigger pipeline
echo "# Pipeline trigger" >> ecosystem.config.js
git add ecosystem.config.js
git commit -m "Trigger pipeline: Fix PM2 logging"
git push origin main
```

### Check Pipeline YAML Syntax
```bash
# Validate YAML syntax
# In Azure DevOps, go to pipeline → Edit → Validate
```

### Check Azure DevOps Permissions
- Ensure you have permissions to trigger pipelines
- Check if branch protection rules are blocking

---

## 📞 Additional Checks

### Check Pipeline Logs
1. Azure DevOps → Pipelines → Your Pipeline
2. Click "Runs" tab
3. Check for any error messages

### Check Repository Webhook
1. Azure DevOps → Project Settings → Service hooks
2. Verify webhook is configured for repository pushes

### Check Build Queue
1. Azure DevOps → Pipelines → Queued
2. Check if pipeline is queued but not running

---

## 🎯 Most Common Solution

**90% of the time, the issue is one of these:**

1. **Pipeline is disabled** → Enable in Azure DevOps UI
2. **Wrong branch** → Push to `main` or `develop`
3. **Changes not pushed** → Run `git push origin main`
4. **Pipeline set to manual** → Enable CI trigger in pipeline settings

---

## ✅ Quick Checklist

- [ ] Changes committed to git
- [ ] Changes pushed to Azure repo
- [ ] Branch is `main` or `develop`
- [ ] Pipeline is enabled in Azure DevOps
- [ ] CI trigger is enabled
- [ ] File changed is not excluded by path filters
- [ ] Service connections are valid
- [ ] You have permissions to trigger pipelines

---

## 🔄 Alternative: Use Azure CLI to Trigger Pipeline

```bash
# Install Azure CLI if not installed
# Then login and trigger pipeline

az pipelines run \
  --name "Your-Pipeline-Name" \
  --branch main \
  --organization https://dev.azure.com/{your-org} \
  --project {your-project}
```

---

**Last Updated:** December 2025

