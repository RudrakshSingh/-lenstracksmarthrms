#!/bin/bash

set -e

CLUSTER_NAME="etelios-prod-v2"
REGION="ap-south-1"
NAMESPACE="etelios-prod"

echo "=========================================="
echo "Setting up Monitoring"
echo "=========================================="

# 1. Setup CloudWatch Container Insights
echo "1. Setting up CloudWatch Container Insights..."
ClusterName=${CLUSTER_NAME}
RegionName=${REGION}
FluentBitHttpPort='2020'
FluentBitReadFromHead='Off'
[[ ${FluentBitReadFromHead} = 'On' ]] && FluentBitReadFromTail='Off'|| FluentBitReadFromTail='On'
[[ -z ${FluentBitHttpPort} ]] && FluentBitHttpServer='Off' || FluentBitHttpServer='On'

curl https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/quickstart/cwagent-fluent-bit-quickstart.yaml | sed 's/{{cluster_name}}/'${ClusterName}'/;s/{{region_name}}/'${RegionName}'/;s/{{http_server_toggle}}/"'${FluentBitHttpServer}'"/;s/{{http_server_port}}/"'${FluentBitHttpPort}'"/;s/{{read_from_head}}/"'${FluentBitReadFromHead}'"/;s/{{read_from_tail}}/"'${FluentBitReadFromTail}'"/' | kubectl apply -f -

echo "✅ CloudWatch Container Insights installed!"
echo ""

# 2. Install Prometheus
echo "2. Installing Prometheus..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.retention=7d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=20Gi \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.storageClassName=gp2 \
  --set grafana.enabled=true \
  --set grafana.adminPassword=admin123

echo "Waiting for Prometheus to start..."
sleep 30

echo "✅ Prometheus installed!"
echo ""

# 3. Expose Grafana
echo "3. Exposing Grafana..."
kubectl patch svc prometheus-grafana -n monitoring -p '{"spec":{"type":"LoadBalancer"}}'

echo "Waiting for Grafana LoadBalancer..."
sleep 30

echo "✅ Grafana exposed!"
echo ""

echo "=========================================="
echo "✅ Monitoring Setup Complete!"
echo "=========================================="
echo ""
echo "📊 CloudWatch Container Insights:"
echo "   View in AWS Console → CloudWatch → Container Insights"
echo ""
echo "📊 Grafana Dashboard:"
GRAFANA_URL=$(kubectl get svc prometheus-grafana -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
if [ -z "$GRAFANA_URL" ]; then
  echo "   Getting URL..."
  sleep 20
  GRAFANA_URL=$(kubectl get svc prometheus-grafana -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
fi
echo "   URL: http://${GRAFANA_URL}"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📊 Prometheus:"
echo "   kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090"
echo "   Then visit: http://localhost:9090"
echo ""
