# How to Get AWS Access Key ID and Secret Access Key

**Account:** Upcapto (383234048604)  
**Region:** ap-south-1 (Mumbai)  
**Application:** Etelios

---

## 🎯 Step-by-Step Guide

### Step 1: Login to AWS Console

1. Go to: https://console.aws.amazon.com
2. Login with your AWS account credentials
3. Make sure you're in the **ap-south-1 (Mumbai)** region

---

### Step 2: Navigate to IAM

1. In the AWS Console, search for **"IAM"** in the top search bar
2. Click on **"IAM"** service
3. You'll see the IAM dashboard

---

### Step 3: Create IAM User (If you don't have one)

1. In the left sidebar, click **"Users"**
2. Click **"Create user"** button (top right)
3. Enter user name: `etelios-migration-user` (or any name you prefer)
4. Click **"Next"**

---

### Step 4: Attach Permissions

1. Select **"Attach policies directly"**
2. Search and select these policies:
   - ✅ **AdministratorAccess** (for full access during migration)
   - OR select these specific policies:
     - `AmazonEC2FullAccess`
     - `AmazonEKSFullAccess`
     - `AmazonEC2ContainerRegistryFullAccess`
     - `AmazonS3FullAccess`
     - `AmazonDocDBFullAccess`
     - `IAMFullAccess`
     - `CloudWatchFullAccess`
     - `AWSCodePipelineFullAccess`
     - `AWSCodeBuildDeveloperAccess`
     - `AmazonEventBridgeFullAccess`
     - `AmazonSQSFullAccess`
     - `AmazonElastiCacheFullAccess`
     - `SecretsManagerReadWrite`

3. Click **"Next"**
4. Review and click **"Create user"**

---

### Step 5: Create Access Keys

1. After user is created, click on the **user name** you just created
2. Go to **"Security credentials"** tab
3. Scroll down to **"Access keys"** section
4. Click **"Create access key"** button

---

### Step 6: Select Use Case

1. Select: **"Command Line Interface (CLI)"**
2. Check the confirmation box
3. Click **"Next"**
4. (Optional) Add description: "For Etelios migration"
5. Click **"Create access key"**

---

### Step 7: Download/Copy Credentials

**⚠️ IMPORTANT: Save these immediately! You won't see the secret key again!**

1. You'll see:
   - **Access key ID:** `AKIA...` (starts with AKIA)
   - **Secret access key:** `...` (long random string)

2. **Download the CSV file** or **copy both values**

3. **Save them securely** - you'll need them for `aws configure`

---

### Step 8: Configure AWS CLI

Now run this in your terminal:

```bash
aws configure
```

Enter:
- **AWS Access Key ID:** [Paste the Access Key ID you copied]
- **AWS Secret Access Key:** [Paste the Secret Access Key you copied]
- **Default region name:** `ap-south-1`
- **Default output format:** `json`

---

### Step 9: Verify Configuration

```bash
# Test your credentials
aws sts get-caller-identity
```

**Expected output:**
```json
{
    "UserId": "...",
    "Account": "383234048604",
    "Arn": "arn:aws:iam::383234048604:user/etelios-migration-user"
}
```

If you see this, you're all set! ✅

---

## 🔐 Security Best Practices

1. **Never share** your access keys
2. **Don't commit** keys to Git
3. **Use IAM roles** in production (instead of access keys)
4. **Rotate keys** regularly
5. **Delete unused keys**

---

## 🚨 Troubleshooting

### "Access Denied" Error

- Check if your IAM user has the required permissions
- Verify you're using the correct access key
- Make sure the access key is active (not disabled)

### "Invalid credentials"

- Double-check you copied the full access key ID and secret key
- Make sure there are no extra spaces
- Try creating new access keys

### "Region mismatch"

- Make sure you set region to `ap-south-1` in `aws configure`
- Or set it manually: `export AWS_DEFAULT_REGION=ap-south-1`

---

## 📋 Quick Checklist

- [ ] Logged into AWS Console
- [ ] Created IAM user (or using existing)
- [ ] Attached necessary permissions
- [ ] Created access keys
- [ ] Saved Access Key ID and Secret Access Key
- [ ] Ran `aws configure`
- [ ] Verified with `aws sts get-caller-identity`
- [ ] Ready to run `./day1-aws-setup.sh`

---

## 🎯 Direct Links

- **IAM Console:** https://console.aws.amazon.com/iam/home?region=ap-south-1#/users
- **Create User:** https://console.aws.amazon.com/iam/home?region=ap-south-1#/users$new
- **Your Account:** https://console.aws.amazon.com/billing/home?region=ap-south-1#/account

---

**Once you have the credentials, run:**

```bash
aws configure
aws sts get-caller-identity
./day1-aws-setup.sh
```

**Ready to proceed!** 🚀
