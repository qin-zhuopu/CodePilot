# syntax=docker/dockerfile:1
# CodePilot Web —— 容器内多阶段构建
#
# 基础镜像: harbor.jereh.cn/base/node:22(内部 Node.js 22 镜像)
#
# 构建参数(可用 --build-arg 覆盖):
#   NPM_REGISTRY     —— npm registry(默认内网 nexus,可传入其他地址覆盖)
#   HTTP_PROXY_URL   —— better-sqlite3 预编译二进制走 GitHub 下载所需代理

ARG BASE_IMAGE=harbor.jereh.cn/base/node:22

# ============================================================
# Stage 1: builder —— 容器内安装依赖 + 构建 Next.js standalone
# ============================================================
FROM ${BASE_IMAGE} AS builder

# 构建参数仅作为默认值 / fallback(未传 secret 时使用)。
# 值本身不出现在镜像层中,只有被 secret mount 读取过才会留痕迹。
ARG HTTP_PROXY_URL=http://172.24.0.5:3128
ARG NPM_REGISTRY=https://registry.npmmirror.com

ENV NPM_CONFIG_REGISTRY=${NPM_REGISTRY} \
    ELECTRON_SKIP_BINARY_DOWNLOAD=1

WORKDIR /app

# 先只 COPY 依赖清单,利用 Docker 层缓存(依赖没变则不重装)
COPY package.json package-lock.json* ./
COPY apps/site/package.json ./apps/site/package.json

# 1) 安装依赖。从 secret 读取 NPM_REGISTRY 覆盖 ENV 默认值,
#    未传 secret 则走 ENV 中 ARG 的默认值。
#    --ignore-scripts: 跳过 better-sqlite3 postinstall(prebuild-install/node-gyp),
#    避免在容器内触发编译或网络下载。
RUN --mount=type=secret,id=npm_registry,dst=/run/secrets/npm_registry \
    --mount=type=cache,target=/root/.npm \
    NPM_REGISTRY=$(\
      [ -f /run/secrets/npm_registry ] \
      && cat /run/secrets/npm_registry \
      || echo "${NPM_REGISTRY}" \
    ); \
    npm ci -d --ignore-scripts --fetch-timeout=120000 --fetch-retries=5 \
      --registry=${NPM_REGISTRY:-$NPM_CONFIG_REGISTRY}

# 2) 预下载 better-sqlite3 预编译二进制并解压到位。
#    curl 走代理(从 secret 读取 HTTP_PROXY_URL)。
#    未传 secret 则走 ARG 默认值。
RUN --mount=type=secret,id=http_proxy,dst=/run/secrets/http_proxy \
    HTTP_PROXY_URL=$(\
      [ -f /run/secrets/http_proxy ] \
      && cat /run/secrets/http_proxy \
      || echo "${HTTP_PROXY_URL}" \
    ) && \
    mkdir -p node_modules/better-sqlite3/build/Release && \
    HTTP_PROXY=${HTTP_PROXY_URL} HTTPS_PROXY=${HTTP_PROXY_URL} \
    curl -fSL --connect-timeout 30 --max-time 300 \
      -o /tmp/better-sqlite3-prebuild.tar.gz \
      https://github.com/WiseLibs/better-sqlite3/releases/download/v12.6.2/better-sqlite3-v12.6.2-node-v127-linux-x64.tar.gz && \
    tar xzf /tmp/better-sqlite3-prebuild.tar.gz -C /tmp && \
    mv /tmp/build/Release/better_sqlite3.node node_modules/better-sqlite3/build/Release/

# COPY 源码并构建。
COPY . .
RUN npm run build

# ============================================================
# Stage 2: runtime —— 只带 standalone 产物,丢弃庞大的 node_modules
# ============================================================
FROM ${BASE_IMAGE} AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    CLAUDE_GUI_DATA_DIR=/app/data

WORKDIR /app

# Next.js standalone 自带运行所需的精简 node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 数据目录(SQLite / .codepilot),供 volume 挂载
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "server.js"]
