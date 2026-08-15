#!/usr/bin/env bash
set -euo pipefail

# 读 .env 的键值对,export 为环境变量
set -a
[ -f .env ] && source .env
set +a

# SQLITE3_PREBUILD_HOST 可选:better-sqlite3 预编译二进制镜像,
# 默认 npmmirror(Dockerfile 内置),需要覆盖时在 .env 里设置。
exec docker build \
    --build-arg NPM_REGISTRY="${NPM_REGISTRY:?NPM_REGISTRY not set in .env}" \
    ${SQLITE3_PREBUILD_HOST:+--build-arg SQLITE3_PREBUILD_HOST="${SQLITE3_PREBUILD_HOST}"} \
    "$@" \
    -t codepilot-web:latest .
