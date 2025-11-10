#!/bin/bash

set -e

# Configuration - Update these values for your deployment
PROJECT_ID="${GCP_PROJECT_ID:-your-gcp-project-id}"
SERVICE_NAME="${SERVICE_NAME:-precepgo-agents-frontend}"
REGION="${REGION:-us-central1}"
API_URL="${API_URL:-https://your-api-url.run.app}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying PrecepGo Agents Frontend to Cloud Run"
echo "=================================================="
echo "Project: ${PROJECT_ID}"
echo "Service: ${SERVICE_NAME}"
echo "Region: ${REGION}"
echo "API URL: ${API_URL}"
echo ""

# Validate configuration
if [ "$PROJECT_ID" = "your-gcp-project-id" ]; then
  echo "❌ Error: Please set GCP_PROJECT_ID environment variable or update PROJECT_ID in deploy.sh"
  exit 1
fi

# Set project
gcloud config set project ${PROJECT_ID}

# Enable APIs
gcloud services enable cloudbuild.googleapis.com --quiet
gcloud services enable run.googleapis.com --quiet

# Build container image
echo "📋 Building container image..."
gcloud builds submit --config cloudbuild.yaml --timeout=20m \
  --substitutions=_IMAGE_NAME=${IMAGE_NAME},_API_URL=${API_URL}

# Deploy to Cloud Run
echo "📋 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --update-env-vars "VITE_API_URL=${API_URL}" \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Service URL:"
gcloud run services describe ${SERVICE_NAME} \
  --region ${REGION} \
  --format="value(status.url)"

