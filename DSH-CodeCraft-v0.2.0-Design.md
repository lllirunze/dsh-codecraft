# DSH CodeCraft v0.2.0 设计文档

> **版本名称：** Python Intelligence & Extensible Intelligence Architecture  
> **版本号：** `v0.2.0`  
> **版本性质：** 次版本 / 智能编程基础架构里程碑  
> **状态：** 设计稿，待与现有仓库及 DSH Desktop API 核对  
> **平台：** macOS  
> **基础版本：** `v0.1.4`（按计划完成通用缩进后）  
> **首个落地目标：** Python 项目级智能编程

---

## 1. 背景与版本定位

CodeCraft `0.1.x` 专注通用代码编辑体验：依托 DSH Desktop 原生工作区文件树和文件 Tab，在文件内容区域提供轻量、可靠、美观的编辑能力；包括安全保存、自动保存、括号配对、通用缩进等。这些能力不针对具体编程语言提供专属语义规则。

从 `0.2.0` 开始，CodeCraft 正式增加**智能编程能力层**。本版本不仅要支持 Python，还要首次实现可供后续语言、框架和生态扩展复用的基础架构。

**本版本的两项并列成果：**

1. **架构成果**：通用智能编程父级抽象、统一能力接口、可扩展的语言/框架能力关系、LSP 连接与生命周期管理、编辑器桥接。
2. **可用成果**：Python 的项目级语义补全，包括 import、跨文件符号、对象成员、已安装依赖，以及基本类型说明与导航能力（按照优先级交付）。

不以“编辑器弹出了候选列表”作为成功标准；应在真实 Python 项目中验证语义补全正确性与稳定性。

### 1.1 长期版本规则

- `0.1.x`：通用编辑器能力，不实现语言专属规则。
- `0.2.0`：首个智能编程基础架构 + Python。
- 后续每个次版本**通常聚焦一个新的智能编程能力单元**，可以是语言、框架或开发生态，不强制每次新增语言。
- 修订版本用于缺陷修复、兼容性与已有功能完善；重大新增能力可以根据实际范围安排次版本。
- 语言和框架版本顺序**不提前锁死**。PyTorch、Spring Boot 等只是潜在路线，不构成承诺。

### 1.2 项目长期约束

- 个人维护的开源插件，严格控制代码规模与依赖复杂度。
- 只支持 macOS，暂不承担 Windows/Linux 兼容工作。
- 复用 DSH 原生 Workspace Files 树、原生文件 Tab，不创建第二套文件管理、终端、Git、Agent、构建或调试系统。
- `dsh-better-sidebar` 是**独立插件**，不是 CodeCraft 的技术依赖，也不要求版本兼容矩阵。
- 遵守 DSH 官方提供的插件 API；不得为实现功能依赖不稳定的私有 DOM 注入或未经授权的宿主能力。
- 保留现有文档草稿、安全保存、冲突检测及自动保存保障。
- GitHub 仓库默认分支遵循项目现有的 `master`，不改为 `main`。

---

## 2. 范围与交付优先级

### 2.1 P0：必须交付

| 模块 | 功能 | 验收重点 |
|---|---|---|
| 基础架构 | `BaseIntelligence` 及能力提供者接口 | 具体语言可继承/扩展；不与 Python 耦合 |
| 基础架构 | 能力注册、激活与组合 | 按文件语言/工作区选择有效能力 |
| LSP | 可复用客户端、传输、进程与会话管理 | 连接、初始化、取消、重启、关闭均正确 |
| 文档同步 | 与 CodeCraft 内存文档状态一致 | 未保存内容也能得到准确补全 |
| UI | CodeMirror 6 补全桥接 | 候选、排序、选择、插入、失败回退正常 |
| Python | Python 文件识别与工作区上下文 | 在项目根目录内正确解析相关模块 |
| Python | import 补全 | 包名、模块名、可导入符号 |
| Python | 对象成员补全 | `obj.` 显示可解析的方法、属性 |
| Python | 跨文件符号补全 | 同一项目不同 `.py` 文件中可访问符号 |
| Python | 解释器及依赖环境识别 | 支持常见 `.venv`、明确配置与异常反馈 |
| 安全与回归 | 原生 Tab、保存、自动保存、缩进不退化 | 能卸载、能回退，不丢草稿 |

### 2.2 P1：建议在 P0 稳定后补充

- 函数参数签名提示（Signature Help）。
- 悬浮类型与文档说明（Hover）。
- 跳转定义（Go to Definition），复用 DSH 允许的原生文件打开/定位接口。
- Python 语法与类型诊断的基本展示（波浪线与悬浮信息）。
- 对已选定补全项的附加导入编辑（当语言服务器返回标准编辑且宿主安全写入机制允许时）。

**P1 若未完成，不应模糊宣称已支持；应在 CHANGELOG 和 Release 中准确标注。**

### 2.3 明确不在本次实现

- PyTorch、Django、FastAPI 等 Python 框架专属智能分析。
- Java、C++、TypeScript、YAML 等其他语言的 LSP 集成。
- Code Quality 自定义规则引擎、企业 CodeCheck 规则移植、AI 修复。
- 自动大规模重构、调试、运行 Python、包管理器 UI、虚拟环境创建器。
- 自建 Python 类型推断器、源码索引数据库或完整语法分析引擎。
- 独立文件树、Tab 系统、命令行终端、Git 面板。
- Notebook 单元格语义同步与专属交互；`.ipynb` 不作为 P0 支持对象。

---

## 3. 架构原则：通用父级能力不是孤立系统

### 3.1 分层能力关系

```text
BaseIntelligence（通用智能编程基础）
├── PythonIntelligence（Python 语言能力）
│   ├── PyTorch 扩展（未来）
│   ├── Django 扩展（未来）
│   └── FastAPI 扩展（未来）
├── JavaIntelligence（未来）
│   ├── Spring Boot 扩展（未来）
│   └── MyBatis 扩展（未来）
└── 其他语言/配置生态能力（未来）
```

**约束：**

1. 通用基础类定义统一能力入口、共享策略、默认行为与生命周期。
2. 语言实现继承或实现上述抽象，并只补充语言特有的项目环境、协议配置和语义能力。
3. 框架能力明确依附于对应语言或生态基础，不重复搭建补全 UI、诊断 UI 或 LSP 客户端。
4. 同一项目存在多个框架时允许并存，因此框架增强建议采用**父级能力复用 + Provider 组合/委托**，而不是强制多层单继承。
5. 能力缺失时必须可降级，不得让某一框架或语言模块故障拖垮编辑器。
6. 不在 0.2.0 里创建尚未落地的框架目录和复杂继承链；仅确立可验证的扩展接口与约束。

### 3.2 与通用编辑器层的边界

| 层次 | 职责 | 典型实现 |
|---|---|---|
| `editor/` | 输入、选区、CodeMirror 展示与交互 | 缩进、括号、补全弹窗适配 |
| `document/` | 文档内存状态、版本、保存与冲突 | dirty 状态、保存服务 |
| `intelligence/` | 通用智能能力的**父类与协调层** | Provider、能力组合、请求协调 |
| `lsp/` | 标准协议、通信、会话与进程 | initialize、didChange、completion |
| `languages/` | 具体语言能力，**扩展 intelligence** | Python 项目与解释器识别 |
| `frameworks/` | 框架增强，**复用语言基础** | 未来 PyTorch、Spring Boot |
| `ecosystems/` | 工具链与生态增强 | 未来 Helm、Kubernetes 等 |
| `settings/` | 用户可见配置与持久化 | server 路径、启用状态 |
| `host/` | 与 DSH Desktop 已公开能力的边界 | 文件、Tab、进程桥接（若支持） |

严格区分：**CodeMirror 自动补全弹窗属于编辑器 UI；智能补全来源和合并策略属于 intelligence；LSP 协议属于 lsp；语言服务器的启动参数和解释器环境属于 languages。**

### 3.3 推荐依赖方向

```text
DSH 原生 Workspace Files / Tab
             │
             ▼
          editor/  ──调用──> intelligence/  <──扩展── languages/
             │                    │                    ▲
             ▼                    ▼                    │
         document/              lsp/  <──────配置─────┘
                                  │
                                  ▼
                           host/ 受控进程接口

未来 frameworks/、ecosystems/ 通过 intelligence 的能力协议
挂载到已存在的语言/项目上下文，不创建第二套编辑器。
```

---

## 4. 推荐代码目录

此结构为**职责划分目标**，应按当前 v0.1.4 实际代码进行最小迁移，不为文件名一致而重建现有功能。

```text
src/
├── core/
│   └── ...                        # 插件生命周期与初始化
│
├── editor/
│   ├── extensions/                # 现有通用编辑扩展
│   └── intelligence-bridge.ts     # CodeMirror 与智能能力的桥接
│
├── intelligence/
│   ├── base/
│   │   ├── BaseIntelligence.ts    # 通用父级能力
│   │   ├── capabilities.ts        # 能力声明
│   │   └── context.ts             # 统一文档/项目上下文
│   ├── completion/
│   │   ├── types.ts
│   │   ├── provider.ts
│   │   └── coordinator.ts         # 查询/取消/过滤/去重
│   └── registry.ts                # 能力注册、选择、生命周期
│
├── lsp/
│   ├── client.ts                  # LSP 请求/通知与能力协商
│   ├── transport.ts               # 传输抽象
│   ├── process-manager.ts         # 服务进程与失败恢复
│   ├── document-sync.ts           # 内存文档同步
│   └── session-manager.ts         # 工作区/语言服务器会话
│
├── languages/
│   ├── base/
│   │   └── LanguageIntelligence.ts # 语言基类/契约
│   └── python/
│       ├── PythonIntelligence.ts  # 首个语言实现
│       ├── server.ts              # 服务启动与能力配置
│       ├── environment.ts         # Python 环境发现
│       └── workspace.ts           # 项目根目录与配置
│
├── document/                      # 复用已有安全文档机制
├── settings/                      # 复用 AutoSave/Indentation 设置能力
└── host/                          # DSH 公开 API 的隔离层
```

`frameworks/`、`ecosystems/` 暂不要求创建。未来使用时再增加，并优先采用能力注册机制，而非通过硬编码修改 Python 或 Java 的核心实现。

---

## 5. 通用能力抽象设计

### 5.1 统一上下文

```typescript
interface IntelligenceContext {
  documentUri: string;
  languageId: string;
  workspaceUri?: string;
  documentVersion: number;
  position: { line: number; character: number };
}

interface IntelligenceCapabilities {
  completion?: boolean;
  hover?: boolean;
  signatureHelp?: boolean;
  definition?: boolean;
  diagnostics?: boolean;
}
```

这里 `line`/`character` 代表**适配后的统一文档位置**，不是 CodeMirror 的绝对字符偏移。需要在桥接层进行严格转换；LSP 位置编码要通过协议初始化协商，不能在多字节/代理对字符上假定偏移一致。

### 5.2 基类与 Provider 合作

下面仅用于表达继承、默认实现和能力组合的关系；正式编码时按现有代码与实际接口调整。

```typescript
interface CompletionProvider {
  provideCompletions(
    context: IntelligenceContext,
    signal: AbortSignal
  ): Promise<CompletionItem[]>;
}

interface CompletionItem {
  label: string;
  kind?: string;
  detail?: string;
  insertText?: string;
}

abstract class BaseIntelligence {
  protected completionProviders: CompletionProvider[] = [];

  registerCompletionProvider(provider: CompletionProvider): void {
    this.completionProviders.push(provider);
  }

  async complete(
    context: IntelligenceContext,
    signal: AbortSignal
  ): Promise<CompletionItem[]> {
    const results = await Promise.allSettled(
      this.completionProviders.map(p =>
        p.provideCompletions(context, signal)
      )
    );

    return mergeAndRank(
      results.flatMap(r => r.status === "fulfilled" ? r.value : [])
    );
  }
}

abstract class LanguageIntelligence extends BaseIntelligence {
  abstract readonly languageId: string;
  abstract activate(workspaceUri?: string): Promise<void>;
  abstract dispose(): Promise<void>;
}

class PythonIntelligence extends LanguageIntelligence {
  readonly languageId = "python";
  // 复用 BaseIntelligence 的完成流程，注册 Python LSP Provider。
  async activate(workspaceUri?: string): Promise<void> { /* ... */ }
  async dispose(): Promise<void> { /* ... */ }
}
```

`mergeAndRank` 为示意函数，尚需实现。实际版应尊重服务端 `sortText`、`filterText`、`textEdit`、`additionalTextEdits`、Snippet 格式、候选更新范围等协议语义；**不能只保留示例中的五个字段**，也不能仅拼接文本而丢失补全编辑信息。

### 5.3 框架增强的预留方式

未来的 PyTorch 能力可以依赖 Python 上下文并额外注册 Provider：

```typescript
interface IntelligenceExtension {
  id: string;
  requires: { language?: string; capabilities?: string[] };
  activate(base: BaseIntelligence): Promise<void>;
  deactivate(): Promise<void>;
}
```

例如 PyTorch 扩展声明 `requires.language = 'python'`，将额外的 PyTorch 语义补全注册到已有 PythonIntelligence 之上；Python LSP 基础能力仍然保留。这样同一项目未来可以并行启用 PyTorch、FastAPI 等扩展，不会形成互斥的单继承分叉。

**0.2.0 只验证通用父类与 Python 子类的真实关系；框架扩展仅保留接口设计，不实现 PyTorch。**

---

## 6. LSP 基础设施

### 6.1 为什么选择 LSP

Language Server Protocol 将编辑器与语言分析器解耦。CodeCraft 可以复用通用客户端，通过不同语言适配器连接各自的语言服务器，避免自己开发类型推断、依赖解析和全项目符号分析。

P0 实现的协议闭环：

```text
启动服务进程
  → initialize / initialized
  → textDocument/didOpen
  → textDocument/didChange（内存版本）
  → textDocument/completion
  → CompletionItem 转换及应用
  → textDocument/didClose
  → shutdown / exit
```

其它能力按已协商的服务器能力逐步启用，不能假定所有服务器都支持每个 LSP 方法。

### 6.2 运行时能力验证是阻断条件

在编写完整 LSP 模块前必须确认：

1. DSH Desktop 插件公开 API 是否允许启动、管理受控本地语言服务器进程。
2. 是否允许标准输入/输出或其他受支持传输通道，实现稳定双向 JSON-RPC 通信。
3. 插件 Tab 与工作区文件是否提供**稳定的 URI、正文、版本及变更事件**。
4. 插件是否可以按受支持的方式取得项目根目录、文件路径权限和已授权工作区访问。
5. 进程异常、插件卸载和 DSH 退出时能否可靠清理子进程。

**上述能力尚未在本设计阶段从项目实际运行环境验证，不能当作已具备。**

若宿主不支持进程/通信能力：只先完成通用接口与 CodeMirror 映射，评估公开、受支持的外部进程桥接机制；不可通过私有 API 或隐式权限绕过实现，也不得将“项目级智能补全”降级为单纯词法补全后仍按 P0 验收。

### 6.3 LSP 会话与作用域

- 优先以工作区及语言服务器配置确定会话作用域，不为每个 Tab 单独启动语言服务器。
- 同一工作区中的多个 Python 文件共享适当的服务器会话。
- Tab 关闭时发送对应 `didClose`，但仅当不存在其他引用且符合实现的会话策略。
- 工作区切换、插件禁用、配置变化时正确释放或重建会话。
- 服务器意外退出时有限次数重启并提供明确诊断，不无限重启。
- 一旦文档版本发生变化，旧请求的结果不能无条件应用到新光标或新文档版本。
- 请求可取消，重复输入时不要堆积过期补全请求。
- 不应在每次按键时做全工作区同步扫描。

### 6.4 传输与错误处理

优先采用标准 LSP JSON-RPC 传输；若采用 `stdio`，应支持 `Content-Length` 消息帧、部分读取、响应与请求 ID 匹配、错误响应、超时与取消，不能将 stdout 当作普通逐行 JSON 解析。日志从 stderr 或受控日志通道读取，不泄露用户代码与路径细节。

### 6.5 文档内存状态与保存状态

**内存编辑内容是当前智能补全的数据来源**。不能只读取磁盘上的最近一次保存版本：用户输入尚未保存的类或方法时，语言服务器也应感知变化。

应复用现有 `document/` 的版本序列；LSP 的文档同步与 AutoSave、手动保存共存，但不负责直接写盘。保存冲突仍由现有安全保存机制处理。

---

## 7. Python Intelligence 设计

### 7.1 服务器方案

首版建议以 **Pyright Language Server** 为候选，连接标准 LSP；最终选型取决于 macOS 打包许可、实际安装路径、Node 运行时要求、体积、配置和宿主进程能力验证。

候选启动命令示意：

```bash
pyright-langserver --stdio
```

**不能默认用户已经安装命令，不能假定插件运行环境天然包含 Node.js。**

必须先决定部署策略：

- **首选评估**：检测用户已有 Pyright 可执行程序，并提供明确的配置路径和缺失提示。
- **可选后续**：在版权许可与分发体积允许、且宿主进程环境稳定的前提下，考虑随插件发布/受控安装服务端。
- **本次最低要求**：至少有一种文档化、实际测试可用的 macOS 启动方案；用户无需自行拼接未说明的内部命令。

### 7.2 Python 项目与环境识别

采用保守的环境优先级：

1. 用户在 CodeCraft 设置中明确指定的 Python 解释器/虚拟环境路径。
2. 当前工作区下常见的 `.venv`（以及可验证的 `venv`）环境。
3. 可用且受支持的系统 Python 环境作为最后候选。
4. 无法确定时提供明显的状态说明，不随机推断或默默选择错误环境。

需要遵守宿主授权的工作区文件访问范围。Python 依赖补全应以语言服务器解析的解释器环境和导入路径为准，不另外维护一套不一致的第三方包数据库。

### 7.3 智能补全场景

**场景 A：包和模块 import**

```python
from services import |
```

候选应来自项目内可导入模块及符号，而不仅仅是当前文档出现过的单词。

**场景 B：跨文件类与方法**

```text
project/
├── main.py
└── services/
    ├── __init__.py
    └── user_service.py
```

`user_service.py`：

```python
class UserService:
    def create_user(self) -> None:
        pass
```

`main.py`：

```python
from services.user_service import UserService

service = UserService()
service.|
```

应能提示 `create_user` 等可访问成员。

**场景 C：已安装依赖**

```python
import pandas as pd
pd.|
```

仅当相应依赖已在选定解释器环境中安装且服务器可解析时，提供可解析的成员。不能将某依赖是否安装作为静默假设。

### 7.4 补全编辑的正确性

- `textEdit`、`insertText`、Snippet 及附加编辑应遵循 LSP 原始语义转换到 CodeMirror 的事务。
- 多编辑合并时校验范围不冲突，且当前文档版本仍匹配。
- 仅对宿主许可的文件执行跨文件附加编辑；否则禁用相应能力或明确提示。
- 保持自动括号闭合和自动缩进的输入体验，避免补全重复插入 `()` 或破坏已有括号。
- 用户撤销操作应能够合理撤销一次补全所产生的代码更改。

---

## 8. 编辑器体验与设置

### 8.1 补全 UI

复用 CodeMirror 6 的 `@codemirror/autocomplete` 及现有编辑器主题能力，尽量避免重复实现候选列表组件。

P0 要求：

- 输入时可弹出语义补全候选；支持主动触发补全快捷键。
- 提供候选名称、类型、必要的简短说明。
- 支持键盘上下移动、Enter/Tab 接受、Esc 取消。
- 支持服务端排序/过滤信息和本地过滤，避免乱序、重复与明显错误候选。
- 高延迟情况下不卡住输入、不阻塞编辑器渲染。
- 无语言服务器时编辑器仍保持完整的通用编辑能力。

### 8.2 设置项建议

在 DSH Desktop 原有 CodeCraft 插件设置中增加一个轻量的 **Python Intelligence** 分组：

| 设置 | 建议默认值 | 用途 |
|---|---|---|
| 启用 Python 智能编程 | 开启（条件为服务可用） | 用户可随时禁用 |
| Python 解释器路径 | 自动发现 | 决定 Python 环境 |
| Python Language Server 路径 | 自动发现/用户配置 | 定位服务器可执行文件 |
| 智能补全启用 | 开启 | 控制语义补全 |

配置实际形态以 DSH 插件设置 API 支持为准。不要新增独立设置应用、隐藏私有入口或绕过宿主设置机制。

### 8.3 状态反馈

推荐少量非侵入状态：`Ready`、`Starting`、`Not installed`、`Unavailable`、`Error`；服务缺失时给出安装/配置指导，但不反复弹窗打断用户。

---

## 9. 性能、安全与可靠性

### 9.1 性能

- 不阻塞主线程：语言分析通过独立服务与异步请求进行。
- 输入事件仅做轻量调度；避免每按一次键重新启动服务或全量扫描目录。
- 可取消过期补全，限制请求队列和重试次数。
- 多文件复用工作区会话，避免重复进程。
- 插件禁用时停止服务，避免后台常驻资源泄漏。
- 将 MacBook Air 日常多 Tab 编辑作为主要测试环境；不以无依据的固定毫秒数据承诺性能。

### 9.2 本地进程与工作区信任

- 本地语言服务器以当前用户权限运行，必须遵循 DSH 提供的执行/授权边界。
- 不从未经信任的项目文件中自动执行命令、安装依赖或下载二进制文件。
- 插件默认不上传用户源码到外部服务；若后续增加云端 AI，另行设计显式授权与隐私说明。
- 服务路径、解释器路径校验应避免命令注入；优先使用参数化进程执行而非拼接 shell 字符串。
- 限制日志中的源码与路径内容；诊断信息尽量以用户可理解的形式呈现。

### 9.3 回归要求

- 仍使用 DSH 原生 Workspace Files 树与 Tab。
- 不破坏手动保存、自动保存、未保存标识、安全保存冲突处理。
- 不破坏 v0.1.4 的 2/4 空格缩进及整数倍对齐。
- 不破坏括号、引号的自动闭合、选区包裹、成对删除。
- 禁用或卸载 CodeCraft 后不残留语言服务器进程或键盘监听。
- 与其他插件，包括 `dsh-better-sidebar`，保持各自独立、可并行使用。

---

## 10. 开发阶段与技术验证门槛

### 阶段 0：宿主可行性验证（必须先完成）

1. 检查 v0.1.4 真实仓库结构、版本与构建入口。
2. 查证 DSH Desktop 当前插件 API 文档及样例。
3. 做一个最小实验：从插件中启动或连接语言服务器，并发送 `initialize` 收到响应。
4. 从 DSH 原生 Tab 取得文件正文/URI/编辑事件，验证版本同步。
5. 测试 Tab 关闭、工作区切换、插件卸载后进程正确退出。

**此阶段不通过，不应直接铺开完整 LSP 架构开发；先解决公开 API 与传输可行性问题。**

### 阶段 1：基础接口与模块划分

1. 建立 `BaseIntelligence`、能力接口、`LanguageIntelligence`。
2. 将编辑器与语义来源隔离，统一补全 Context 与 Result。
3. 建立语言注册机制；仅注册 Python。
4. 保证通用编辑器的既有功能不迁移、不重复实现。

### 阶段 2：通用 LSP 闭环

1. 实现传输和标准 JSON-RPC 消息边界。
2. 实现会话初始化、能力协商、请求/响应、取消和关闭。
3. 实现 `didOpen`、`didChange`、`didClose`。
4. 实现 `textDocument/completion` 和结果适配。
5. 实现异常退出恢复、资源回收与用户状态反馈。

### 阶段 3：Python 项目级能力

1. Python 文件识别及项目根目录确定。
2. `.venv` 及用户配置解释器发现。
3. Python 模块 import 补全。
4. 跨文件类/函数/方法/属性补全。
5. 已安装第三方依赖的补全验证。

### 阶段 4：体验增强与 P1（时间允许）

1. 函数签名与悬浮说明。
2. 跳转定义。
3. 基本诊断显示。
4. 补全编辑的撤销与异常体验优化。

### 阶段 5：测试、文档、发布

1. 使用小型、多文件、带虚拟环境的真实 Python 项目进行端到端测试。
2. 在 macOS DSH Desktop 中验证典型 Tab/保存生命周期。
3. 更新 README、CHANGELOG、架构文档与安装依赖说明。
4. npm 发布 `0.2.0`、验证实际发布内容。
5. 基于 `master` 创建对应 Git Tag，并在 GitHub 上发布 Release。

---

## 11. 验收标准

### 11.1 架构验收

- [ ] `BaseIntelligence` 为语言能力提供可复用的父级能力或统一默认实现。
- [ ] Python 能力在通用父级基础上扩展，而不是另建独立补全系统。
- [ ] LSP 客户端不包含 Python 的硬编码业务规则。
- [ ] CodeMirror 补全 UI 不直接依赖 Pyright 专有接口。
- [ ] 未来框架扩展可在不复制公共 UI 和 LSP 客户端的情况下追加 Provider。
- [ ] 同一项目未来可组合多个框架能力，设计上不依赖强制的多层单继承。
- [ ] 未实现语言/框架不会被空目录或大量无意义抽象提前引入。

### 11.2 LSP 与生命周期验收

- [ ] DSH 宿主允许的通信与进程管理路径已验证。
- [ ] `initialize`、补全请求、文档同步、`shutdown` 等链路真实可用。
- [ ] 未保存修改参与补全分析。
- [ ] 过期请求不会覆盖当前补全结果。
- [ ] 文档与工作区切换后会话、URI、版本不会错乱。
- [ ] 插件关闭后没有残留语言服务器进程。
- [ ] 未安装服务器时不会令编辑器崩溃或失去基本编辑能力。

### 11.3 Python P0 验收

- [ ] `.py` 文件可正确启用 Python 智能服务。
- [ ] 能补全当前项目的包、模块及可导入符号。
- [ ] 能补全其他 Python 文件中可访问的类、函数和方法。
- [ ] 能根据可解析类型提示对象方法与属性。
- [ ] 能识别常见 `.venv` 环境，允许用户配置解释器。
- [ ] 在所选环境中已安装依赖可被合理解析。
- [ ] 候选项插入不会破坏现有括号与缩进行为。
- [ ] 服务不可用时有明确、非侵入的状态反馈。

### 11.4 回归验收

- [ ] 手动保存 `Cmd+S`、AutoSave、冲突检测、草稿保护正常。
- [ ] 通用缩进、括号闭合、行号、语法高亮、代码折叠正常。
- [ ] DSH 原生文件树/Tab 未被替换或绕过。
- [ ] 禁用/卸载插件后 DSH 原生编辑功能不受影响。
- [ ] `dsh-better-sidebar` 等独立插件不会因本版本受到专门的依赖约束。

### 11.5 发布阻断项

以下任一项未满足，不应宣称 `v0.2.0` 已完成本设计 P0：

- 只能提供关键词/当前文档词法补全，无法提供真实跨文件语义补全。
- 语言服务器进程不能可靠启动或关闭。
- 未保存编辑无法同步到语言服务器。
- 补全结果可能错误地写入其他 Tab 或旧文档版本。
- 自动保存或安全保存出现数据丢失回归。
- Python 环境配置不可用且没有清晰的修复路径。

---

## 12. 风险与决策记录

| 风险 | 影响 | 处理原则 |
|---|---|---|
| DSH 插件 API 不支持子进程或双向通信 | LSP 方案可能无法落地 | 阶段 0 提前验证；只用受支持的桥接接口 |
| Pyright/Node 运行时或可执行路径缺失 | 部分用户不能启动服务器 | 明确安装/检测/路径配置；不静默失败 |
| 语言服务器进程过多 | 内存与 CPU 压力 | 共享工作区会话、按需启动、闲置释放 |
| 文档版本与 LSP 同步错乱 | 候选错误、编辑污染 | 严格版本检查、取消请求、URI 绑定 |
| 首次分析较慢 | 影响使用体验 | 非阻塞、状态提示、无需等待服务即可编辑 |
| 过度抽象 | 个人维护成本上升 | 只实现 Python 所需接口，框架架构仅预留契约 |
| 过度承诺 Python 能力 | 交付范围失控 | 明确 P0/P1/P2，先保证跨文件补全闭环 |

**需在进入编码前明确的决策：** DSH 进程/通信支持情况、Pyright 的分发策略、语言服务器管理粒度、Python 环境优先级。文档给出建议而不是宣称已验证。

---

## 13. 后续扩展路线

未来次版本可以是：

- **语言级**：Java、C++、TypeScript、Go、Rust、YAML 等。
- **框架级**：PyTorch、Django、Spring Boot 等，依附既有语言分析能力。
- **生态级**：Kubernetes/Helm、Maven、Gradle、Dockerfile 等，按实际结构建立能力依赖关系。
- **代码质量**：在统一诊断协议之上增加风格、复杂度、文档检查、外部检查工具接入与可选 AI 修复。

上述均为方向示例，**不确定具体版本号和开发顺序**。Code Quality 当前仅保留架构空间，不纳入 0.2.0。

---

## 14. 最终交付定义

`v0.2.0 — Python Intelligence & Extensible Intelligence Architecture`

本版本不是“只添加了一个 Python 补全插件”，而是 CodeCraft 从**通用代码编辑器**走向**可扩展智能编程平台**的基础迭代：

1. `intelligence/` 成为所有语言、框架和生态智能能力的**父级基础设施**。
2. `languages/python/` 成为第一个实际落地、可以被验证的子级实现。
3. `lsp/` 封装统一协议和进程/会话管理，不重复制造语言服务底层。
4. `editor/` 继续作为用户交互层，与智能来源解耦。
5. 后续框架可在对应语言能力上增量扩展，而不破坏已有架构。
6. 保持 macOS、轻量化、可维护、与 DSH 原生工作区系统协同的产品定位。

**验收判断：在真实 Python 多文件项目中得到可靠的项目级补全，同时证明下一门语言或框架可以在保留公共基础设施的前提下接入。**

---

## 参考规范与实现资料

- Language Server Protocol 3.18 specification: https://github.com/microsoft/language-server-protocol/blob/gh-pages/_specifications/lsp/3.18/specification.md
- Pyright installation documentation: https://github.com/microsoft/pyright/blob/main/docs/installation.md
- CodeMirror autocomplete: https://www.npmjs.com/package/@codemirror/autocomplete

> 注：本文件是基于已讨论需求的设计方案，尚未审查 CodeCraft 实际 `v0.1.4` 源码及 DSH Desktop 当前插件 API。因此文中的文件名、接口与启动方式需要在阶段 0 核对后再成为最终实现约束。
