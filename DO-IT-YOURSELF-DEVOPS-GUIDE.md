# Do-It-Yourself DevOps Guide
## What You Can Do vs What Needs an Expert

---

## ✅ **YES, You Can Do These Yourself** (With Guidance)

### **1. Azure App Service Configuration** ⭐⭐⭐ (Medium Difficulty)

**What You Can Do:**
- Configure environment variables
- Set request timeout settings
- Enable "Always On"
- Configure auto-scaling rules
- View logs and diagnostics

**Time Required:** 2-4 hours  
**Risk Level:** Low (can revert changes)

**Step-by-Step:**

#### Fix 408 Timeout Issues:

1. **Access Azure Portal**
   - Go to https://portal.azure.com
   - Navigate to your App Service

2. **Set Request Timeout**
   ```
   Configuration → Application Settings → New application setting
   Name: WEBSITES_REQUEST_TIMEOUT
   Value: 300
   ```

3. **Enable Always On**
   ```
   Configuration → General settings → Always On → ON
   ```

4. **Check Health Check Path**
   ```
   Configuration → General settings → Health check path: /health
   ```

#### View Logs:
```
App Service → Log stream (real-time logs)
App Service → Logs → Application Logging → ON
```

---

### **2. Environment Variables & Configuration** ⭐⭐ (Easy)

**What You Can Do:**
- Add/update environment variables
- Configure connection strings
- Set up Kafka/Event Hub configuration
- Manage secrets in Azure Key Vault (basic)

**Time Required:** 1-2 hours  
**Risk Level:** Low

**Step-by-Step:**

1. **Add Kafka Configuration:**
   ```
   App Service → Configuration → Application settings
   
   Add these:
   KAFKA_BROKERS=etelios-eventhub.servicebus.windows.net:9093
   KAFKA_SECURITY_PROTOCOL=SASL_SSL
   KAFKA_SASL_MECHANISM=PLAIN
   KAFKA_SASL_USERNAME=$ConnectionString
   EVENTHUB_CONNECTION_STRING=<your-connection-string>
   EVENTHUB_NAME=etelios-events
   ```

2. **Save and Restart:**
   - Click "Save"
   - App Service will restart automatically

---

### **3. Database Connection Optimization (Code Level)** ⭐⭐⭐ (Medium)

**What You Can Do:**
- Update connection pool settings in code
- Add retry logic
- Configure timeouts in application code
- Add connection health checks

**Time Required:** 4-6 hours  
**Risk Level:** Medium (test thoroughly)

**Step-by-Step:**

Update `microservices/shared/config/database.js`:

```javascript
const connection = await mongoose.createConnection(uri, {
  dbName,
  maxPoolSize: 10,              // Increase from default
  minPoolSize: 2,               // Add minimum pool
  serverSelectionTimeoutMS: 30000,  // Increase to 30s
  socketTimeoutMS: 60000,       // Increase to 60s
  connectTimeoutMS: 30000,      // Add explicit connect timeout
  retryWrites: true,            // Enable retry writes
  retryReads: true,             // Enable retry reads
  heartbeatFrequencyMS: 10000,  // Health check frequency
  ...mongooseOptions
});
```

---

### **4. Basic Monitoring Setup** ⭐⭐ (Easy-Medium)

**What You Can Do:**
- Enable Application Insights
- View basic metrics
- Set up simple alerts
- View application logs

**Time Required:** 2-3 hours  
**Risk Level:** Low

**Step-by-Step:**

1. **Enable Application Insights:**
   ```
   App Service → Application Insights → Turn on Application Insights
   Select: Create new resource
   Click: Apply
   ```

2. **View Metrics:**
   ```
   App Service → Metrics
   - Response time
   - Requests per second
   - Failed requests
   - CPU/Memory usage
   ```

3. **View Logs:**
   ```
   App Service → Log stream (real-time)
   App Service → Logs → Download logs
   ```

---

### **5. Azure Event Hubs Setup (Basic)** ⭐⭐⭐ (Medium)

**What You Can Do:**
- Create Event Hub namespace
- Create Event Hub
- Get connection string
- Configure in App Service

**Time Required:** 1-2 hours  
**Risk Level:** Low

**Step-by-Step:**

1. **Create Event Hub Namespace:**
   ```
   Azure Portal → Create a resource → Event Hubs
   Namespace name: etelios-eventhub
   Location: Central India
   Pricing tier: Standard
   Enable Kafka: Yes
   ```

2. **Create Event Hub:**
   ```
   Event Hub namespace → Event Hubs → + Event Hub
   Name: etelios-events
   Partition count: 3
   Message retention: 1 day
   ```

3. **Get Connection String:**
   ```
   Event Hub namespace → Shared access policies → RootManageSharedAccessKey
   Copy: Primary connection string
   ```

4. **Configure in App Service:**
   ```
   App Service → Configuration → Application settings
   Add: EVENTHUB_CONNECTION_STRING = <connection-string>
   ```

---

### **6. View and Understand Logs** ⭐⭐ (Easy)

**What You Can Do:**
- View application logs
- View infrastructure logs
- Search logs
- Export logs

**Time Required:** 1 hour to learn  
**Risk Level:** None (read-only)

**Step-by-Step:**

1. **View Real-time Logs:**
   ```
   App Service → Log stream
   ```

2. **View Historical Logs:**
   ```
   App Service → Logs → Download logs
   ```

3. **Search Logs:**
   ```
   App Service → Logs → Log Analytics
   Use KQL queries to search
   ```

---

## ⚠️ **Maybe, With Learning** (Medium-High Difficulty)

### **7. Azure DevOps Pipeline Updates** ⭐⭐⭐⭐ (Hard)

**What You Can Do:**
- Update pipeline YAML files
- Add environment variables
- Modify build steps
- Add deployment steps

**Time Required:** 8-12 hours to learn  
**Risk Level:** Medium (can break deployments)

**Learning Resources:**
- Azure DevOps documentation
- YAML pipeline syntax
- Test in dev environment first

**Recommendation:** Start with small changes, test thoroughly

---

### **8. Basic Kubernetes Operations** ⭐⭐⭐⭐ (Hard)

**What You Can Do:**
- View pods and services
- Check logs
- Restart deployments
- Update environment variables

**Time Required:** 10-15 hours to learn  
**Risk Level:** Medium-High

**Basic Commands:**
```bash
# View pods
kubectl get pods

# View logs
kubectl logs <pod-name>

# Restart deployment
kubectl rollout restart deployment/<deployment-name>

# Update environment variable
kubectl set env deployment/<deployment-name> KEY=value
```

**Recommendation:** Learn basics, but get help for complex operations

---

## ❌ **NO, Get Expert Help** (High Risk)

### **1. Azure Load Balancer/Application Gateway Configuration** ⚠️

**Why You Need Help:**
- Complex networking concepts
- Can break entire infrastructure
- Requires deep Azure networking knowledge
- One wrong setting can take down services

**What Expert Does:**
- Configure backend timeouts
- Set up health probes
- Configure routing rules
- Optimize performance

**Risk if You Do It:** 🔴 HIGH - Can cause service outages

---

### **2. Infrastructure-Level Database Optimization** ⚠️

**Why You Need Help:**
- Requires database administration expertise
- Network-level optimizations
- Connection pool sizing at infrastructure level
- Performance tuning requires experience

**What Expert Does:**
- Optimize MongoDB connection settings
- Configure network-level timeouts
- Set up connection pooling at infrastructure level
- Performance tuning

**Risk if You Do It:** 🟡 MEDIUM-HIGH - Can cause performance issues

---

### **3. Security Hardening** ⚠️

**Why You Need Help:**
- Security misconfigurations can expose data
- Requires security expertise
- Compliance requirements
- Risk of data breaches

**What Expert Does:**
- Configure network security groups
- Set up managed identities
- Implement secrets rotation
- Security audits

**Risk if You Do It:** 🔴 HIGH - Security vulnerabilities

---

### **4. Disaster Recovery Setup** ⚠️

**Why You Need Help:**
- Complex backup strategies
- Failover procedures
- Data consistency
- Recovery time objectives

**What Expert Does:**
- Design backup strategy
- Create failover procedures
- Test recovery procedures
- Document runbooks

**Risk if You Do It:** 🔴 HIGH - Data loss risk

---

### **5. Cost Optimization** ⚠️

**Why You Need Help:**
- Requires deep Azure knowledge
- Resource sizing expertise
- Can waste money if done wrong
- Need to balance cost vs performance

**What Expert Does:**
- Analyze usage patterns
- Right-size resources
- Implement cost-saving measures
- Monitor and optimize

**Risk if You Do It:** 🟡 MEDIUM - Can waste money

---

## 📋 **Recommended Approach: Hybrid**

### **Phase 1: Do It Yourself (Week 1-2)**

1. ✅ Configure Azure App Service settings
2. ✅ Add environment variables
3. ✅ Enable Application Insights
4. ✅ Set up basic monitoring
5. ✅ Configure Event Hubs (basic)
6. ✅ Update database connection settings in code

**Time:** 10-15 hours  
**Cost:** $0 (your time)

---

### **Phase 2: Learn Basics (Week 3-4)**

1. 📚 Learn Azure DevOps basics
2. 📚 Learn basic kubectl commands
3. 📚 Understand Azure networking basics
4. 📚 Learn to read and interpret logs

**Time:** 20-30 hours  
**Cost:** $0 (your time)

---

### **Phase 3: Get Expert Help (Week 5+)**

1. 🔧 Hire DevOps consultant for:
   - Load Balancer configuration
   - Infrastructure optimization
   - Security hardening
   - Advanced monitoring setup

**Time:** 20-40 hours (consultant)  
**Cost:** ₹50,000 - ₹1,00,000 (one-time)

---

## 🎯 **Quick Wins You Can Do Today**

### **1. Fix 408 Timeout (30 minutes)**

```bash
# Azure Portal → App Service → Configuration
Add: WEBSITES_REQUEST_TIMEOUT = 300
Save and restart
```

### **2. Enable Always On (5 minutes)**

```bash
# Azure Portal → App Service → Configuration → General settings
Always On: ON
Save
```

### **3. Add Kafka Configuration (15 minutes)**

```bash
# Azure Portal → App Service → Configuration → Application settings
Add all Kafka environment variables
Save and restart
```

### **4. Enable Application Insights (10 minutes)**

```bash
# Azure Portal → App Service → Application Insights
Turn on Application Insights
Create new resource
Apply
```

**Total Time:** ~1 hour  
**Impact:** High (fixes immediate issues)

---

## 📚 **Learning Resources**

### **Free Resources:**

1. **Microsoft Learn**
   - Azure App Service: https://learn.microsoft.com/azure/app-service
   - Azure DevOps: https://learn.microsoft.com/azure/devops
   - Azure Kubernetes: https://learn.microsoft.com/azure/aks

2. **YouTube Channels:**
   - Microsoft Azure
   - John Savill's Technical Training
   - Azure DevOps

3. **Documentation:**
   - Azure App Service docs
   - Azure DevOps docs
   - Kubernetes docs

### **Paid Resources:**

1. **Udemy Courses:**
   - Azure DevOps Bootcamp
   - Kubernetes for Beginners
   - Azure Administrator

2. **Pluralsight:**
   - Azure DevOps paths
   - Kubernetes paths

---

## ⚡ **Time vs Cost Analysis**

### **Option 1: Do Everything Yourself**
- **Time:** 100-150 hours (2-3 months part-time)
- **Cost:** $0 (your time)
- **Risk:** Medium-High
- **Quality:** Variable

### **Option 2: Hybrid (Recommended)**
- **Your Time:** 30-40 hours (basics)
- **Consultant Time:** 20-40 hours (expert tasks)
- **Cost:** ₹50,000 - ₹1,00,000
- **Risk:** Low
- **Quality:** High

### **Option 3: Full DevOps Hire**
- **Time:** Immediate start
- **Cost:** ₹10-30 LPA (annual)
- **Risk:** Low
- **Quality:** High

---

## ✅ **Final Recommendation**

### **Start Here (This Week):**

1. ✅ Do the "Quick Wins" above (1 hour)
2. ✅ Learn Azure Portal basics (2-3 hours)
3. ✅ Set up Application Insights (30 minutes)
4. ✅ Configure environment variables (1 hour)

**Total:** 4-5 hours this week

### **Next Week:**

1. 📚 Learn basic Azure concepts (5-10 hours)
2. ✅ Update database connection settings (2-3 hours)
3. ✅ Set up Event Hubs (1-2 hours)

**Total:** 8-15 hours next week

### **Then Decide:**

- **If comfortable:** Continue learning, do more yourself
- **If stuck:** Hire consultant for specific tasks
- **If overwhelmed:** Hire full-time DevOps engineer

---

## 🎓 **Skills You'll Gain**

Even if you eventually hire DevOps, learning basics helps you:
- ✅ Communicate better with DevOps team
- ✅ Understand infrastructure decisions
- ✅ Troubleshoot basic issues
- ✅ Make informed decisions
- ✅ Reduce dependency on others

---

## 💡 **Pro Tips**

1. **Start Small:** Don't try to do everything at once
2. **Test First:** Always test in dev/staging before production
3. **Document:** Write down what you do
4. **Backup:** Take snapshots before major changes
5. **Ask for Help:** Don't hesitate to get expert help when stuck
6. **Use Azure Portal:** GUI is easier than CLI for beginners
7. **Read Logs:** Logs tell you what's wrong
8. **One Change at a Time:** Easier to troubleshoot

---

## 🚨 **When to Stop and Get Help**

Stop immediately and get expert help if:
- ❌ Services go down
- ❌ You're not sure what a setting does
- ❌ Changes affect multiple services
- ❌ Security-related changes
- ❌ Network/firewall changes
- ❌ You're stuck for more than 2 hours

---

**Remember:** It's okay to learn and do some things yourself, but don't be afraid to get expert help for critical infrastructure tasks. A hybrid approach is often best!

