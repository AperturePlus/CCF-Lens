import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import monkey, { cdn } from 'vite-plugin-monkey'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'CCF-Lens',
        namespace: 'https://github.com/AperturePlus/ccf-lens',
        version: '1.0.0',
        description: 'Display CCF rank badges for papers on arXiv, DBLP, and IEEE Xplore',
        author: 'AperturePlus',
        icon: 'https://www.ccf.org.cn/favicon.ico',
        // 多站点匹配规则 - Requirements 1.1, 1.2, 1.3
        match: [
          // arXiv - Requirements 1.1
          '*://arxiv.org/search*',
          '*://arxiv.org/list*',
          '*://arxiv.org/abs/*',
          // DBLP - Requirements 1.2
          'https://dblp.org/search*',
          'https://dblp.org/db/*',
          'https://dblp.org/pid/*',
          'https://dblp.uni-trier.de/search*',
          'https://dblp.uni-trier.de/db/*',
          'https://dblp.uni-trier.de/pid/*',
          // IEEE Xplore - Requirements 1.3
          'https://ieeexplore.ieee.org/search/*',
          'https://ieeexplore.ieee.org/author/*',
          'https://ieeexplore.ieee.org/document/*',
          // Google Scholar - Requirements 1.1, 1.2 (google-scholar-integration)
          '*://scholar.google.com/scholar*',
          '*://scholar.google.com/citations*',
          '*://scholar.google.com.hk/scholar*',
          '*://scholar.google.com.hk/citations*',
          // Google Scholar Proxy Sites (for testing)
          '*://scholar.lanfanshu.cn/scholar*',
          '*://scholar.lanfanshu.cn/citations*',
        ],
        include: [
          // Match other Google Scholar regional domains like scholar.google.co.uk / scholar.google.com.sg, etc.
          /^https?:\/\/scholar\.google\.[^/]+\/scholar/,
          /^https?:\/\/scholar\.google\.[^/]+\/citations/,
        ],
        // GM API 权限 - Requirements 5.6
        grant: [
          'GM_setValue',
          'GM_getValue',
          'GM_deleteValue',
          'GM_listValues',
          'GM_xmlhttpRequest',
          'GM_addStyle',
          'GM_registerMenuCommand',
        ],
        // 允许跨域请求DBLP API
        connect: [
          'dblp.org',
          'dblp.uni-trier.de',
          'scholar.google.com',
          'scholar.google.com.hk',
          'scholar.lanfanshu.cn',
        ],
        // 在文档加载完成后运行
        'run-at': 'document-end',
      },
      build: {
        externalGlobals: {
          vue: cdn.jsdelivr('Vue', 'dist/vue.global.prod.js'),
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
