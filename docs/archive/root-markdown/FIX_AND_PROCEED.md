# Fix Homebrew Permissions & Proceed with Day 1

## ⚠️ Current Issue

Homebrew permissions need to be fixed before installing tools.

## 🔧 Step 1: Fix Homebrew Permissions

Run this command in your terminal:

```bash
sudo chown -R $(whoami) /opt/homebrew/Cellar
sudo chown -R $(whoami) /opt/homebrew/Library
```

## 📦 Step 2: Install Required Tools

After fixing permissions, run:

```bash
# Install AWS CLI
brew install awscli

# Install eksctl
brew install eksctl

# kubectl is already installed ✅
```

## ⚙️ Step 3: Configure AWS CLI

```bash
aws configure
```

Enter:
- **AWS Access Key ID:** [Your access key]
- **AWS Secret Access Key:** [Your secret key]
- **Default region name:** `ap-south-1`
- **Default output format:** `json`

## ✅ Step 4: Verify Setup

```bash
# Check AWS CLI
aws --version
aws sts get-caller-identity

# Check eksctl
eksctl version

# Check kubectl
kubectl version --client
```

## 🚀 Step 5: Run Day 1 Setup

Once everything is verified:

```bash
./day1-aws-setup.sh
```

---

## 📋 Quick Command Sequence

Copy and paste these commands one by one:

```bash
# 1. Fix permissions
sudo chown -R $(whoami) /opt/homebrew/Cellar
sudo chown -R $(whoami) /opt/homebrew/Library

# 2. Install tools
brew install awscli eksctl

# 3. Configure AWS (you'll need to enter credentials)
aws configure

# 4. Verify
aws sts get-caller-identity

# 5. Run Day 1 setup
./day1-aws-setup.sh
```

---

**Ready to proceed!** 🎯
