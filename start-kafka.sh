#!/bin/bash

# Script to start Kafka infrastructure

echo "=== Starting Kafka Infrastructure ==="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo ""
    echo "Please start Docker Desktop first:"
    echo "  1. Open Docker Desktop application"
    echo "  2. Wait for Docker to fully start"
    echo "  3. Run this script again"
    echo ""
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Navigate to microservices directory
cd "$(dirname "$0")/microservices" || exit 1

# Start Kafka services
echo "Starting Zookeeper, Kafka, and Kafka UI..."
docker-compose up -d zookeeper kafka kafka-ui

# Wait a moment for services to start
echo ""
echo "Waiting for services to initialize..."
sleep 5

# Check status
echo ""
echo "=== Service Status ==="
docker-compose ps | grep -E "kafka|zookeeper|kafka-ui" || echo "Services starting..."

# Check if Kafka is ready
echo ""
echo "Checking Kafka connection..."
if docker exec microservices-kafka-1 kafka-broker-api-versions --bootstrap-server localhost:9092 > /dev/null 2>&1; then
    echo "✅ Kafka is ready!"
else
    echo "⏳ Kafka is starting... (this may take 30 seconds)"
    echo "   Run 'docker-compose logs kafka' to check progress"
fi

echo ""
echo "=== Access Points ==="
echo "Kafka UI: http://localhost:8080"
echo "Kafka Broker: localhost:9092"
echo "Zookeeper: localhost:2181"
echo ""
echo "✅ Kafka infrastructure started!"
echo ""
echo "To view logs: docker-compose logs -f kafka"
echo "To stop: docker-compose stop zookeeper kafka kafka-ui"

