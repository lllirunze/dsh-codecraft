<div align="center">

# DSH CodeCraft

**在 DSH 原生文件 Tab 中使用 CodeMirror 6 安全、精确地编辑代码。**

[![npm version](https://img.shields.io/npm/v/dsh-codecraft?logo=npm&label=npm)](https://www.npmjs.com/package/dsh-codecraft)
[![DSH compatibility](https://img.shields.io/badge/DSH-0.2.1--rc.5-5b5bd6)](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.1-rc.5)
[![CI](https://github.com/lllirunze/dsh-codecraft/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/lllirunze/dsh-codecraft/actions/workflows/ci.yml)
[![platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Windows-4c8bf5)](#环境要求)
[![license](https://img.shields.io/github/license/lllirunze/dsh-codecraft)](LICENSE)

[English](README.md) · [简体中文](README.zh-CN.md) · [项目文档](docs/README.md)

</div>

> **当前状态：** v0.1.4 已通过自动化验证，发布前仍需完成真实 DSH Desktop 回归测试。

## 功能

- 复用 DSH 原生工作区文件树和文件 Tab。
- 提供语法高亮、行号、折叠、搜索、行注释、缩进、撤销重做和基础补全。
- 自动闭合常用括号与引号，并支持包裹选区、成对删除以及按语言启用反引号或 Python 三引号。
- 支持 2 格或 4 格空格缩进、回车展开通用括号，以及按整数边界执行单行或多行 Tab 操作。
- 在 DSH 设置中提供可选的自动保存，可选择 10、30、60 或 120 秒；默认关闭。
- macOS 使用 `Cmd+S`、Windows 使用 `Ctrl+S` 保存，并显示未保存、保存中、已保存、失败和只读状态。
- 检测外部文件变化，拒绝基于旧版本覆盖。
- 切换或关闭 Tab、刷新页面后恢复未保存草稿。
- 保留 LF/CRLF、UTF-8 BOM，并在系统支持时保留 POSIX 文件权限。
- 对超大、二进制、非 UTF-8、混合换行及其他不安全文件进行安全回退。
- 编辑过程完全在本地完成，不调用模型、不增加遥测、不上传文件。

## 环境要求

| 组件 | 支持范围 |
| --- | --- |
| 操作系统 | macOS 或 Windows |
| DSH Desktop | `0.2.1-rc.5` |
| Node.js | 从源码构建时需要 20 或更高版本 |

## 安装

### 从 npm 安装

```bash
dsh plugin --profile desktop add dsh-codecraft@latest
```

安装后重启 DSH Desktop。

### 从源码安装

```bash
git clone https://github.com/lllirunze/dsh-codecraft.git
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
dsh plugin --profile desktop add dsh-codecraft@0.1.4
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
3. 编辑文件后，在 macOS 按 `Cmd+S`，在 Windows 按 `Ctrl+S`；也可以点击状态栏中的保存操作。
4. 需要时可通过 Tab 上方的查看器菜单切换到 DSH 原生“代码”或“纯文本”预览。

自动保存默认关闭。在设置侧边栏打开 **设置 → CodeCraft** 即可启用，并选择 10、30、60 或 120 秒的保存间隔。自动保存和手动保存共用同一条冲突安全写入路径。

新增缩进始终使用空格。可以在同一设置区域选择 2 格或 4 格宽度；修改会立即作用于已打开的编辑器，但不会重写文件中的已有内容。

### 快捷键

| macOS | Windows | 功能 |
| --- | --- | --- |
| `Cmd+S` | `Ctrl+S` | 保存当前文件 |
| `Cmd+F` | `Ctrl+F` | 文件内搜索 |
| `Cmd+/` | `Ctrl+/` | 切换行注释 |
| `Cmd+Z` / `Cmd+Shift+Z` | `Ctrl+Z` / `Ctrl+Y` | 撤销 / 重做 |
| `Tab` / `Shift+Tab` | `Tab` / `Shift+Tab` | 缩进 / 反缩进 |
| `Ctrl+Space` | `Ctrl+Space` | 打开基础补全 |

## 文档

- [架构设计与验证记录](docs/README.md)
- [插件兼容性与已知解决办法](docs/plugin-compatibility.md)
- [更新记录](CHANGELOG.md)

## 限制

- CodeCraft 只支持不超过 2 MiB 的 UTF-8 源码和文本文件。
- 符号链接只能只读打开。
- 暂无 LSP、语义诊断、自动导入和跳转定义。
- Linux 尚未完成验证，目前不在支持范围内。
- 暂无多窗口草稿同步。

## 许可证

MIT，详见 [LICENSE](LICENSE)。
