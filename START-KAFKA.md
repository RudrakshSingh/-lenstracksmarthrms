# How to Start Kafka

## Prerequisites

**Docker Desktop must be running!**

### Step 1: Start Docker Desktop

1. Open Docker Desktop application
2. Wait for Docker to fully start (whale icon in menu bar should be steady)
3. Verify Docker is running:
   ```bash
   docker ps
   ```

### Step 2: Start Kafka Services

Once Docker is running, execute:

```bash
cd microservices
docker-compose up -d zookeeper kafka kafka-ui
```

### Step 3: Verify Kafka is Running

```bash
# Check service status
docker-compose ps | grep -E "kafka|zookeeper"

# Check logs
docker-compose logs kafka | tail -20

# Test connection
docker exec -it microservices-kafka-1 kafka-broker-api-versions --bootstrap-server localhost:9092
```

### Step 4: Access Kafka UI

Open in browser: **http://localhost:8080**

## Quick Commands

### Start Kafka
```bash
cd microservices
docker-compose up -d zookeeper kafka kafka-ui
```

### Stop Kafka
```bash
cd microservices
docker-compose stop zookeeper kafka kafka-ui
```

### View Logs
```bash
cd microservices
docker-compose logs -f kafka
```

### Restart Kafka
```bash
cd microservices
docker-compose restart zookeeper kafka
```

## Troubleshooting

### Docker Not Running
- **macOS**: Open Docker Desktop from Applications
- **Windows**: Open Docker Desktop from Start Menu
- **Linux**: Start Docker service: `sudo systemctl start docker`

### Port Already in Use
If ports 9092, 2181, or 8080 are in use:
```bash
# Find what's using the port
lsof -i :9092
lsof -i :2181
lsof -i :8080

# Kill the process or change ports in docker-compose.yml
```

### Kafka Won't Start
1. Check Zookeeper is running first
2. Check logs: `docker-compose logs zookeeper kafka`
3. Wait 30 seconds for Kafka to fully initialize
4. Try restarting: `docker-compose restart zookeeper kafka`

## Service URLs

- **Kafka Broker**: `localhost:9092` (external), `kafka:29092` (Docker network)
- **Zookeeper**: `localhost:2181`
- **Kafka UI**: http://localhost:8080

## Environment Variables

For your microservices, set:
```env
KAFKA_BROKERS=localhost:9092
```

## Next Steps

Once Kafka is running:
1. Configure your microservices with `KAFKA_BROKERS=localhost:9092`
2. Start publishing/consuming events
3. Monitor via Kafka UI at http://localhost:8080

See `KAFKA-IMPLEMENTATION-GUIDE.md` for integration examples.

