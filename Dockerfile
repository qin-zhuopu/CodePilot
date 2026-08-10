# syntax=docker/dockerfile:1
# CodePilot Web —— 容器内多阶段构建
#
# 基础镜像特殊点(踩坑记录):
#   1. 默认用户是 dev (uid 1001, 非 root),无法写 /data,数据目录用 /app/data
#   2. node 通过 nvm 安装,PATH 需显式包含 nvm bin 目录
#   3. 基础镜像 ENTRYPOINT 是 /bin/zsh,必须清空,否则 `node server.js` 被当文件名打开
#
# 构建参数(可用 --build-arg 覆盖):
#   HTTP_PROXY_URL   —— better-sqlite3 预编译二进制走 GitHub 下载所需代理
#   NPM_REGISTRY     —— npm registry(默认 npmmirror,避开内网 nexus 超时)

ARG BASE_IMAGE=harbor.jereh.cn/base/ubuntu:24.04-node22-python312

# ============================================================
# Stage 1: builder —— 容器内安装依赖 + 构建 Next.js standalone
# ============================================================
FROM ${BASE_IMAGE} AS builder

ARG HTTP_PROXY_URL=http://172.24.0.5:3128
ARG NPM_REGISTRY=https://registry.npmmirror.com

# nvm 的 node 加入 PATH
ENV PATH="/home/dev/.nvm/versions/node/v22.22.0/bin:${PATH}"
ENV NODE_ENV=development
# better-sqlite3 预编译下载走代理;electron 桌面二进制在 web 部署里用不到,跳过
ENV http_proxy=${HTTP_PROXY_URL} \
    https_proxy=${HTTP_PROXY_URL} \
    ELECTRON_SKIP_BINARY_DOWNLOAD=1

WORKDIR /app

# 先只 COPY 依赖清单,利用 Docker 层缓存(依赖没变则不重装)
COPY --chown=dev:dev package.json package-lock.json* ./
COPY --chown=dev:dev apps/site/package.json ./apps/site/package.json

# npm install:npmmirror 快;better-sqlite3/zlib-sync 预编译失败时,镜像自带
# g++/make/python3 可兜底本地编译(node-gyp)。electron 二进制已跳过。
RUN npm install --registry=${NPM_REGISTRY} --fetch-timeout=120000 --fetch-retries=5

# COPY 源码并构建。registry 需为 build 期可能触发的按需安装保持一致。
COPY --chown=dev:dev . .
RUN npm run build

# ============================================================
# Stage 2: runtime —— 只带 standalone 产物,丢弃庞大的 node_modules
# ============================================================
FROM ${BASE_IMAGE} AS runtime

ENV PATH="/home/dev/.nvm/versions/node/v22.22.0/bin:${PATH}"
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    CLAUDE_GUI_DATA_DIR=/app/data

WORKDIR /app

# Next.js standalone 自带运行所需的精简 node_modules
COPY --chown=dev:dev --from=builder /app/.next/standalone ./
COPY --chown=dev:dev --from=builder /app/.next/static ./.next/static
COPY --chown=dev:dev --from=builder /app/public ./public

# 数据目录(SQLite / .codepilot),供 volume 挂载
RUN mkdir -p /app/data

EXPOSE 3000
# 清空基础镜像的 /bin/zsh entrypoint
ENTRYPOINT []
CMD ["node", "server.js"]
