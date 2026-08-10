# Docker Web 部署交接文档

在纯 Node.js 容器中运行 CodePilot 的 Web 服务(无需 Electron 桌面外壳)。

> 本文档随 `release/docker` 分支维护。相关文件:根目录 `Dockerfile`、`.dockerignore`、`scripts/release-docker.sh`。

## 这是什么

CodePilot 桌面端 = Electron 外壳 + Next.js 服务。Web 服务本身(Next.js App Router + API + SQLite)不依赖 Electron,可以单独跑在 Docker 容器里。

**适用场景:** 服务器部署、远程访问、多人共用一个实例。
**不适用:** 需要终端、本地文件 reveal、系统通知、自动更新等桌面能力时(见下方「功能降级」)。

## 快速开始

### 前置条件
- 已安装 Docker(支持多阶段构建 / BuildKit)
- 能访问基础镜像 `harbor.jereh.cn/base/ubuntu:24.04-node22-python312`
- 构建期需要 HTTP 代理(下载 npm 包 + better-sqlite3 预编译二进制)

### 一键发布(推荐)

用参数化脚本从指定 git tag 构建并部署:

```bash
# 构建期依赖走代理(better-sqlite3 预编译二进制从 GitHub 下载)
export https_proxy=http://172.24.0.5:3128 http_proxy=http://172.24.0.5:3128

scripts/release-docker.sh v0.66.0-docker
```

脚本会自动完成:导出 tag 快照 → 容器内构建 → 修正数据目录权限 → 替换旧容器 → 启动 → 健康检查 → 打印访问地址。

成功后访问 `http://localhost:3000`。

### 手动构建运行

```bash
export https_proxy=http://172.24.0.5:3128 http_proxy=http://172.24.0.5:3128

# 构建
docker build -t codepilot-web:latest \
  --build-arg HTTP_PROXY_URL=http://172.24.0.5:3128 \
  --build-arg NPM_REGISTRY=https://registry.npmmirror.com \
  .

# 数据目录须归属容器内 dev 用户(uid 1001),否则 SQLite 无法建库
mkdir -p ~/.codepilot-web/data
sudo chown -R 1001:1001 ~/.codepilot-web/data

# 运行
docker run -d \
  --name codepilot-web \
  -p 3000:3000 \
  -v ~/.codepilot-web/data:/app/data \
  codepilot-web:latest
```

## release-docker.sh 用法

```
scripts/release-docker.sh <tag> [options]
```

| 参数 / 选项 | 说明 | 默认值 |
|-------------|------|--------|
| `<tag>` | **必填**。git tag 名。为空或不存在立即报错退出。 | — |
| `--port <port>` | 宿主机映射端口 | `3000` |
| `--name <name>` | 容器名 | `codepilot-web` |
| `--data <dir>` | 宿主机数据目录(挂载到 `/app/data`) | `~/.codepilot-web/data` |
| `--http-proxy <url>` | 构建期代理 | `http://172.24.0.5:3128` |
| `--npm-registry <url>` | npm registry | `https://registry.npmmirror.com` |
| `--no-run` | 只构建镜像,不启动容器 | — |
| `--keep-worktree` | 保留临时 worktree(调试用) | — |

**示例:**
```bash
# 换端口和数据目录
scripts/release-docker.sh v0.67.0 --port 8080 --data /srv/codepilot/data

# 只构建镜像不运行
scripts/release-docker.sh v0.66.0-docker --no-run
```

**版本来源:** 镜像 tag 直接用传入的 git tag(如 `codepilot-web:v0.66.0-docker`),不读 package.json。脚本用 `git worktree` 导出该 tag 的干净快照到临时目录构建,不污染当前工作区。

## 架构

### 多阶段构建(Dockerfile)

```
builder 阶段(基础镜像)
  ├─ npm install(容器内,npmmirror registry)
  │    ├─ better-sqlite3 预编译二进制走代理从 GitHub 下载
  │    └─ ELECTRON_SKIP_BINARY_DOWNLOAD=1(web 部署不需要 electron 二进制)
  └─ npm run build → 产出 .next/standalone

runtime 阶段(同基础镜像)
  ├─ 只 COPY standalone 产物(丢弃 2.2GB 的完整 node_modules)
  ├─ .next/static + public
  └─ CMD ["node", "server.js"]
```

runtime 阶段只带 standalone 自包含的精简 node_modules,镜像显著瘦身。

### 运行时配置

| 环境变量 | 值 | 说明 |
|----------|-----|------|
| `NODE_ENV` | `production` | — |
| `PORT` | `3000` | 容器内监听端口 |
| `HOSTNAME` | `0.0.0.0` | 监听所有网卡(容器外可访问) |
| `CLAUDE_GUI_DATA_DIR` | `/app/data` | SQLite 数据库 + `.codepilot` 数据目录 |

### 数据持久化

SQLite 数据库存在 `/app/data`(WAL 模式,含 `.db` / `.db-shm` / `.db-wal`)。通过 `-v` 挂载到宿主机目录实现持久化,容器重启/重建数据不丢。

## 功能降级(web 模式 vs 桌面)

Web 模式缺少 `window.electronAPI`,以下功能降级或不可用:

| 功能 | web 模式表现 |
|------|--------------|
| 聊天 / API / SQLite / Bridge IM | ✅ 完全可用 |
| 文件夹选择器 | 降级为 HTML `<input>` 文件选择 |
| 终端 (Terminal) | 不可用(UI 隐藏) |
| 文件 reveal / 打开本地文件 | 不可用 |
| 原生通知 | 降级为浏览器通知 |
| Claude Code 安装向导 | 不可用 |
| 系统代理自动检测 | 需手动设置环境变量 |
| 自动更新 | 不可用 |

## 已知坑与根因(排查时先看这里)

基础镜像 `harbor.jereh.cn/base/ubuntu:24.04-node22-python312` 的特性导致 4 个坑,均已在 Dockerfile / 脚本里固化处理:

### 1. 数据目录权限:容器内 dev = uid 1001
基础镜像默认用户是 `dev`(uid 1001,非 root),无法创建 `/data`,也无法写宿主机挂载目录若其属主不是 1001。
- **症状:** SQLite `SQLITE_CANTOPEN` / `unable to open database file`,容器退出。
- **处理:** 数据目录用 `/app/data`;脚本自动 `sudo chown -R 1001:1001 <数据目录>`。

### 2. ENTRYPOINT 是 /bin/zsh
基础镜像把 `ENTRYPOINT` 设成了 `["/bin/zsh"]`,导致 `CMD ["node","server.js"]` 被解读为 `zsh node server.js`,zsh 把 `node` 当文件名打开。
- **症状:** `/bin/zsh: can't open input file: node`。
- **处理:** Dockerfile 里 `ENTRYPOINT []` 清空。

### 3. node 经 nvm 安装,PATH 不含 node
node 装在 `/home/dev/.nvm/versions/node/v22.22.0/bin`,非交互 shell 里不在 PATH。
- **症状:** `node: command not found`。
- **处理:** Dockerfile `ENV PATH` 显式包含 nvm bin 目录。

### 4. NODE_ENV=development 污染 next build
builder 阶段若设 `NODE_ENV=development`,会让 `next build` 时 React 加载 dev 构建,`/_global-error` 静态预渲染崩溃。
- **症状:** `TypeError: Cannot read properties of null (reading 'useContext')`,build exit 1。
- **处理:** builder 阶段不设 `NODE_ENV`。`npm install` 默认就装 devDependencies,不需要它。

### 附:代理污染本地健康检查
调用脚本时 shell 常设 `http_proxy`/`https_proxy`(供构建期下载),curl 健康检查会把本地 `localhost` 请求也发给代理,返回 503。
- **处理:** 脚本健康检查 curl 加 `--noproxy '*'`。

## 依赖网络说明

- **npm 包:** 走 `registry.npmmirror.com`(内网 `nexus.jereh.cn` 实测频繁超时,已弃用)。
- **better-sqlite3 二进制:** `prebuild-install` 从 GitHub 下载预编译包,需代理。Node 22 = ABI 127,linux-x64/glibc,与基础镜像匹配,一般直接命中预编译包不触发本地编译。若下载失败,镜像自带 `g++`/`make`/`python3` 可兜底 `node-gyp` 编译。
- **electron 二进制:** `ELECTRON_SKIP_BINARY_DOWNLOAD=1` 跳过(web 部署用不到,否则会卡在 GitHub 下载)。

## 常用运维命令

```bash
# 看日志
docker logs -f codepilot-web

# 健康检查(注意绕过代理)
curl --noproxy '*' http://localhost:3000/api/health   # {"status":"ok"}

# 停止 / 删除
docker stop codepilot-web && docker rm codepilot-web

# 进容器排查
docker exec -it codepilot-web bash
```
