# Kafka Startup Guide

## Quick Start

### Start Kafka Infrastructure

```bash
cd microservices
docker-compose up -d zookeeper kafka kafka-ui
```

### Check Status

```bash
# Check if services are running
docker-compose ps | grep -E "kafka|zookeeper"

# Or use docker ps
docker ps --filter "name=kafka" --filter "name=zookeeper"
```

### Access Kafka UI

Once running, access Kafka UI at:
- **URL**: http://localhost:8080
- **Features**: View topics, messages, consumer groups, broker metrics

### Verify Kafka is Working

```bash
# Test Kafka connection
docker exec -it microservices-kafka-1 kafka-broker-api-versions --bootstrap-server localhost:9092

# List topics (will be empty initially)
docker exec -it microservices-kafka-1 kafka-topics --bootstrap-server localhost:9092 --list
```

## Service Ports

- **Zookeeper**: 2181
- **Kafka Broker**: 9092 (external), 29092 (internal Docker network)
- **Kafka UI**: 8080

## Environment Configuration

For local development, use:
```env
KAFKA_BROKERS=localhost:9092
```

For Docker Compose (services talking to each other):
```env
KAFKA_BROKERS=kafka:29092
```

## Troubleshooting

### Services Won't Start

1. **Check if ports are in use**:
   ```bash
   lsof -i :9092
   lsof -i :2181
   lsof -i :8080
   ```

2. **Check Docker logs**:
   ```bash
   docker-compose logs zookeeper
   docker-compose logs kafka
   ```

3. **Restart services**:
   ```bash
   docker-compose restart zookeeper kafka
   ```

### Kafka Not Responding

1. **Wait for startup** (Kafka takes 10-30 seconds to fully start)
2. **Check health**:
   ```bash
   docker exec microservices-kafka-1 kafka-broker-api-versions --bootstrap-server localhost:9092
   ```

### Connection Issues

- Make sure Zookeeper starts before Kafka
- Check network connectivity: `docker network ls`
- Verify service names match in docker-compose.yml

## Stop Kafka

```bash
docker-compose stop zookeeper kafka kafka-ui
```

## Remove Kafka (Clean Slate)

```bash
docker-compose down -v zookeeper kafka kafka-ui
```

This will remove containers and volumes (deletes all Kafka data).

## Production Notes

For production on Azure, use **Azure Event Hubs** instead:
- Kafka-compatible API
- Managed service
- Built-in security and scaling
- No infrastructure management

See `KAFKA-IMPLEMENTATION-GUIDE.md` for Azure Event Hubs setup.

