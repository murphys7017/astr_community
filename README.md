<p align="center">
    <img alt="logo" src="./vue3-project/src/assets/imgs/logo.png" width="100" />
</p>
<h1 align="center" style="margin: 20px 30px 0px 30px; font-weight: bold;">AstrBot Community</h1>

---
<p align="center">
    <b>基于 Express + Vue 的前后端分离轻量文本社区</b>
</p>
<p align="center">
    <i>面向 AstrBot 用户的轻量文本社区，支持 Markdown、外链媒体与本地渲染样式切换</i>
</p>
<p align="center"><a href="https://www.shiliu.space">演示网站</a> · <a href="https://www.bilibili.com/video/BV1J4agztEBX/?spm_id_from=333.1387.homepage.video_card.click">视频介绍</a>
</p>
<p align="center"><a href="README.md">简体中文</a> | <a href="doc/i18n/README_En.md">English</a> | <a href="doc/i18n/README_zh-Hant.md">繁體中文</a>
</p>
<p align="center">
    <a href="https://github.com/murphys7017/astr_community/stargazers">
        <img src="https://img.shields.io/github/stars/murphys7017/astr_community?style=flat&logo=github&color=brightgreen&label=Stars">
    </a>
    <a href="https://github.com/murphys7017/astr_community/network/members">
        <img src="https://img.shields.io/github/forks/murphys7017/astr_community?style=flat&logo=github&color=brightgreen&label=Forks">
    </a>
    <a href="https://github.com/murphys7017/astr_community">
        <img src="https://img.shields.io/badge/AstrBot%20Community-v1.3.2-brightgreen">
    </a>
    <a href="https://github.com/murphys7017/astr_community/blob/master/LICENSE">
        <img src="https://img.shields.io/github/license/murphys7017/astr_community?color=8ebc06">
    </a>
</p>
<p align="center">
    <img src="https://img.shields.io/static/v1?message=Vue&color=4f4f4f&logo=Vue.js&logoColor=4FC08D&label=">
    <img
        src="https://img.shields.io/static/v1?&message=JavaScript&color=4f4f4f&logo=JavaScript&logoColor=F7DF1E&label=">
    </a>
</p>


> **声明**  
> 本项目基于 [GPLv3 协议](./LICENSE)，免费开源，仅供学习交流，禁止转卖，谨防受骗。如需商用请保留版权信息，确保合法合规使用，运营风险自负，与作者无关。

---

## 项目来源

AstrBot Community 基于原项目 [ZTMYO/XiaoShiLiu](https://github.com/ZTMYO/XiaoShiLiu) 二次改造而来。

当前仓库在保留原项目前后端基础能力的前提下，结合 AstrBot 社区场景进行了品牌、文案、分类结构、登录流程与纯文本社区化方向的调整。

## 当前定位

- 面向 AstrBot 用户的轻量文本交流平台
- 帖子正文以 Markdown 源文存储，并在前端渲染
- 图片、视频、文档均优先通过外链接入
- 头像默认跟随 GitHub 等外部账号来源，不再提供站内头像上传
- Markdown 渲染样式当前提供 `phycat-mint` 与 `phycat-abyss` 两套内置主题

> 📁 **项目结构说明**：本项目包含完整的前后端代码，前端位于 `vue3-project/` 目录，后端位于 `express-project/` 目录。详细结构请查看 [项目结构文档](./doc/PROJECT_STRUCTURE.md)。

## 项目展示

### PC端界面

<table>
  <tr>
    <td><img src="./doc/imgs/1.png" alt="PC端界面1" width="300"/></td>
    <td><img src="./doc/imgs/2.png" alt="PC端界面2" width="300"/></td>
    <td><img src="./doc/imgs/3.png" alt="PC端界面3" width="300"/></td>
  </tr>
  <tr>
    <td><img src="./doc/imgs/4.png" alt="PC端界面4" width="300"/></td>
    <td><img src="./doc/imgs/5.png" alt="PC端界面5" width="300"/></td>
    <td><img src="./doc/imgs/6.png" alt="PC端界面6" width="300"/></td>
  </tr>
  <tr>
    <td><img src="./doc/imgs/7.png" alt="PC端界面7" width="300"/></td>
    <td><img src="./doc/imgs/8.png" alt="PC端界面8" width="300"/></td>
    <td><img src="./doc/imgs/9.png" alt="PC端界面9" width="300"/></td>
  </tr>
  <tr>
    <td><img src="./doc/imgs/10.png" alt="PC端界面10" width="300"/></td>
    <td><img src="./doc/imgs/11.png" alt="PC端界面11" width="300"/></td>
    <td><img src="./doc/imgs/12.png" alt="PC端界面12" width="300"/></td>
  </tr>
  <tr>
    <td><img src="./doc/imgs/13.png" alt="PC端界面13" width="300"/></td>
    <td><img src="./doc/imgs/14.png" alt="PC端界面14" width="300"/></td>
    <td><img src="./doc/imgs/15.png" alt="PC端界面15" width="300"/></td>
  </tr>
    <tr>
    <td><img src="./doc/imgs/16.png" alt="PC端界面16" width="300"/></td>
    <td><img src="./doc/imgs/17.png" alt="PC端界面17" width="300"/></td>
    <td><img src="./doc/imgs/18.png" alt="PC端界面18" width="300"/></td>
  </tr>
</table>



### 移动端界面

<table>
  <tr>
    <td><img src="./doc/imgs/m1.png" alt="移动端界面1" width="200"/></td>
    <td><img src="./doc/imgs/m2.png" alt="移动端界面2" width="200"/></td>
    <td><img src="./doc/imgs/m3.png" alt="移动端界面3" width="200"/></td>
    <td><img src="./doc/imgs/m4.png" alt="移动端界面4" width="200"/></td>
  </tr>
  <tr>
    <td><img src="./doc/imgs/m5.png" alt="移动端界面5" width="200"/></td>
    <td><img src="./doc/imgs/m6.png" alt="移动端界面6" width="200"/></td>
    <td><img src="./doc/imgs/m7.png" alt="移动端界面7" width="200"/></td>
    <td><img src="./doc/imgs/m8.png" alt="移动端界面8" width="200"/></td>
  </tr>
  <tr>
    <td><img src="./doc/imgs/m9.png" alt="移动端界面9" width="200"/></td>
    <td><img src="./doc/imgs/m10.png" alt="移动端界面10" width="200"/></td>
    <td><img src="./doc/imgs/m11.png" alt="移动端界面11" width="200"/></td>
    <td><img src="./doc/imgs/m12.png" alt="移动端界面12" width="200"/></td>
  </tr>
</table>

## 项目文档

| 文档 | 说明 |
|------|------|
| [部署指南](./doc/DEPLOYMENT.md) | 部署配置和环境搭建说明 |
| [项目结构](./doc/PROJECT_STRUCTURE.md) | 项目目录结构架构说明 |
| [数据库设计](./doc/DATABASE_DESIGN.md) | 数据库表结构设计文档 |
| [API接口文档](./doc/API_DOCS.md) | 后端API接口说明和示例 |

## 项目亮点

- **工程化：** 环境配置、代码规范、构建与产物优化的完整流程
- **业务能力：** 鉴权流程、路由守卫、状态管理与接口封装
- **体验优化：** 骨架屏、懒加载、预加载、无障碍与响应式适配
- **组件与分层：** 可复用组件拆分、按领域分组与别名引入
- **后台管理：** 基础CRUD、数据管理与配置面板，支持后续扩展权限与统计
- **快速部署：** 基于 Docker 的一键部署方案，支持多环境配置与自动化部署
- **Markdown 渲染：** 支持完整 Markdown 语法、远程 Markdown 内联、视频嵌入与双主题切换

## 功能特性

### Markdown 渲染系统

- **完整 Markdown 支持**：标题、列表、代码块、引用、表格等标准语法
- **外链图片**：`![图片描述](url)` 支持外部图片链接渲染
- **远程 Markdown**：`[::md](url)` 支持远程 Markdown 文件抓取并内联渲染（默认展开）
- **视频嵌入**：`[::video](url)` 支持 mp4/webm/ogg 直链视频和 Bilibili 长链接解析
- **双主题切换**：Phycat Mint（浅色）和 Phycat Abyss（深色）两套主题，保存在本地 localStorage

#### 自定义块语法

除标准 Markdown 语法外，系统还支持以下自定义块语法：

| 语法 | 说明 | 示例 |
|------|------|------|
| `[::md](url)` | 远程 Markdown - 抓取并内联渲染远程 .md 文件 | `[::md](https://example.com/readme.md)` |
| `[::video](url)` | 视频嵌入 - 支持直链视频和 Bilibili 长链接 | `[::video](https://example.com/video.mp4)` |

> **注意**：自定义语法必须单独成行才能被识别。

### 纯文本社区优化

- **移除媒体上传**：不再提供站内文件上传入口，所有媒体通过外链引用
- **媒体标签拦截**：后端自动拦截 `<img>`、`<video>`、`<audio>`、`<iframe>` 等 HTML 标签
- **移除 @提及功能**：全站移除 mention UI、解析和通知生成逻辑

## 技术栈

> 💡点击可展开查看详细内容
<details>
<summary><b>前端技术</b></summary>

- **Vue.js 3** - 前端框架（Composition API）
- **Vue Router 4** - 路由管理
- **Pinia** - 状态管理
- **Vite** - 构建工具和开发服务器
- **Axios** - HTTP客户端
- **VueUse** - Vue组合式工具库
- **CropperJS** - 图片裁剪
- **Vue3 Emoji Picker** - 表情选择器
- **svg-captcha** - 验证码生成器
- **markdown-it** - Markdown 解析器
</details>

<details>
<summary><b>后端技术</b></summary>

- **Node.js** - 运行环境
- **Express.js** - Web框架
- **MySQL** - 数据库
- **JWT** - 身份认证
- **Multer** - 文件上传
- **bcrypt** - 密码加密
- **CORS** - 跨域资源共享

</details>



## 第三方API
- **IP 属地查询：** 默认使用 [保罗 API](https://api.pearktrue.cn/console/detail?id=290) 作为主/备属地查询服务
- **SMTP 邮件：** 邮箱验证码和找回密码能力依赖你自行配置的 SMTP 服务
- **外链媒体：** 图片、视频与远程 Markdown 由用户提供外链，平台默认不托管站内上传文件


## 环境要求

| 组件 | 版本要求 |
|------|----------|
| Node.js | >= 16.0.0 |
| MySQL | >= 5.7 |
| MariaDB | >= 10.3 |
| npm | >= 8.0.0 |
| yarn | >= 1.22.0 |
| 浏览器 | 支持ES6+ |

> 提示：上述为传统本地开发的最低版本要求。若使用 Docker 部署，默认镜像版本如下：MySQL 5.7、Node 18-alpine（前后端构建/运行）、Nginx alpine；Docker >= 20、Docker Compose >= 2。详见[部署指南文档](./doc/DEPLOYMENT.md)。

## 环境配置

项目使用环境变量进行配置管理，前后端分别有独立的 `.env` 文件：

### 后端配置 (express-project/.env)

```env
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=123456
DB_NAME=xiaoshiliu
DB_PORT=3306

# JWT配置
JWT_SECRET=xiaoshiliu_secret_key_2025
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# API配置
API_BASE_URL=http://localhost:3001

# 上传配置
# 当前默认关闭站内文件上传；以下配置仅保留给兼容旧数据或二次开发使用
IMAGE_MAX_SIZE=10mb
VIDEO_MAX_SIZE=100mb
IMAGE_UPLOAD_STRATEGY=imagehost
VIDEO_UPLOAD_STRATEGY=local

# 本地存储配置
LOCAL_UPLOAD_DIR=uploads
LOCAL_BASE_URL=http://localhost:3001
# 视频存储目录
VIDEO_UPLOAD_DIR=uploads/videos
# 视频封面存储目录
VIDEO_COVER_DIR=uploads/covers

# 第三方图床配置（当IMAGE_UPLOAD_STRATEGY=imagehost时使用）
IMAGEHOST_API_URL=https://api.xinyew.cn/api/360tc
IMAGEHOST_TIMEOUT=60000

# Cloudflare R2 配置（当IMAGE_UPLOAD_STRATEGY=r2或VIDEO_UPLOAD_STRATEGY=r2时使用）
R2_ACCESS_KEY_ID=your_r2_access_key_id_here
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key_here
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
R2_BUCKET_NAME=your_bucket_name_here
R2_ACCOUNT_ID=your_account_id_here
R2_REGION=auto
# 可选：如果有自定义域名，可以设置 R2_PUBLIC_URL
# R2_PUBLIC_URL=https://your-custom-domain.com

# CORS配置
CORS_ORIGIN=http://localhost:5173

# 邮件服务配置
# 是否启用邮件功能 (true/false)，默认不启用
EMAIL_ENABLED=false
# SMTP服务器地址
SMTP_HOST=smtp.qq.com
# SMTP服务器端口
SMTP_PORT=465
# 是否使用SSL/TLS (true/false)
SMTP_SECURE=true
# 邮箱账号
SMTP_USER=your_email@example.com
# 邮箱密码/授权码
SMTP_PASSWORD=your_email_password
# 发件人邮箱
EMAIL_FROM=your_email@example.com
# 发件人名称
EMAIL_FROM_NAME=AstrBot Community

# IP属地查询配置
# 主API地址
IP_LOCATION_PRIMARY_API=https://api.pearktrue.cn/api/ip/details
# 主API超时时间（毫秒）
IP_LOCATION_PRIMARY_TIMEOUT=10000
# 备用API地址
IP_LOCATION_BACKUP_API=https://api.pearktrue.cn/api/ip/high
# 备用API超时时间（毫秒）
IP_LOCATION_BACKUP_TIMEOUT=5000
```

### 前端配置 (vue3-project/.env)

```env
# API基础URL
VITE_API_BASE_URL=http://localhost:3001/api

# 是否使用真实API
VITE_USE_REAL_API=true

# 应用标题
VITE_APP_TITLE=AstrBot Community
```

> 💡 **配置说明**：
> - 当前版本默认关闭站内图片、视频和头像上传，媒体建议统一使用外链
> - 上传相关环境变量仍保留在后端，主要用于兼容历史实现或二次开发
> - 邮件功能默认关闭，启用后支持邮箱验证注册和找回密码
> - IP属地查询支持主备双API，自动切换保证服务可用性
> - 前端使用 Vite 环境变量，变量名需以 `VITE_` 开头
> - 详细配置说明请参考 [部署指南](./doc/DEPLOYMENT.md)

### 1. 安装依赖

```bash
# 使用 cnpm或npm
cnpm install
# 或使用 yarn
yarn install
```

### 2. 启动开发服务器

```bash
# 启动开发服务器
npm run dev

# 或使用 yarn
yarn dev
```

开发服务器将在 `http://localhost:5173` 启动

### 3. 构建生产版本

```bash
# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

> ⚠️ **重要提醒**：前端项目需要配合后端服务使用，详细配置请查看 [部署指南](./doc/DEPLOYMENT.md)

## Star历史

[![Star History Chart](https://api.star-history.com/svg?repos=murphys7017/astr_community&type=Date&theme=dark)](https://www.star-history.com/#murphys7017/astr_community&Date)

---

<div align="center">

Copyright © 2025 - **AstrBot Community**\
By ZTMYO\
Made with ❤️ & ⌨️

</div>

