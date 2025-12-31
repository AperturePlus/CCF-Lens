# CCF-Lens 🔍

[![CI](https://github.com/AperturePlus/Labelpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/AperturePlus/Labelpilot/actions/workflows/ci.yml)
[![Release](https://github.com/AperturePlus/Labelpilot/actions/workflows/release.yml/badge.svg)](https://github.com/AperturePlus/Labelpilot/releases)

> 在 arXiv、DBLP、IEEE Xplore 等学术网站上显示 CCF 等级徽章的油猴脚本

## ✨ 功能特性

- 🏷️ **CCF 等级徽章** - 自动在论文标题旁显示 A/B/C 等级
- 🌐 **多站点支持** - 支持 arXiv、DBLP、IEEE Xplore
- 🔍 **智能匹配** - 自动识别会议/期刊名称
- ⚡ **高性能** - 结果缓存，避免重复查询
- 🎨 **美观徽章** - 不同等级使用不同颜色

## 📦 安装

### 前置要求

安装以下任一油猴扩展：
- [Tampermonkey](https://www.tampermonkey.net/) (推荐)
- [Violentmonkey](https://violentmonkey.github.io/)

### 安装脚本

从 [Releases](https://github.com/AperturePlus/Labelpilot/releases) 页面下载最新的 `ccf-lens.user.js` 文件并安装。

## 🌐 支持的网站

| 网站 | 支持页面 |
|------|----------|
| **arXiv** | 搜索页、列表页、摘要页 |
| **DBLP** | 搜索页、数据库页、作者页 |
| **IEEE Xplore** | 搜索页、作者页、文档页 |

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 运行测试
npm test

# 构建
npm run build
```

## 📝 License

MIT License

## 🙏 致谢

- [CCF 推荐国际学术会议和期刊目录](https://www.ccf.org.cn/Academic_Evaluation/By_category/)
- [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey)
