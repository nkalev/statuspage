#!/bin/bash
set -e

# Configuration
# Replace these with your actual values or export them before running script
CENTRAL_API_URL=${CENTRAL_API_URL:-"https://status.example.com"}
API_SECRET=${API_SECRET:-"my-production-secret-123"}
IMAGE_NAME=${IMAGE_NAME:-"registry.example.com/santiment/backend:latest"}
REGION=${1:-"Hetzner-Unknown"}

echo " Provisioning Probe for Region: $REGION"
echo " Central API: $CENTRAL_API_URL"

# 1. Update & Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
else
    echo "Docker already installed."
fi

# 2. Pull Image (Login might be required if private registry)
# echo "Please login to registry if needed:"
# docker login registry.example.com

echo "Pulling latest probe image..."
docker pull $IMAGE_NAME

# 3. Stop existing probe if any
echo "Stopping existing probes..."
docker stop status-probe || true
docker rm status-probe || true

# 4. Run Probe
# Note: NODE_OPTIONS is crucial for large header support
echo "Starting Probe..."
docker run -d \
  --name status-probe \
  --restart always \
  -e PROBE_MODE="true" \
  -e REGION="$REGION" \
  -e CENTRAL_API_URL="$CENTRAL_API_URL" \
  -e API_SECRET="$API_SECRET" \
  -e PORT=3000 \
  -e NODE_OPTIONS="--max-http-header-size=32768" \
  $IMAGE_NAME

echo "Probe started successfully!"
docker ps | grep status-probe
docker logs status-probe --tail 10
