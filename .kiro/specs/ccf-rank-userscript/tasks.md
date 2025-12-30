# Implementation Plan: CCF Rank UserScript

## Overview

使用 vite-plugin-monkey + Vue3 开发统一的 CCF 等级显示油猴脚本。采用模块化架构，通过适配器模式支持多站点，使用 Vue3 组件化构建 UI。

## Tasks

- [x] 1. 项目初始化和基础配置
  - [x] 1.1 使用 vite-plugin-monkey 创建项目
    - 执行 `npm create monkey` 创建项目
    - 选择 Vue3 + TypeScript 模板
    - 配置 package.json 依赖
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 配置 vite.config.ts
    - 配置油猴脚本元数据（@match, @grant等）
    - 配置多站点匹配规则
    - 配置 GM API 权限
    - _Requirements: 1.1, 1.2, 1.3, 5.6_

  - [x] 1.3 配置测试环境
    - 安装 vitest 和 @vue/test-utils
    - 安装 fast-check 用于属性测试
    - 配置 vitest.config.ts
    - _Requirements: 全部_

- [x] 2. 实现 CCF 目录数据模块
  - [x] 2.1 创建 CCF 目录数据文件
    - 创建 src/data/ccf-catalog.json
    - 包含所有 A/B 类期刊和会议
    - 包含缩写、全称、别名映射
    - _Requirements: 3.1, 3.6_

  - [x] 2.2 实现 CCFCatalog 类
    - 创建 src/core/ccf-catalog.ts
    - 实现 findByKey、getAllEntries、getByRank 方法
    - 实现别名查找功能
    - _Requirements: 3.1, 3.6_

  - [x] 2.3 编写 CCFCatalog 单元测试
    - 测试目录数据完整性
    - 测试查询功能
    - _Requirements: 3.1_

- [x] 3. 实现 Venue 匹配器模块
  - [x] 3.1 实现 VenueMatcher 类
    - 创建 src/core/venue-matcher.ts
    - 实现 cleanVenue 方法（清理年份、卷号等）
    - 实现 generateAcronym 方法
    - 实现 match 方法（多级匹配策略）
    - _Requirements: 2.5, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 编写 VenueMatcher 属性测试
    - **Property 1: Venue字符串清理一致性**
    - **Validates: Requirements 2.5**

  - [x] 3.3 编写 CCF等级匹配属性测试
    - **Property 2: CCF等级匹配正确性**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**

  - [x] 3.4 编写大小写不敏感属性测试
    - **Property 3: 匹配大小写不敏感**
    - **Validates: Requirements 3.2**

- [x] 4. 实现缓存管理模块
  - [x] 4.1 实现 CacheManager 类
    - 创建 src/core/cache-manager.ts
    - 使用 GM_setValue/GM_getValue 存储
    - 实现 TTL 过期机制
    - _Requirements: 6.1_

  - [x] 4.2 编写缓存属性测试
    - **Property 4: 缓存命中避免重复请求**
    - **Validates: Requirements 6.1**

- [x] 5. 实现 DBLP 查询服务
  - [x] 5.1 实现 DblpService 类
    - 创建 src/services/dblp-service.ts
    - 实现 queryByTitle 方法
    - 集成 CacheManager
    - 实现超时和错误处理
    - _Requirements: 2.2, 6.1, 6.5, 8.1, 8.2_

  - [x] 5.2 编写 DblpService 单元测试
    - 测试查询功能（mock API）
    - 测试缓存集成
    - 测试错误处理
    - _Requirements: 2.2, 8.1, 8.2_

- [x] 6. 实现设置存储模块
  - [x] 6.1 实现 SettingsStore
    - 创建 src/stores/settings-store.ts
    - 使用 Vue3 reactive 实现响应式
    - 实现 load、save、reset 方法
    - _Requirements: 5.5, 5.6_

  - [x] 6.2 编写设置持久化属性测试
    - **Property 7: 设置持久化一致性**
    - **Validates: Requirements 5.5**

- [x] 7. Checkpoint - 核心模块完成
  - 确保所有核心模块测试通过
  - 如有问题请询问用户

- [x] 8. 实现站点适配器基类
  - [x] 8.1 定义 SiteAdapter 接口
    - 创建 src/adapters/types.ts
    - 定义 PaperInfo、SiteAdapter 接口
    - _Requirements: 1.5_

  - [x] 8.2 实现 SiteManager
    - 创建 src/adapters/site-manager.ts
    - 实现适配器注册和管理
    - 实现当前站点检测
    - _Requirements: 1.5_

- [x] 9. 实现 arXiv 适配器
  - [x] 9.1 实现 ArxivAdapter 类
    - 创建 src/adapters/arxiv-adapter.ts
    - 实现 parseVenueFromComments 方法
    - 实现 getPapers、processPaper 方法
    - 实现 MutationObserver 监听
    - _Requirements: 1.1, 1.4, 2.1_

  - [x] 9.2 编写 Comments 解析属性测试
    - **Property 8: Comments解析覆盖率**
    - **Validates: Requirements 2.1**

- [x] 10. 实现 DBLP 适配器
  - [x] 10.1 实现 DblpAdapter 类
    - 创建 src/adapters/dblp-adapter.ts
    - 实现 extractVenueFromLink 方法
    - 实现 getPapers、processPaper 方法
    - 实现 MutationObserver 监听
    - _Requirements: 1.2, 1.4, 2.3_

- [x] 11. 实现 IEEE 适配器
  - [x] 11.1 实现 IeeeAdapter 类
    - 创建 src/adapters/ieee-adapter.ts
    - 实现 extractVenueFromPublication 方法
    - 实现 getPapers、processPaper 方法
    - 实现 MutationObserver 监听
    - _Requirements: 1.3, 1.4, 2.4_

- [ ] 12. Checkpoint - 适配器完成
  - 确保所有适配器测试通过
  - 如有问题请询问用户

- [x] 13. 实现 Vue3 UI 组件
  - [x] 13.1 实现 RankBadge 组件
    - 创建 src/components/RankBadge.vue
    - 实现不同等级的样式（A红/B橙/C蓝/未知灰）
    - 实现 tooltip 显示详细信息
    - 实现 loading 和 error 状态
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 13.2 编写 RankBadge 组件测试
    - 测试不同等级的渲染
    - 测试 tooltip 内容
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 13.3 实现 SettingsPanel 组件
    - 创建 src/components/SettingsPanel.vue
    - 实现等级过滤设置
    - 实现站点开关设置
    - 实现显示位置设置
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 13.4 实现 StatsPanel 组件
    - 创建 src/components/StatsPanel.vue
    - 实现等级分布统计显示
    - 实现百分比计算
    - 实现筛选/高亮功能
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [x] 13.5 编写统计正确性属性测试
    - **Property 6: 统计数据正确性**
    - **Validates: Requirements 7.2, 7.3**

  - [x] 13.6 实现 FloatingButton 组件
    - 创建 src/components/FloatingButton.vue
    - 实现悬浮按钮显示设置入口
    - _Requirements: 5.1_

- [x] 14. 实现主应用入口
  - [x] 14.1 实现 App.vue
    - 创建 src/App.vue
    - 集成所有组件
    - 实现组件间通信
    - _Requirements: 全部_

  - [x] 14.2 实现 main.ts
    - 创建 src/main.ts
    - 初始化 Vue 应用
    - 初始化 SiteManager
    - 启动页面处理
    - 设置全局错误处理
    - _Requirements: 8.3, 8.4, 8.5_

- [x] 15. 实现处理幂等性
  - [x] 15.1 添加已处理标记
    - 在 SiteManager 中维护已处理元素集合
    - 在处理前检查是否已处理
    - _Requirements: 6.3_

  - [x] 15.2 编写处理幂等性属性测试
    - **Property 5: 处理幂等性**
    - **Validates: Requirements 6.3**

- [ ] 16. 实现防抖和性能优化
  - [ ] 16.1 添加防抖机制
    - 在 MutationObserver 回调中使用防抖
    - 配置合理的防抖延迟
    - _Requirements: 6.2_

  - [ ] 16.2 实现分批处理
    - 大量论文时分批处理
    - 使用 requestIdleCallback 优化
    - _Requirements: 6.4_

- [ ] 17. Final Checkpoint - 功能完成
  - 确保所有测试通过
  - 确保所有功能正常工作
  - 如有问题请询问用户

- [ ] 18. 构建和发布准备
  - [ ] 18.1 配置构建脚本
    - 配置生产环境构建
    - 生成 .user.js 文件
    - _Requirements: 全部_

  - [ ] 18.2 编写 README 文档
    - 编写安装说明
    - 编写使用说明
    - 编写开发说明
    - _Requirements: 全部_

## Notes

- All tasks are required for complete test coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
