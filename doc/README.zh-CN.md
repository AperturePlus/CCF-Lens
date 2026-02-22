# CCF-Lens 中文文档

[English](../README.md) | [中文](README.zh-CN.md)

## CCF-Lens 是什么？

CCF-Lens 是一个强大的油猴脚本，能在 arXiv、DBLP、IEEE Xplore 等主流学术网站上自动显示 CCF（中国计算机学会）会议和期刊排名徽章。无需手动查询，一眼就能看出论文是否来自顶级（A类）、高质量（B类）或认可（C类）会议/期刊。

## 核心功能

**智能识别** - 自动从论文标题和元数据中识别会议/期刊名称，与完整的 CCF 目录进行匹配

**多站点支持** - 无缝集成以下网站：
- arXiv（搜索页、列表页、摘要页）
- DBLP（搜索页、数据库页、作者页）
- IEEE Xplore（搜索页、作者页、文档页）

**性能优化** - 智能缓存系统确保快速加载，避免重复查询

**简洁直观** - 彩色徽章（A类金色、B类银色、C类铜色）自然融入各网站设计

**注重隐私** - 所有处理均在浏览器本地完成，不收集任何数据

## 安装方法

1. 安装油猴管理器：
   - [Tampermonkey](https://www.tampermonkey.net/)（推荐 - 支持 Chrome、Firefox、Edge、Safari）
   - [Violentmonkey](https://violentmonkey.github.io/)（支持 Chrome、Firefox、Edge）

2. 安装 CCF-Lens：
   - 访问 [Releases 页面](https://github.com/AperturePlus/CCF-Lens/releases)
   - 点击最新版本的 `ccf-lens.user.js` 文件
   - 油猴管理器会提示您安装

3. 开始使用 - CCF 徽章将自动出现！

## 使用说明

安装后，CCF-Lens 会自动工作。当您访问支持的学术网站时：

- 来自 CCF 排名会议/期刊的论文会显示彩色徽章
- 点击徽章可查看完整的会议/期刊详情
- 使用浮动设置按钮自定义显示偏好
- 查看统计信息，了解当前页面的排名分布

## 屏幕截图

*即将推出 - 展示在 arXiv、DBLP 和 IEEE Xplore 上的实际效果*

## 开发指南

使用现代 Web 技术构建，配备完善的测试：

```bash
# 安装依赖
npm install

# 开发模式（支持热重载）
npm run dev

# 运行完整测试套件（208 个测试）
npm test

# 构建生产版本
npm run build
```

**技术栈：**
- Vue 3 + TypeScript 构建健壮的组件架构
- Vite 实现快速构建和开发
- Vitest 提供 208+ 测试，包括基于属性的测试
- Fast-check 确保全面的边界情况覆盖

## 贡献指南

欢迎贡献！无论是 Bug 报告、功能建议还是 Pull Request：

1. Fork 本仓库
2. 创建功能分支（`git checkout -b feature/AmazingFeature`）
3. 提交更改（`git commit -m 'Add some AmazingFeature'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 开启 Pull Request

请确保您的代码通过所有测试（`npm test`）并遵循现有代码风格。

## 支持与反馈

- Bug 报告：[GitHub Issues](https://github.com/AperturePlus/CCF-Lens/issues)
- 功能建议：[GitHub Discussions](https://github.com/AperturePlus/CCF-Lens/discussions)
- 问题咨询：查看已有 issue 或发起新讨论

## 🙏 致谢

- [CCF 推荐国际学术会议和期刊目录](https://www.ccf.org.cn/Academic_Evaluation/By_category/)
- [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey)
