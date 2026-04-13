# Fix AWS CLI Permission Error

**Issue:** AWS CLI has permission errors with awscrt module

---

## 🔧 Quick Fix

Run this command in your terminal (outside of script):

```bash
sudo chown -R $(whoami) /opt/homebrew/Cellar/awscli
```

If that doesn't work, try:

```bash
sudo chmod -R u+w /opt/homebrew/Cellar/awscli
```

---

## 🔄 Alternative: Reinstall AWS CLI

If permission fix doesn't work:

```bash
# Uninstall
brew uninstall awscli

# Reinstall
brew install awscli

# Verify
aws --version
```

---

## ✅ After Fix

Once AWS CLI is working, run:

```bash
./day1-aws-setup.sh
```

---

**Note:** The script has been updated to handle kubectl version check better.
