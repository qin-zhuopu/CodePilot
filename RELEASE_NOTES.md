## CodePilot v0.67.1

> 修复 GLM-5.3 在模型管理中显示“已添加”却无法看到或选择的问题，推荐使用智谱 CodePlan 的用户升级。

### 修复问题

- **修复 GLM-5.3 未出现在模型列表** — 打开模型管理后，旧版 GLM-5.2 目录会安全更新为当前 GLM-5.3、GLM-5-Turbo 与 GLM-4.7，不再出现候选显示“已添加”但列表仍停留在旧模型的情况。
- **修复隐藏模型无法恢复** — 已隐藏的 GLM 模型会明确显示“已添加（已隐藏）”，可以直接重新启用。
- **修复删除后重新添加丢失模型能力** — 从官方目录重新添加 GLM-5.3 时，会保留正确的实际请求模型、推理档位和上下文能力。
- **修复并发加载模型目录偶发失败** — 多个窗口或进程同时首次打开模型管理时，不再因重复写入导致请求失败。

### 优化改进

- 添加模型现在会同时识别 CodePilot 中的稳定模型 ID 和服务商实际模型 ID，避免同一个 GLM 模型重复出现。
- 模型搜索支持按 `glm-5.3[1m]` 等服务商实际模型 ID 查找。
- 目录同步只更新 CodePilot 管理且未被用户修改的模型；手动模型、用户编辑和隐藏状态不会被静默覆盖。

## 下载地址

### macOS
- [Apple Silicon (M1/M2/M3/M4)](https://github.com/op7418/CodePilot/releases/download/v0.67.1/CodePilot-0.67.1-arm64.dmg)
- [Intel](https://github.com/op7418/CodePilot/releases/download/v0.67.1/CodePilot-0.67.1-x64.dmg)

### Windows
- [Windows 安装包](https://github.com/op7418/CodePilot/releases/download/v0.67.1/CodePilot.Setup.0.67.1.exe)

### Linux x64
- [AppImage](https://github.com/op7418/CodePilot/releases/download/v0.67.1/CodePilot-0.67.1-x86_64.AppImage)
- [deb](https://github.com/op7418/CodePilot/releases/download/v0.67.1/CodePilot-0.67.1-amd64.deb)
- [rpm](https://github.com/op7418/CodePilot/releases/download/v0.67.1/CodePilot-0.67.1-x86_64.rpm)

### Linux arm64
- [AppImage](https://github.com/op7418/CodePilot/releases/download/v0.67.1/CodePilot-0.67.1-arm64.AppImage)
- [deb](https://github.com/op7418/CodePilot/releases/download/v0.67.1/CodePilot-0.67.1-arm64.deb)
- [rpm](https://github.com/op7418/CodePilot/releases/download/v0.67.1/CodePilot-0.67.1-aarch64.rpm)

## 安装说明

**macOS**：下载 DMG → 拖入 Applications → 首次启动如遇安全提示，在系统设置 > 隐私与安全中点击“仍要打开”

**Windows**：下载 exe 安装包 → 双击安装

**Linux**：AppImage 添加可执行权限后直接运行；Debian/Ubuntu 安装 deb；Fedora/RHEL 系安装 rpm

## 系统要求

- macOS 12.0+ / Windows 10+ / Linux (glibc 2.35+)
- 需要配置 API 服务商或受支持的套餐凭据
- 推荐安装 Claude Code CLI 以获得完整功能
