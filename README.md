# Layered Learning Log

这是一个适合上传到 GitHub 仓库的个人学习博客模板，核心目标是：

- 每篇学习日记都作为一份独立 Markdown 文件保存
- 网站自动把这些 Markdown 渲染成可阅读页面
- 通过标签组织和筛选日记
- 后续新增标签时不需要改模板代码

## 目录结构

```text
.
├── _config.yml           # Jekyll 站点配置
├── _layouts/            # 页面布局模板
├── _includes/           # 可复用片段
├── _notes/              # 你的学习日记 Markdown 文件
├── assets/
│   ├── css/             # 样式
│   └── js/              # 标签筛选和交互
├── index.md             # 首页
└── tags.md              # 标签聚合页
```

## 如何新增一篇学习日记

在 `_notes/` 目录里新建一个 Markdown 文件，例如：

```md
---
title: 今天学了什么
date: 2026-03-15
summary: 一句话概括今天这篇日记讲的内容。
tags:
  - Python
  - 工程化
  - 复盘
---

这里开始写正文。
```

你只需要关注四个字段：

- `title`：标题
- `date`：日期
- `summary`：列表页摘要
- `tags`：标签数组，可以自由新增

注意：`date` 如果写成未来日期，Jekyll 默认不会把这篇内容发布到站点里。

## 如何新增标签

这是一个静态博客模板，所以“新增标签”的方式是：

1. 在某篇日记的 `tags` 字段里直接写上新标签
2. 提交到 GitHub 仓库
3. GitHub Pages 重新构建后，首页筛选区和标签页会自动出现这个新标签

例如：

```md
tags:
  - AReaL
  - RLHF
  - 分布式训练
```

不需要在任何别的文件里注册标签。

## 本地预览

如果本机已经安装 Ruby 和 Bundler，可以在仓库根目录执行：

```bash
bundle install
bundle exec jekyll serve
```

然后打开 `http://127.0.0.1:4000` 预览。

## 发布到 GitHub Pages

1. 把当前目录初始化为 Git 仓库并推到 GitHub。
2. 在 GitHub 仓库设置里打开 Pages。
3. 选择从默认分支部署。
4. GitHub 会自动用 Jekyll 构建这个站点。

因为这是仓库 `Personal_Knowledge_Base` 下的 project site，默认访问地址会是：

```text
https://ln172.github.io/Personal_Knowledge_Base/
```

这个模板已经按这个路径配置好了 `baseurl`。

## 适合继续扩展的方向

- 增加“按年份归档”页面
- 增加某个标签的专题说明页
- 增加文章封面图、系列字段或阅读时长
- 接入评论系统或统计系统

## 需要知道的边界

当前模板已经支持：

- Markdown 日记自动渲染
- 标签自动汇总
- 按标签和关键词筛选

当前模板**不支持**在线直接在网页上创建标签并自动写回 GitHub 仓库。  
如果你想要“在网站上点按钮新增标签并持久化保存”，那就需要额外引入后端，或者接 GitHub API + 登录鉴权。
