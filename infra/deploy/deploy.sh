#!/usr/bin/env bash
set -euo pipefail

APP_NAME="cen-starter"
APP_CONTAINER="cen-starter"
APP_SECRET="app-env"
ENV_FILE=".env.production"
OPENSHIFT_DIR="deploy/openshift"
POSTGRES_MANIFEST="$OPENSHIFT_DIR/postgres.yaml"
POSTGRES_SECRET="postgres-env"
GITHUB_SOURCE_SECRET="github-source"
GITHUB_WEBHOOK_SECRET="github-webhook-secret"
GITHUB_WEBHOOK_KEY="WebHookSecretKey"

namespace=""
image=""
autodeploy=false
in_cluster_db_used=false
external_db_used=false
database_url=""
route_url=""
derived_env_summary=()

tmp_files=()

cleanup() {
  if ((${#tmp_files[@]} > 0)); then
    rm -f -- "${tmp_files[@]}"
  fi
}
trap cleanup EXIT

usage() {
  cat <<EOF
Usage: $0 -n <namespace> [-i <image>] [-a|--autodeploy]

Options:
  -n <namespace>   OpenShift namespace/project to deploy into (required)
  -i <image>       Image reference to set on the Deployment
  -a, --autodeploy Configure OpenShift BuildConfig + GitHub webhook automation
  -h, --help       Show this help
EOF
}

error() {
  printf 'error: %s\n' "$*" >&2
}

warning() {
  printf 'warning: %s\n' "$*" >&2
}

info() {
  printf '%s\n' "$*"
}

need_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    error "$command_name is required but was not found in PATH"
    exit 1
  fi
}

make_temp_file() {
  local temp_file

  temp_file=$(mktemp)
  tmp_files+=("$temp_file")
  printf '%s' "$temp_file"
}

strip_matching_quotes() {
  local value="$1"
  local first_char=""
  local last_char=""

  if ((${#value} >= 2)); then
    first_char="${value:0:1}"
    last_char="${value: -1}"

    if [[ "$first_char" == "$last_char" && ( "$first_char" == '"' || "$first_char" == "'" ) ]]; then
      value="${value:1:${#value}-2}"
    fi
  fi

  printf '%s' "$value"
}

env_file_value() {
  local key="$1"
  local file="$2"
  local line=""
  local value=""

  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" == \#* ]] && continue

    if [[ "$line" == export\ * ]]; then
      line="${line#export }"
    fi

    if [[ "$line" == "$key="* ]]; then
      value="${line#*=}"
      strip_matching_quotes "$value"
      return 0
    fi
  done < "$file"

  return 1
}

base64_decode() {
  if printf 'YQ==' | base64 -d >/dev/null 2>&1; then
    base64 -d
  else
    base64 -D
  fi
}

read_secret_key() {
  local secret_name="$1"
  local key="$2"
  local encoded_value=""

  encoded_value=$(oc get secret "$secret_name" -n "$namespace" -o "jsonpath={.data.$key}")
  if [[ -z "$encoded_value" ]]; then
    error "secret '$secret_name' does not contain key '$key'"
    exit 1
  fi

  printf '%s' "$encoded_value" | base64_decode
}

parse_args() {
  while (($# > 0)); do
    case "$1" in
      -n)
        if (($# < 2)); then
          error "-n requires a namespace"
          usage >&2
          exit 2
        fi
        namespace="$2"
        shift 2
        ;;
      -i)
        if (($# < 2)); then
          error "-i requires an image"
          usage >&2
          exit 2
        fi
        image="$2"
        shift 2
        ;;
      -a | --autodeploy)
        autodeploy=true
        shift
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      --)
        shift
        break
        ;;
      -*)
        error "unknown option: $1"
        usage >&2
        exit 2
        ;;
      *)
        error "unexpected argument: $1"
        usage >&2
        exit 2
        ;;
    esac
  done

  if (($# > 0)); then
    error "unexpected argument: $1"
    usage >&2
    exit 2
  fi

  if [[ -z "$namespace" ]]; then
    error "-n <namespace> is required"
    usage >&2
    exit 2
  fi
}

check_preconditions() {
  need_command oc

  if ! oc whoami >/dev/null 2>&1; then
    error "oc whoami failed; log in with 'oc login' and try again"
    exit 1
  fi

  if ! oc get namespace "$namespace" >/dev/null 2>&1; then
    error "namespace '$namespace' does not exist or is not accessible"
    exit 1
  fi

  if [[ ! -f "$ENV_FILE" ]]; then
    error "$ENV_FILE is missing; create it from .env.production.example"
    exit 1
  fi
}

ensure_postgres_secret() {
  local postgres_password=""

  need_command openssl
  need_command base64

  if oc get secret "$POSTGRES_SECRET" -n "$namespace" >/dev/null 2>&1; then
    postgres_password=$(read_secret_key "$POSTGRES_SECRET" POSTGRES_PASSWORD)
  else
    postgres_password=$(openssl rand -hex 16)
    # stdout of this function is captured as the password — keep oc output away from it
    oc create secret generic "$POSTGRES_SECRET" \
      -n "$namespace" \
      --from-literal=POSTGRES_USER=app \
      --from-literal=POSTGRES_PASSWORD="$postgres_password" \
      --from-literal=POSTGRES_DB=app \
      --dry-run=client \
      -o yaml \
      | oc apply -n "$namespace" -f - >&2
  fi

  printf '%s' "$postgres_password"
}

configure_database() {
  local postgres_password=""

  if database_url=$(env_file_value DATABASE_URL "$ENV_FILE"); then
    if [[ -n "$database_url" ]]; then
      external_db_used=true
      info "DATABASE_URL found in $ENV_FILE; using the external database."
      return
    fi
  else
    database_url=""
  fi

  if [[ ! -f "$POSTGRES_MANIFEST" ]]; then
    return
  fi

  info "no DATABASE_URL found -> deploying in-cluster PostgreSQL (pilot/demo grade; set DATABASE_URL in $ENV_FILE for a managed database)."

  postgres_password=$(ensure_postgres_secret)
  oc apply -n "$namespace" -f "$POSTGRES_MANIFEST"
  oc rollout status -n "$namespace" deploy/postgresql

  database_url="postgres://app:${postgres_password}@postgresql:5432/app"
  in_cluster_db_used=true
}

ensure_route() {
  oc apply -n "$namespace" -f "$OPENSHIFT_DIR/route.yaml"
}

derive_env_values() {
  local env_secret_file="$1"
  local auth_url=""
  local derived_env_file="${env_secret_file}.derived"

  auth_url=$(env_file_value BETTER_AUTH_URL "$env_secret_file" || true)
  if [[ -n "$auth_url" && "$auth_url" != "https://cen-starter.example.com" ]]; then
    return
  fi

  if [[ -z "$route_url" ]]; then
    warning "could not derive BETTER_AUTH_URL because the OpenShift route URL is unavailable"
    return
  fi

  tmp_files+=("$derived_env_file")
  sed '/^BETTER_AUTH_URL=/d;/^export BETTER_AUTH_URL=/d' "$env_secret_file" > "$derived_env_file"
  printf '\nBETTER_AUTH_URL=%s\n' "$route_url" >> "$derived_env_file"
  mv "$derived_env_file" "$env_secret_file"

  derived_env_summary+=("BETTER_AUTH_URL=$route_url")
  info "derived BETTER_AUTH_URL=$route_url (set it in $ENV_FILE to override)"
}

create_app_secret() {
  local env_secret_file

  env_secret_file=$(make_temp_file)

  if [[ "$in_cluster_db_used" == "true" ]]; then
    sed '/^GITHUB_TOKEN=/d;/^DATABASE_URL=/d' "$ENV_FILE" > "$env_secret_file"
    printf '\nDATABASE_URL=%s\n' "$database_url" >> "$env_secret_file"
  else
    sed '/^GITHUB_TOKEN=/d' "$ENV_FILE" > "$env_secret_file"
  fi

  derive_env_values "$env_secret_file"

  oc create secret generic "$APP_SECRET" \
    --from-env-file="$env_secret_file" \
    --dry-run=client \
    -o yaml \
    | oc apply -n "$namespace" -f -
}

github_token() {
  local token="${GITHUB_TOKEN:-}"

  if [[ -z "$token" ]]; then
    if token=$(env_file_value GITHUB_TOKEN "$ENV_FILE"); then
      :
    else
      token=""
    fi
  fi

  if [[ -z "$token" ]]; then
    error "--autodeploy requires GITHUB_TOKEN; set it in the environment or add GITHUB_TOKEN=... to $ENV_FILE"
    exit 1
  fi

  printf '%s' "$token"
}

parse_git_origin() {
  local remote_url=""
  local without_scheme=""
  local path=""
  local host=""
  local owner=""
  local repo=""

  if ! remote_url=$(git remote get-url origin 2>/dev/null); then
    error "--autodeploy requires a git remote named 'origin'"
    exit 1
  fi

  if [[ "$remote_url" == git@*:* ]]; then
    without_scheme="${remote_url#git@}"
    host="${without_scheme%%:*}"
    path="${without_scheme#*:}"
  elif [[ "$remote_url" == https://*/*/* ]]; then
    without_scheme="${remote_url#https://}"
    host="${without_scheme%%/*}"
    path="${without_scheme#*/}"
  else
    error "unsupported origin URL '$remote_url'; expected git@HOST:OWNER/REPO.git or https://HOST/OWNER/REPO.git"
    exit 1
  fi

  path="${path%.git}"
  if [[ "$path" != */* ]]; then
    error "could not derive git host/owner/repo from origin URL '$remote_url'"
    exit 1
  fi

  owner="${path%%/*}"
  repo="${path#*/}"

  if [[ -z "$host" || -z "$owner" || -z "$repo" || "$repo" == */* ]]; then
    error "could not derive git host/owner/repo from origin URL '$remote_url'"
    exit 1
  fi

  GIT_HTTPS_URL="https://${host}/${owner}/${repo}.git"
  GITHUB_API_BASE="https://api.${host}/repos/${owner}/${repo}"
}

ensure_github_source_secret() {
  local token="$1"

  oc create secret generic "$GITHUB_SOURCE_SECRET" \
    -n "$namespace" \
    --type=kubernetes.io/basic-auth \
    --from-literal=username=oauth2 \
    --from-literal=password="$token" \
    --dry-run=client \
    -o yaml \
    | oc apply -n "$namespace" -f -
}

ensure_github_webhook_secret() {
  local webhook_secret_value=""

  need_command openssl
  need_command base64

  if oc get secret "$GITHUB_WEBHOOK_SECRET" -n "$namespace" >/dev/null 2>&1; then
    webhook_secret_value=$(read_secret_key "$GITHUB_WEBHOOK_SECRET" "$GITHUB_WEBHOOK_KEY")
  else
    webhook_secret_value=$(openssl rand -hex 16)
    # stdout of this function is captured as the secret — keep oc output away from it
    oc create secret generic "$GITHUB_WEBHOOK_SECRET" \
      -n "$namespace" \
      --from-literal="$GITHUB_WEBHOOK_KEY=$webhook_secret_value" \
      --dry-run=client \
      -o yaml \
      | oc apply -n "$namespace" -f - >&2
  fi

  printf '%s' "$webhook_secret_value"
}

apply_build_resources() {
  cat <<EOF | oc apply -n "$namespace" -f -
apiVersion: image.openshift.io/v1
kind: ImageStream
metadata:
  name: $APP_NAME
  labels:
    app.kubernetes.io/name: $APP_NAME
---
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: $APP_NAME
  labels:
    app.kubernetes.io/name: $APP_NAME
spec:
  runPolicy: SerialLatestOnly
  source:
    type: Git
    git:
      uri: "$GIT_HTTPS_URL"
      ref: main
    sourceSecret:
      name: $GITHUB_SOURCE_SECRET
  strategy:
    type: Docker
    dockerStrategy:
      dockerfilePath: deploy/Dockerfile
  output:
    to:
      kind: ImageStreamTag
      name: $APP_NAME:latest
  triggers:
    - type: GitHub
      github:
        secretReference:
          name: $GITHUB_WEBHOOK_SECRET
EOF
}

manual_webhook_fallback() {
  local webhook_url="$1"

  warning "GitHub webhook was not created automatically."
  {
    printf 'Add this webhook manually in the repository settings:\n'
    printf '  Payload URL: %s\n' "$webhook_url"
    printf '  Content type: application/json\n'
    printf '  Events: push\n'
  } >&2
}

is_2xx() {
  [[ "$1" =~ ^2[0-9][0-9]$ ]]
}

create_github_webhook() {
  local token="$1"
  local webhook_url="$2"
  local hooks_url="${GITHUB_API_BASE}/hooks"
  local response=""
  local response_body=""
  local http_code=""
  local json_payload=""

  response=$(curl -sS -w "\n%{http_code}" \
    -H "Authorization: token $token" \
    -H "Accept: application/vnd.github+json" \
    "$hooks_url" || true)
  http_code=$(printf '%s\n' "$response" | tail -n 1)
  response_body=$(printf '%s\n' "$response" | sed '$d')

  if ! is_2xx "$http_code"; then
    warning "failed to list GitHub webhooks at $hooks_url (HTTP $http_code)"
    if [[ -n "$response_body" ]]; then
      printf '%s\n' "$response_body" >&2
    fi
    manual_webhook_fallback "$webhook_url"
    return 0
  fi

  if printf '%s\n' "$response_body" | grep -Fq "$webhook_url"; then
    info "GitHub webhook already exists for $APP_NAME."
    return 0
  fi

  json_payload="{\"name\":\"web\",\"active\":true,\"events\":[\"push\"],\"config\":{\"url\":\"$webhook_url\",\"content_type\":\"json\",\"insecure_ssl\":\"0\"}}"

  response=$(curl -sS -w "\n%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $token" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "$hooks_url" \
    -d "$json_payload" || true)
  http_code=$(printf '%s\n' "$response" | tail -n 1)
  response_body=$(printf '%s\n' "$response" | sed '$d')

  if is_2xx "$http_code" && printf '%s\n' "$response_body" | grep -q '"id"'; then
    info "GitHub webhook created for $APP_NAME."
    return 0
  fi

  if [[ "$http_code" == "422" ]] && printf '%s\n' "$response_body" | grep -Fq "Hook already exists"; then
    info "GitHub webhook already exists for $APP_NAME."
    return 0
  fi

  warning "failed to create GitHub webhook at $hooks_url (HTTP $http_code)"
  if [[ -n "$response_body" ]]; then
    printf '%s\n' "$response_body" >&2
  fi
  manual_webhook_fallback "$webhook_url"
}

wait_for_build() {
  local build_ref="$1"
  local phase=""
  local deadline=$((SECONDS + 900))

  while true; do
    phase=$(oc get -n "$namespace" "$build_ref" -o jsonpath='{.status.phase}' 2>/dev/null || true)

    case "$phase" in
      Complete)
        info "Build $build_ref completed."
        return 0
        ;;
      Failed | Error | Cancelled)
        error "Build $build_ref ended with phase '$phase'."
        printf 'Inspect logs with: oc logs -n %s %s\n' "$namespace" "$build_ref" >&2
        oc logs -n "$namespace" "$build_ref" --tail=80 >&2 || true
        exit 1
        ;;
    esac

    if ((SECONDS >= deadline)); then
      error "timed out waiting for build $build_ref to complete"
      printf 'Inspect logs with: oc logs -n %s %s\n' "$namespace" "$build_ref" >&2
      exit 1
    fi

    sleep 5
  done
}

configure_autodeploy() {
  local token=""
  local webhook_secret_value=""
  local server_url=""
  local webhook_url=""
  local started_build=""
  local build_ref=""

  need_command git
  need_command curl

  token=$(github_token)
  parse_git_origin

  if [[ -n "$image" ]]; then
    warning "--autodeploy uses the ImageStream build output; ignoring -i '$image'"
  fi

  ensure_github_source_secret "$token"
  webhook_secret_value=$(ensure_github_webhook_secret)

  apply_build_resources
  oc set build-secret -n "$namespace" --source "bc/$APP_NAME" "$GITHUB_SOURCE_SECRET"
  oc set triggers -n "$namespace" "deploy/$APP_NAME" --from-image="$APP_NAME:latest" -c "$APP_CONTAINER"

  server_url=$(oc whoami --show-server)
  server_url="${server_url%/}"
  webhook_url="${server_url}/apis/build.openshift.io/v1/namespaces/${namespace}/buildconfigs/${APP_NAME}/webhooks/${webhook_secret_value}/github"
  create_github_webhook "$token" "$webhook_url"

  started_build=$(oc start-build -n "$namespace" "$APP_NAME" -o name)
  build_ref="build/${started_build##*/}"
  info "Started $build_ref."
  wait_for_build "$build_ref"
}

capture_route_url() {
  local host=""
  local tls_termination=""
  local scheme="http"

  host=$(oc get route "$APP_NAME" -n "$namespace" -o jsonpath='{.spec.host}' 2>/dev/null || true)
  if [[ -z "$host" ]]; then
    route_url=""
    return
  fi

  tls_termination=$(oc get route "$APP_NAME" -n "$namespace" -o jsonpath='{.spec.tls.termination}' 2>/dev/null || true)
  if [[ -n "$tls_termination" ]]; then
    scheme="https"
  fi

  route_url="${scheme}://${host}"
}

print_summary() {
  local derived_value=""

  capture_route_url

  info ""
  info "Deployment summary"
  if [[ -n "$route_url" ]]; then
    info "Route: $route_url"
  else
    info "Route: not found"
  fi

  if [[ "$in_cluster_db_used" == "true" ]]; then
    info "Database: in-cluster PostgreSQL"
  elif [[ "$external_db_used" == "true" ]]; then
    info "Database: external DATABASE_URL from $ENV_FILE"
  else
    info "Database: not configured by this script"
  fi

  if [[ "$autodeploy" == "true" ]]; then
    info "Autodeploy: git push to main now builds and deploys automatically"
  fi

  if ((${#derived_env_summary[@]} > 0)); then
    for derived_value in "${derived_env_summary[@]}"; do
      info "Derived env: $derived_value"
    done
  fi
}

parse_args "$@"
check_preconditions
configure_database
ensure_route
capture_route_url
create_app_secret

oc apply -n "$namespace" -k "$OPENSHIFT_DIR"

if [[ "$autodeploy" == "true" ]]; then
  configure_autodeploy
elif [[ -n "$image" ]]; then
  oc set image -n "$namespace" "deploy/$APP_NAME" "$APP_CONTAINER=$image"
fi

oc rollout status -n "$namespace" "deploy/$APP_NAME"
print_summary
