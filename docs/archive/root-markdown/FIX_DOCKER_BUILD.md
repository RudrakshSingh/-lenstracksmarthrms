# Fix Docker Build Issues

## Issue 1: Docker Daemon Not Running

**Error:** `Cannot connect to the Docker daemon at unix:///Users/rudrakshsingh/.docker/run/docker.sock`

### Solution:

1. **Start Docker Desktop:**
   - Open Docker Desktop application
   - Wait for it to fully start (whale icon in menu bar should be steady)
   - Verify: `docker ps` should work without errors

2. **Verify Docker is running:**
   ```bash
   docker ps
   docker version
   ```

---

## Issue 2: Build Context Fixed

The script has been updated to build from the root directory (as Dockerfiles expect), not from service directories.

**Changed:**
- Old: `docker build -f "microservices/$service/Dockerfile" "microservices/$service"`
- New: `docker build -f "microservices/$service/Dockerfile" .`

This matches what the Dockerfiles expect (they reference `microservices/auth-service/` paths).

---

## Next Steps:

1. **Start Docker Desktop**
2. **Verify Docker is running:**
   ```bash
   docker ps
   ```
3. **Re-run Day 2 script:**
   ```bash
   ./day2-aws-setup.sh
   ```

---

## If Docker Desktop Won't Start:

1. Check Docker Desktop is installed:
   ```bash
   which docker
   ```

2. Restart Docker Desktop:
   - Quit Docker Desktop completely
   - Restart it
   - Wait for full startup

3. Check Docker Desktop logs:
   - Docker Desktop → Troubleshoot → View logs

4. Reset Docker Desktop (if needed):
   - Docker Desktop → Settings → Reset to factory defaults
