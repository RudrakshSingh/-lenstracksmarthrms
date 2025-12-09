#!/bin/bash

# Script to generate Kubernetes manifests for all microservices
# Usage: ./generate-manifests.sh [service-name]

set -e

ACR_NAME="${ACR_NAME:-eteliosacr}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
NAMESPACE="${NAMESPACE:-etelios-backend-prod}"
REPLICAS="${REPLICAS:-2}"

# Service configurations (compatible with bash 3.x)
# Format: service_name:port:acr_name:image_tag
# If acr_name or image_tag is empty, it uses the default ACR_NAME and IMAGE_TAG
SERVICES="api-gateway:3000:eteliosacr:latest auth-service:3001:eteliosacr:latest hr-service:3002:eteliosacr:latest attendance-service:3003:eteliosacr:latest payroll-service:3004:eteliosacr:latest crm-service:3005:eteliosacr:latest inventory-service:3006:eteliosacr:latest sales-service:3007:eteliosacr:latest purchase-service:3008:eteliosacr:latest financial-service:3009:eteliosacr:latest document-service:3010:eteliosacr:latest service-management:3011:eteliosacr:latest cpp-service:3012:eteliosacr:latest prescription-service:3013:eteliosacr:latest analytics-service:3014:eteliosacr:latest notification-service:3015:eteliosacr:latest monitoring-service:3016:eteliosacr:latest tenant-registry-service:3020:eteliosacr:latest realtime-service:3021:eteliosacr:latest"

# Function to get port for a service
get_service_port() {
  local service_name=$1
  for service in $SERVICES; do
    local svc_name="${service%%:*}"
    if [ "$svc_name" == "$service_name" ]; then
      local rest="${service#*:}"
      echo "${rest%%:*}"
      return
    fi
  done
  echo ""
}

# Function to get ACR name for a service
get_service_acr() {
  local service_name=$1
  for service in $SERVICES; do
    local svc_name="${service%%:*}"
    if [ "$svc_name" == "$service_name" ]; then
      local rest="${service#*:}"
      local port="${rest%%:*}"
      rest="${rest#*:}"
      local acr="${rest%%:*}"
      echo "${acr:-${ACR_NAME}}"
      return
    fi
  done
  echo "${ACR_NAME}"
}

# Function to get image tag for a service
get_service_tag() {
  local service_name=$1
  for service in $SERVICES; do
    local svc_name="${service%%:*}"
    if [ "$svc_name" == "$service_name" ]; then
      local rest="${service#*:}"
      rest="${rest#*:}"
      rest="${rest#*:}"
      local tag="${rest%%:*}"
      echo "${tag:-${IMAGE_TAG}}"
      return
    fi
  done
  echo "${IMAGE_TAG}"
}

# Resource requests and limits
CPU_REQUEST="${CPU_REQUEST:-100m}"
CPU_LIMIT="${CPU_LIMIT:-500m}"
MEMORY_REQUEST="${MEMORY_REQUEST:-256Mi}"
MEMORY_LIMIT="${MEMORY_LIMIT:-512Mi}"

generate_deployment() {
  local service_name=$1
  local port=$(get_service_port $service_name)
  if [ -z "$port" ]; then
    echo "Error: Unknown service '$service_name'" >&2
    return 1
  fi
  local service_acr=$(get_service_acr $service_name)
  local service_tag=$(get_service_tag $service_name)
  local image_name="${service_acr}.azurecr.io/${service_name}:${service_tag}"
  
  cat <<EOF
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${service_name}
  namespace: ${NAMESPACE}
  labels:
    app: ${service_name}
    version: ${service_tag}
spec:
  replicas: ${REPLICAS}
  selector:
    matchLabels:
      app: ${service_name}
  template:
    metadata:
      labels:
        app: ${service_name}
        version: ${service_tag}
    spec:
      containers:
      - name: ${service_name}
        image: ${image_name}
        imagePullPolicy: Always
        ports:
        - containerPort: ${port}
          name: http
          protocol: TCP
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "${port}"
        - name: SERVICE_NAME
          value: "${service_name}"
        - name: K8S_ENV
          value: "true"
        envFrom:
        - configMapRef:
            name: etelios-config
        - secretRef:
            name: etelios-secrets
        resources:
          requests:
            memory: "${MEMORY_REQUEST}"
            cpu: "${CPU_REQUEST}"
          limits:
            memory: "${MEMORY_LIMIT}"
            cpu: "${CPU_LIMIT}"
        livenessProbe:
          httpGet:
            path: /health
            port: ${port}
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: ${port}
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: false
          capabilities:
            drop:
            - ALL
---
apiVersion: v1
kind: Service
metadata:
  name: ${service_name}
  namespace: ${NAMESPACE}
  labels:
    app: ${service_name}
spec:
  type: ClusterIP
  selector:
    app: ${service_name}
  ports:
  - port: ${port}
    targetPort: ${port}
    protocol: TCP
    name: http
EOF
}

generate_all_manifests() {
  echo "Generating Kubernetes manifests for all services..."
  
  for service_config in $SERVICES; do
    service_name="${service_config%%:*}"
    service_acr=$(get_service_acr $service_name)
    service_tag=$(get_service_tag $service_name)
    echo "Generating manifest for ${service_name} (ACR: ${service_acr}, Tag: ${service_tag})..."
    generate_deployment "$service_name" > "k8s/deployments/${service_name}.yaml"
  done
  
  echo "All manifests generated in k8s/deployments/"
}

# Main execution
mkdir -p k8s/deployments

if [ -z "$1" ]; then
  # Generate all manifests
  generate_all_manifests
else
  # Generate single service manifest
  SERVICE_NAME=$1
  port=$(get_service_port $SERVICE_NAME)
  if [ -z "$port" ]; then
    echo "Error: Unknown service '$SERVICE_NAME'"
    exit 1
  fi
  generate_deployment "$SERVICE_NAME" > "k8s/deployments/${SERVICE_NAME}.yaml"
  echo "Generated manifest for ${SERVICE_NAME} in k8s/deployments/${SERVICE_NAME}.yaml"
fi

