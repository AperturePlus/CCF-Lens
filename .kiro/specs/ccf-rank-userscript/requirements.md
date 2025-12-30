# Requirements Document

## Introduction

本项目旨在使用 vite-plugin-monkey + Vue3 开发一个统一的油猴脚本，整合并丰富现有的三个 CCF 等级显示脚本（arXiv、DBLP、IEEE Xplore），为科研人员在浏览学术网站时提供便捷的论文 CCF 分级信息展示功能。

## Glossary

- **CCF_Catalog**: 中国计算机学会推荐国际学术会议和期刊目录数据库，包含期刊/会议名称与其CCF等级(A/B/C)的映射关系
- **Venue**: 论文发表的期刊或会议名称
- **Venue_Matcher**: 负责将提取到的venue字符串与CCF目录进行匹配的模块
- **Site_Adapter**: 针对特定学术网站的适配器，负责从页面DOM中提取论文和venue信息
- **Rank_Badge**: 显示CCF等级的UI组件
- **Settings_Panel**: 用户设置面板组件
- **DBLP_Service**: 通过DBLP API查询论文venue信息的服务模块

## Requirements

### Requirement 1: 多站点支持

**User Story:** As a 科研人员, I want to 在多个学术网站上看到CCF等级信息, so that 我可以快速评估论文的发表质量。

#### Acceptance Criteria

1. WHEN 用户访问 arXiv.org 搜索结果页面 THEN THE Site_Adapter SHALL 识别并处理页面上的论文列表
2. WHEN 用户访问 DBLP.org 搜索结果或作者页面 THEN THE Site_Adapter SHALL 识别并处理页面上的论文列表
3. WHEN 用户访问 IEEE Xplore 搜索结果页面 THEN THE Site_Adapter SHALL 识别并处理页面上的论文列表
4. WHEN 页面动态加载新内容 THEN THE Site_Adapter SHALL 自动检测并处理新增的论文条目
5. THE Site_Adapter SHALL 支持通过插件机制扩展新的学术网站

### Requirement 2: Venue信息提取

**User Story:** As a 科研人员, I want to 脚本能准确提取论文的发表venue, so that 能正确显示CCF等级。

#### Acceptance Criteria

1. WHEN 处理arXiv论文 THEN THE Site_Adapter SHALL 首先从论文comments字段解析venue信息
2. WHEN arXiv论文comments中未找到venue THEN THE DBLP_Service SHALL 通过论文标题查询DBLP获取venue
3. WHEN 处理DBLP页面论文 THEN THE Site_Adapter SHALL 从venue链接或文本中提取venue信息
4. WHEN 处理IEEE Xplore论文 THEN THE Site_Adapter SHALL 从publication-title或相关元素提取venue信息
5. THE Venue_Matcher SHALL 清理venue字符串，移除年份、卷号、页码等无关信息
6. IF venue提取失败 THEN THE System SHALL 显示"未找到"状态而非报错

### Requirement 3: CCF等级匹配

**User Story:** As a 科研人员, I want to 脚本能准确匹配CCF等级, so that 显示的等级信息是可靠的。

#### Acceptance Criteria

1. THE CCF_Catalog SHALL 包含CCF 2022版目录中所有A类和B类期刊与会议
2. WHEN 匹配venue THEN THE Venue_Matcher SHALL 首先尝试完全匹配（不区分大小写）
3. WHEN 完全匹配失败 THEN THE Venue_Matcher SHALL 尝试清理后的字符串匹配
4. WHEN 清理匹配失败 THEN THE Venue_Matcher SHALL 尝试部分匹配（venue包含已知缩写）
5. WHEN 部分匹配失败 THEN THE Venue_Matcher SHALL 尝试首字母缩写匹配
6. THE Venue_Matcher SHALL 支持常见的venue全称和别名映射

### Requirement 4: CCF等级显示

**User Story:** As a 科研人员, I want to 清晰地看到论文的CCF等级, so that 我能快速识别高质量论文。

#### Acceptance Criteria

1. WHEN CCF等级为A THEN THE Rank_Badge SHALL 显示红色背景的"CCF-A"标签
2. WHEN CCF等级为B THEN THE Rank_Badge SHALL 显示橙色背景的"CCF-B"标签
3. WHEN CCF等级为C THEN THE Rank_Badge SHALL 显示蓝色背景的"CCF-C"标签
4. WHEN venue已识别但无CCF等级 THEN THE Rank_Badge SHALL 显示灰色的venue信息
5. THE Rank_Badge SHALL 显示venue来源信息（comment/DBLP/页面提取）
6. WHEN 用户悬停在Rank_Badge上 THEN THE System SHALL 显示详细的venue和来源信息tooltip
7. THE Rank_Badge SHALL 不破坏原网站的页面布局和样式

### Requirement 5: 用户设置

**User Story:** As a 科研人员, I want to 自定义脚本的行为和显示, so that 脚本能满足我的个性化需求。

#### Acceptance Criteria

1. WHEN 用户点击设置按钮 THEN THE Settings_Panel SHALL 显示设置界面
2. THE Settings_Panel SHALL 允许用户选择要显示的CCF等级（A/B/C/全部）
3. THE Settings_Panel SHALL 允许用户启用或禁用特定网站的支持
4. THE Settings_Panel SHALL 允许用户选择Rank_Badge的显示位置（标题后/作者后/自定义）
5. WHEN 用户修改设置 THEN THE System SHALL 立即应用更改并持久化存储
6. THE System SHALL 使用GM_setValue/GM_getValue存储用户设置

### Requirement 6: 性能优化

**User Story:** As a 科研人员, I want to 脚本运行流畅不卡顿, so that 不影响我的正常浏览体验。

#### Acceptance Criteria

1. THE System SHALL 缓存DBLP查询结果，避免重复请求
2. THE System SHALL 使用防抖机制处理页面滚动和动态加载
3. THE System SHALL 避免重复处理已添加Rank_Badge的论文条目
4. WHEN 页面有大量论文 THEN THE System SHALL 使用虚拟滚动或分批处理
5. THE DBLP_Service SHALL 设置合理的请求超时时间（10秒）

### Requirement 7: 统计功能

**User Story:** As a 科研人员, I want to 看到当前页面的论文等级分布, so that 我能快速了解搜索结果的整体质量。

#### Acceptance Criteria

1. THE System SHALL 在页面上显示一个可折叠的统计面板
2. THE Statistics_Panel SHALL 显示当前页面各CCF等级的论文数量
3. THE Statistics_Panel SHALL 显示各等级论文的百分比
4. WHEN 页面内容变化 THEN THE Statistics_Panel SHALL 自动更新统计数据
5. THE Statistics_Panel SHALL 允许用户点击某个等级快速筛选/高亮对应论文

### Requirement 8: 错误处理

**User Story:** As a 科研人员, I want to 脚本能优雅地处理错误, so that 不会影响我的正常使用。

#### Acceptance Criteria

1. IF DBLP请求失败 THEN THE System SHALL 显示友好的错误提示而非崩溃
2. IF DBLP请求超时 THEN THE System SHALL 显示超时状态并允许用户重试
3. IF 页面DOM结构变化导致提取失败 THEN THE System SHALL 记录日志并继续处理其他论文
4. THE System SHALL 提供调试模式，在控制台输出详细日志
5. IF 发生未预期错误 THEN THE System SHALL 捕获异常并显示通用错误提示
