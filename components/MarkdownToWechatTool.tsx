import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    WECHAT_THEMES,
    WechatThemeId,
    copyWechatHtml,
    renderWechatMarkdown,
} from '../utils/wechatMarkdownRenderer';

const STORAGE_KEY = 'freetool-markdown-wechat';
const THEME_KEY = 'freetool-markdown-wechat-theme';

const DEFAULT_CONTENT = `# MD 转公众号

欢迎使用 MaFreeTool **MD 转公众号** 工具。左侧编辑 Markdown，右侧实时预览公众号排版效果。

## 功能特点

- 真实公众号样式预览，所见即所发
- 支持代码高亮、表格、引用块
- 多套主题：雅致 / 极简 / 科技蓝 / 暖心橙
- 一键复制到公众号编辑器

## 代码示例

\`\`\`javascript
const publish = (markdown) => {
  console.log('复制后粘贴到公众号后台即可');
};
\`\`\`

> 提示：Mermaid 图表建议先用 Mermaid 工具导出 PNG 再插入。

| 步骤 | 操作 |
|------|------|
| 1 | 粘贴 Markdown 内容 |
| 2 | 选择主题风格 |
| 3 | 点击「复制到公众号」 |
`;

type MobilePane = 'edit' | 'preview';
type PreviewMode = 'light' | 'dark';

const MarkdownToWechatTool: React.FC = () => {
    const [content, setContent] = useState('');
    const [previewHtml, setPreviewHtml] = useState('');
    const [themeId, setThemeId] = useState<WechatThemeId>('elegant');
    const [previewMode, setPreviewMode] = useState<PreviewMode>('light');
    const [mobilePane, setMobilePane] = useState<MobilePane>('edit');
    const [hint, setHint] = useState('');
    const [isHintFadingOut, setIsHintFadingOut] = useState(false);
    const [isCopying, setIsCopying] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const theme = WECHAT_THEMES[themeId];
    const lineCount = content.split('\n').length;
    const charCount = content.length;

    const showHint = useCallback((message: string) => {
        setHint(message);
        setIsHintFadingOut(false);
        setTimeout(() => setIsHintFadingOut(true), 1700);
        setTimeout(() => {
            setHint('');
            setIsHintFadingOut(false);
        }, 2000);
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        const savedTheme = localStorage.getItem(THEME_KEY) as WechatThemeId | null;
        setContent(saved ?? DEFAULT_CONTENT);
        if (savedTheme && savedTheme in WECHAT_THEMES) {
            setThemeId(savedTheme);
        }
    }, []);

    useEffect(() => {
        if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);

        renderTimeoutRef.current = setTimeout(async () => {
            try {
                const html = await renderWechatMarkdown(content, themeId);
                setPreviewHtml(html);
            } catch {
                setPreviewHtml('<p style="color:#cf1322;">渲染失败，请检查 Markdown 内容</p>');
            }
        }, 300);

        return () => {
            if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
        };
    }, [content, themeId]);

    useEffect(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            localStorage.setItem(STORAGE_KEY, content);
            localStorage.setItem(THEME_KEY, themeId);
        }, 500);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [content, themeId]);

    const handleImport = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const text = typeof reader.result === 'string' ? reader.result : '';
            setContent(text);
            showHint(`已导入 ${file.name}`);
        };
        reader.readAsText(file);
    }, [showHint]);

    const handleCopy = useCallback(async () => {
        if (!previewHtml.trim()) {
            showHint('请先输入 Markdown 内容');
            return;
        }

        setIsCopying(true);
        try {
            await copyWechatHtml(previewHtml, themeId);
            showHint('已复制，可粘贴到公众号编辑器');
        } catch {
            showHint('复制失败，请重试');
        } finally {
            setIsCopying(false);
        }
    }, [previewHtml, themeId, showHint]);

    const previewBackground = previewMode === 'light' ? '#ffffff' : '#1f1f1f';
    const previewTextColor = previewMode === 'light' ? theme.text : '#e8e8e8';

    return (
        <div className="flex w-full flex-col items-center px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-10">
            {hint && (
                <div
                    className={`fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-gray-700 ${
                        isHintFadingOut ? 'animate-fade-out-up' : 'animate-fade-in-down'
                    }`}
                >
                    {hint}
                </div>
            )}

            <div className="flex w-full max-w-7xl flex-col items-center gap-2 text-center mb-6">
                <p className="text-3xl font-black leading-tight tracking-tighter text-gray-900 dark:text-white sm:text-4xl">
                    MD 转公众号
                </p>
                <p className="text-base font-normal text-gray-500 dark:text-gray-400">
                    将 Markdown 转为微信公众号兼容样式，实时预览，一键复制发布。
                </p>
            </div>

            <div className="w-full max-w-7xl">
                <div className="mb-3 flex flex-col gap-3 rounded-xl border border-border-light bg-surface-light p-3 shadow-sm dark:border-border-dark dark:bg-surface-dark lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".md,.markdown,.txt"
                            className="hidden"
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleImport(file);
                                e.target.value = '';
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1 rounded-lg border border-border-light px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-border-dark dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            <span className="material-symbols-outlined text-lg">upload_file</span>
                            导入
                        </button>

                        <div className="flex rounded-lg border border-border-light p-1 dark:border-border-dark">
                            {(['light', 'dark'] as PreviewMode[]).map(mode => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setPreviewMode(mode)}
                                    className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                                        previewMode === mode
                                            ? 'bg-primary text-white'
                                            : 'text-gray-600 dark:text-gray-300'
                                    }`}
                                >
                                    {mode === 'light' ? '浅' : '深'}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-1">
                            {(Object.keys(WECHAT_THEMES) as WechatThemeId[]).map(id => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setThemeId(id)}
                                    className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                                        themeId === id
                                            ? 'text-white'
                                            : 'border border-border-light text-gray-700 hover:bg-gray-50 dark:border-border-dark dark:text-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                    style={themeId === id ? { backgroundColor: WECHAT_THEMES[id].primary } : undefined}
                                >
                                    {WECHAT_THEMES[id].name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleCopy}
                        disabled={isCopying || !previewHtml.trim()}
                        className="flex items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-lg">content_copy</span>
                        {isCopying ? '复制中...' : '复制到公众号'}
                    </button>
                </div>

                <div className="mb-3 flex rounded-lg border border-border-light bg-gray-100 p-1 dark:border-border-dark dark:bg-gray-800 md:hidden">
                    {(['edit', 'preview'] as MobilePane[]).map(pane => (
                        <button
                            key={pane}
                            type="button"
                            onClick={() => setMobilePane(pane)}
                            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                                mobilePane === pane
                                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-500 dark:text-gray-400'
                            }`}
                        >
                            {pane === 'edit' ? '编辑' : '预览'}
                        </button>
                    ))}
                </div>

                <div className="grid h-[calc(100vh-18rem)] min-h-[480px] grid-cols-1 gap-4 md:grid-cols-2">
                    <div className={`flex flex-col overflow-hidden rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark ${mobilePane !== 'edit' ? 'hidden md:flex' : 'flex'}`}>
                        <div className="flex items-center justify-between border-b border-border-light px-4 py-2 dark:border-border-dark">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">编辑</span>
                            <span className="text-xs text-gray-400">{lineCount} 行 · {charCount} 字符</span>
                        </div>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            spellCheck={false}
                            className="flex-1 resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-gray-900 outline-none dark:text-gray-100"
                            placeholder="在此粘贴 Markdown 内容..."
                        />
                    </div>

                    <div className={`flex flex-col overflow-hidden rounded-xl border border-border-light dark:border-border-dark ${mobilePane !== 'preview' ? 'hidden md:flex' : 'flex'}`}>
                        <div className="flex items-center justify-between border-b border-border-light bg-surface-light px-4 py-2 dark:border-border-dark dark:bg-surface-dark">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">公众号文章</span>
                            <span className="text-xs text-gray-400">主题：{theme.name}</span>
                        </div>
                        <div
                            className="flex-1 overflow-auto p-4"
                            style={{ backgroundColor: previewBackground }}
                        >
                            {content.trim() ? (
                                <div
                                    className="mx-auto max-w-[677px] rounded-lg p-6 shadow-sm"
                                    style={{
                                        backgroundColor: previewMode === 'light' ? '#ffffff' : '#2a2a2a',
                                        color: previewTextColor,
                                        minHeight: '100%',
                                    }}
                                >
                                    <div
                                        className="wechat-preview"
                                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                                    />
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                                    粘贴 Markdown 后，此处显示公众号排版预览
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarkdownToWechatTool;
