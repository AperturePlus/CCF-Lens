# CCF-Lens

[![CI](https://github.com/AperturePlus/CCF-Lens/actions/workflows/ci.yml/badge.svg)](https://github.com/AperturePlus/CCF-Lens/actions/workflows/ci.yml)
[![Release](https://github.com/AperturePlus/CCF-Lens/actions/workflows/release.yml/badge.svg)](https://github.com/AperturePlus/CCF-Lens/releases)
[![License](https://img.shields.io/github/license/AperturePlus/CCF-Lens)](LICENSE)
[![Version](https://img.shields.io/github/v/release/AperturePlus/CCF-Lens)](https://github.com/AperturePlus/CCF-Lens/releases)

> A powerful userscript that automatically displays CCF rankings for academic venues directly on arXiv, DBLP, and IEEE Xplore

[English](#english) | [中文](#中文)

## English

### What is CCF-Lens?

CCF-Lens enhances your academic browsing experience by automatically displaying China Computer Federation (CCF) conference and journal rankings directly on popular academic websites. No more manual lookups - see at a glance whether a paper is from a top-tier (A), high-quality (B), or recognized (C) venue.

### Key Features

**Smart Recognition** - Automatically identifies conference and journal names from paper titles and metadata, matching them against the comprehensive CCF catalog

**Multi-Site Support** - Seamlessly integrates with:
- arXiv (search, list, and abstract pages)
- DBLP (search, database, and author pages)
- IEEE Xplore (search, author, and document pages)

**Performance Optimized** - Intelligent caching system ensures fast loading without redundant API calls

**Clean & Intuitive** - Color-coded badges (gold for A, silver for B, bronze for C) blend naturally with each site's design

**Privacy Focused** - All processing happens locally in your browser, no data collection

### Installation

1. Install a userscript manager:
   - [Tampermonkey](https://www.tampermonkey.net/) (Recommended - Chrome, Firefox, Edge, Safari)
   - [Violentmonkey](https://violentmonkey.github.io/) (Chrome, Firefox, Edge)

2. Install CCF-Lens:
   - Visit [Releases](https://github.com/AperturePlus/CCF-Lens/releases)
   - Click on the latest `ccf-lens.user.js` file
   - Your userscript manager will prompt you to install

3. Start browsing - CCF badges will appear automatically!

### Usage

Once installed, CCF-Lens works automatically. When you visit supported academic sites:

- Papers from CCF-ranked venues will display colored badges
- Click on any badge to see full venue details
- Use the floating settings button to customize display preferences
- View statistics showing distribution of rankings on the current page

### Screenshots

*Coming soon - See badges in action on arXiv, DBLP, and IEEE Xplore*

### Development

Built with modern web technologies and comprehensive testing:

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Run complete test suite (208 tests)
npm test

# Build production version
npm run build
```

**Tech Stack:**
- Vue 3 with TypeScript for robust component architecture
- Vite for fast builds and development
- Vitest with 208+ tests including property-based testing
- Fast-check for thorough edge case coverage

### Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or pull requests:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please ensure your code passes all tests (`npm test`) and follows the existing code style.

### Support

- Report bugs: [GitHub Issues](https://github.com/AperturePlus/CCF-Lens/issues)
- Feature requests: [GitHub Discussions](https://github.com/AperturePlus/CCF-Lens/discussions)
- Questions: Check existing issues or start a new discussion

---

## 中文

中文说明已迁移至 [`doc/README.zh-CN.md`](doc/README.zh-CN.md)。

## 🙏 Acknowledgements

- [CCF Recommended International Academic Conferences and Journals](https://www.ccf.org.cn/Academic_Evaluation/By_category/)
- [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey)
