#!/usr/bin/env bash
# ==============================================================================
# BottomUp Monorepo Deployment Script (Web & API)
#
# Deployments:
#   - Backend API  (apps/api) -> Google Cloud Run (FastAPI + Google ADK)
#   - Frontend Web (apps/web) -> Firebase App Hosting (Next.js 16) or Cloud Run
#   - Local / Dev             -> Docker Compose
#
# Compatible with macOS default Bash 3.2+ and Linux Bash.
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# Script Location & Root Detection
# ------------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ------------------------------------------------------------------------------
# Color Output Formatting (supports NO_COLOR)
# ------------------------------------------------------------------------------
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  BOLD="\033[1m"
  DIM="\033[2m"
  GREEN="\033[0;32m"
  BLUE="\033[0;34m"
  CYAN="\033[0;36m"
  YELLOW="\033[1;33m"
  RED="\033[0;31m"
  RESET="\033[0m"
else
  BOLD=""
  DIM=""
  GREEN=""
  BLUE=""
  CYAN=""
  YELLOW=""
  RED=""
  RESET=""
fi

log_info() {
  printf "${BLUE}${BOLD}ℹ %s${RESET}\n" "$*"
}

log_step() {
  printf "\n${CYAN}${BOLD}▶ %s${RESET}\n" "$*"
}

log_success() {
  printf "${GREEN}${BOLD}✔ %s${RESET}\n" "$*"
}

log_warn() {
  printf "${YELLOW}${BOLD}⚠ %s${RESET}\n" "$*" >&2
}

log_error() {
  printf "${RED}${BOLD}✖ %s${RESET}\n" "$*" >&2
}

# ------------------------------------------------------------------------------
# Default Settings
# ------------------------------------------------------------------------------
DEFAULT_PROJECT_ID="thanarat-dev"
DEFAULT_REGION="asia-southeast1"
DEFAULT_API_SERVICE="bottomup-api"
DEFAULT_WEB_BACKEND="bottomup-web"
DEFAULT_WEB_TARGET="apphosting" # apphosting | cloudrun

PROJECT_ID="${GCP_PROJECT:-${PROJECT_ID:-}}"
REGION="${GCP_REGION:-${REGION:-$DEFAULT_REGION}}"
API_SERVICE="${API_SERVICE:-$DEFAULT_API_SERVICE}"
WEB_BACKEND="${WEB_BACKEND:-$DEFAULT_WEB_BACKEND}"
WEB_TARGET="${WEB_TARGET:-$DEFAULT_WEB_TARGET}"
GIT_BRANCH=""
GIT_COMMIT=""
AUTO_PUSH=false
DRY_RUN=false
SKIP_HEALTH_CHECK=false
EXPLICIT_API_KEY=""

TARGET=""

# ------------------------------------------------------------------------------
# Help & Usage
# ------------------------------------------------------------------------------
show_help() {
  cat <<EOF
${BOLD}BottomUp Deployment CLI${RESET}
Deploy backend API (Google Cloud Run) and frontend Web (Firebase App Hosting / Cloud Run).

${BOLD}USAGE:${RESET}
  ./deploy.sh [TARGET] [OPTIONS]

${BOLD}TARGETS:${RESET}
  ${CYAN}all${RESET}           Deploy Backend API to Cloud Run and Frontend Web to Firebase App Hosting (default)
  ${CYAN}api${RESET}           Deploy only Backend API (apps/api) to Google Cloud Run
  ${CYAN}web${RESET}           Deploy only Frontend Web (apps/web)
  ${CYAN}docker${RESET}        Build and start local containers via Docker Compose
  ${CYAN}status${RESET}        Check live status of deployed API and Web services
  ${CYAN}help${RESET}          Show this help message

${BOLD}OPTIONS:${RESET}
  --project <ID>            GCP & Firebase project ID (default: ${DEFAULT_PROJECT_ID})
  --region <REGION>         Cloud Run region (default: ${DEFAULT_REGION})
  --api-service <NAME>      Cloud Run service name for API (default: ${DEFAULT_API_SERVICE})
  --web-backend <NAME>      App Hosting backend name for Web (default: ${DEFAULT_WEB_BACKEND})
  --web-target <TARGET>     Web deployment method: 'apphosting' (default) or 'cloudrun'
  --branch <BRANCH>         Git branch for Firebase App Hosting rollout (default: active branch)
  --commit <COMMIT>         Git commit SHA for Firebase App Hosting rollout
  --push                    Automatically 'git push origin <branch>' before App Hosting rollout
  --api-key <KEY>           Explicit Google Gemini API key (defaults to apps/api/.env or env var)
  --skip-health-check       Skip post-deployment HTTP health validation
  --dry-run                 Preview commands without executing them
  -h, --help                Show this help message

${BOLD}EXAMPLES:${RESET}
  # Deploy both API and Web with default settings:
  ./deploy.sh

  # Deploy only the backend API to Cloud Run:
  ./deploy.sh api

  # Deploy only the frontend Web (pushes git branch first):
  ./deploy.sh web --push

  # Deploy web directly to Cloud Run instead of Firebase App Hosting:
  ./deploy.sh web --web-target cloudrun

  # Check live URLs and health status:
  ./deploy.sh status
EOF
}

# ------------------------------------------------------------------------------
# Parse Arguments
# ------------------------------------------------------------------------------
while [ $# -gt 0 ]; do
  case "$1" in
    all|api|web|docker|compose|local|status)
      TARGET="$1"
      shift
      ;;
    help|-h|--help)
      show_help
      exit 0
      ;;
    --project)
      PROJECT_ID="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    --api-service)
      API_SERVICE="$2"
      shift 2
      ;;
    --web-backend)
      WEB_BACKEND="$2"
      shift 2
      ;;
    --web-target)
      WEB_TARGET="$2"
      shift 2
      ;;
    --branch)
      GIT_BRANCH="$2"
      shift 2
      ;;
    --commit)
      GIT_COMMIT="$2"
      shift 2
      ;;
    --api-key)
      EXPLICIT_API_KEY="$2"
      shift 2
      ;;
    --push)
      AUTO_PUSH=true
      shift
      ;;
    --skip-health-check)
      SKIP_HEALTH_CHECK=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      log_error "Unknown option or target: $1"
      show_help
      exit 1
      ;;
  esac
done

# Default target is "all" if none provided
TARGET="${TARGET:-all}"
if [ "$TARGET" = "compose" ] || [ "$TARGET" = "local" ]; then
  TARGET="docker"
fi

# Resolve project ID if not set
if [ -z "$PROJECT_ID" ]; then
  if command -v gcloud >/dev/null 2>&1; then
    ACTIVE_GCLOUD_PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
    if [ -n "$ACTIVE_GCLOUD_PROJECT" ] && [ "$ACTIVE_GCLOUD_PROJECT" != "(unset)" ]; then
      PROJECT_ID="$ACTIVE_GCLOUD_PROJECT"
    fi
  fi
fi
PROJECT_ID="${PROJECT_ID:-$DEFAULT_PROJECT_ID}"

# ------------------------------------------------------------------------------
# Execute or Dry-run wrapper with secret masking
# ------------------------------------------------------------------------------
mask_secrets() {
  local cmd_str="$*"
  echo "$cmd_str" | sed -E 's/GOOGLE_API_KEY=[^, ]+/GOOGLE_API_KEY=***/g'
}

run_cmd() {
  local safe_cmd
  safe_cmd="$(mask_secrets "$@")"
  if [ "$DRY_RUN" = true ]; then
    printf "${DIM}[dry-run] %s${RESET}\n" "$safe_cmd"
  else
    printf "${DIM}+ %s${RESET}\n" "$safe_cmd"
    "$@"
  fi
}

# ------------------------------------------------------------------------------
# Dependency Verification
# ------------------------------------------------------------------------------
check_prerequisites_api() {
  log_step "Checking prerequisites for API deployment (Google Cloud Run)..."
  if ! command -v gcloud >/dev/null 2>&1; then
    log_error "Google Cloud CLI (gcloud) is not installed."
    log_error "Install it via: https://cloud.google.com/sdk/docs/install"
    exit 1
  fi

  if ! gcloud auth print-access-token >/dev/null 2>&1; then
    log_warn "gcloud is not authenticated. Running 'gcloud auth login'..."
    if [ "$DRY_RUN" = false ]; then
      gcloud auth login
    fi
  fi
  log_success "gcloud CLI authenticated."
}

check_prerequisites_web_apphosting() {
  log_step "Checking prerequisites for Web deployment (Firebase App Hosting)..."
  if ! command -v firebase >/dev/null 2>&1; then
    log_error "Firebase CLI (firebase) is not installed."
    log_error "Install it via: npm install -g firebase-tools"
    exit 1
  fi
  log_success "firebase CLI ready."
}

check_prerequisites_docker() {
  log_step "Checking prerequisites for Docker Compose..."
  if ! command -v docker >/dev/null 2>&1; then
    log_error "Docker is not installed or not in PATH."
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    log_error "Docker daemon is not running. Please start Docker Desktop/daemon."
    exit 1
  fi
  log_success "Docker daemon ready."
}

# ------------------------------------------------------------------------------
# Load Environment for API
# ------------------------------------------------------------------------------
resolve_api_env() {
  GOOGLE_API_KEY="${EXPLICIT_API_KEY:-${GOOGLE_API_KEY:-}}"
  GOOGLE_GENAI_USE_ENTERPRISE="${GOOGLE_GENAI_USE_ENTERPRISE:-0}"

  # Fallback to apps/api/.env
  if [ -z "$GOOGLE_API_KEY" ] && [ -f "apps/api/.env" ]; then
    GOOGLE_API_KEY="$(grep -E '^GOOGLE_API_KEY=' apps/api/.env | cut -d '=' -f2- | tr -d '"'\'' ' || true)"
  fi

  # Fallback to root .env
  if [ -z "$GOOGLE_API_KEY" ] && [ -f ".env" ]; then
    GOOGLE_API_KEY="$(grep -E '^GOOGLE_API_KEY=' .env | cut -d '=' -f2- | tr -d '"'\'' ' || true)"
  fi

  if [ -z "$GOOGLE_API_KEY" ] || [ "$GOOGLE_API_KEY" = "YOUR_GEMINI_API_KEY" ]; then
    log_warn "No valid GOOGLE_API_KEY found in environment or apps/api/.env."
    log_warn "The API requires GOOGLE_API_KEY to call Google Gemini / ADK agents."
    if [ "$DRY_RUN" = false ]; then
      read -r -p "Enter GOOGLE_API_KEY (or press Enter to proceed without setting): " USER_KEY
      if [ -n "$USER_KEY" ]; then
        GOOGLE_API_KEY="$USER_KEY"
      fi
    fi
  fi
}

# ------------------------------------------------------------------------------
# Deploy API to Google Cloud Run
# ------------------------------------------------------------------------------
DEPLOYED_API_URL=""

deploy_api() {
  check_prerequisites_api
  resolve_api_env

  log_step "Deploying Backend API to Google Cloud Run..."
  log_info "Service:    $API_SERVICE"
  log_info "Project:    $PROJECT_ID"
  log_info "Region:     $REGION"
  log_info "Source:     apps/api"

  local ENV_VARS="GOOGLE_GENAI_USE_ENTERPRISE=${GOOGLE_GENAI_USE_ENTERPRISE:-0}"
  if [ -n "$GOOGLE_API_KEY" ]; then
    ENV_VARS="GOOGLE_API_KEY=${GOOGLE_API_KEY},${ENV_VARS}"
  fi

  run_cmd gcloud run deploy "$API_SERVICE" \
    --source apps/api \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --allow-unauthenticated \
    --port 8080 \
    --set-env-vars "$ENV_VARS"

  if [ "$DRY_RUN" = false ]; then
    DEPLOYED_API_URL="$(gcloud run services describe "$API_SERVICE" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)' 2>/dev/null || true)"
    if [ -n "$DEPLOYED_API_URL" ]; then
      log_success "Backend API deployed successfully at: $DEPLOYED_API_URL"

      if [ "$SKIP_HEALTH_CHECK" = false ]; then
        log_step "Verifying API health endpoint ($DEPLOYED_API_URL/health)..."
        local ATTEMPTS=0
        local MAX_ATTEMPTS=5
        local HEALTHY=false
        while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
          ATTEMPTS=$((ATTEMPTS + 1))
          HTTP_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYED_API_URL/health" || true)"
          if [ "$HTTP_STATUS" = "200" ]; then
            HEALTHY=true
            break
          fi
          sleep 2
        done

        if [ "$HEALTHY" = true ]; then
          log_success "Health check passed (HTTP 200)."
        else
          log_warn "Health check returned status $HTTP_STATUS after $MAX_ATTEMPTS attempts."
        fi
      fi

      # Verify apps/web/apphosting.yaml configuration
      if [ -f "apps/web/apphosting.yaml" ]; then
        if grep -q "NEXT_PUBLIC_API_URL" apps/web/apphosting.yaml; then
          log_info "Configured web API endpoint in apps/web/apphosting.yaml is active."
        fi
      fi
    fi
  else
    DEPLOYED_API_URL="https://${API_SERVICE}-mock.a.run.app"
  fi
}

# ------------------------------------------------------------------------------
# Deploy Web
# ------------------------------------------------------------------------------
DEPLOYED_WEB_URL=""

deploy_web_apphosting() {
  check_prerequisites_web_apphosting

  log_step "Deploying Frontend Web to Firebase App Hosting..."
  log_info "Backend:    $WEB_BACKEND"
  log_info "Project:    $PROJECT_ID"
  log_info "Region:     $REGION"

  # Determine branch
  if [ -z "$GIT_BRANCH" ] && [ -z "$GIT_COMMIT" ]; then
    GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")"
    if [ "$GIT_BRANCH" = "HEAD" ]; then
      GIT_BRANCH="main"
    fi
  fi

  # Check git push status since App Hosting builds from remote GitHub
  if [ -n "$GIT_BRANCH" ] && command -v git >/dev/null 2>&1; then
    local UNPUSHED
    UNPUSHED="$(git log "origin/${GIT_BRANCH}..${GIT_BRANCH}" --oneline 2>/dev/null || true)"
    if [ -n "$UNPUSHED" ]; then
      log_warn "You have local commits that are not pushed to origin/${GIT_BRANCH}:"
      printf "${DIM}%s${RESET}\n" "$UNPUSHED"
      if [ "$AUTO_PUSH" = true ]; then
        log_step "Pushing ${GIT_BRANCH} to origin as requested by --push..."
        run_cmd git push origin "$GIT_BRANCH"
      else
        log_warn "Firebase App Hosting builds from GitHub. Make sure to run 'git push origin ${GIT_BRANCH}' so App Hosting receives these commits."
      fi
    fi
  fi

  if [ -n "$GIT_COMMIT" ]; then
    log_info "Triggering rollout for commit: $GIT_COMMIT"
    run_cmd firebase apphosting:rollouts:create "$WEB_BACKEND" \
      --project "$PROJECT_ID" \
      --git-commit "$GIT_COMMIT" \
      --force
  else
    log_info "Triggering rollout for branch: $GIT_BRANCH"
    run_cmd firebase apphosting:rollouts:create "$WEB_BACKEND" \
      --project "$PROJECT_ID" \
      --git-branch "$GIT_BRANCH" \
      --force
  fi

  if [ "$DRY_RUN" = false ]; then
    # Fetch live URL from backend info
    DEPLOYED_WEB_URL="$(firebase apphosting:backends:get "$WEB_BACKEND" --project "$PROJECT_ID" 2>/dev/null | grep -E 'https://[a-zA-Z0-9.-]+\.hosted\.app' -o | head -n1 || true)"
    if [ -z "$DEPLOYED_WEB_URL" ]; then
      DEPLOYED_WEB_URL="https://${WEB_BACKEND}--${PROJECT_ID}.${REGION}.hosted.app"
    fi
    log_success "Firebase App Hosting rollout initiated for: $DEPLOYED_WEB_URL"
  else
    DEPLOYED_WEB_URL="https://${WEB_BACKEND}--${PROJECT_ID}.${REGION}.hosted.app"
  fi
}

deploy_web_cloudrun() {
  check_prerequisites_api

  log_step "Deploying Frontend Web directly to Google Cloud Run..."
  log_info "Service:    $WEB_BACKEND"
  log_info "Project:    $PROJECT_ID"
  log_info "Region:     $REGION"
  log_info "Source:     apps/web"

  local API_URL_ARG="${DEPLOYED_API_URL:-}"
  if [ -z "$API_URL_ARG" ] && command -v gcloud >/dev/null 2>&1; then
    API_URL_ARG="$(gcloud run services describe "$API_SERVICE" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)' 2>/dev/null || true)"
  fi
  API_URL_ARG="${API_URL_ARG:-https://${API_SERVICE}-272801300023.${REGION}.run.app}"

  run_cmd gcloud run deploy "$WEB_BACKEND" \
    --source apps/web \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --allow-unauthenticated \
    --port 3000 \
    --set-env-vars "NEXT_PUBLIC_API_URL=${API_URL_ARG}"

  if [ "$DRY_RUN" = false ]; then
    DEPLOYED_WEB_URL="$(gcloud run services describe "$WEB_BACKEND" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)' 2>/dev/null || true)"
    if [ -n "$DEPLOYED_WEB_URL" ]; then
      log_success "Frontend Web deployed to Cloud Run at: $DEPLOYED_WEB_URL"
    fi
  else
    DEPLOYED_WEB_URL="https://${WEB_BACKEND}-mock.a.run.app"
  fi
}

deploy_web() {
  if [ "$WEB_TARGET" = "cloudrun" ]; then
    deploy_web_cloudrun
  else
    deploy_web_apphosting
  fi
}

# ------------------------------------------------------------------------------
# Docker Compose Local Deployment
# ------------------------------------------------------------------------------
deploy_docker() {
  check_prerequisites_docker
  resolve_api_env

  log_step "Starting services locally with Docker Compose..."
  export GOOGLE_API_KEY
  export GOOGLE_GENAI_USE_ENTERPRISE

  run_cmd docker compose up -d --build

  log_success "Docker Compose services launched:"
  printf "  • %-12s http://localhost:8080 (docs: http://localhost:8080/docs)\n" "Backend API:"
  printf "  • %-12s http://localhost:3000\n" "Frontend Web:"
}

# ------------------------------------------------------------------------------
# Status Command
# ------------------------------------------------------------------------------
show_status() {
  log_step "Fetching deployment status for project '${PROJECT_ID}' (${REGION})..."

  printf "\n${BOLD}Google Cloud Run Services:${RESET}\n"
  if command -v gcloud >/dev/null 2>&1; then
    gcloud run services list --project "$PROJECT_ID" --region "$REGION" || true
  else
    log_warn "gcloud CLI not found."
  fi

  printf "\n${BOLD}Firebase App Hosting Backends:${RESET}\n"
  if command -v firebase >/dev/null 2>&1; then
    firebase apphosting:backends:list --project "$PROJECT_ID" || true
  else
    log_warn "firebase CLI not found."
  fi
}

# ------------------------------------------------------------------------------
# Main Dispatcher
# ------------------------------------------------------------------------------
main() {
  START_TIME="$(date +%s)"

  printf "${BOLD}======================================================${RESET}\n"
  printf "${BOLD}         BottomUp Deployment Orchestrator             ${RESET}\n"
  printf "${BOLD}======================================================${RESET}\n"
  log_info "Target:     $TARGET"
  log_info "Project:    $PROJECT_ID"
  log_info "Region:     $REGION"
  if [ "$DRY_RUN" = true ]; then
    log_warn "Running in DRY-RUN mode. No changes will be applied."
  fi

  case "$TARGET" in
    api)
      deploy_api
      ;;
    web)
      deploy_web
      ;;
    all)
      deploy_api
      deploy_web
      ;;
    docker)
      deploy_docker
      ;;
    status)
      show_status
      exit 0
      ;;
    *)
      log_error "Invalid target: $TARGET"
      show_help
      exit 1
      ;;
  esac

  END_TIME="$(date +%s)"
  ELAPSED=$((END_TIME - START_TIME))

  printf "\n${BOLD}======================================================${RESET}\n"
  printf "${GREEN}${BOLD}           Deployment Completed in ${ELAPSED}s!${RESET}\n"
  printf "${BOLD}======================================================${RESET}\n"
  if [ -n "$DEPLOYED_API_URL" ]; then
    printf "  • ${BOLD}%-14s${RESET} %s\n" "Backend API:" "$DEPLOYED_API_URL"
  fi
  if [ -n "$DEPLOYED_WEB_URL" ]; then
    printf "  • ${BOLD}%-14s${RESET} %s\n" "Frontend Web:" "$DEPLOYED_WEB_URL"
  fi
  printf "\n"
}

main "$@"
