# 🧠 Etelios Brain - Complete Dataflow Model & Architecture
## **AI/ML Architecture & Data Processing Pipeline**

**Date**: January 2025  
**Version**: 1.0  
**Purpose**: Comprehensive documentation of Etelios Brain's dataflow, AI architecture, and ML pipelines

---

## 📋 Executive Summary

**Etelios Brain** is the AI/ML intelligence layer of Etelios ERP that powers predictive analytics, intelligent recommendations, automated decision-making, and natural language interactions across all business modules. It processes data from 18 microservices, generates insights, and provides AI-powered features including demand forecasting, lead scoring, fraud detection, document OCR, and conversational AI.

---

## 🏗️ Architecture Overview

### **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                        ETELIOS BRAIN                             │
│                    AI/ML Intelligence Layer                       │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │  Data   │          │   AI    │          │ Insights │
   │Ingestion│          │Gateway  │          │ Engine   │
   └────┬────┘          └────┬────┘          └────┬────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │Processing│          │  Model  │          │ Storage │
   │Pipeline  │          │Registry │          │  Layer  │
   └──────────┘          └─────────┘          └─────────┘
```

### **Core Components**

1. **Data Ingestion Layer**: Collects data from all microservices
2. **AI Gateway**: Central entry point for all AI requests
3. **Processing Pipeline**: ETL, feature engineering, data transformation
4. **Model Registry**: ML model storage and versioning
5. **Inference Engine**: Real-time and batch predictions
6. **Insights Engine**: Generates business insights and recommendations
7. **Storage Layer**: Data lakes, vector databases, metadata stores

---

## 📊 Data Sources & Collection

### **1. Microservice Data Sources**

#### **HR Service**
- **Data Types**: Employee records, attendance, leave, performance
- **Volume**: ~1,000-10,000 records/day
- **Update Frequency**: Real-time
- **Key Metrics**: Attendance rate, leave patterns, performance scores

#### **Sales Service**
- **Data Types**: Orders, quotes, opportunities, customer interactions
- **Volume**: ~500-5,000 transactions/day
- **Update Frequency**: Real-time
- **Key Metrics**: Sales velocity, conversion rates, average order value

#### **Inventory Service**
- **Data Types**: Stock levels, movements, batches, expiry dates
- **Volume**: ~2,000-20,000 movements/day
- **Update Frequency**: Real-time
- **Key Metrics**: Stock levels, turnover rate, ageing analysis

#### **CRM Service**
- **Data Types**: Leads, contacts, interactions, campaigns
- **Volume**: ~1,000-10,000 interactions/day
- **Update Frequency**: Real-time
- **Key Metrics**: Lead scores, engagement rates, conversion funnels

#### **Financial Service**
- **Data Types**: Invoices, payments, expenses, budgets
- **Volume**: ~500-5,000 transactions/day
- **Update Frequency**: Real-time
- **Key Metrics**: Cash flow, revenue, expenses, profitability

#### **Analytics Service**
- **Data Types**: Aggregated metrics, KPIs, reports
- **Volume**: ~100-1,000 aggregations/day
- **Update Frequency**: Hourly/daily
- **Key Metrics**: Business KPIs, trends, anomalies

### **2. External Data Sources**

- **Email Communications**: Sentiment, engagement, response times
- **SMS/WhatsApp**: Message delivery, response rates
- **Document Uploads**: Invoices, receipts, contracts (OCR processing)
- **Payment Gateways**: Transaction patterns, fraud signals
- **Third-Party APIs**: Market data, competitor pricing, trends

---

## 🔄 Data Flow Architecture

### **Level 1: Data Ingestion Flow**

```
┌──────────────┐
│ Microservice │
│   (18 APIs)  │
└──────┬───────┘
       │
       │ Event/API Call
       │
┌──────▼──────────────────────────────────────┐
│         Data Ingestion Layer                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Event   │  │   API    │  │  Batch   │  │
│  │ Collector│  │ Collector│  │ Collector│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
└───────┼─────────────┼─────────────┼────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
              ┌───────▼───────┐
              │  Message Queue │
              │   (BullMQ/     │
              │  Azure Service │
              │     Bus)       │
              └───────┬───────┘
                      │
              ┌───────▼───────┐
              │  Data Validation│
              │  & Normalization│
              └───────┬───────┘
                      │
              ┌───────▼───────┐
              │  Azure Blob    │
              │  Storage      │
              │  (Raw Data)   │
              └───────────────┘
```

### **Level 2: Data Processing Pipeline**

```
┌─────────────────────────────────────────────────────────┐
│              Data Processing Pipeline                    │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│   Extract    │ │Transform   │ │   Load     │
│              │ │            │ │            │
│ - Raw Data   │ │ - Clean    │ │ - Cosmos DB│
│ - Events     │ │ - Enrich   │ │ - AI Search│
│ - Files      │ │ - Feature  │ │ - Redis   │
│              │ │   Engineer │ │            │
└───────┬──────┘ └─────┬──────┘ └─────┬──────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
              ┌────────▼────────┐
              │  Feature Store  │
              │  (Processed     │
              │   Features)     │
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│  Real-Time   │ │   Batch    │ │  Stream    │
│  Processing  │ │ Processing │ │ Processing │
└──────────────┘ └────────────┘ └────────────┘
```

### **Level 3: AI/ML Processing Flow**

```
┌─────────────────────────────────────────────────────────┐
│                  AI/ML Processing Layer                  │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│   Training   │ │  Inference │ │  Embedding │
│   Pipeline   │ │   Engine   │ │  Generation│
│              │ │            │ │            │
│ - Data Prep  │ │ - Real-time│ │ - Text     │
│ - Model Train│ │ - Batch    │ │ - Image    │
│ - Evaluation │ │ - Streaming│ │ - Document │
│ - Registry   │ │            │ │            │
└───────┬──────┘ └─────┬──────┘ └─────┬──────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
              ┌────────▼────────┐
              │  Model Registry  │
              │  (Azure ML)      │
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│  Predictions │ │  Insights  │ │  Actions   │
│              │ │            │ │            │
│ - Forecasts  │ │ - Anomalies│ │ - Alerts   │
│ - Scores     │ │ - Trends   │ │ - Auto-    │
│ - Classify   │ │ - Patterns │ │   Actions  │
└──────────────┘ └────────────┘ └────────────┘
```

---

## 🧠 AI Capabilities & Data Flow

### **1. Predictive Analytics**

#### **Inventory Demand Forecasting**

**Data Flow**:
```
Sales History → Feature Engineering → Time Series Model → Forecast
     │                │                      │              │
     │                │                      │              │
┌────▼────┐      ┌────▼────┐          ┌─────▼─────┐   ┌────▼────┐
│Historical│     │Features │          │  Prophet/ │   │Forecast │
│  Sales  │─────▶│  (Lags, │─────────▶│  ARIMA/   │──▶│  (Next  │
│  Data   │     │Seasonal)│          │  LSTM     │   │  30/90  │
└─────────┘     └─────────┘          └───────────┘   │  days)  │
                                                      └────┬────┘
                                                           │
                                                    ┌──────▼──────┐
                                                    │ Reorder     │
                                                    │Recommendation│
                                                    └─────────────┘
```

**Processing Steps**:
1. **Data Collection**: Historical sales (last 2 years)
2. **Feature Engineering**: 
   - Lag features (7, 14, 30, 90 days)
   - Seasonal patterns (weekly, monthly, yearly)
   - External factors (holidays, promotions)
3. **Model Training**: Prophet/ARIMA for time series
4. **Forecast Generation**: Next 30/90 days demand
5. **Recommendation**: Auto-generate purchase orders

#### **Sales Revenue Forecasting**

**Data Flow**:
```
Sales Pipeline → Opportunity Data → ML Model → Revenue Forecast
     │                │                │            │
┌────▼────┐      ┌────▼────┐      ┌────▼────┐  ┌────▼────┐
│Pipeline │      │Features │      │ Gradient│  │Forecast │
│  Data   │─────▶│(Stage,  │─────▶│ Boosting│──▶│(Next Q, │
│         │      │Amount,  │      │  Model  │  │  Year)  │
│         │      │History) │      │         │  │         │
└─────────┘      └─────────┘      └─────────┘  └─────────┘
```

### **2. Lead Scoring & CRM Intelligence**

#### **Lead Scoring Pipeline**

**Data Flow**:
```
Lead Data → Feature Extraction → Scoring Model → Lead Score
    │              │                  │              │
┌───▼───┐    ┌─────▼─────┐      ┌────▼────┐   ┌────▼────┐
│  Lead │    │  Features │      │  ML     │   │  Score  │
│  Info │───▶│  - Source │─────▶│  Model  │──▶│  (0-100)│
│  -    │    │  - Behavior│      │  (XGBoost│   │         │
│  Email│    │  - Demographics│  │  /      │   │         │
│  Phone│    │  - Engagement │  │  Random │   │         │
│  Name │    │  - History    │  │  Forest)│   │         │
└───────┘    └──────────────┘  └─────────┘   └────┬────┘
                                                   │
                                            ┌──────▼──────┐
                                            │  Priority   │
                                            │  Assignment │
                                            └─────────────┘
```

**Features Used**:
- Lead source quality
- Email engagement (opens, clicks)
- Website behavior (pages visited, time spent)
- Demographic fit (company size, industry)
- Historical conversion rates by source
- Response time
- Interaction frequency

### **3. Document Intelligence (OCR & Extraction)**

#### **Document Processing Pipeline**

**Data Flow**:
```
Document Upload → OCR Processing → Entity Extraction → Structured Data
      │                │                  │                  │
┌─────▼─────┐    ┌─────▼─────┐      ┌─────▼─────┐      ┌────▼────┐
│  Invoice  │    │  Azure    │      │  Form     │      │  JSON   │
│  Receipt  │───▶│  Document │─────▶│Recognizer │─────▶│  Data   │
│  Contract │    │Intelligence│     │  / NER    │      │         │
│           │    │            │     │           │      │         │
└───────────┘    └────────────┘     └───────────┘      └────┬────┘
                                                              │
                                                       ┌──────▼──────┐
                                                       │  Database   │
                                                       │  Storage    │
                                                       └─────────────┘
```

**Processing Steps**:
1. **Upload**: Document uploaded to Azure Blob Storage
2. **OCR**: Azure Document Intelligence extracts text
3. **Entity Extraction**: Named Entity Recognition (NER) extracts:
   - Invoice numbers, dates, amounts
   - Vendor names, addresses
   - Line items, quantities, prices
   - Tax information
4. **Validation**: Cross-check with existing records
5. **Storage**: Store structured data in Cosmos DB

### **4. RAG (Retrieval-Augmented Generation)**

#### **RAG Pipeline for Conversational AI**

**Data Flow**:
```
User Query → Embedding → Vector Search → Context Retrieval → LLM → Response
     │          │            │                │              │        │
┌────▼────┐ ┌───▼────┐  ┌───▼────┐      ┌────▼────┐   ┌────▼────┐ ┌──▼──┐
│  "What  │ │Text    │  │ Azure  │      │ Relevant│   │  GPT-4o │ │Answer│
│  is my  │ │Embedding│ │ AI     │─────▶│ Docs    │──▶│  with   │ │      │
│  sales  │ │(Vector)│ │ Search  │      │ Context │   │ Context │ │      │
│  today?"│ │        │  │        │      │         │   │         │ │      │
└─────────┘ └────────┘  └────────┘      └─────────┘   └─────────┘ └──────┘
```

**Processing Steps**:
1. **Query Processing**: User question converted to embedding
2. **Vector Search**: Search Azure AI Search for relevant documents
3. **Context Retrieval**: Top-K most relevant documents retrieved
4. **Prompt Construction**: Build prompt with context + query
5. **LLM Inference**: GPT-4o generates answer with citations
6. **Response**: Return answer with source references

### **5. Anomaly Detection**

#### **Fraud & Anomaly Detection Pipeline**

**Data Flow**:
```
Transaction → Feature Extraction → Anomaly Model → Alert/Block
     │                │                  │              │
┌────▼────┐      ┌────▼────┐      ┌─────▼─────┐  ┌────▼────┐
│Payment  │      │Features │      │ Isolation │  │  Action │
│Login    │─────▶│- Amount │─────▶│  Forest/  │──▶│  - Alert│
│Order    │      │- Time   │      │  Auto-    │  │  - Block│
│         │      │- Location│     │  Encoder  │  │  - Flag │
│         │      │- Pattern│      │           │  │         │
└─────────┘      └─────────┘      └───────────┘  └─────────┘
```

**Anomaly Types Detected**:
- Unusual payment patterns
- Suspicious login attempts
- Inventory discrepancies
- Unusual sales patterns
- Cash flow anomalies

---

## 🔄 Real-Time vs Batch Processing

### **Real-Time Processing**

**Use Cases**:
- Lead scoring (immediate)
- Fraud detection (transaction time)
- Inventory alerts (stock changes)
- Customer recommendations (session-based)
- Chat responses (conversational AI)

**Architecture**:
```
Event → Message Queue → Stream Processor → Model Inference → Action
  │          │                │                  │              │
┌─▼──┐   ┌───▼───┐       ┌────▼────┐      ┌─────▼─────┐  ┌────▼────┐
│User│   │ Azure │       │ Stream  │      │  Real-time│  │Response │
│Action│  │Service│─────▶│Processor│─────▶│  Model    │──▶│/Alert   │
│     │   │  Bus  │       │(Kafka)  │      │ Inference │  │         │
└─────┘   └───────┘       └─────────┘      └───────────┘  └─────────┘
```

**Latency Requirements**: < 500ms for user-facing features

### **Batch Processing**

**Use Cases**:
- Demand forecasting (daily)
- Sales forecasting (weekly)
- Inventory optimization (daily)
- Report generation (hourly/daily)
- Model retraining (weekly/monthly)

**Architecture**:
```
Scheduled Job → Data Collection → Batch Processing → Model Inference → Storage
     │              │                  │                  │              │
┌────▼────┐    ┌────▼────┐       ┌─────▼─────┐     ┌─────▼─────┐  ┌───▼────┐
│ Cron    │    │Historical│      │  Spark/   │     │  Batch    │  │Results │
│ Job     │───▶│  Data    │─────▶│  Azure    │────▶│  Model    │──▶│Storage │
│(Daily)  │    │          │      │  Databricks│     │ Inference │  │        │
└─────────┘    └──────────┘      └───────────┘     └───────────┘  └────────┘
```

**Processing Schedule**:
- **Hourly**: Real-time metrics, alerts
- **Daily**: Forecasts, reports, recommendations
- **Weekly**: Model retraining, trend analysis
- **Monthly**: Long-term forecasts, strategic insights

---

## 💾 Data Storage Architecture

### **Storage Layers**

```
┌─────────────────────────────────────────────────────────┐
│                    Storage Architecture                   │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│  Raw Data   │ │ Processed  │ │  Features  │
│             │ │   Data     │ │            │
│ - Azure Blob│ │ - Cosmos DB│ │ - Feature  │
│   Storage   │ │ - MongoDB  │ │   Store    │
│             │ │            │ │            │
└─────────────┘ └────────────┘ └────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│  Vectors     │ │  Metadata  │ │  Models    │
│              │ │            │ │            │
│ - AI Search  │ │ - Cosmos DB│ │ - Azure ML │
│ - Embeddings │ │ - Prompts  │ │ - Registry │
│              │ │ - Runs     │ │            │
└─────────────┘ └────────────┘ └────────────┘
```

### **Data Retention**

- **Raw Data**: 90 days (Azure Blob Storage)
- **Processed Data**: 2 years (Cosmos DB)
- **Features**: 1 year (Feature Store)
- **Models**: Indefinite (Model Registry)
- **Predictions**: 90 days (Redis/Cosmos DB)
- **Logs**: 30 days (Application Insights)

---

## 🔍 Feature Engineering Pipeline

### **Feature Categories**

#### **Temporal Features**
- Time-based: Hour, day, week, month, quarter
- Lag features: Previous 7, 14, 30, 90 days
- Rolling statistics: Moving averages, standard deviations
- Seasonal patterns: Day of week, month of year

#### **Categorical Features**
- One-hot encoding: Categories, statuses, types
- Target encoding: Mean target by category
- Frequency encoding: Count of occurrences

#### **Numerical Features**
- Normalization: Min-max, z-score
- Binning: Age groups, price ranges
- Aggregations: Sum, mean, max, min

#### **Interaction Features**
- Product of features: Price × Quantity
- Ratio features: Revenue / Cost
- Polynomial features: Squared, cubed

### **Feature Store**

**Purpose**: Centralized storage for processed features

**Components**:
- **Feature Definitions**: Schema, transformations
- **Feature Values**: Computed features
- **Feature Metadata**: Version, lineage, statistics
- **Feature Serving**: Real-time and batch access

---

## 🤖 Model Training & Management

### **Model Training Pipeline**

```
┌─────────────────────────────────────────────────────────┐
│              Model Training Pipeline                      │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│  Data Prep  │ │  Training  │ │ Evaluation │
│             │ │            │ │            │
│ - Split     │ │ - Hyperparam│ │ - Metrics  │
│ - Validate  │ │   Tuning   │ │ - Cross-val│
│ - Transform │ │ - Training │ │ - Testing  │
└───────┬─────┘ └─────┬──────┘ └─────┬──────┘
        │             │              │
        └─────────────┼──────────────┘
                      │
              ┌───────▼───────┐
              │  Model Registry│
              │  (Azure ML)   │
              └───────┬───────┘
                      │
              ┌───────▼───────┐
              │  Model Version│
              │  & Metadata   │
              └───────────────┘
```

### **Model Types**

#### **Time Series Models**
- **Prophet**: Facebook's time series forecasting
- **ARIMA**: AutoRegressive Integrated Moving Average
- **LSTM**: Long Short-Term Memory networks

#### **Classification Models**
- **XGBoost**: Gradient boosting for lead scoring
- **Random Forest**: Ensemble for fraud detection
- **Logistic Regression**: Baseline models

#### **Clustering Models**
- **K-Means**: Customer segmentation
- **DBSCAN**: Anomaly detection

#### **NLP Models**
- **GPT-4o**: Generative AI, chat
- **text-embedding-3-large**: Vector embeddings
- **NER Models**: Named entity recognition

### **Model Versioning**

- **Version Control**: Semantic versioning (v1.0.0)
- **Metadata**: Training date, metrics, features used
- **A/B Testing**: Compare model versions
- **Rollback**: Revert to previous version if needed

---

## 📈 Insights Generation

### **Insight Types**

#### **Predictive Insights**
- Sales forecasts (next 30/90 days)
- Demand predictions (inventory)
- Cash flow forecasts (90 days)
- Churn predictions (customers)

#### **Prescriptive Insights**
- Reorder recommendations
- Pricing suggestions
- Marketing campaign recommendations
- Staffing recommendations

#### **Descriptive Insights**
- Trend analysis
- Performance comparisons
- Anomaly explanations
- Pattern recognition

### **Insight Generation Flow**

```
Data Aggregation → Pattern Detection → Insight Generation → Recommendation
      │                  │                    │                    │
┌─────▼─────┐      ┌─────▼─────┐      ┌─────▼─────┐      ┌──────▼──────┐
│Historical │      │  ML/AI    │      │  Business │      │  Actionable │
│  Data     │─────▶│  Analysis │─────▶│  Logic    │─────▶│  Insights   │
│           │      │           │      │           │      │             │
└───────────┘      └───────────┘      └───────────┘      └─────────────┘
```

---

## 🔐 Security & Privacy

### **Data Privacy**

- **PII Redaction**: Automatic PII detection and masking
- **Tenant Isolation**: Complete data separation
- **Encryption**: At-rest and in-transit encryption
- **Access Control**: RBAC for AI features

### **Model Security**

- **Private Endpoints**: All AI services via private links
- **API Key Management**: Azure Key Vault
- **Rate Limiting**: Per-tenant limits
- **Audit Logging**: All AI requests logged

---

## 📊 Monitoring & Observability

### **Metrics Tracked**

- **Latency**: P50, P95, P99 response times
- **Throughput**: Requests per second
- **Error Rate**: 4xx, 5xx errors
- **Cost**: Token usage, API calls
- **Model Performance**: Accuracy, precision, recall

### **Dashboards**

- **Real-Time Metrics**: Live system health
- **Cost Tracking**: AI service costs by tenant
- **Model Performance**: Accuracy trends
- **Usage Analytics**: Feature adoption

---

## 🚀 Deployment Architecture

### **Azure Services Used**

```
┌─────────────────────────────────────────────────────────┐
│                  Azure AI Services                       │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│ Azure OpenAI │ │ Azure AI   │ │ Azure      │
│              │ │ Search     │ │ Cognitive  │
│ - GPT-4o     │ │            │ │ Services   │
│ - Embeddings │ │ - Vector   │ │            │
│              │ │   Search   │ │ - Vision   │
└──────────────┘ └────────────┘ │ - Language │
                                │ - Speech   │
                                └────────────┘
```

### **Infrastructure**

- **Compute**: Azure App Service, Container Apps, AKS
- **Storage**: Azure Blob Storage, Cosmos DB
- **Cache**: Azure Cache for Redis
- **Queue**: Azure Service Bus
- **ML**: Azure Machine Learning
- **Monitoring**: Application Insights, Log Analytics

---

## 📝 Summary

### **Key Components**

1. **Data Ingestion**: 18 microservices → Event collectors → Message queues
2. **Processing**: ETL pipelines → Feature engineering → Feature store
3. **AI/ML**: Model training → Model registry → Inference engine
4. **Insights**: Pattern detection → Business logic → Recommendations
5. **Storage**: Raw data → Processed data → Features → Models

### **Data Flow Summary**

```
Raw Data → Processing → Features → Models → Predictions → Insights → Actions
```

### **Processing Modes**

- **Real-Time**: < 500ms latency for user-facing features
- **Batch**: Scheduled processing for forecasts and reports
- **Streaming**: Continuous processing for high-volume events

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Status**: Production Architecture


