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

> **当前状态：** v0.3.2 使用正确的包版本元数据重新发布已经验证的 Python 导航更新。

## 功能

- 复用 DSH 原生工作区文件树和文件 Tab。
- 提供语法高亮、行号、折叠、搜索、行注释、缩进、撤销重做和补全。
- 在 macOS 和 Windows 上提供项目级 Python 补全，包括 import、跨文件符号、推断成员和所选环境中的依赖。
- 在明确的 Python 调用位置接受方法、函数或构造器补全时自动加入括号，同时保留回调等可调用对象引用。
- 将未保存的 Python 内容同步到工作区级 Pyright，并通过 DSH 托管子进程服务管理其生命周期。
- 鼠标悬停在 Python 标识符上时，显示 Pyright 返回的签名、类型、Docstring 和来源位置。
- 在 macOS 使用 `Command+点击`、Windows 使用 `Ctrl+点击` 从使用位置跳转到定义，并在声明位置打开按文件分组的引用结果。
- 在 DSH 原生文件 Tab 中打开跨文件导航目标，并提供精确范围的后退与前进历史。
- 自动闭合常用括号与引号，并支持包裹选区、成对删除以及按语言启用反引号或 Python 三引号。
- 支持 2 格或 4 格空格缩进、回车展开通用括号，以及按整数边界执行单行或多行 Tab 操作。
- 根据 Python 语法上下文处理代码块、分支、多行表达式和结束括号的缩进。
- 仅在 Python 函数、方法、异步函数或类的首个语句位置，通过 `"""` + Enter 生成 Google Style Docstring 占位模板。
- 无需语言服务器即可提供本地 Java 关键字、常用类型、代码片段和当前文档标识符补全。
- 根据 Java 文档中已有的方法或构造器声明生成 CodeCraft Structured Javadoc。
- 完全离线支持 Java 括号、缩进、行注释、折叠以及常用声明和控制流代码片段。
- 取消过期补全请求、限制 Pyright 恢复次数，并在工作区没有 Python 文档后清理语言服务器会话。
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
| 基础编辑器 | macOS 或 Windows |
| Python 智能编程 | macOS 或 Windows |
| Java 编辑 | v0.3.0 支持 macOS 或 Windows；无需 JDK |
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
dsh plugin --profile desktop add dsh-codecraft@0.3.2
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

新增缩进始终使用空格。可以在同一设置区域选择 2 格或 4 格宽度；修改会立即作用于已打开的编辑器，但不会重写文件中的已有内容。Python 文件还会根据语法上下文处理代码块、分支和多行表达式的回车缩进。

要生成 Google Style Docstring，请在 Python 函数、方法、异步函数或类的首个语句位置输入 `"""`，并在自动配对的引号中按 Enter。只有语法上下文明确时，CodeCraft 才会生成可编辑的摘要、`Args`、`Returns` 或 `Yields` 占位内容。模块顶层、赋值表达式、嵌套代码块、后续语句以及带前缀的三引号仍按普通多行字符串处理。

在 macOS 和 Windows 的 Python 文件中，Python 智能编程默认开启。CodeCraft 使用随附的 Pyright，优先选择明确设置的解释器或工作区 `.venv`/`venv`；PATH 回退在 macOS 上优先使用 `python3`，在 Windows 上优先使用 `python`。可以在 **设置 → CodeCraft → Python 智能编程** 中关闭语义补全，或指定解释器和语言服务器的绝对路径。状态栏会显示“启动中”“就绪”或“不可用”；智能服务不可用时不会影响普通编辑和保存。

语义补全会在输入时自动打开，包括输入 `service.` 这类成员访问点之后。当 Pyright 只提供可调用名称，并且当前位置是明确的调用表达式时，接受方法、函数或构造器补全会插入 `()` 并把光标留在括号内。赋值右侧、回调参数、容器、import、装饰器、已有 snippet 或括号都保持不变。CodeCraft 不绑定 macOS 的 `Option` 组合键，因为它们可能产生输入法组合字符；如果操作系统没有占用 `Ctrl+Space`，仍可使用它手动打开补全。

将鼠标悬停在 Python 标识符上，可以查看 Pyright 提供的信息。在 macOS 使用 `Command+点击`、Windows 使用 `Ctrl+点击` 可从使用位置跳转到定义；在声明位置使用相同操作会打开按文件分组的引用列表。跨文件目标会在 DSH 原生 Tab 中打开。编辑器状态栏中的左右箭头或 `Command/Ctrl+Alt+左/右方向键` 可在成功的导航历史中移动。

`.java` 文件会自动启用 Java 支持。补全内容包括 Java 关键字、常用标准库类型、`psvm` 和 `sout` 等代码片段，以及当前文档中的标识符。在完整的方法或构造器声明上方输入 `/**` 并按 Enter，可生成 CodeCraft Structured Javadoc。可通过 **设置 → CodeCraft → Java 编辑辅助** 即时关闭或恢复已打开及后续 Java Tab 的这些专属能力；该设置默认开启并会在重启后保留。关闭后普通编辑和保存仍然可用。这些功能均在本地运行，不需要 JDK、JDT LS、Java 进程、额外下载或网络连接。Java 补全属于词法辅助，不会解析 import、依赖、推断成员或跨文件符号。

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
- 暂未提供 Python 悬浮说明、参数提示、诊断、跨文件自动编辑和跳转定义。
- 暂未提供 Java 语义补全、诊断、导航、重构和构建集成。
- Linux 尚未完成验证，目前不在支持范围内。
- 暂无多窗口草稿同步。

## 许可证

MIT，详见 [LICENSE](LICENSE)。
