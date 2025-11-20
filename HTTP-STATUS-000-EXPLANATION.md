# HTTP Status 000 - Explanation & Troubleshooting

## What is HTTP Status 000?

**HTTP Status 000** is **NOT a valid HTTP status code**. It means:

- ❌ **No HTTP response received** from the server
- ❌ **Connection timeout** - Request timed out before getting a response
- ❌ **Connection refused** - Server refused the connection
- ❌ **Network error** - General connectivity issue
- ❌ **DNS resolution failure** - Couldn't resolve hostname

## Valid HTTP Status Codes

HTTP status codes are 3-digit numbers:
- **2xx**: Success (200, 201, 204, etc.)
- **3xx**: Redirection (301, 302, etc.)
- **4xx**: Client Error (400, 401, 404, etc.)
- **5xx**: Server Error (500, 502, 503, etc.)

**000 is NOT in this range** - it means no HTTP response was received.

## What Causes HTTP 000?

### 1. Connection Timeout
- Server took too long to respond
- Request timed out (e.g., after 10 seconds)
- Server is overloaded or slow

### 2. Connection Refused
- Server is not running
- Port is not open
- Firewall blocking connection

### 3. Network Error
- Internet connectivity issue
- DNS resolution failure
- Proxy/firewall blocking

### 4. Service Not Deployed
- Endpoint doesn't exist
- Code not deployed yet
- Wrong URL/hostname

## In Your Case

**Symptom:**
```
curl ... --max-time 10
HTTP Status: 000
Time: 10.005303s
```

**This means:**
- Request timed out after 10 seconds
- No HTTP response received
- Server didn't respond in time

**Possible Causes:**
1. **Fast mock login endpoint not deployed** - Code exists but not on server
2. **Auth service not running** - Service is down
3. **Network/firewall issue** - Connection blocked
4. **Service overloaded** - Taking too long to respond

## Troubleshooting Steps

### Step 1: Check API Gateway
```bash
curl -X GET "https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/health" -k
```

**Expected:** 200 OK  
**If 000:** Gateway is down

### Step 2: Check Auth Service
```bash
curl -X GET "https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/health" -k
```

**Expected:** 200 OK  
**If 000:** Auth service is down

### Step 3: Check Endpoint Exists
```bash
curl -X POST "https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/mock-login-fast" \
  -H "Content-Type: application/json" \
  -d '{"role":"hr"}' \
  -k -v
```

**Expected:** 200 OK with token  
**If 000:** Endpoint doesn't exist or service not responding

### Step 4: Check Deployment Status
- Check Azure DevOps pipelines
- Verify code is deployed
- Check Azure App Service logs

## Solutions

### If Endpoint Not Deployed:
1. **Check Azure Pipeline** - Verify build/deploy completed
2. **Check App Service** - Verify code is deployed
3. **Restart App Service** - Sometimes fixes deployment issues

### If Service Down:
1. **Check Azure Portal** - Verify App Service is running
2. **Check Logs** - Look for errors in App Service logs
3. **Restart Service** - Restart the App Service

### If Network Issue:
1. **Check Firewall** - Verify IP is whitelisted
2. **Check DNS** - Verify hostname resolves correctly
3. **Check Connectivity** - Test from different network

## Next Steps

1. **Verify deployment** - Check if code is actually deployed
2. **Check service status** - Verify services are running
3. **Check logs** - Look for errors in Azure App Service logs
4. **Test with longer timeout** - Try `--max-time 30` to see if it's just slow

## Summary

**HTTP Status 000 = No Response Received**

- Not a valid HTTP status code
- Means connection failed or timed out
- Usually indicates service is down or not deployed
- Need to check deployment status and service health

