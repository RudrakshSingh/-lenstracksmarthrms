# 🔐 SSL/HTTPS Endpoints

## Production API Endpoint (SSL Enabled)

**Base URL:** `https://api.etelios.com`

---

## 📋 All API Endpoints

### Health & Status
- **Health Check:** `https://api.etelios.com/health`
- **Root:** `https://api.etelios.com/`

### Authentication
- **Login:** `https://api.etelios.com/api/auth/login`
- **Register:** `https://api.etelios.com/api/auth/register`
- **All Auth APIs:** `https://api.etelios.com/api/auth/*`

### HR Service
- **Employees:** `https://api.etelios.com/api/hr/employees`
- **All HR APIs:** `https://api.etelios.com/api/hr/*`

### Attendance Service
- **Today's Attendance:** `https://api.etelios.com/api/attendance/today`
- **Attendance Stats:** `https://api.etelios.com/api/attendance/stats`
- **All Attendance APIs:** `https://api.etelios.com/api/attendance/*`

### Other Services
- **Payroll:** `https://api.etelios.com/api/payroll/*`
- **CRM:** `https://api.etelios.com/api/crm/*`
- **Inventory:** `https://api.etelios.com/api/inventory/*`
- **Sales:** `https://api.etelios.com/api/sales/*`
- **Purchase:** `https://api.etelios.com/api/purchase/*`
- **Financial:** `https://api.etelios.com/api/financial/*`
- **Documents:** `https://api.etelios.com/api/documents/*`
- **Analytics:** `https://api.etelios.com/api/analytics/*`
- **Dashboard:** `https://api.etelios.com/api/dashboard/*`
- **Notifications:** `https://api.etelios.com/api/notification/*`
- **Monitoring:** `https://api.etelios.com/api/monitoring/*`

### WebSocket Services
- **Socket.IO:** `https://api.etelios.com/socket.io/*`
- **WebSocket:** `https://api.etelios.com/ws/*`

---

## 🔐 SSL Certificate Details

- **Domain:** `*.etelios.com` (Wildcard)
- **Issuer:** Sectigo Public Server Authentication CA DV R36
- **Valid From:** March 6, 2026
- **Valid Until:** January 2, 2027
- **Status:** ✅ Active and Secured

---

## ✅ SSL Features

- ✅ HTTPS Encryption Enabled
- ✅ TLS 1.2 / TLS 1.3 Support
- ✅ Secure Ciphers Configured
- ✅ Certificate Valid and Not Expired
- ✅ Wildcard Certificate (covers all subdomains)

---

## 🧪 Test SSL Connection

```bash
# Test health endpoint
curl -I https://api.etelios.com/health

# Test with SSL verification
curl -v https://api.etelios.com/health

# Test API endpoint
curl https://api.etelios.com/api/auth/health
```

---

## 📝 Quick Links

**Main API:** `https://api.etelios.com`

**Health Check:** `https://api.etelios.com/health`

**All APIs:** `https://api.etelios.com/api/*`

---

**SSL Certificate:** ✅ Active  
**Endpoint:** ✅ Live  
**Status:** ✅ Production Ready
