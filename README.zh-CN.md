<div align="center">

<img src="assets/favicon.svg" alt="dsh-codecraft logo" width="144" height="144">

# DSH CodeCraft

**在 DSH 原生文件 Tab 中使用 CodeMirror 6 安全、精确地编辑代码。**

[![npm version](https://img.shields.io/npm/v/dsh-codecraft?logo=npm&label=npm)](https://www.npmjs.com/package/dsh-codecraft)
[![DSH compatibility](https://img.shields.io/badge/DSH-0.2.2--rc.3-5b5bd6)](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.3)
[![CI](https://github.com/lllirunze/dsh-codecraft/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/lllirunze/dsh-codecraft/actions/workflows/ci.yml)
[![platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Windows-4c8bf5)](#环境要求)
[![license](https://img.shields.io/github/license/lllirunze/dsh-codecraft)](LICENSE)

[English](README.md) · [简体中文](README.zh-CN.md) · [项目文档](docs/README.md)

</div>

> **当前状态：** v0.5.5 已在 macOS 和 Windows 的 DSH Desktop 0.2.2-rc.3 上完成 CodeCraft 全语言 GitHub Default 语法配色、六级括号配色及 Material 通用图标回退验证。

## 功能

- 集成 DSH 原生工作区文件树和文件 Tab，并提供文件操作、路径面包屑与 Material 文件图标。
- 基于 CodeMirror 提供 GitHub Default 浅色/深色语法配色、六级括号配色、折叠、搜索、注释、补全、撤销重做及 2 格或 4 格缩进。
- 对可写修改进行冲突检查并立即保存，同时保留换行符、UTF-8 BOM 和受支持的文件权限；不安全文件会安全回退。
- 通过托管的 Pyright 提供项目级 Python 补全、Hover、定义/引用跳转、导航历史、语法缩进和 Google Style Docstring。
- 完全本地提供 Java 补全、代码片段、Structured Javadoc、缩进、注释和折叠，无需 JDK 或语言服务器。
- 离线提供 HTML 补全、诊断、大纲、导航、格式化、Emmet、安全标签/ID 重命名和浏览器预览。
- 提供持久化的按语言设置；主开关始终可见，Python 详细配置可展开或收起。
- 所有编辑均在本地完成，不调用模型、不增加遥测、不上传文件。

## 环境要求

| 组件 | 支持范围 |
| --- | --- |
| 基础编辑器 | macOS 或 Windows |
| Python 智能编程 | macOS 或 Windows |
| Java 编辑 | v0.3.0 支持 macOS 或 Windows；无需 JDK |
| HTML 编辑 | v0.4.2 支持 macOS 或 Windows；完全离线 |
| DSH Desktop | `0.2.2-rc.3` |
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
dsh plugin --profile desktop add dsh-codecraft@0.5.5
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
2. 直接在原生 Tab 中编辑。可写修改会通过冲突检查立即保存；状态栏会提示只读、外部变更、冲突或保存失败。
3. 打开 **设置 → CodeCraft** 选择 2 格或 4 格缩进，并配置 Python、Java 和 HTML 编辑辅助。关闭辅助功能不会影响普通编辑和保存。
4. 需要时可通过 Tab 上方的查看器菜单切换到 DSH 原生“代码”或“纯文本”预览。

各语言的主要用法：

- **Python：** 随附的 Pyright 提供补全和 Hover。macOS 使用 `Command+点击`、Windows 使用 `Ctrl+点击` 跳转到定义或查看引用；可在展开的 Python 设置中指定解释器和服务器路径。
- **Java：** `.java` 文件提供本地词法补全与代码片段。在方法或构造器上方输入 `/**` 并按 Enter，可生成 Structured Javadoc。
- **HTML：** `.html` 和 `.htm` 文件离线提供补全、诊断、导航、格式化、重构和**在浏览器中预览**，无需语言服务器或网络连接。

### 快捷键

| macOS | Windows | 功能 |
| --- | --- | --- |
| `Cmd+S` | `Ctrl+S` | 保存当前文件 |
| `Cmd+F` | `Ctrl+F` | 文件内搜索 |
| `Cmd+/` | `Ctrl+/` | 切换行注释 |
| `Cmd+Z` / `Cmd+Shift+Z` | `Ctrl+Z` / `Ctrl+Y` | 撤销 / 重做 |
| `Tab` / `Shift+Tab` | `Tab` / `Shift+Tab` | 缩进 / 反缩进 |
| — | `Ctrl+Space` | 手动打开补全 |

## 文档

- [架构设计与验证记录](docs/README.md)
- [插件兼容性与已知解决办法](docs/guide/plugin-compatibility.md)
- [更新记录](CHANGELOG.md)

## 限制

- CodeCraft 只支持不超过 2 MiB 的 UTF-8 源码和文本文件。
- 符号链接只能只读打开。
- 暂未提供 Python 参数提示、诊断、跨文件自动编辑和重构。
- 暂未提供 Java 语义补全、诊断、导航、重构和构建集成。
- HTML 诊断和重构仅限当前文档；暂不包含 CSS/JavaScript 分析、跨文件重命名和跨语言工程关联。
- Linux 尚未完成验证，目前不在支持范围内。

## 许可证

MIT，详见 [LICENSE](LICENSE)。
