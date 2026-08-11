#!/usr/bin/env bash
set -euo pipefail

# 读 .env 的键值对,export 为环境变量
set -a
[ -f .env ] && source .env
set +a

exec docker build \
    --build-arg NPM_REGISTRY="${NPM_REGISTRY:?NPM_REGISTRY not set in .env}" \
    --build-arg HTTP_PROXY_URL="${HTTP_PROXY_URL:?HTTP_PROXY_URL not set in .env}" \
    "$@" \
    -t codepilot-web:latest .
