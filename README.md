# Cursor Pool 文档

这是 Cursor Pool 的官方文档网站，基于 VitePress 构建。

## 📚 文档内容

- 软件介绍与功能说明
- 安装教程（Windows/macOS）
- 故障排除指南
- Cursor 相关问题解答
- 常见问题解答

## 🚀 本地开发

### 环境要求

- Node.js 16.0 或更高版本
- npm 或 yarn 包管理器

### 安装依赖

```bash
# npm
npm install

# yarn
yarn install
```

### 开发服务器

```bash
# npm
npm run docs:dev

# yarn
yarn docs:dev
```

开发服务器将在 http://localhost:5173 启动

### 构建文档

```bash
# npm
npm run docs:build

# yarn
yarn docs:build
```

构建后的文件将生成在 `docs/.vitepress/dist` 目录下

### 预览构建结果

```bash
# npm
npm run docs:preview

# yarn
yarn docs:preview
```

## 📁 目录结构

```
docs/
├── .vitepress/
│   └── config.ts          # VitePress 配置文件
├── guide/                 # 入门指南
│   ├── introduction.md    # 软件介绍
│   ├── windows/           # Windows 相关
│   └── macos/            # macOS 相关
├── troubleshooting/       # 故障排除
│   ├── windows/          # Windows 问题
│   └── macos/           # macOS 问题
├── cursor-issues/         # Cursor 相关问题
└── public/               # 静态资源
```

## 🔧 配置说明

- 文档使用 VitePress 构建
- 支持 Markdown 增强语法
- 使用 emoji 表情图标
- 支持图片放大预览
- 自动生成目录

## ❤️ 贡献指南

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📄 许可证

本项目使用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🔗 相关链接

- [Cursor Pool 主仓库](https://github.com/Sanyela/CursorPool_Clinet)
- [问题反馈](https://github.com/Sanyela/CursorPool_Clinet/issues)
- [VitePress 文档](https://vitepress.dev/) 