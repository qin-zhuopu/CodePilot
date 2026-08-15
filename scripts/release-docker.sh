#!/usr/bin/env bash
#
# release-docker.sh —— 参数化 Docker 发布脚本
#
# 从指定的 git tag 构建 CodePilot Web 镜像并部署为容器。
# 版本号来自 tag:tag 为空或不存在则立即报错退出。
# 构建在容器内完成(见 Dockerfile 多阶段),不依赖宿主机 node 环境。
#
# 用法:
#   scripts/release-docker.sh <tag> [options]
#
# 参数:
#   <tag>              必填。git tag 名(如 v0.66.0-docker)。不存在则退出。
#
# 选项:
#   --port <port>      宿主机映射端口(默认 3000)
#   --name <name>      容器名(默认 codepilot-web)
#   --data <dir>       宿主机数据目录(默认 ~/.codepilot-web/data),挂载到 /app/data
#   --sqlite3-prebuild-host <url> better-sqlite3 预编译二进制镜像(默认 npmmirror)
#   --npm-registry <url> npm registry(默认 https://registry.npmmirror.com)
#   --no-run           只构建镜像,不启动容器
#   --keep-worktree    保留临时 worktree(调试用)
#   -h, --help         显示帮助
#
# 示例:
#   scripts/release-docker.sh v0.66.0-docker
#   scripts/release-docker.sh v0.67.0 --port 8080 --data /srv/codepilot/data
#
set -euo pipefail

# ---- 默认值 ----
PORT=3000
NAME=codepilot-web
DATA_DIR="${HOME}/.codepilot-web/data"
SQLITE3_PREBUILD_HOST=https://registry.npmmirror.com/-/binary/better-sqlite3
NPM_REGISTRY=https://registry.npmmirror.com
DO_RUN=1
KEEP_WORKTREE=0
CONTAINER_UID=1001   # 基础镜像内 dev 用户 uid,volume 目录须归属它

# ---- 颜色输出 ----
if [ -t 1 ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
  RED=; GREEN=; YELLOW=; BOLD=; RESET=
fi
info()  { echo "${GREEN}[release]${RESET} $*"; }
warn()  { echo "${YELLOW}[release]${RESET} $*"; }
err()   { echo "${RED}[release] ERROR:${RESET} $*" >&2; }
die()   { err "$*"; exit 1; }

usage() { sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

# ---- 解析参数 ----
TAG=""
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage 0 ;;
    --port)         PORT="${2:?--port 需要值}"; shift 2 ;;
    --name)         NAME="${2:?--name 需要值}"; shift 2 ;;
    --data)         DATA_DIR="${2:?--data 需要值}"; shift 2 ;;
    --http-proxy)   die "--http-proxy 已移除:better-sqlite3 预编译默认走 npmmirror 镜像,无需代理" ;;
    --sqlite3-prebuild-host) SQLITE3_PREBUILD_HOST="${2:?--sqlite3-prebuild-host 需要值}"; shift 2 ;;
    --npm-registry) NPM_REGISTRY="${2:?--npm-registry 需要值}"; shift 2 ;;
    --no-run)       DO_RUN=0; shift ;;
    --keep-worktree) KEEP_WORKTREE=1; shift ;;
    -*) die "未知选项:$1(用 --help 查看用法)" ;;
    *)
      if [ -z "$TAG" ]; then TAG="$1"; shift
      else die "多余参数:$1"; fi
      ;;
  esac
done

# ---- 校验 tag(硬性:空或不存在都退出) ----
[ -n "$TAG" ] || die "必须指定 git tag。用法:release-docker.sh <tag>"

# 定位仓库根目录
REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null)" \
  || die "当前不在 git 仓库内"
cd "$REPO_ROOT"

git rev-parse --verify --quiet "refs/tags/${TAG}" >/dev/null \
  || die "git tag '${TAG}' 不存在。请先打 tag,或检查拼写。"

IMAGE="${NAME}:${TAG}"
info "仓库根目录: ${REPO_ROOT}"
info "构建 tag:   ${BOLD}${TAG}${RESET}"
info "镜像名:     ${IMAGE}"
info "端口:       ${PORT}"
info "数据目录:   ${DATA_DIR}"

# ---- 用 worktree 导出干净的 tag 快照(不污染当前工作区) ----
WORKTREE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codepilot-release-XXXXXX")"
cleanup() {
  if [ "$KEEP_WORKTREE" -eq 1 ]; then
    warn "保留 worktree: ${WORKTREE_DIR}"
    return
  fi
  git worktree remove --force "$WORKTREE_DIR" 2>/dev/null \
    || rm -rf "$WORKTREE_DIR" 2>/dev/null || true
}
trap cleanup EXIT

info "导出 tag 快照到临时 worktree..."
git worktree add --detach --force "$WORKTREE_DIR" "refs/tags/${TAG}" >/dev/null

# tag 里必须自带 Dockerfile,否则无法构建
[ -f "${WORKTREE_DIR}/Dockerfile" ] \
  || die "tag '${TAG}' 里没有 Dockerfile。请确认该 tag 包含 Docker 构建文件。"

# ---- 构建镜像(容器内 build) ----
info "开始构建镜像(容器内 npm install + npm run build,可能需要 10-20 分钟)..."
docker build \
  -t "$IMAGE" \
  -t "${NAME}:latest" \
  --build-arg "SQLITE3_PREBUILD_HOST=${SQLITE3_PREBUILD_HOST}" \
  --build-arg "NPM_REGISTRY=${NPM_REGISTRY}" \
  "$WORKTREE_DIR" \
  || die "docker build 失败"
info "镜像构建完成:${IMAGE}(同时 tag 为 ${NAME}:latest)"

if [ "$DO_RUN" -eq 0 ]; then
  info "--no-run 指定,跳过启动容器。"
  exit 0
fi

# ---- 准备数据目录 + 修正 uid(踩坑:容器内 dev=uid 1001 需可写) ----
info "准备数据目录并修正属主为 uid ${CONTAINER_UID}..."
mkdir -p "$DATA_DIR"
if [ "$(stat -c '%u' "$DATA_DIR")" != "$CONTAINER_UID" ]; then
  if command -v sudo >/dev/null 2>&1; then
    sudo chown -R "${CONTAINER_UID}:${CONTAINER_UID}" "$DATA_DIR" \
      || die "chown 数据目录失败(容器内 SQLite 将无法写入)"
  else
    chown -R "${CONTAINER_UID}:${CONTAINER_UID}" "$DATA_DIR" 2>/dev/null \
      || die "数据目录属主不是 uid ${CONTAINER_UID} 且无 sudo,容器内 SQLite 将无法写入"
  fi
fi

# ---- 替换旧容器 ----
if docker ps -a --format '{{.Names}}' | grep -qx "$NAME"; then
  info "移除同名旧容器 ${NAME}..."
  docker rm -f "$NAME" >/dev/null
fi

info "启动容器..."
docker run -d \
  --name "$NAME" \
  -p "${PORT}:3000" \
  -v "${DATA_DIR}:/app/data" \
  -e PORT=3000 \
  -e HOSTNAME=0.0.0.0 \
  -e NODE_ENV=production \
  "$IMAGE" >/dev/null

# ---- 健康检查(轮询 /api/health) ----
info "等待服务就绪(健康检查 /api/health)..."
HEALTH_URL="http://localhost:${PORT}/api/health"
OK=0
for i in $(seq 1 30); do
  # --noproxy '*' 必须:若调用者 shell 设有 http_proxy/https_proxy,
  # 不绕过的话 curl 会把本地 localhost 请求也发给代理,导致
  # 健康检查恒返回 503/000。
  code="$(curl -s --noproxy '*' -o /dev/null -w '%{http_code}' "$HEALTH_URL" 2>/dev/null || echo 000)"
  if [ "$code" = "200" ]; then OK=1; break; fi
  # 容器提前退出则快速失败
  if ! docker ps --format '{{.Names}}' | grep -qx "$NAME"; then
    err "容器已退出,启动失败。最近日志:"
    docker logs --tail 30 "$NAME" 2>&1 | sed 's/^/    /' >&2
    exit 1
  fi
  sleep 2
done

echo ""
if [ "$OK" -eq 1 ]; then
  info "${BOLD}${GREEN}部署成功 ✅${RESET}"
  echo "  镜像:     ${IMAGE}"
  echo "  容器:     ${NAME}"
  echo "  访问地址: ${BOLD}http://localhost:${PORT}${RESET}"
  echo "  数据目录: ${DATA_DIR}  (挂载到 /app/data)"
else
  err "健康检查超时(60s 内 /api/health 未返回 200)。最近日志:"
  docker logs --tail 30 "$NAME" 2>&1 | sed 's/^/    /' >&2
  exit 1
fi
