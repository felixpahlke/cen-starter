#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 -n <namespace> [-i <image>]" >&2
  exit 2
}

namespace=""
image=""

while getopts ":n:i:h" opt; do
  case "$opt" in
    n) namespace="$OPTARG" ;;
    i) image="$OPTARG" ;;
    h) usage ;;
    :) echo "error: -$OPTARG requires a value" >&2; usage ;;
    \?) echo "error: unknown option -$OPTARG" >&2; usage ;;
  esac
done

shift $((OPTIND - 1))

if [ $# -ne 0 ] || [ -z "$namespace" ]; then
  usage
fi

if ! command -v oc >/dev/null 2>&1; then
  echo "error: oc CLI not found in PATH" >&2
  exit 1
fi

if ! oc whoami >/dev/null 2>&1; then
  echo "error: oc whoami failed; log in with 'oc login' and try again" >&2
  exit 1
fi

if ! oc get namespace "$namespace" >/dev/null 2>&1; then
  echo "error: namespace '$namespace' does not exist or is not accessible" >&2
  exit 1
fi

if [ ! -f .env.production ]; then
  echo "error: .env.production is missing; create it from .env.production.example" >&2
  exit 1
fi

oc create secret generic app-env --from-env-file=.env.production --dry-run=client -o yaml \
  | oc apply -n "$namespace" -f -

oc apply -n "$namespace" -k deploy/openshift

if [ -n "$image" ]; then
  oc set image -n "$namespace" deploy/cen-app cen-app="$image"
fi

oc rollout status -n "$namespace" deploy/cen-app
