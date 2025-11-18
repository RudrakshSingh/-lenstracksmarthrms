#!/bin/bash

# Service Image Configuration
# Configure different ACR registries and image tags for each service
# This file is sourced by build-and-push.sh and generate-manifests.sh

# Default values (used if not overridden per service)
DEFAULT_ACR="${DEFAULT_ACR:-eteliosacr}"
DEFAULT_TAG="${DEFAULT_TAG:-latest}"

# Service-specific configurations
# Format: SERVICE_IMAGE_CONFIG["service-name"]="acr_name:image_tag"
# Example: SERVICE_IMAGE_CONFIG["auth-service"]="eteliosacr-auth:v1.0.0"

declare -A SERVICE_IMAGE_CONFIG

# Configure different image URLs for each service
# Uncomment and modify as needed:

# Authentication Service
# SERVICE_IMAGE_CONFIG["auth-service"]="eteliosacr-auth:latest"

# HR Service
# SERVICE_IMAGE_CONFIG["hr-service"]="eteliosacr-hr:latest"

# Attendance Service
# SERVICE_IMAGE_CONFIG["attendance-service"]="eteliosacr-attendance:latest"

# Payroll Service
# SERVICE_IMAGE_CONFIG["payroll-service"]="eteliosacr-payroll:latest"

# CRM Service
# SERVICE_IMAGE_CONFIG["crm-service"]="eteliosacr-crm:latest"

# Inventory Service
# SERVICE_IMAGE_CONFIG["inventory-service"]="eteliosacr-inventory:latest"

# Sales Service
# SERVICE_IMAGE_CONFIG["sales-service"]="eteliosacr-sales:latest"

# Purchase Service
# SERVICE_IMAGE_CONFIG["purchase-service"]="eteliosacr-purchase:latest"

# Financial Service
# SERVICE_IMAGE_CONFIG["financial-service"]="eteliosacr-financial:latest"

# Document Service
# SERVICE_IMAGE_CONFIG["document-service"]="eteliosacr-document:latest"

# Service Management
# SERVICE_IMAGE_CONFIG["service-management"]="eteliosacr-service-management:latest"

# CPP Service
# SERVICE_IMAGE_CONFIG["cpp-service"]="eteliosacr-cpp:latest"

# Prescription Service
# SERVICE_IMAGE_CONFIG["prescription-service"]="eteliosacr-prescription:latest"

# Analytics Service
# SERVICE_IMAGE_CONFIG["analytics-service"]="eteliosacr-analytics:latest"

# Notification Service
# SERVICE_IMAGE_CONFIG["notification-service"]="eteliosacr-notification:latest"

# Monitoring Service
# SERVICE_IMAGE_CONFIG["monitoring-service"]="eteliosacr-monitoring:latest"

# Tenant Registry Service
# SERVICE_IMAGE_CONFIG["tenant-registry-service"]="eteliosacr-tenant:latest"

# Realtime Service
# SERVICE_IMAGE_CONFIG["realtime-service"]="eteliosacr-realtime:latest"

# API Gateway
# SERVICE_IMAGE_CONFIG["api-gateway"]="eteliosacr-gateway:latest"

# Helper function to get ACR name for a service
get_service_acr() {
    local service_name=$1
    if [ -n "${SERVICE_IMAGE_CONFIG[$service_name]}" ]; then
        echo "${SERVICE_IMAGE_CONFIG[$service_name]%%:*}"
    else
        echo "${DEFAULT_ACR}"
    fi
}

# Helper function to get image tag for a service
get_service_tag() {
    local service_name=$1
    if [ -n "${SERVICE_IMAGE_CONFIG[$service_name]}" ]; then
        local config="${SERVICE_IMAGE_CONFIG[$service_name]}"
        echo "${config#*:}"
    else
        echo "${DEFAULT_TAG}"
    fi
}

# Export functions for use in other scripts
export -f get_service_acr
export -f get_service_tag

