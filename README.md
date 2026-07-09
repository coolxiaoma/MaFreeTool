<div align="center">
  <img src="public/assets/logo_with_text.png" alt="MaFreeTool Logo" width="500"/>

  **MaFreeTool** — 基于 [FreeTool](https://github.com/zstar1003/FreeTool) 的纯前端多功能在线工具站。

  提供文本处理、图片编辑、数据转换、媒体处理等实用工具，开箱即用。

  除在线翻译等少数需联网的功能外，**所有工具均在浏览器本地运行**，数据不会上传到服务器。

  部分 AI / OCR 工具首次使用时会下载模型并缓存到浏览器本地。

  <!-- 部署后替换为实际地址 -->
  <!-- 在线访问：https://your-domain.com/MaFreeTool -->
</div>

## 关于本项目

本项目是 [zstar1003/FreeTool](https://github.com/zstar1003/FreeTool) 的 Fork，在保留原版全部能力的基础上进行个性化维护与功能扩展。

| 项目 | 地址 |
|------|------|
| 上游仓库 | [zstar1003/FreeTool](https://github.com/zstar1003/FreeTool) |
| 本仓库 | [coolxiaoma/MaFreeTool](https://github.com/coolxiaoma/MaFreeTool) |
| 上游在线演示 | [xdxsb.top/FreeTool](https://xdxsb.top/FreeTool) · [tool.zstar.website](https://tool.zstar.website) |

## 功能一览

### 文本工具

- 在线翻译
- 代码高亮
- 文本格式化
- JSON 格式化
- XML 格式化
- 文本差异对比

### 图片工具

- 图片格式转换
- AI 图片检测
- 图片快速编辑
- 多图自由拼接
- 图片圆角处理
- 图片 OCR 识别
- 模板快速拼接
- 图片水印去除
- PCB 艺术画

### 数据工具

- 表格格式转换
- 数学公式编辑
- 思维导图
- 绘图画布

### 媒体工具

- 视频比例转换
- PDF 转 PPT
- PDF 转长图

### 其它工具

- 显存计算器
- 图片转提示词
- 简历生成器
- 提示词生成器
- MBTI 人格测试

> **小技巧**：在工具项上点击鼠标右键，可将常用工具置顶到菜单栏。

## 路线图

以下功能正在规划或开发中：

- [ ] **Markdown 工具** — 新增独立菜单分类，计划包含：
  - Markdown 实时预览
  - Markdown 与 HTML 互转
  - 目录（TOC）生成
  - 表格 / 代码块格式化
  - 更多常用 Markdown 辅助工具（持续补充）

欢迎通过 [Issue](https://github.com/coolxiaoma/MaFreeTool/issues) 提出需求或参与贡献。

## 技术栈

- **框架**：React 19 + TypeScript
- **构建**：Vite 6
- **样式**：Tailwind CSS
- **特性**：组件懒加载、深色模式、LocalStorage 置顶偏好

## 本地开发

**环境要求**：Node.js 16+

```bash
# 克隆仓库
git clone https://github.com/coolxiaoma/MaFreeTool.git
cd MaFreeTool

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器访问 `http://localhost:5173`。

部分 AI 相关工具（如图片转提示词、简历生成等）需在项目根目录创建 `.env` 文件并配置：

```env
GEMINI_API_KEY=你的_Gemini_API_Key
```

## 构建与预览

```bash
# 生产构建，产物输出至 dist/
npm run build

# 本地预览构建结果
npm run preview
```

## 参与贡献

1. Fork 本仓库并创建功能分支
2. 提交变更并确保 `npm run build` 通过
3. 向本仓库发起 Pull Request

发现问题或有功能建议，欢迎提交 [Issue](https://github.com/coolxiaoma/MaFreeTool/issues)。

若改动涉及上游通用能力，也欢迎同步贡献至 [FreeTool 原仓库](https://github.com/zstar1003/FreeTool)。

## License

详见 [LICENSE](LICENSE) 文件。
