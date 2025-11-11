# 📊 Etelios Analytics - Complete Documentation
## **All Analytics Features & Capabilities in the Codebase**

This document provides a comprehensive overview of all analytics, reporting, and insights capabilities available across the Etelios ERP platform.

---

## 🎯 Analytics Service Overview

**Service**: `analytics-service`  
**Port**: 3014  
**Base Path**: `/api/analytics`

The Analytics Service is a dedicated microservice that provides comprehensive analytics, reporting, and AI-powered insights across all business modules.

---

## 📋 Table of Contents

1. [HR Analytics](#1-hr-analytics)
2. [Inventory Analytics](#2-inventory-analytics)
3. [Sales Analytics](#3-sales-analytics)
4. [CRM Analytics](#4-crm-analytics)
5. [Service Management Analytics](#5-service-management-analytics)
6. [Training Analytics](#6-training-analytics)
7. [Dashboard Management](#7-dashboard-management)
8. [Expiry Reports](#8-expiry-reports)
9. [Batch Analytics](#9-batch-analytics)
10. [AI-Powered Insights](#10-ai-powered-insights)
11. [Export & Integration](#11-export--integration)

---

## 1. HR Analytics

### 1.1 Employee Statistics
**Endpoint**: `GET /api/analytics/employee-stats`

**Capabilities**:
- Department-wise employee distribution
- Average tenure per department
- Employee count by department
- Active vs inactive employee breakdown
- Department sorting by employee count

**Response Structure**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "Sales",
      "count": 45,
      "avgTenure": 2.5
    },
    {
      "_id": "HR",
      "count": 8,
      "avgTenure": 3.2
    }
  ]
}
```

### 1.2 Attendance Analytics
**Endpoint**: `GET /api/analytics/attendance-analytics?days=30&department=Sales`

**Capabilities**:
- Daily attendance trends (last 7-30 days)
- Present, late, and absent counts
- Attendance rate calculations
- Department-wise attendance filtering
- Historical attendance patterns

**Response Structure**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "2024-01-15",
      "totalAttendance": 150,
      "presentCount": 142,
      "lateCount": 5,
      "absentCount": 3
    }
  ]
}
```

### 1.3 Performance Metrics
**Endpoint**: `GET /api/analytics/performance-metrics`

**Capabilities**:
- Employee performance scores
- Attendance-based performance metrics
- Average attendance per employee
- Performance rankings
- Department-wise performance comparison

**Response Structure**:
```json
{
  "success": true,
  "data": [
    {
      "name": "John Doe",
      "department": "Sales",
      "attendanceCount": 25,
      "avgAttendance": 0.96
    }
  ]
}
```

### 1.4 Compliance Analytics
**Endpoint**: `GET /api/analytics/compliance-analytics`

**Capabilities**:
- Document compliance percentage by type
- Signed vs unsigned documents breakdown
- Compliance alerts and warnings
- Department-wise compliance metrics
- Expiring document tracking

**Response Structure**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "NDA",
      "totalDocuments": 150,
      "signedDocuments": 145,
      "compliancePercentage": 96.67
    }
  ]
}
```

### 1.5 Comprehensive HR Analytics
**Endpoint**: `GET /api/analytics/hr-analytics`

**Capabilities**:
- Complete HR dashboard data
- Combined employee, attendance, and compliance stats
- Real-time HR metrics
- Department-wise breakdowns
- Trend analysis

**Response Structure**:
```json
{
  "success": true,
  "data": {
    "employeeStats": [...],
    "attendanceStats": [...],
    "complianceStats": [...],
    "generatedAt": "2024-01-15T10:30:00Z",
    "source": "built-in"
  }
}
```

---

## 2. Inventory Analytics

### 2.1 Batch Analytics Service
**Location**: `microservices/inventory-service/src/services/batchAnalytics.service.js`

**Capabilities**:
- **Batch Received Tracking**: Track when batches are received
  - Batch ID, number, lot number
  - Product variant, quantity, expiry date
  - Vendor ID, purchase price
  - Store ID, user ID

- **Batch Adjusted Tracking**: Track batch adjustments
  - Adjustment type and quantity change
  - Previous and new quantities
  - Reason for adjustment
  - Expiry information

- **Batch Depleted Tracking**: Track batch depletion
  - Depletion reason (sold, expired, damaged, etc.)
  - Final quantity before depletion
  - Expiry information

- **Batch Expired Tracking**: Track expired batches
  - Expiry date and days overdue
  - Final quantity at expiry
  - Financial impact calculation

- **Batch Sold Tracking**: Track batch sales
  - Quantity sold from batch
  - Selling price and revenue
  - Order/transaction ID
  - Profit margin calculation

- **FEFO Compliance Tracking**: Track FEFO (First Expiry First Out) compliance
  - Sequence violations
  - Compliance percentage
  - Recommendations

- **Batch Movement Tracking**: Track batch movements
  - Source and destination stores
  - Transfer quantity
  - Movement reason

### 2.2 Ageing Reports
**Service**: `expiryReports.service.js`

**Capabilities**:
- **Near-Expiry Report**: Products expiring within specified days
  - Configurable days ahead (default: 90 days)
  - Store-wise filtering
  - Product type filtering
  - Include/exclude expired items
  - Critical status (≤7 days, ≤30 days)

**Endpoint**: `GET /api/analytics/expiry-reports/near-expiry?days_ahead=90&store_id=xxx&product_type=yyy`

**Response Structure**:
```json
{
  "summary": {
    "total_batches": 25,
    "expired": 3,
    "near_expiry": 8,
    "expiring_soon": 2
  },
  "batches": [
    {
      "batch_id": "...",
      "batch_number": "BATCH-001",
      "product_name": "Lens A",
      "store_name": "Main Store",
      "expiry_date": "2024-02-15",
      "days_to_expiry": 15,
      "current_quantity": 50,
      "is_expired": false,
      "status": "WARNING"
    }
  ]
}
```

- **Batch-Wise Stock Report**: Complete stock breakdown by batches
  - Product-wise grouping
  - Batch details per product
  - Total quantity per product
  - Expiry status

**Endpoint**: `GET /api/analytics/expiry-reports/batch-wise?store_id=xxx&product_type=yyy`

- **FEFO Compliance Report**: Check FEFO compliance across products
  - Product-wise FEFO compliance status
  - Sequence violations identification
  - Compliance percentage
  - Recommendations for correction

**Endpoint**: `GET /api/analytics/expiry-reports/fefo-compliance?store_id=xxx&days_back=30`

**Response Structure**:
```json
{
  "summary": {
    "total_products": 50,
    "fefo_compliant": 45,
    "fefo_violations": 5
  },
  "products": [
    {
      "product_name": "Product A",
      "fefo_compliant": true,
      "batches": [...]
    }
  ]
}
```

- **Expiry Heatmap**: Visual heatmap of expiring products
  - Date-wise expiry distribution
  - Quantity and batch counts per date
  - Severity levels (HIGH, MEDIUM, LOW)
  - Product count per date

**Endpoint**: `GET /api/analytics/expiry-reports/heatmap?store_id=xxx&days_ahead=90`

**Response Structure**:
```json
{
  "summary": {
    "total_dates": 15,
    "total_quantity": 500,
    "total_batches": 25
  },
  "heatmap": [
    {
      "date": "2024-02-15",
      "total_quantity": 100,
      "batch_count": 5,
      "product_count": 3,
      "severity": "MEDIUM"
    }
  ]
}
```

- **Loss Due to Expiry Report**: Financial impact of expired products
  - Total expired batches and quantities
  - Estimated financial loss
  - Purchase price tracking
  - Date range filtering

**Endpoint**: `GET /api/analytics/expiry-reports/loss?store_id=xxx&from_date=2024-01-01&to_date=2024-01-31`

**Response Structure**:
```json
{
  "summary": {
    "total_expired_batches": 10,
    "total_expired_quantity": 150,
    "estimated_loss": 15000
  },
  "expired_batches": [
    {
      "batch_id": "...",
      "product_name": "Product A",
      "expired_quantity": 15,
      "purchase_price": 100,
      "estimated_loss": 1500,
      "expiry_date": "2024-01-15",
      "expired_at": "2024-01-16T00:00:00Z"
    }
  ]
}
```

---

## 3. Sales Analytics

### 3.1 Sales Performance Metrics
**Service**: `sales-service`

**Capabilities**:
- Sales pipeline analytics
- Revenue by product, region, rep
- Win/loss analysis
- Sales cycle tracking
- Conversion rate analysis

### 3.2 AI-Powered Sales Analytics
**Features**:
- **Lead Scoring**: AI-powered lead scoring (85%+ accuracy)
- **Opportunity Forecasting**: Predictive deal closure probability
- **Revenue Forecasting**: AI forecasts revenue 90 days ahead
- **Next Best Action**: AI suggests optimal next steps
- **Performance Optimization**: AI identifies improvement areas

---

## 4. CRM Analytics

### 4.1 Engagement Analytics
**Service**: `crm-service/src/services/engagementService.js`

**Endpoint**: `GET /api/crm/engagement/analytics?date_from=2024-01-01&customer_id=xxx`

**Capabilities**:
- Channel-wise engagement metrics (Email, SMS, WhatsApp)
- Delivery status tracking
- Delivery rate calculations
- Cost analysis per channel
- Customer engagement trends

**Response Structure**:
```json
{
  "success": true,
  "data": [
    {
      "channel": "email",
      "total_sent": 1000,
      "delivered": 950,
      "delivery_rate": 95,
      "total_cost": 10.50
    },
    {
      "channel": "sms",
      "total_sent": 500,
      "delivered": 485,
      "delivery_rate": 97,
      "total_cost": 25.00
    }
  ]
}
```

### 4.2 Customer Analytics
**Capabilities**:
- Customer lifetime value (LTV)
- Customer segmentation
- Purchase behavior analysis
- Churn prediction
- Customer engagement scores

---

## 5. Service Management Analytics

### 5.1 Service Ticket Analytics
**Service**: `service-management/src/services/serviceService.js`

**Capabilities**:
- **Trend Reports**: Service ticket trends over time
  - Ticket volume trends
  - Resolution time trends
  - SLA compliance trends

**Endpoint**: `GET /api/service-management/trend-report?start_date=xxx&end_date=yyy`

- **Analytics Reports**: Comprehensive service analytics
  - Average resolution time
  - Ticket status distribution
  - Category-wise breakdown
  - Priority-wise analysis
  - Agent performance metrics

**Endpoint**: `GET /api/service-management/analytics?query=xxx`

---

## 6. Training Analytics

### 6.1 Training Progress Analytics
**Service**: `lenstrack-training-app/src/services/analytics.service.js`

**Capabilities**:
- **User Progress Analytics**: Individual training progress
  - Completed courses and lessons
  - Assessment scores
  - Time spent on learning
  - Certification status

**Endpoint**: `GET /api/analytics/user-progress?userId=xxx&timeRange=30d`

- **Store Performance Analytics**: Store-wise training metrics
  - Training completion rates
  - Average scores per store
  - Certification status
  - ROI analysis

**Endpoint**: `GET /api/analytics/store-performance?storeId=xxx&timeRange=30d`

- **Track Analytics**: Learning track performance
  - Track completion rates
  - Popular tracks
  - Average completion time
  - Success metrics

**Endpoint**: `GET /api/analytics/track-analytics?trackId=xxx&timeRange=30d`

- **KPI Impact Analytics**: Training impact on KPIs
  - AR attach rate improvement
  - Progressive conversion improvement
  - AOV improvement
  - Remake rate reduction

**Endpoint**: `GET /api/analytics/kpi-impact?storeId=xxx&timeRange=30d`

- **Skill Gap Analysis**: Identify skill gaps
  - Skill gap identification
  - Training recommendations
  - Competency levels
  - Improvement areas

**Endpoint**: `GET /api/analytics/skill-gaps?storeId=xxx&timeRange=30d`

### 6.2 Gamification Analytics
**Capabilities**:
- XP points tracking
- Badge achievements
- Leaderboard rankings
- Store-wise competitions
- Individual performance metrics

---

## 7. Dashboard Management

### 7.1 Dashboard Creation & Management
**Service**: `analytics-service/src/controllers/dashboardController.js`

**Endpoints**:
- `POST /api/analytics/dashboard` - Create custom dashboard
- `GET /api/analytics/dashboard/:dashboardId` - Get dashboard data
- `GET /api/dashboard` - Get role-based dashboard
- `GET /api/dashboard/:widgetId/data` - Get widget-specific data

**Capabilities**:
- **Role-Based Dashboards**: Dashboards customized per user role
  - Admin, HR, Manager, Employee dashboards
  - Permission-based widget filtering
  - Customizable layouts

- **Widget Types**:
  - **Attendance Widgets**: Attendance charts, trends, statistics
  - **Employee Widgets**: Employee counts, new hires, department breakdowns
  - **Asset Widgets**: Asset utilization, category breakdowns
  - **Transfer Widgets**: Employee transfer tracking
  - **Document Widgets**: Document status, pending signatures
  - **Store Widgets**: Store performance, employee distribution
  - **Audit Log Widgets**: Recent activities, system alerts
  - **System Metrics Widgets**: Server uptime, active users, performance
  - **Compliance Widgets**: Compliance percentages, trends

**Dashboard Structure**:
```json
{
  "title": "HR Dashboard",
  "slug": "hr-dashboard",
  "role": "hr",
  "widgets": [
    {
      "widget_id": "attendance-chart",
      "widget_type": "line_chart",
      "data_source": "attendance",
      "position": { "x": 0, "y": 0, "w": 6, "h": 4 },
      "permissions": ["view_attendance"]
    }
  ]
}
```

---

## 8. Expiry Reports

### 8.1 Comprehensive Expiry Management
**Service**: `analytics-service/src/services/expiryReports.service.js`

**All Endpoints**:
- `GET /api/analytics/expiry-reports/near-expiry`
- `GET /api/analytics/expiry-reports/batch-wise`
- `GET /api/analytics/expiry-reports/fefo-compliance`
- `GET /api/analytics/expiry-reports/heatmap`
- `GET /api/analytics/expiry-reports/loss`

**Key Features**:
- Multi-store filtering
- Product type filtering
- Date range filtering
- Configurable thresholds
- Status-based filtering (Active, Expired, Blocked)
- Financial impact calculations

---

## 9. Batch Analytics

### 9.1 Event Tracking
**Service**: `inventory-service/src/services/batchAnalytics.service.js`

**Tracked Events**:
1. **Batch Received**: When new batches arrive
2. **Batch Adjusted**: When quantities are adjusted
3. **Batch Depleted**: When batches run out
4. **Batch Expired**: When batches expire
5. **Batch Sold**: When batches are sold
6. **FEFO Compliance**: When FEFO rules are followed/violated
7. **Batch Movement**: When batches are transferred

**Use Cases**:
- Inventory optimization
- Waste reduction tracking
- Compliance monitoring
- Financial impact analysis
- Supplier performance tracking

---

## 10. AI-Powered Insights

### 10.1 AI Insights Generation
**Endpoint**: `GET /api/analytics/insights`

**Capabilities**:
- **Automated Insight Generation**: AI analyzes data and generates insights
- **Recommendations**: Actionable recommendations based on data
- **Alert Generation**: Automatic alerts for critical issues
- **Trend Identification**: Identifies patterns and trends
- **Predictive Analytics**: Forecasts future trends

**Insight Types**:
```json
{
  "insights": [
    {
      "type": "employee_distribution",
      "title": "Employee Distribution Analysis",
      "description": "Total active employees: 150",
      "recommendation": "Employee count is healthy",
      "priority": "medium"
    },
    {
      "type": "attendance",
      "title": "Attendance Analysis",
      "description": "Average daily attendance: 142.5 employees",
      "recommendation": "Attendance levels are healthy",
      "priority": "high"
    },
    {
      "type": "compliance",
      "title": "Compliance Alert",
      "description": "2 document types have compliance below 80%",
      "recommendation": "Send reminders for pending document signatures",
      "priority": "high"
    }
  ]
}
```

### 10.2 AI Features Across Modules
- **Sales**: Lead scoring, opportunity forecasting, next best action
- **Inventory**: Demand forecasting, reorder recommendations, optimization
- **HR**: Attrition prediction, performance forecasting, hiring recommendations
- **Finance**: Cash flow forecasting, fraud detection, budget optimization

---

## 11. Export & Integration

### 11.1 Data Export
**Endpoint**: `GET /api/analytics/export?format=json|csv|excel`

**Formats Supported**:
- **JSON**: Machine-readable format
- **CSV**: Spreadsheet-compatible format
- **Excel**: Microsoft Excel format (.xlsx)

**Exportable Data**:
- HR Analytics
- Attendance Reports
- Employee Statistics
- Compliance Reports
- Performance Metrics

### 11.2 Integration Capabilities
- **External BI Tools**: Can integrate with Superset, Tableau, Power BI
- **API Access**: RESTful APIs for all analytics
- **Webhook Support**: Real-time analytics updates
- **Scheduled Reports**: Automated report generation and delivery

---

## 🔧 Configuration & Setup

### 11.3 Configuration Status
**Endpoint**: `GET /api/analytics/config`

**Returns**:
- External analytics tool configuration status
- Data source connections
- Service health status
- Feature availability

---

## 📊 Analytics Data Models

### Models Used:
- `User.model.js` - Employee data
- `Attendance.model.js` - Attendance records
- `EmployeeDocument.model.js` - Document compliance
- `InventoryBatch.model.js` - Batch tracking
- `ProductMaster.model.js` - Product information
- `Dashboard.model.js` - Dashboard configurations

---

## 🚀 Performance & Scalability

### Optimization Features:
- **Aggregation Pipelines**: MongoDB aggregation for efficient queries
- **Caching**: Redis caching for frequently accessed analytics
- **Pagination**: Large dataset pagination
- **Lazy Loading**: Widget data loaded on demand
- **Background Processing**: Heavy analytics run asynchronously

---

## 📈 Key Metrics Tracked

### HR Metrics:
- Employee count by department
- Average tenure
- Attendance rates
- Performance scores
- Compliance percentages

### Inventory Metrics:
- Batch counts and quantities
- Expiry dates and days to expiry
- FEFO compliance
- Financial loss due to expiry
- Stock movement patterns

### Sales Metrics:
- Revenue by product/region/rep
- Conversion rates
- Sales cycle duration
- Win/loss ratios
- Pipeline value

### CRM Metrics:
- Engagement rates by channel
- Delivery rates
- Cost per engagement
- Customer lifetime value
- Churn rates

---

## 🔐 Security & Access Control

### Access Control:
- **Role-Based Access**: Analytics accessible based on user roles
- **Permission Checks**: Granular permission checking
- **Data Filtering**: Tenant-wise data isolation
- **Audit Logging**: All analytics access logged

### Roles with Analytics Access:
- **Admin**: Full access to all analytics
- **HR**: HR-specific analytics
- **Manager**: Team/department analytics
- **Employee**: Limited personal analytics

---

## 📝 API Documentation

### Base URL:
```
http://localhost:3014/api/analytics
```

### Authentication:
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Rate Limiting:
- Standard rate limits apply
- Analytics endpoints: 100 requests per 15 minutes per user

---

## 🎯 Use Cases

### Business Intelligence:
- Executive dashboards
- KPI tracking
- Trend analysis
- Performance monitoring

### Operational Analytics:
- Daily operations monitoring
- Real-time alerts
- Issue identification
- Process optimization

### Strategic Planning:
- Forecasting
- Market analysis
- Resource planning
- Growth planning

---

## 🛠️ Future Enhancements

### Planned Features:
- Real-time streaming analytics
- Advanced machine learning models
- Custom report builder
- Mobile analytics app
- Voice-enabled analytics queries
- Augmented analytics (auto-insights)

---

## 📞 Support & Documentation

For more information:
- Service README: `microservices/analytics-service/README.md`
- API Documentation: Available via API Gateway
- Integration Guide: Contact development team

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Service Status**: Production Ready

