#!/bin/bash

# Script to update all service deployments with correct API gateway host and database URIs
# This ensures production-grade configuration for all microservices

set -e

echo "🔧 Updating all service deployments with production configuration..."

# List of services and their database names (space-separated pairs)
SERVICE_CONFIG="payroll-service payroll_db inventory-service inventory_db sales-service sales_db purchase-service purchase_db financial-service financial_db analytics-service analytics_db notification-service notification_db document-service document_db service-management service_management_db tenant-registry-service tenant_registry_db crm-service crm_db monitoring-service monitoring_db realtime-service realtime_db prescription-service prescription_db cpp-service cpp_db"

# API Gateway host
API_GATEWAY_HOST="etelios-aks-dns-6vulk62q.hcp.centralindia.azmk8s.io"

# Function to update a single service deployment
update_service_deployment() {
    local service_name=$1
    local db_name=$2
    local deployment_file="k8s/deployments/${service_name}.yaml"

    if [ ! -f "$deployment_file" ]; then
        echo "⚠️  Skipping $service_name - deployment file not found: $deployment_file"
        return
    fi

    echo "📝 Updating $service_name..."

    # Create uppercase service name for secret key
    local upper_service_name=$(echo "$service_name" | tr 'a-z-' 'A-Z_')
    local secret_key="${upper_service_name}_SERVICE_DB_URI"

    # Update API gateway host if needed
    sed -i '' "s|eteliosacr-hvawabdbgge7e0fu.azurecr.io|$API_GATEWAY_HOST|g" "$deployment_file"

    # Add database configuration before envFrom
    if ! grep -q "MONGODB_URI" "$deployment_file"; then
        sed -i '' "/API_GATEWAY_HOST/a\\
        - name: MONGODB_URI\\
          valueFrom:\\
            secretKeyRef:\\
              name: etelios-secrets\\
              key: $secret_key\\
        - name: DB_NAME\\
          value: \"$db_name\"" "$deployment_file"
        echo "✅ Added database config for $service_name"
    else
        echo "ℹ️  Database config already exists for $service_name"
    fi
}

# Update core services first
update_service_deployment "auth-service" "auth_db"
update_service_deployment "hr-service" "hr-database"
update_service_deployment "attendance-service" "attendance_db"

# Update remaining services
# Parse service config pairs
services=($SERVICE_CONFIG)
for ((i=0; i<${#services[@]}; i+=2)); do
    service="${services[i]}"
    db_name="${services[i+1]}"
    if [[ "$service" != "auth-service" && "$service" != "hr-service" && "$service" != "attendance-service" ]]; then
        update_service_deployment "$service" "$db_name"
    fi
done

echo ""
echo "🎉 All service deployments updated successfully!"
echo ""
echo "📋 Summary of changes:"
echo "• API Gateway host updated to: $API_GATEWAY_HOST"
echo "• Database URIs configured for all services"
echo "• Service-specific database names assigned"
echo "• Production-grade environment variables added"
echo ""
echo "🚀 Ready for production deployment!"
