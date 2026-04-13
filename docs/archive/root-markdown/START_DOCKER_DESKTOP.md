# How to Start Docker Desktop

## 🐳 Quick Start

### Step 1: Open Docker Desktop

**Option A: Using Spotlight**
1. Press `Cmd + Space`
2. Type "Docker"
3. Press Enter

**Option B: From Applications**
1. Open Finder
2. Go to Applications
3. Find "Docker" application
4. Double-click to open

**Option C: Using Terminal**
```bash
open -a Docker
```

---

### Step 2: Wait for Docker to Start

**Signs that Docker is starting:**
- Docker Desktop window opens
- Menu bar में whale icon दिखता है (animated)
- "Docker Desktop is starting..." message

**Signs that Docker is ready:**
- Menu bar में whale icon steady हो जाता है
- "Docker Desktop is running" message
- Usually takes **30-60 seconds**

---

### Step 3: Verify Docker is Running

Run this command in terminal:
```bash
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

(Empty list is fine - it means Docker is running but no containers are running)

**If you see an error:**
```
Cannot connect to the Docker daemon...
```
→ Docker is still starting, wait a bit more and try again

---

### Step 4: Run Day 2 Script

Once Docker is running:
```bash
./day2-aws-setup.sh
```

---

## 🔧 Troubleshooting

### Docker Desktop Won't Start

1. **Check if it's already running:**
   ```bash
   ps aux | grep -i docker
   ```

2. **Quit and restart:**
   - Click whale icon in menu bar
   - Select "Quit Docker Desktop"
   - Wait 10 seconds
   - Start again

3. **Check Docker Desktop logs:**
   - Docker Desktop → Troubleshoot → View logs

4. **Restart your Mac** (if nothing else works)

---

### Docker Desktop Keeps Crashing

1. **Reset Docker Desktop:**
   - Docker Desktop → Settings → Reset to factory defaults
   - ⚠️ This will remove all containers and images

2. **Check system requirements:**
   - macOS 10.15 or later
   - At least 4GB RAM
   - VirtualBox should not be running

---

### Docker Command Not Found

If `docker` command is not found:

1. **Check if Docker Desktop is installed:**
   ```bash
   ls /Applications/ | grep -i docker
   ```

2. **Install Docker Desktop:**
   - Download from: https://www.docker.com/products/docker-desktop
   - Install the .dmg file
   - Move to Applications folder

---

## ✅ Success Checklist

- [ ] Docker Desktop application opened
- [ ] Menu bar में whale icon steady है
- [ ] `docker ps` command works without errors
- [ ] Ready to run `./day2-aws-setup.sh`

---

**Once Docker is running, the Day 2 script will:**
- Build 20 Docker images (60-90 minutes)
- Push images to ECR
- Create DocumentDB cluster
- Setup Kubernetes resources
- Install ALB Ingress Controller
