# App.vue 重构说明

## 概述

将原本 576 行的 `App.vue` 进行了模块化重构，提取了核心业务逻辑到独立的 composable 函数和工具函数中。重构后的 `App.vue` 减少到约 207 行，代码更加清晰易维护。

## 文件结构

```
src/
├── composables/           # Vue 组合式函数
│   ├── index.ts          # 统一导出
│   ├── useDblpQueue.ts   # DBLP 查询队列管理
│   ├── usePaperProcessing.ts  # 论文处理和徽章挂载
│   └── useStatsManagement.ts  # 统计数据管理
└── utils/                # 工具函数
    ├── index.ts          # 统一导出
    └── page-visibility.ts # 页面可见性判断
```

## 重构内容

### 1. useDblpQueue.ts
**职责**: DBLP API 请求的并发控制和队列处理

**导出功能**:
- `enqueueDblpLookup()` - 将查询任务加入队列
- `clearQueue()` - 清空队列和取消进行中的任务
- `isInFlight()` / `addToInFlight()` / `removeFromInFlight()` - 管理进行中的请求
- `getCurrentEpoch()` - 获取当前处理周期（用于取消过期任务）

### 2. usePaperProcessing.ts
**职责**: 论文信息处理、徽章挂载、DBLP 查询

**导出功能**:
- `mountBadge()` - 为论文创建和挂载 RankBadge 组件
- `processPapers()` - 处理当前页面的所有论文
- `cleanup()` - 清理已挂载的徽章和相关资源

**内部功能**:
- 判断是否需要进行 DBLP 查询
- 管理徽章的 Vue 应用实例
- 处理 DBLP 查询结果并更新徽章状态

### 3. useStatsManagement.ts
**职责**: 统计数据管理、过滤和高亮功能

**导出功能**:
- `updateStats()` - 更新统计数据
- `handleFilter()` - 处理筛选器变化
- `applyFilterHighlight()` - 应用高亮/过滤效果
- `refreshStatsPanelVisibility()` - 刷新统计面板可见性
- `scheduleUiUpdate()` - 调度 UI 更新
- `clearPendingUpdate()` - 清除待处理的更新

**响应式状态**:
- `stats` - 统计数据对象
- `showStatsPanel` - 统计面板显示状态
- `activeFilter` - 当前激活的筛选器

### 4. page-visibility.ts
**职责**: 页面可见性判断和 URL 变化监听

**导出功能**:
- `shouldShowStatsPanelForCurrentPage()` - 判断当前页面是否应显示统计面板
- `hasArxivPublicationSignal()` - 判断 arXiv 论文是否已发表
- `installUrlChangeListener()` - 监听 URL 变化（支持 SPA 路由）

## 重构优势

### ✅ 代码可维护性
- 每个模块职责清晰，单一功能原则
- 更容易定位和修复 bug
- 便于添加新功能

### ✅ 可测试性
- 独立的 composable 函数更容易编写单元测试
- 减少了测试 App.vue 时的依赖复杂度

### ✅ 代码复用
- composable 函数可以在其他组件中复用
- 工具函数可以独立使用

### ✅ 类型安全
- 保持了完整的 TypeScript 类型支持
- 构建和测试均通过，无类型错误

### ✅ 性能优化
- 逻辑分离后更容易进行性能优化
- 可以单独优化 DBLP 队列、统计更新等模块

## 使用示例

### 在 App.vue 中使用

```typescript
import { usePaperProcessing } from './composables/usePaperProcessing'
import { useStatsManagement } from './composables/useStatsManagement'

const statsManager = useStatsManagement(siteManager)
const paperProcessor = usePaperProcessing(
  settingsStore,
  siteManager,
  venueMatcher,
  () => statsManager.scheduleUiUpdate(() => {})
)
```

### 在其他组件中复用

```typescript
import { useDblpQueue } from '@/composables'
import { hasArxivPublicationSignal } from '@/utils'

const dblpQueue = useDblpQueue()
// ... 使用队列功能
```

## 测试结果

- ✅ 所有 257 个测试用例通过
- ✅ TypeScript 类型检查通过
- ✅ 构建成功，无警告

## 后续优化建议

1. **添加单元测试**: 为新创建的 composable 函数编写专门的测试
2. **优化性能**: 可以进一步优化 `scheduleUiUpdate` 的防抖逻辑
3. **错误处理**: 增强 DBLP 查询的错误处理和重试机制
4. **配置分离**: 考虑将 `DBLP_LOOKUP_CONCURRENCY` 等常量提取到配置文件

## 兼容性

此重构保持了完全的向后兼容性，不会影响现有功能。所有原有的功能和 API 保持不变。
