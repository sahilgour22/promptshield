#!/usr/bin/env bash
# PromptShield — Full Azure Container Apps deployment
# Deploys both the gateway (port 8000) and the victim-agent (port 9000)
# into the same Container Apps environment.
#
# Usage:
#   export DATABASE_URL="..."
#   export AZURE_OPENAI_ENDPOINT="..."
#   export AZURE_OPENAI_API_KEY="..."
#   export AZURE_OPENAI_DEPLOYMENT="gpt-4o-mini"
#   export AZURE_OPENAI_API_VERSION="2024-02-01"
#   export ALLOWED_ORIGINS="https://<your-app>.vercel.app"   # set after Vercel deploy
#   bash deployment/azure-deploy.sh
#
# Prerequisites: az CLI logged in, Docker running
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
RESOURCE_GROUP="${RESOURCE_GROUP:-promptshield-rg}"
LOCATION="${LOCATION:-eastus}"
ACR_NAME="${ACR_NAME:-promptshieldacr}"            # globally unique — change if taken
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-promptshield-env}"
GATEWAY_APP="${GATEWAY_APP:-promptshield-gateway}"
VICTIM_APP="${VICTIM_APP:-promptshield-victim}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Required secrets — must be set in the calling shell
: "${DATABASE_URL:?Set DATABASE_URL}"
: "${AZURE_OPENAI_ENDPOINT:?Set AZURE_OPENAI_ENDPOINT}"
: "${AZURE_OPENAI_API_KEY:?Set AZURE_OPENAI_API_KEY}"
: "${AZURE_OPENAI_DEPLOYMENT:?Set AZURE_OPENAI_DEPLOYMENT}"
AZURE_OPENAI_API_VERSION="${AZURE_OPENAI_API_VERSION:-2024-02-01}"

# CORS — comma-separated Vercel origins; leave empty to skip (set after Vercel deploy)
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-}"
# Shield enabled by default on the victim agent in production
SHIELD_ENABLED="${SHIELD_ENABLED:-true}"
SHIELD_API_KEY="${SHIELD_API_KEY:-ps_demo_key}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> PromptShield Full Stack Deployment"
echo "    Resource group : $RESOURCE_GROUP ($LOCATION)"
echo "    ACR            : $ACR_NAME"
echo "    Gateway app    : $GATEWAY_APP"
echo "    Victim app     : $VICTIM_APP"
echo ""

# ── STEP 1: Resource group ────────────────────────────────────────────────────
echo "[1/9] Creating resource group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

# ── STEP 2: Azure Container Registry ─────────────────────────────────────────
echo "[2/9] Creating container registry..."
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true \
  --output none

ACR_LOGIN_SERVER=$(az acr show \
  --name "$ACR_NAME" \
  --query loginServer \
  --output tsv)

ACR_PASSWORD=$(az acr credential show \
  --name "$ACR_NAME" \
  --query "passwords[0].value" \
  --output tsv)

az acr login --name "$ACR_NAME"

# ── STEP 3: Build & push gateway image ───────────────────────────────────────
echo "[3/9] Building and pushing gateway image..."
GATEWAY_IMAGE="$ACR_LOGIN_SERVER/$GATEWAY_APP:$IMAGE_TAG"
docker build \
  --platform linux/amd64 \
  -t "$GATEWAY_IMAGE" \
  "$REPO_ROOT/gateway"
docker push "$GATEWAY_IMAGE"

# ── STEP 4: Build & push victim-agent image ───────────────────────────────────
echo "[4/9] Building and pushing victim-agent image..."
VICTIM_IMAGE="$ACR_LOGIN_SERVER/$VICTIM_APP:$IMAGE_TAG"
docker build \
  --platform linux/amd64 \
  -t "$VICTIM_IMAGE" \
  "$REPO_ROOT/victim-agent"
docker push "$VICTIM_IMAGE"

# ── STEP 5: Container Apps environment ───────────────────────────────────────
echo "[5/9] Creating Container Apps environment..."
az containerapp env create \
  --name "$ENVIRONMENT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

# ── STEP 6: Deploy gateway ────────────────────────────────────────────────────
echo "[6/9] Deploying gateway..."
az containerapp create \
  --name "$GATEWAY_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT_NAME" \
  --image "$GATEWAY_IMAGE" \
  --registry-server "$ACR_LOGIN_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 8000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 1.0 \
  --memory 2.0Gi \
  --env-vars \
    "DATABASE_URL=secretref:database-url" \
    "AZURE_OPENAI_ENDPOINT=secretref:aoai-endpoint" \
    "AZURE_OPENAI_API_KEY=secretref:aoai-key" \
    "AZURE_OPENAI_DEPLOYMENT=$AZURE_OPENAI_DEPLOYMENT" \
    "ENVIRONMENT=production" \
    "LOG_LEVEL=INFO" \
    "ALLOWED_ORIGINS=$ALLOWED_ORIGINS" \
  --secrets \
    "database-url=$DATABASE_URL" \
    "aoai-endpoint=$AZURE_OPENAI_ENDPOINT" \
    "aoai-key=$AZURE_OPENAI_API_KEY" \
  --output none

GATEWAY_FQDN=$(az containerapp show \
  --name "$GATEWAY_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv)

echo "  Gateway FQDN: $GATEWAY_FQDN"

# ── STEP 7: Run database migration ───────────────────────────────────────────
echo "[7/9] Running database migration..."
az containerapp job create \
  --name "promptshield-migrate" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT_NAME" \
  --trigger-type Manual \
  --replica-timeout 300 \
  --image "$GATEWAY_IMAGE" \
  --registry-server "$ACR_LOGIN_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASSWORD" \
  --command "python" \
  --args "run_migration.py" \
  --env-vars "DATABASE_URL=secretref:database-url" \
  --secrets "database-url=$DATABASE_URL" \
  --output none 2>/dev/null || true

az containerapp job start \
  --name "promptshield-migrate" \
  --resource-group "$RESOURCE_GROUP" \
  --output none 2>/dev/null || echo "  Migration job skipped — run manually if needed"

# ── STEP 8: Deploy victim-agent ───────────────────────────────────────────────
echo "[8/9] Deploying victim-agent (GATEWAY_URL → https://$GATEWAY_FQDN)..."
az containerapp create \
  --name "$VICTIM_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT_NAME" \
  --image "$VICTIM_IMAGE" \
  --registry-server "$ACR_LOGIN_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 8000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 2 \
  --cpu 1.0 \
  --memory 2.0Gi \
  --env-vars \
    "AZURE_OPENAI_API_KEY=secretref:aoai-key" \
    "AZURE_OPENAI_ENDPOINT=secretref:aoai-endpoint" \
    "AZURE_OPENAI_DEPLOYMENT=$AZURE_OPENAI_DEPLOYMENT" \
    "AZURE_OPENAI_API_VERSION=$AZURE_OPENAI_API_VERSION" \
    "GATEWAY_URL=https://$GATEWAY_FQDN" \
    "SHIELD_ENABLED=$SHIELD_ENABLED" \
    "SHIELD_API_KEY=$SHIELD_API_KEY" \
    "LOG_LEVEL=INFO" \
  --secrets \
    "aoai-key=$AZURE_OPENAI_API_KEY" \
    "aoai-endpoint=$AZURE_OPENAI_ENDPOINT" \
  --output none

VICTIM_FQDN=$(az containerapp show \
  --name "$VICTIM_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv)

# ── STEP 9: Update gateway CORS with both frontend origins ────────────────────
echo "[9/9] Done. Summary:"
echo ""
echo "================================================================"
echo "  PromptShield — Full Stack Live"
echo ""
echo "  GATEWAY"
echo "  Public URL   : https://$GATEWAY_FQDN"
echo "  Health       : https://$GATEWAY_FQDN/health"
echo "  API docs     : https://$GATEWAY_FQDN/docs"
echo ""
echo "  VICTIM AGENT"
echo "  Chat API     : https://$VICTIM_FQDN/chat"
echo "  Demo UI      : https://$VICTIM_FQDN/demo"
echo "  Health       : https://$VICTIM_FQDN/health"
echo ""
echo "  NEXT STEPS"
echo "  1. Deploy frontend to Vercel (see README)"
echo "     Set NEXT_PUBLIC_API_URL=https://$GATEWAY_FQDN"
echo "     Set NEXT_PUBLIC_WS_URL=wss://$GATEWAY_FQDN"
echo ""
echo "  2. Once you have your Vercel URL, update gateway CORS:"
echo "     az containerapp update \\"
echo "       --name $GATEWAY_APP \\"
echo "       --resource-group $RESOURCE_GROUP \\"
echo "       --set-env-vars 'ALLOWED_ORIGINS=https://<vercel-url>.vercel.app'"
echo ""
echo "  3. Test attacks against production:"
echo "     python scripts/verify_production.py \\"
echo "       --gateway-url https://$GATEWAY_FQDN \\"
echo "       --agent-url https://$VICTIM_FQDN"
echo ""
echo "  4. Update attacks/_common.py AGENT_URL default for remote testing:"
echo "     AGENT_URL = os.getenv('VICTIM_AGENT_URL', 'https://$VICTIM_FQDN')"
echo "================================================================"
