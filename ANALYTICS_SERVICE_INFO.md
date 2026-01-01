# 📊 Analytics Service - Complete Information

## Status
**❌ NOT YET DEPLOYED** - Available in codebase, ready to deploy

---

## 📋 Service Details

**Service Name**: `analytics-service`  
**Port**: 3014  
**Purpose**: Business Intelligence, Reports, Dashboards & Analytics  
**Status**: Code complete, not deployed to AKS

---

## 🎯 What Analytics Service Provides

### 1. HR Analytics
- Employee statistics by department
- Average tenure analysis
- Headcount reports
- Department-wise distribution
- Employee demographics

### 2. Attendance Analytics
- Daily/weekly/monthly attendance trends
- Present vs absent vs late statistics
- Attendance rate calculations
- Individual employee attendance patterns
- Store-wise attendance reports

### 3. Compliance Analytics
- Document verification status
- Pending documents tracking
- Compliance rate by department
- Document expiry tracking

### 4. Sales Analytics (Integration)
- Sales performance metrics
- Revenue trends
- Product performance
- Store-wise sales comparison

### 5. Service Management Analytics
- Ticket statistics
- Resolution time analytics
- Customer satisfaction scores
- Trend reports

### 6. Financial Analytics (Integration)
- Revenue analytics
- Expense tracking
- Profit margins
- Financial health indicators

---

## 📡 Available API Endpoints

### Analytics Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **GET** | `/api/analytics/hr` | Get HR analytics | HR, Admin |
| **GET** | `/api/analytics/attendance` | Get attendance analytics | HR, Admin, Manager |
| **GET** | `/api/analytics/compliance` | Get compliance analytics | HR, Admin |
| **GET** | `/api/analytics/sales` | Get sales analytics | Admin, Manager |
| **GET** | `/api/analytics/financial` | Get financial analytics | Admin, Accounts |
| **GET** | `/api/analytics/dashboard` | Get complete dashboard data | All roles (role-based) |
| **GET** | `/api/analytics/reports` | Generate custom reports | HR, Admin |
| **POST** | `/api/analytics/export` | Export analytics data | HR, Admin |

### Health & Status

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| **GET** | `/api/analytics/health` | Health check | Public |
| **GET** | `/api/analytics/status` | Service status | Public |

---

## 🔍 Key Features

### 1. Real-Time Analytics
- Live data processing
- Real-time dashboards
- Instant metric updates

### 2. Historical Analysis
- Trend analysis over time
- Comparative reports
- Period-over-period comparison

### 3. Predictive Analytics
- Trend forecasting
- Predictive insights
- Pattern recognition

### 4. Custom Reports
- Configurable report generation
- Multiple export formats (PDF, Excel, CSV)
- Scheduled reports

### 5. Data Aggregation
- Cross-service data collection
- Unified analytics view
- Multi-dimensional analysis

### 6. Visualization Support
- Chart data preparation
- Graph-ready formats
- Dashboard-optimized responses

---

## 📊 Sample API Responses

### HR Analytics Response:
```json
{
  "success": true,
  "data": {
    "totalEmployees": 245,
    "activeEmployees": 230,
    "departmentStats": [
      {
        "department": "Sales",
        "count": 85,
        "avgTenure": 2.5
      },
      {
        "department": "IT",
        "count": 45,
        "avgTenure": 3.2
      }
    ],
    "newHires": {
      "thisMonth": 12,
      "lastMonth": 8
    },
    "turnoverRate": 5.2
  }
}
```

### Attendance Analytics Response:
```json
{
  "success": true,
  "data": {
    "period": "last_7_days",
    "dailyStats": [
      {
        "date": "2025-12-30",
        "totalAttendance": 230,
        "present": 220,
        "late": 8,
        "absent": 2,
        "attendanceRate": 95.7
      }
    ],
    "summary": {
      "avgAttendanceRate": 94.5,
      "totalLateMarks": 45,
      "totalAbsences": 12
    }
  }
}
```

### Dashboard Response:
```json
{
  "success": true,
  "data": {
    "metrics": {
      "employees": {
        "total": 245,
        "active": 230,
        "onLeave": 10,
        "new": 5
      },
      "attendance": {
        "today": {
          "present": 220,
          "rate": 95.7
        },
        "thisMonth": {
          "avgRate": 94.5
        }
      },
      "leaves": {
        "pending": 15,
        "approved": 42,
        "rejected": 3
      },
      "documents": {
        "pending": 8,
        "verified": 237
      }
    },
    "charts": {
      "attendanceTrend": [...],
      "departmentDistribution": [...],
      "leaveTrend": [...]
    }
  }
}
```

---

## 🛠️ Technical Architecture

### Data Sources:
- **Auth Service** - User data
- **HR Service** - Employee data
- **Attendance Service** - Attendance records
- **Leave Service** - Leave records
- **Document Service** - Document status
- **Sales Service** - Sales data
- **Financial Service** - Financial data

### Processing:
- MongoDB aggregation pipelines
- Real-time data streaming
- Scheduled data updates
- Caching for performance

### Storage:
- Raw data in service databases
- Aggregated data in analytics DB
- Cached results in Redis
- Historical data in time-series DB

---

## 🚀 Deployment Requirements

### To Deploy Analytics Service:

#### 1. Docker Build:
```bash
cd microservices/analytics-service
docker build -t eteliosacr.azurecr.io/analytics-service:latest .
docker push eteliosacr.azurecr.io/analytics-service:latest
```

#### 2. Kubernetes Deployment:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-service
  namespace: etelios-backend-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: analytics-service
  template:
    metadata:
      labels:
        app: analytics-service
        version: v1
    spec:
      containers:
      - name: analytics-service
        image: eteliosacr.azurecr.io/analytics-service:latest
        ports:
        - containerPort: 3014
        env:
        - name: PORT
          value: "3014"
        - name: SERVICE_NAME
          value: "analytics-service"
```

#### 3. Service Exposure:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: analytics-service
  namespace: etelios-backend-prod
spec:
  type: ClusterIP
  selector:
    app: analytics-service
  ports:
  - port: 3014
    targetPort: 3014
```

#### 4. Ingress Route:
Add to `k8s/ingress.yaml`:
```yaml
- path: /api/analytics
  pathType: Prefix
  backend:
    service:
      name: analytics-service
      port:
        number: 3014
```

---

## 📈 Use Cases

### For Admins:
- View complete system analytics
- Monitor all departments
- Track overall performance
- Generate executive reports

### For HR:
- Employee analytics
- Attendance reports
- Compliance tracking
- Recruitment metrics

### For Managers:
- Team performance
- Department analytics
- Team attendance
- Productivity metrics

### For Accounts:
- Financial analytics
- Budget tracking
- Expense analysis
- Revenue reports

---

## 🔧 Configuration

### Environment Variables:
```bash
PORT=3014
SERVICE_NAME=analytics-service
MONGO_URI=mongodb://...
REDIS_URL=redis://...
AUTH_SERVICE_URL=http://auth-service:3001
HR_SERVICE_URL=http://hr-service:3002
ATTENDANCE_SERVICE_URL=http://attendance-service:3003
```

---

## ⚡ Performance Features

1. **Caching**: Results cached for 5-15 minutes
2. **Aggregation**: Pre-computed metrics
3. **Pagination**: Large datasets paginated
4. **Lazy Loading**: Data loaded on demand
5. **Background Jobs**: Heavy processing in background

---

## 🔮 Future Enhancements

1. **Machine Learning**: Predictive analytics
2. **AI Insights**: Automated insights generation
3. **Anomaly Detection**: Automatic anomaly alerts
4. **Advanced Visualizations**: Interactive charts
5. **Custom Dashboards**: User-configurable dashboards

---

## 📞 Integration with Frontend

### Example: Fetch HR Analytics
```javascript
const token = localStorage.getItem('accessToken');

fetch('https://98.70.245.87/api/analytics/hr', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('HR Analytics:', data);
  // Render charts, tables, etc.
});
```

### Example: Get Dashboard Data
```javascript
fetch('https://98.70.245.87/api/analytics/dashboard', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => {
  // data contains all metrics for dashboard
  updateDashboard(data);
});
```

---

## ✅ Deployment Status

| Component | Status |
|-----------|--------|
| **Code** | ✅ Complete |
| **Docker Image** | ❌ Not built |
| **K8s Deployment** | ❌ Not created |
| **Service** | ❌ Not running |
| **Ingress Route** | ❌ Not configured |
| **Testing** | ❌ Not tested |

---

## 🎯 Next Steps

### To Deploy:
1. Build Docker image
2. Push to Azure Container Registry
3. Create Kubernetes manifests
4. Deploy to AKS
5. Configure Ingress route
6. Test endpoints
7. Integrate with frontend

**Would you like me to deploy the Analytics Service now?**

---

**Last Updated**: December 30, 2025  
**Status**: Ready for deployment

