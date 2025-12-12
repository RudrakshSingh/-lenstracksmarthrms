# Etelios Brain: AI & Machine Learning Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core AI Components](#core-ai-components)
4. [Machine Learning Models](#machine-learning-models)
5. [API Reference](#api-reference)
6. [Implementation Details](#implementation-details)
7. [Configuration](#configuration)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## 1. Overview

### 1.1 What is Etelios Brain?

Etelios Brain is the AI and Machine Learning subsystem of the Etelios HRMS platform. It provides intelligent insights, predictive analytics, anomaly detection, and automated decision-making capabilities across various business domains including:

- **Attendance & Location Verification**: AI-powered fake GPS detection
- **HR Analytics**: Predictive insights for workforce management
- **Inventory Management**: Batch analytics and expiry prediction
- **Training & Development**: AI-powered role-play and feedback systems
- **Security**: Pattern-based anomaly detection

### 1.2 Key Features

- **Multi-Signal AI Engine**: Aggregates multiple security signals for intelligent decision-making
- **Pattern Recognition**: ML-based movement pattern analysis
- **Predictive Analytics**: Forecast trends and anomalies
- **Automated Insights**: Generate actionable recommendations
- **Real-time Processing**: Low-latency AI inference
- **Explainable AI**: Transparent decision-making with detailed breakdowns

### 1.3 Technology Stack

- **Language**: Node.js (JavaScript)
- **ML Approach**: Rule-based + Statistical Analysis
- **Data Processing**: MongoDB Aggregation Pipeline
- **Real-time**: Event-driven architecture
- **Storage**: MongoDB for historical data
- **Analytics**: Custom analytics service

---

## 2. Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Etelios Brain AI Layer                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Anti-Fake  │  │   Movement   │  │   Analytics  │      │
│  │  GPS AI      │  │   Pattern    │  │   Insights   │      │
│  │   Engine     │  │   Analyzer   │  │   Generator  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │  Signal Fusion  │                        │
│                   │     Engine      │                        │
│                   └────────┬────────┘                        │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│              Microservices Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Attendance  │  │  Analytics   │  │  Inventory   │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

1. **Input Collection**: Raw data from various sources (GPS, device sensors, user actions)
2. **Signal Processing**: Individual signals are analyzed independently
3. **AI Aggregation**: Multiple signals are fused using weighted scoring
4. **Decision Making**: AI engine determines action (ALLOW/FLAG/BLOCK)
5. **Feedback Loop**: Results are stored for continuous learning

---

## 3. Core AI Components

### 3.1 Anti-Fake GPS AI Engine

**Location**: `microservices/attendance-service/src/services/security/antiFakeGPSAI.service.js`

#### 3.1.1 Purpose

The Anti-Fake GPS AI Engine is a sophisticated multi-signal fusion system that detects fake GPS locations and location spoofing attempts. It aggregates signals from multiple security checks to calculate a comprehensive suspiciousness score.

#### 3.1.2 How It Works

The engine uses a **weighted signal fusion** approach:

1. **Signal Collection**: Gathers signals from 8 different security checks:
   - Mock Location Detection
   - Device Security Status
   - Speed Anomaly Detection
   - Network Analysis
   - Satellite Signal Analysis
   - App State Verification
   - Face Verification
   - Movement Pattern Analysis

2. **Score Aggregation**: Each signal contributes to a total suspicious score (0-100)

3. **Decision Making**: Based on the final score:
   - **Score > 85**: BLOCK - Fake GPS detected, check-in blocked
   - **Score 60-85**: FLAG - Suspicious activity, requires review
   - **Score < 60**: ALLOW - Location verified

#### 3.1.3 Algorithm Details

```javascript
calculateSuspiciousScore(signals) {
  totalSuspiciousScore = 0
  
  // Aggregate scores from all checks
  totalSuspiciousScore += signals.mockLocation.suspiciousScore || 0
  totalSuspiciousScore += signals.deviceSecurity.suspiciousScore || 0
  totalSuspiciousScore += signals.speed.suspiciousScore || 0
  totalSuspiciousScore += signals.network.suspiciousScore || 0
  totalSuspiciousScore += signals.satellite.suspiciousScore || 0
  totalSuspiciousScore += signals.appState.suspiciousScore || 0
  totalSuspiciousScore += signals.faceVerification.suspiciousScore || 0
  totalSuspiciousScore += signals.movementPattern.suspiciousScore || 0
  
  // Cap at 100
  finalScore = min(100, totalSuspiciousScore)
  
  // Determine action
  return determineAction(finalScore)
}
```

#### 3.1.4 Response Format

```json
{
  "suspiciousScore": 75,
  "action": "FLAG",
  "message": "Suspicious activity detected - Requires review",
  "violations": [
    {
      "type": "AI_ANOMALY",
      "severity": "HIGH",
      "message": "Teleportation detected in movement pattern"
    }
  ],
  "breakdown": {
    "mockLocation": 0,
    "deviceSecurity": 15,
    "speed": 10,
    "network": 5,
    "satellite": 0,
    "appState": 0,
    "faceVerification": 0,
    "movementPattern": 30
  }
}
```

#### 3.1.5 Use Cases

- **Employee Check-in Verification**: Validate that employees are at the correct location
- **Field Sales Tracking**: Ensure sales representatives are visiting actual customer locations
- **Attendance Fraud Prevention**: Detect and prevent location spoofing
- **Compliance Monitoring**: Ensure employees follow location-based policies

---

### 3.2 Movement Pattern Analyzer

**Location**: `microservices/attendance-service/src/services/security/movementPatternAnalyzer.service.js`

#### 3.2.1 Purpose

The Movement Pattern Analyzer uses machine learning techniques to analyze historical location data and detect unnatural movement patterns that indicate fake GPS usage.

#### 3.2.2 ML Techniques Used

1. **Straight-Line Detection** (Variance Analysis)
   - **Algorithm**: Bearing variance calculation
   - **Principle**: Real movement has direction changes; fake GPS often shows straight lines
   - **Detection**: Low variance (< 5 degrees) indicates unnatural movement

2. **Teleportation Detection** (Distance-Time Analysis)
   - **Algorithm**: Haversine distance calculation with time analysis
   - **Principle**: Physical movement has speed limits
   - **Detection**: Distance > 10km in < 10 seconds = teleportation

3. **Acceleration Pattern Analysis** (Speed Variance)
   - **Algorithm**: Speed variance calculation
   - **Principle**: Real movement has speed variation; fake GPS often has constant speed
   - **Detection**: Low speed variance indicates fake GPS

4. **GPS Drift Detection** (Accuracy Variance)
   - **Algorithm**: Accuracy variance analysis
   - **Principle**: Real GPS has natural accuracy variations
   - **Detection**: Too consistent accuracy indicates fake GPS

#### 3.2.3 Mathematical Models

##### Bearing Calculation (Straight-Line Detection)

```javascript
calculateBearing(lat1, lon1, lat2, lon2) {
  dLon = toRad(lon2 - lon1)
  lat1Rad = toRad(lat1)
  lat2Rad = toRad(lat2)
  
  y = sin(dLon) * cos(lat2Rad)
  x = cos(lat1Rad) * sin(lat2Rad) - 
      sin(lat1Rad) * cos(lat2Rad) * cos(dLon)
  
  bearing = atan2(y, x)
  return (bearing * 180 / π + 360) % 360
}

// Variance calculation
variance = Σ(bearing - mean)² / n

// Detection: variance < 5 = straight line (suspicious)
```

##### Distance Calculation (Teleportation Detection)

```javascript
calculateDistance(lat1, lon1, lat2, lon2) {
  R = 6371 // Earth radius in km
  dLat = toRad(lat2 - lat1)
  dLon = toRad(lon2 - lon1)
  
  a = sin²(dLat/2) + cos(lat1) * cos(lat2) * sin²(dLon/2)
  c = 2 * atan2(√a, √(1-a))
  
  return R * c
}

// Detection: distance > 10km in < 10 seconds = teleportation
```

##### Speed Variance (Acceleration Pattern)

```javascript
speed = distance / timeDifference
variance = Σ(speed - mean)² / n

// Detection: variance < 5 = constant speed (suspicious)
```

#### 3.2.4 Pattern Detection Scores

| Pattern | Detection Method | Suspicious Score | Severity |
|---------|-----------------|------------------|----------|
| Straight Line | Bearing variance < 5° | +20 | MEDIUM |
| Teleportation | Distance > 10km in < 10s | +30 | HIGH |
| No Acceleration | Speed variance < 5 | +15 | MEDIUM |
| No GPS Drift | Accuracy variance < 1 | +10 | LOW |

#### 3.2.5 Data Requirements

- **Minimum History**: 3 location points required for analysis
- **Optimal History**: 20 location points for best accuracy
- **Time Window**: Analyzes last 20 check-ins
- **Data Points**: Latitude, Longitude, Timestamp, Accuracy

---

### 3.3 Analytics & Insights Engine

**Location**: `microservices/analytics-service/src/services/analytics.service.js`

#### 3.3.1 Purpose

The Analytics & Insights Engine provides AI-powered business intelligence, generating actionable insights from HR, attendance, and compliance data.

#### 3.3.2 AI Insights Generation

The system generates insights using **rule-based AI** combined with **statistical analysis**:

1. **Employee Distribution Analysis**
   - Analyzes department-wise employee distribution
   - Calculates average tenure
   - Generates hiring recommendations

2. **Attendance Pattern Analysis**
   - Calculates average daily attendance
   - Identifies attendance trends
   - Suggests attendance improvement strategies

3. **Compliance Monitoring**
   - Tracks document compliance percentage
   - Identifies low-compliance areas
   - Generates reminder recommendations

#### 3.3.3 Insight Types

##### Employee Distribution Insight

```javascript
{
  "type": "employee_distribution",
  "title": "Employee Distribution Analysis",
  "description": "Total active employees: 150",
  "recommendation": "Employee count is healthy",
  "priority": "medium"
}
```

**Logic**:
- If total employees < 50: "Consider hiring more employees for growth"
- If total employees >= 50: "Employee count is healthy"

##### Attendance Insight

```javascript
{
  "type": "attendance",
  "title": "Attendance Analysis",
  "description": "Average daily attendance: 8.5 employees",
  "recommendation": "Attendance levels are healthy",
  "priority": "high"
}
```

**Logic**:
- If avg attendance < 5: "Consider implementing attendance incentives"
- If avg attendance >= 5: "Attendance levels are healthy"

##### Compliance Insight

```javascript
{
  "type": "compliance",
  "title": "Compliance Alert",
  "description": "2 document types have compliance below 80%",
  "recommendation": "Send reminders for pending document signatures",
  "priority": "high"
}
```

**Logic**:
- If compliance < 80%: Generate alert with reminder recommendation
- Threshold: 80% compliance rate

#### 3.3.4 Data Aggregation Pipeline

The system uses MongoDB aggregation pipelines for efficient data processing:

```javascript
// Employee Statistics
User.aggregate([
  { $match: { is_active: true } },
  {
    $group: {
      _id: '$department',
      count: { $sum: 1 },
      avgTenure: { 
        $avg: { 
          $divide: [
            { $subtract: [new Date(), '$date_of_joining'] }, 
            365 * 24 * 60 * 60 * 1000
          ] 
        } 
      }
    }
  },
  { $sort: { count: -1 } }
])
```

#### 3.3.5 Performance Metrics

The system calculates various performance metrics:

- **Average Attendance Rate**: Percentage of employees present daily
- **Department Distribution**: Employee count per department
- **Compliance Percentage**: Document signing compliance rate
- **Tenure Analysis**: Average employee tenure by department

---

### 3.4 Batch Analytics Service

**Location**: `microservices/inventory-service/src/services/batchAnalytics.service.js`

#### 3.4.1 Purpose

The Batch Analytics Service tracks and analyzes inventory batch events to provide insights into batch lifecycle, expiry patterns, and FEFO (First Expiry First Out) compliance.

#### 3.4.2 Event Tracking

The service tracks the following events:

1. **Batch Received**: When new batches are added to inventory
2. **Batch Adjusted**: When batch quantities are modified
3. **Batch Depleted**: When batches are fully consumed
4. **Near Expiry Alert**: When batches approach expiry dates
5. **FEFO Compliance**: Tracks FEFO compliance violations
6. **Batch Expiry**: When batches expire

#### 3.4.3 Analytics Capabilities

- **Expiry Prediction**: Predicts which batches will expire soon
- **Loss Estimation**: Calculates estimated financial loss from expiries
- **FEFO Violation Detection**: Identifies non-compliant batch usage
- **Trend Analysis**: Analyzes batch lifecycle patterns

#### 3.4.4 FEFO Compliance Algorithm

```javascript
calculateViolations(batchSequence) {
  violations = 0
  for (i = 1; i < batchSequence.length; i++) {
    currentExpiry = batchSequence[i].expiry_date
    previousExpiry = batchSequence[i-1].expiry_date
    
    if (currentExpiry < previousExpiry) {
      violations++  // FEFO violation: later expiry used before earlier
    }
  }
  return violations
}
```

**Principle**: Batches should be used in order of expiry (earliest first). If a later-expiring batch is used before an earlier-expiring one, it's a violation.

---

## 4. Machine Learning Models

### 4.1 Model Types

#### 4.1.1 Rule-Based Models

**Used For**: 
- Signal fusion
- Decision making
- Threshold-based detection

**Advantages**:
- Explainable
- Fast inference
- No training required
- Deterministic results

**Example**: Anti-Fake GPS AI Engine uses rule-based scoring

#### 4.1.2 Statistical Models

**Used For**:
- Pattern detection
- Anomaly detection
- Trend analysis

**Techniques**:
- Variance analysis
- Mean calculation
- Distribution analysis
- Correlation analysis

**Example**: Movement Pattern Analyzer uses statistical variance

#### 4.1.3 Aggregation Models

**Used For**:
- Data summarization
- Trend calculation
- Metric computation

**Techniques**:
- MongoDB aggregation pipelines
- Time-series analysis
- Grouping and averaging

**Example**: Analytics Service uses aggregation for insights

### 4.2 Model Training (Future Enhancement)

While the current implementation uses rule-based and statistical approaches, the architecture supports future ML model integration:

**Potential Enhancements**:
- **Supervised Learning**: Train models on labeled fake GPS data
- **Unsupervised Learning**: Clustering for anomaly detection
- **Time Series Forecasting**: Predict attendance trends
- **Deep Learning**: Neural networks for complex pattern recognition

---

## 5. API Reference

### 5.1 Anti-Fake GPS AI Engine

#### Endpoint: Internal Service Call

**Method**: Internal (called by Security Service)

**Input**:
```javascript
{
  signals: {
    mockLocation: { suspiciousScore: 0, violations: [] },
    deviceSecurity: { suspiciousScore: 15, violations: [...] },
    speed: { suspiciousScore: 10, violations: [...] },
    network: { suspiciousScore: 5, violations: [] },
    satellite: { suspiciousScore: 0, violations: [] },
    appState: { suspiciousScore: 0, violations: [] },
    faceVerification: { suspiciousScore: 0, violations: [] },
    movementPattern: { suspiciousScore: 30, violations: [...] }
  }
}
```

**Output**:
```javascript
{
  suspiciousScore: 60,
  action: "FLAG",
  message: "Suspicious activity detected - Requires review",
  violations: [...],
  breakdown: {
    mockLocation: 0,
    deviceSecurity: 15,
    speed: 10,
    network: 5,
    satellite: 0,
    appState: 0,
    faceVerification: 0,
    movementPattern: 30
  }
}
```

### 5.2 Movement Pattern Analyzer

#### Method: `analyzeMovementPattern(employeeId, currentLocation)`

**Parameters**:
- `employeeId` (string): Employee identifier
- `currentLocation` (object): Current location data

**Returns**:
```javascript
{
  detected: true,
  suspiciousScore: 30,
  passed: true,
  violations: [
    {
      type: "AI_ANOMALY",
      severity: "HIGH",
      message: "Teleportation detected in movement pattern",
      details: {
        distance: 15.5,
        timeDiff: 5000
      }
    }
  ],
  patterns: {
    straightLine: { detected: false },
    teleportation: { detected: true, distance: 15.5 },
    acceleration: { detected: true, variance: 8.2 },
    gpsDrift: { detected: true, variance: 2.1 }
  }
}
```

### 5.3 Analytics Service

#### Endpoint: `GET /api/analytics/ai-insights`

**Authentication**: Required (JWT token)

**Authorization**: Admin, HR roles

**Response**:
```json
{
  "success": true,
  "data": {
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
        "description": "Average daily attendance: 8.5 employees",
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
    ],
    "generatedAt": "2025-12-11T18:00:00.000Z",
    "totalInsights": 3
  }
}
```

#### Endpoint: `GET /api/analytics/hr-analytics`

**Response**:
```json
{
  "success": true,
  "data": {
    "employeeStats": [
      {
        "_id": "Sales",
        "count": 45,
        "avgTenure": 2.5
      }
    ],
    "attendanceStats": [
      {
        "_id": "2025-12-11",
        "totalAttendance": 10,
        "presentCount": 8,
        "lateCount": 1,
        "absentCount": 1
      }
    ],
    "complianceStats": [
      {
        "_id": "AADHAR",
        "totalDocuments": 100,
        "signedDocuments": 95,
        "compliancePercentage": 95
      }
    ],
    "generatedAt": "2025-12-11T18:00:00.000Z",
    "source": "built-in"
  }
}
```

---

## 6. Implementation Details

### 6.1 Signal Weighting

The Anti-Fake GPS AI Engine uses equal weighting for all signals. Each signal can contribute up to its maximum suspicious score:

| Signal | Max Score | Typical Range |
|--------|-----------|---------------|
| Mock Location | 0-30 | 0-30 |
| Device Security | 0-20 | 0-20 |
| Speed | 0-15 | 0-15 |
| Network | 0-10 | 0-10 |
| Satellite | 0-10 | 0-10 |
| App State | 0-10 | 0-10 |
| Face Verification | 0-15 | 0-15 |
| Movement Pattern | 0-30 | 0-30 |
| **Total** | **0-150** | **Capped at 100** |

### 6.2 Decision Thresholds

```javascript
if (score > 85) {
  action = "BLOCK"  // High confidence: Fake GPS detected
} else if (score > 60) {
  action = "FLAG"   // Medium confidence: Suspicious, needs review
} else {
  action = "ALLOW"  // Low confidence: Location verified
}
```

### 6.3 Performance Optimization

1. **Caching**: Location history is cached for quick access
2. **Batch Processing**: Multiple signals processed in parallel
3. **Early Exit**: If critical signal fails, can block immediately
4. **Lazy Loading**: History loaded only when needed

### 6.4 Error Handling

The AI engine includes comprehensive error handling:

```javascript
try {
  // AI processing
} catch (error) {
  logger.error('Error in AI processing', { error: error.message });
  return {
    suspiciousScore: 0,
    action: 'ALLOW',  // Fail-safe: Allow on error
    message: 'Error in AI analysis',
    violations: [],
    error: error.message
  };
}
```

**Fail-Safe Principle**: On error, the system defaults to ALLOW to prevent false positives from blocking legitimate users.

---

## 7. Configuration

### 7.1 Environment Variables

```bash
# AI Engine Configuration
AI_SUSPICIOUS_THRESHOLD=60      # Score threshold for FLAG
AI_BLOCK_THRESHOLD=85           # Score threshold for BLOCK
AI_MOVEMENT_HISTORY_LIMIT=20    # Number of locations to analyze
AI_MIN_HISTORY_REQUIRED=3       # Minimum locations for analysis

# Analytics Configuration
ANALYTICS_ENABLED=true
ANALYTICS_RETENTION_DAYS=365    # Data retention period
ANALYTICS_BATCH_SIZE=1000       # Batch processing size

# Performance Configuration
AI_CACHE_TTL=300                # Cache TTL in seconds
AI_PARALLEL_PROCESSING=true     # Enable parallel signal processing
```

### 7.2 Tuning Parameters

#### Suspicious Score Thresholds

Adjust these based on your security requirements:

```javascript
// More strict (fewer false positives, more false negatives)
BLOCK_THRESHOLD = 75
FLAG_THRESHOLD = 50

// More lenient (more false positives, fewer false negatives)
BLOCK_THRESHOLD = 95
FLAG_THRESHOLD = 70
```

#### Movement Pattern Sensitivity

```javascript
// More sensitive (detects more anomalies)
STRAIGHT_LINE_VARIANCE_THRESHOLD = 10
TELEPORTATION_DISTANCE_THRESHOLD = 5  // km
TELEPORTATION_TIME_THRESHOLD = 5      // seconds

// Less sensitive (fewer false positives)
STRAIGHT_LINE_VARIANCE_THRESHOLD = 3
TELEPORTATION_DISTANCE_THRESHOLD = 20  // km
TELEPORTATION_TIME_THRESHOLD = 30      // seconds
```

---

## 8. Best Practices

### 8.1 Data Collection

1. **Collect Sufficient History**: Ensure at least 3-5 location points before analysis
2. **Maintain Data Quality**: Validate GPS accuracy and timestamp accuracy
3. **Regular Cleanup**: Archive old location history to maintain performance
4. **Privacy Compliance**: Follow GDPR/data protection regulations

### 8.2 Model Usage

1. **Start Conservative**: Begin with higher thresholds, then tune based on results
2. **Monitor False Positives**: Track legitimate users being blocked
3. **Review Flagged Cases**: Manually review FLAG cases to improve thresholds
4. **Continuous Improvement**: Update thresholds based on real-world performance

### 8.3 Performance

1. **Cache Aggressively**: Cache location history and analysis results
2. **Batch Processing**: Process multiple employees in batches
3. **Async Processing**: Use async/await for non-blocking operations
4. **Database Indexing**: Index location history by employee_id and timestamp

### 8.4 Security

1. **Encrypt Sensitive Data**: Encrypt location data at rest
2. **Audit Logging**: Log all AI decisions for audit trails
3. **Rate Limiting**: Prevent abuse of AI endpoints
4. **Access Control**: Restrict AI insights to authorized users only

---

## 9. Troubleshooting

### 9.1 Common Issues

#### Issue: High False Positive Rate

**Symptoms**: Legitimate users being blocked frequently

**Solutions**:
1. Increase BLOCK_THRESHOLD (e.g., from 85 to 90)
2. Review movement pattern sensitivity settings
3. Check if device security checks are too strict
4. Analyze flagged cases to identify patterns

#### Issue: High False Negative Rate

**Symptoms**: Fake GPS not being detected

**Solutions**:
1. Decrease BLOCK_THRESHOLD (e.g., from 85 to 75)
2. Increase movement pattern sensitivity
3. Enable additional security checks
4. Review signal weights (increase movement pattern weight)

#### Issue: Slow Performance

**Symptoms**: AI analysis taking too long

**Solutions**:
1. Reduce MOVEMENT_HISTORY_LIMIT (e.g., from 20 to 10)
2. Enable caching with appropriate TTL
3. Optimize database queries with indexes
4. Use parallel processing for signals

#### Issue: Insufficient Data

**Symptoms**: "Insufficient location history" errors

**Solutions**:
1. Reduce MIN_HISTORY_REQUIRED (e.g., from 3 to 2)
2. Allow check-ins with limited history (with higher scrutiny)
3. Collect more location data before analysis

### 9.2 Debugging

#### Enable Debug Logging

```javascript
// Set log level to debug
process.env.LOG_LEVEL = 'debug'
```

#### View Signal Breakdown

The AI engine returns a detailed breakdown:

```javascript
{
  breakdown: {
    mockLocation: 0,
    deviceSecurity: 15,
    speed: 10,
    network: 5,
    satellite: 0,
    appState: 0,
    faceVerification: 0,
    movementPattern: 30
  }
}
```

Use this to identify which signals are contributing most to the score.

#### Test Individual Signals

Test each signal independently to isolate issues:

```javascript
// Test only movement pattern
const signals = {
  movementPattern: await analyzeMovementPattern(employeeId, location),
  // Other signals set to 0
  mockLocation: { suspiciousScore: 0 },
  deviceSecurity: { suspiciousScore: 0 },
  // ...
}
```

---

## 10. Future Enhancements

### 10.1 Planned Features

1. **Machine Learning Models**: 
   - Supervised learning for fake GPS detection
   - Unsupervised learning for anomaly detection
   - Deep learning for complex pattern recognition

2. **Predictive Analytics**:
   - Attendance forecasting
   - Employee turnover prediction
   - Inventory expiry prediction

3. **Advanced Pattern Recognition**:
   - Behavioral biometrics
   - Typing pattern analysis
   - Device fingerprinting

4. **Real-time Learning**:
   - Online learning from new data
   - Adaptive thresholds
   - Continuous model improvement

### 10.2 Integration Opportunities

1. **External ML Services**: 
   - Azure Machine Learning
   - AWS SageMaker
   - Google Cloud AI Platform

2. **Advanced Analytics**:
   - Apache Spark for big data processing
   - TensorFlow.js for browser-based ML
   - PyTorch for deep learning

3. **Data Science Tools**:
   - Jupyter notebooks for analysis
   - Pandas for data manipulation
   - Scikit-learn for ML models

---

## 11. Glossary

- **AI (Artificial Intelligence)**: Computer systems that perform tasks requiring human intelligence
- **ML (Machine Learning)**: Subset of AI that learns from data
- **Signal Fusion**: Combining multiple signals into a single decision
- **Suspicious Score**: Numerical score (0-100) indicating likelihood of fake GPS
- **FEFO**: First Expiry First Out - inventory management principle
- **Haversine Formula**: Formula for calculating distance between two GPS coordinates
- **Bearing**: Direction from one point to another (0-360 degrees)
- **Variance**: Measure of data spread/dispersion
- **Teleportation**: Unnatural movement where location changes too quickly
- **GPS Drift**: Natural variation in GPS accuracy

---

## 12. Support & Contact

For technical support or questions about Etelios Brain AI/ML:

- **Documentation**: This document
- **Code Location**: `microservices/*/src/services/security/` and `microservices/analytics-service/`
- **Logs**: Check service logs for AI processing details
- **API Docs**: See individual service documentation

---

## Appendix A: Code Examples

### A.1 Using Anti-Fake GPS AI Engine

```javascript
const antiFakeGPSAI = require('./services/security/antiFakeGPSAI.service');

// Collect signals from various checks
const signals = {
  mockLocation: await checkMockLocation(locationData),
  deviceSecurity: await checkDeviceSecurity(deviceInfo),
  speed: await checkSpeed(locationData),
  network: await checkNetwork(networkInfo),
  satellite: await checkSatellite(satelliteInfo),
  appState: await checkAppState(appState),
  faceVerification: await verifyFace(faceData),
  movementPattern: await analyzeMovementPattern(employeeId, locationData)
};

// Get AI decision
const result = antiFakeGPSAI.calculateSuspiciousScore(signals);

if (result.action === 'BLOCK') {
  // Block check-in
} else if (result.action === 'FLAG') {
  // Flag for review
} else {
  // Allow check-in
}
```

### A.2 Using Analytics Insights

```javascript
const AnalyticsService = require('./services/analytics.service');

// Get AI insights
const insights = await AnalyticsService.getAIInsights();

insights.forEach(insight => {
  console.log(`${insight.title}: ${insight.description}`);
  console.log(`Recommendation: ${insight.recommendation}`);
  console.log(`Priority: ${insight.priority}`);
});
```

### A.3 Custom Signal Implementation

```javascript
// Example: Custom signal check
async function checkCustomSignal(data) {
  let suspiciousScore = 0;
  const violations = [];
  
  // Your custom logic here
  if (data.someCondition) {
    suspiciousScore += 20;
    violations.push({
      type: 'CUSTOM_VIOLATION',
      severity: 'MEDIUM',
      message: 'Custom violation detected'
    });
  }
  
  return {
    suspiciousScore,
    violations,
    passed: suspiciousScore < 30
  };
}
```

---

**Document Version**: 1.0  
**Last Updated**: December 2025  
**Maintained By**: Etelios Development Team

