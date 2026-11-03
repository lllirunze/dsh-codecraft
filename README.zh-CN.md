# DSH CodeCraft

使用 CodeMirror 6 在 DSH 原生文件 Tab 中直接编辑源码和文本文件。

[English](README.md)

> **当前状态：** v0.1.0 正处于发布前验收阶段。代码实现和自动化检查已经完成，真实 DSH Desktop 交互仍需完成最终手工验收。

## 功能

- 复用 DSH 原生工作区文件树和文件 Tab。
- 提供语法高亮、行号、折叠、搜索、行注释、缩进、撤销重做和基础补全。
- 使用 `Cmd+S` 保存，并显示未保存、保存中、已保存、失败和只读状态。
- 检测外部文件变化，拒绝基于旧版本覆盖。
- 切换或关闭 Tab、刷新页面后恢复未保存草稿。
- 保留 LF/CRLF、UTF-8 BOM 和 POSIX 文件权限。
- 对超大、二进制、非 UTF-8、混合换行及其他不安全文件进行安全回退。
- 编辑过程完全在本地完成，不调用模型、不增加遥测、不上传文件。

## 环境要求

- macOS；主要支持目标为 Apple Silicon。
- DSH Desktop `0.2.1-rc.5`。
- 从源码构建需要 Node.js 20 或更高版本。

## 安装

### 从 npm 安装

软件包发布后使用：

```bash
dsh plugin --profile desktop add dsh-codecraft@latest
```

安装后重启 DSH Desktop。

### 从源码安装

```bash
git clone <repository-url>
cd dsh-codecraft
npm install
npm run check
dsh plugin --profile desktop add "$PWD"
```

安装后重启 DSH Desktop。插件清单会自动把 CodeCraft 加入选定的 DSH profile，不需要手工修改 profile 配置。

## 更新

将 npm 安装更新到最新发布版本：

```bash
dsh plugin --profile desktop update --latest dsh-codecraft
```

也可以安装指定版本来替换当前版本：

```bash
dsh plugin --profile desktop add dsh-codecraft@0.1.0
```

更新后重启 DSH Desktop。

如果使用本地源码安装，需要拉取新代码、重新构建并刷新 profile 依赖：

```bash
git pull
npm install
npm run check
dsh plugin --profile desktop add "$PWD"
```

CodeCraft 当前没有应用内更新提示或后台自动更新功能。安装和更新由 DSH CLI 管理。

## 卸载

```bash
dsh plugin --profile desktop remove dsh-codecraft
```

重启 DSH Desktop 后，原生文件预览会自动恢复。

## 使用

1. 从 DSH 工作区文件树打开受支持的源码或文本文件。
2. DSH 打开原生文件 Tab，并选择 CodeCraft 渲染器。
3. 编辑文件后按 `Cmd+S`，或点击状态栏中的保存操作。
4. 需要时可通过 Tab 上方的查看器菜单切换到 DSH 原生“代码”或“纯文本”预览。

### 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Cmd+S` | 保存当前文件 |
| `Cmd+F` | 文件内搜索 |
| `Cmd+/` | 切换行注释 |
| `Cmd+Z` / `Cmd+Shift+Z` | 撤销 / 重做 |
| `Tab` / `Shift+Tab` | 缩进 / 反缩进 |
| `Ctrl+Space` | 打开基础补全 |

## 限制

- v0.1.0 只支持不超过 2 MiB 的 UTF-8 源码和文本文件。
- 符号链接只能只读打开。
- 暂无 LSP、语义诊断、自动导入和跳转定义。
- v0.1.0 不支持 Windows 和 Linux。
- 暂无多窗口草稿同步。

## 许可证

MIT，详见 [LICENSE](LICENSE)。
