# Better Note

一个美观简洁的 macOS 风格 Markdown 便签应用。

## ✨ 特性

- 🖊️ **简洁设计** - 每个便签都是独立的简约窗口
- 📝 **Markdown 支持** - 完整的 Markdown 语法支持和实时预览
- ⚡ **智能输入** - 类似 Notion 的快捷语法输入
- 💾 **自动保存** - 智能防抖保存，无需手动操作
- 🔍 **快速搜索** - 支持便签内容和标签搜索
- 🏷️ **标签管理** - 便签分类和组织
- 🎯 **快捷键** - 完整的键盘快捷键支持
- 🪟 **窗口管理** - 置顶、托盘、多窗口支持

## 🚀 快捷操作

### Markdown 智能输入
- `#` + 空格 → H1 标题
- `##` + 空格 → H2 标题  
- `###` + 空格 → H3 标题
- `-` + 空格 → 无序列表
- `1.` + 空格 → 有序列表
- `>` + 空格 → 引用块
- ``` + 空格 → 代码块

### 快捷键
- `Cmd+N` - 新建便签
- `Cmd+S` - 保存便签  
- `Cmd+Shift+P` - 切换预览模式
- `Cmd+B` - 加粗文本
- `Cmd+I` - 斜体文本
- `Cmd+\`` - 代码格式

### 列表操作
- **回车** - 自动续行列表
- **Tab** - 增加缩进
- **Shift+Tab** - 减少缩进

## 🛠️ 开发

### 环境要求
- Node.js >= 18
- npm >= 9

### 安装依赖
```bash
npm install
```

### 开发运行
```bash
npm run dev
```

### 构建应用
```bash
# 构建生产版本
npm run build

# 仅打包（不分发）
npm run pack
```

## 📦 技术栈

- **前端**: React + Vite
- **桌面**: Electron
- **Markdown**: react-markdown + remark-gfm
- **构建**: electron-builder

## 🎯 架构设计

```
better-note/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── main.js        # 应用入口
│   │   ├── note-window.js # 便签窗口管理
│   │   └── preload.js     # 预加载脚本
│   ├── renderer/          # React 渲染进程
│   │   ├── components/    # 可复用组件
│   │   ├── utils/         # 工具函数
│   │   ├── App.jsx        # 主应用组件
│   │   └── SingleNoteApp.jsx # 单便签应用
│   └── shared/            # 共享代码
├── public/                # 静态资源
└── dist/                  # 构建输出
```

## 🔧 自定义配置

应用数据存储在本地 localStorage 中，支持：
- 便签内容和元数据
- 用户偏好设置
- 窗口状态记忆

## 📱 平台支持

- ✅ macOS (Intel + Apple Silicon)
- ✅ Windows 10/11
- ✅ Linux (Ubuntu/Debian)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

ISC License

---

**Better Note** - 让 Markdown 笔记更简单、更美观 ✨