# Azure DevOps Personal Access Token (PAT) Setup Guide

## Step-by-Step Instructions

### 1. Navigate to PAT Creation Page

**Direct Link:**
```
https://dev.azure.com/Hindempire-devops1/_usersSettings/tokens
```

**Or follow these steps:**
1. Go to: https://dev.azure.com/Hindempire-devops1
2. Click on your profile icon (top right corner)
3. Select **"Personal access tokens"** from the dropdown menu
4. Or go to: **User Settings** → **Personal access tokens**

---

### 2. Create New Token

1. Click the **"+ New Token"** button
2. Fill in the form:

   **Name:**
   ```
   Git Push Token - Lenstrack HRMS
   ```
   (or any descriptive name you prefer)

   **Organization:**
   ```
   All accessible organizations
   ```
   (or select "etelios" specifically)

   **Expiration:**
   - Choose: **90 days** (recommended)
   - Or **Custom** if you want a different duration
   - Maximum: **1 year**

   **Scopes:**
   - Check: **Code (read & write)**
   - This allows you to push/pull code

3. Click **"Create"** button

---

### 3. Copy the Token

⚠️ **IMPORTANT:** The token will be shown **ONLY ONCE**. Copy it immediately!

1. You'll see a success message with the token
2. **Copy the entire token** (it's a long string like: `abc123def456ghi789...`)
3. Store it securely (you won't be able to see it again)

---

### 4. Use the Token to Push

Once you have the token, use one of these methods:

#### Method 1: Push with Token in URL (One-time)

```bash
git push https://YOUR_PAT_TOKEN@dev.azure.com/Hindempire-devops1/etelios/_git/etelios main
```

Replace `YOUR_PAT_TOKEN` with your actual token.

#### Method 2: Set Remote URL with Token (Permanent)

```bash
# Set the remote URL with your PAT
git remote set-url azure https://YOUR_PAT_TOKEN@dev.azure.com/Hindempire-devops1/etelios/_git/etelios

# Now you can push normally
git push azure main
```

#### Method 3: Use Git Credential Helper (Most Secure)

```bash
# When prompted for username, enter: anything (or your email)
# When prompted for password, enter: YOUR_PAT_TOKEN

git push azure main
```

The token will be saved in macOS Keychain for future use.

---

## Security Best Practices

1. ✅ **Don't commit tokens to git** - Never add PATs to your code
2. ✅ **Use minimum required scopes** - Only grant "Code (read & write)" if that's all you need
3. ✅ **Set expiration dates** - Don't create tokens that never expire
4. ✅ **Revoke unused tokens** - Delete old tokens you're not using
5. ✅ **Store securely** - Use a password manager or secure notes

---

## Troubleshooting

### Token Not Working?

1. **Check expiration** - Tokens expire after the set duration
2. **Verify scopes** - Make sure "Code (read & write)" is selected
3. **Check organization** - Ensure token has access to "etelios" organization
4. **Regenerate** - Create a new token if the old one doesn't work

### Revoke a Token

1. Go to: https://dev.azure.com/Hindempire-devops1/_usersSettings/tokens
2. Find your token in the list
3. Click **"Revoke"** button

---

## Quick Reference

**PAT Creation URL:**
```
https://dev.azure.com/Hindempire-devops1/_usersSettings/tokens
```

**Required Scopes:**
- ✅ Code (read & write)

**Repository URL:**
```
https://dev.azure.com/Hindempire-devops1/etelios/_git/etelios
```

---

## Example: Complete Push Workflow

```bash
# 1. Create PAT in Azure DevOps (follow steps above)

# 2. Set remote URL with PAT
git remote set-url azure https://YOUR_PAT@dev.azure.com/Hindempire-devops1/etelios/_git/etelios

# 3. Push your changes
git push azure main

# 4. Verify push was successful
git log --oneline -1
```

---

**Note:** If you're using the token in the URL, it will be visible in your git config. For better security, use the credential helper method (Method 3) which stores it in macOS Keychain.
