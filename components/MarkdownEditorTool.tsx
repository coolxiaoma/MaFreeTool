import React, { useState, useCallback, useEffect, useRef } from 'react';
import { highlightPreviewCode, renderMarkdown } from '../utils/renderMarkdown';

const STORAGE_KEY = 'freetool-markdown-editor';
const DEFAULT_FILENAME = 'mafreetool_markdown.md';

const DEFAULT_CONTENT = `# Markdown 编辑器

欢迎使用 MaFreeTool Markdown 编辑器！左侧写作，右侧实时预览 GFM 渲染效果。

## 功能特点

- **实时双栏预览** — 编辑与渲染同步刷新
- **自动保存** — 草稿保存在浏览器 localStorage
- **导出文件** — \`Ctrl+S\` / \`Cmd+S\` 下载 .md 文件
- **本地运行** — 内容不上传服务器

## 表格示例

| 功能 | 说明 |
|------|------|
| GFM | 支持 GitHub 风味 Markdown |
| 代码高亮 | 围栏代码块自动高亮 |
| 任务清单 | 支持 checkbox 列表 |

## 代码块

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}
greet('Markdown');
\`\`\`

> 引用块：适合标注重点或引用原文。

- [x] 支持粗体、斜体、删除线
- [x] 支持有序 / 无序列表
- [ ] 更多 Markdown 工具持续添加中
`;

type MobilePane = 'edit' | 'preview';

interface ToolbarAction {
    icon: string;
    title: string;
    action: () => void;
}

const MarkdownEditorTool: React.FC = () => {
    const [content, setContent] = useState<string>('');
    const [previewHtml, setPreviewHtml] = useState<string>('');
    const [mobilePane, setMobilePane] = useState<MobilePane>('edit');
    const [saveHint, setSaveHint] = useState<string>('');
    const [isHintFadingOut, setIsHintFadingOut] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const lineCount = content.split('\n').length;
    const charCount = content.length;

    const showHint = useCallback((message: string) => {
        setSaveHint(message);
        setIsHintFadingOut(false);
        setTimeout(() => setIsHintFadingOut(true), 1700);
        setTimeout(() => {
            setSaveHint('');
            setIsHintFadingOut(false);
        }, 2000);
    }, []);

    const insertMarkdown = useCallback((
        before: string,
        after = '',
        placeholder = ''
    ) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = content.substring(start, end) || placeholder;
        const nextValue = content.substring(0, start) + before + selected + after + content.substring(end);

        setContent(nextValue);

        requestAnimationFrame(() => {
            const cursor = start + before.length + selected.length;
            textarea.focus();
            textarea.setSelectionRange(cursor, cursor);
        });
    }, [content]);

    const handleExport = useCallback(() => {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = DEFAULT_FILENAME;
        link.click();
        URL.revokeObjectURL(url);
        showHint('已导出 .md 文件');
    }, [content, showHint]);

    const handleImport = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const text = typeof reader.result === 'string' ? reader.result : '';
            setContent(text);
            showHint(`已导入 ${file.name}`);
        };
        reader.readAsText(file);
    }, [showHint]);

    const handleClear = useCallback(() => {
        if (!content.trim()) return;
        if (window.confirm('确定清空当前内容吗？')) {
            setContent('');
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [content]);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        setContent(saved ?? DEFAULT_CONTENT);
    }, []);

    useEffect(() => {
        if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);

        renderTimeoutRef.current = setTimeout(async () => {
            const html = await renderMarkdown(content);
            setPreviewHtml(html);
        }, 200);

        return () => {
            if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
        };
    }, [content]);

    useEffect(() => {
        highlightPreviewCode(previewRef.current);
    }, [previewHtml]);

    useEffect(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            localStorage.setItem(STORAGE_KEY, content);
        }, 500);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [content]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                handleExport();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleExport]);

    const toolbarGroups: ToolbarAction[][] = [
        [
            { icon: 'format_bold', title: '粗体', action: () => insertMarkdown('**', '**', '粗体') },
            { icon: 'format_italic', title: '斜体', action: () => insertMarkdown('*', '*', '斜体') },
            { icon: 'strikethrough_s', title: '删除线', action: () => insertMarkdown('~~', '~~', '删除线') },
        ],
        [
            { icon: 'title', title: '标题', action: () => insertMarkdown('## ', '', '标题') },
            { icon: 'format_list_bulleted', title: '无序列表', action: () => insertMarkdown('- ', '', '列表项') },
            { icon: 'format_list_numbered', title: '有序列表', action: () => insertMarkdown('1. ', '', '列表项') },
            { icon: 'checklist', title: '任务清单', action: () => insertMarkdown('- [ ] ', '', '待办事项') },
        ],
        [
            { icon: 'format_quote', title: '引用', action: () => insertMarkdown('> ', '', '引用内容') },
            { icon: 'code', title: '行内代码', action: () => insertMarkdown('`', '`', 'code') },
            { icon: 'data_object', title: '代码块', action: () => insertMarkdown('```\n', '\n```', 'code') },
        ],
        [
            { icon: 'link', title: '链接', action: () => insertMarkdown('[', '](https://)', '链接文字') },
            { icon: 'image', title: '图片', action: () => insertMarkdown('![', '](https://)', '图片描述') },
            { icon: 'table_chart', title: '表格', action: () => insertMarkdown('| 列1 | 列2 |\n| --- | --- |\n| ', ' | 内容 |', '内容') },
        ],
    ];

    return (
        <div className="flex w-full flex-col items-center px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-10">
            {saveHint && (
                <div
                    className={`fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-gray-700 ${
                        isHintFadingOut ? 'animate-fade-out-up' : 'animate-fade-in-down'
                    }`}
                >
                    {saveHint}
                </div>
            )}

            <div className="flex w-full max-w-7xl flex-col items-center gap-2 text-center mb-6">
                <p className="text-3xl font-black leading-tight tracking-tighter text-gray-900 dark:text-white sm:text-4xl">
                    Markdown 编辑器
                </p>
                <p className="text-base font-normal text-gray-500 dark:text-gray-400">
                    在线撰写 Markdown，实时 GFM 预览，草稿自动保存到本地浏览器。
                </p>
            </div>

            <div className="w-full max-w-7xl">
                <div className="mb-3 flex flex-col gap-3 rounded-xl border border-border-light bg-surface-light p-3 shadow-sm dark:border-border-dark dark:bg-surface-dark sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-1">
                        {toolbarGroups.map((group, groupIndex) => (
                            <React.Fragment key={groupIndex}>
                                {groupIndex > 0 && (
                                    <div className="mx-1 hidden h-6 w-px bg-gray-200 dark:bg-gray-600 sm:block" />
                                )}
                                {group.map(item => (
                                    <button
                                        key={item.title}
                                        type="button"
                                        title={item.title}
                                        onClick={item.action}
                                        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                    >
                                        <span className="material-symbols-outlined text-xl">{item.icon}</span>
                                    </button>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>

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
                        <button
                            type="button"
                            onClick={handleExport}
                            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                        >
                            <span className="material-symbols-outlined text-lg">download</span>
                            导出
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="flex items-center gap-1 rounded-lg border border-border-light px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-border-dark dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            <span className="material-symbols-outlined text-lg">delete</span>
                            清空
                        </button>
                    </div>
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
                            {pane === 'edit' ? '编辑器' : '预览'}
                        </button>
                    ))}
                </div>

                <div className="grid h-[calc(100vh-18rem)] min-h-[480px] grid-cols-1 gap-4 md:grid-cols-2">
                    <div className={`flex flex-col overflow-hidden rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark ${mobilePane !== 'edit' ? 'hidden md:flex' : 'flex'}`}>
                        <div className="flex items-center justify-between border-b border-border-light px-4 py-2 dark:border-border-dark">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">编辑器</span>
                            <span className="text-xs text-gray-400">{lineCount} 行 · {charCount} 字符</span>
                        </div>
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            spellCheck={false}
                            className="flex-1 resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-gray-900 outline-none dark:text-gray-100"
                            placeholder="在此输入 Markdown 内容..."
                        />
                    </div>

                    <div className={`flex flex-col overflow-hidden rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark ${mobilePane !== 'preview' ? 'hidden md:flex' : 'flex'}`}>
                        <div className="border-b border-border-light px-4 py-2 dark:border-border-dark">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">预览</span>
                        </div>
                        <div className="flex-1 overflow-auto px-6 py-4">
                            {content.trim() ? (
                                <div
                                    ref={previewRef}
                                    className="markdown-preview text-gray-800 dark:text-gray-100"
                                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                                />
                            ) : (
                                <p className="text-sm text-gray-400">预览区域将在此显示渲染结果</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .markdown-preview h1 { font-size: 1.875rem; font-weight: 800; margin: 1.5rem 0 1rem; line-height: 1.25; }
                .markdown-preview h2 { font-size: 1.5rem; font-weight: 700; margin: 1.25rem 0 0.75rem; line-height: 1.3; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem; }
                .markdown-preview h3 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
                .markdown-preview p { margin: 0.75rem 0; line-height: 1.75; }
                .markdown-preview ul, .markdown-preview ol { margin: 0.75rem 0; padding-left: 1.5rem; }
                .markdown-preview ul { list-style-type: disc; }
                .markdown-preview ol { list-style-type: decimal; }
                .markdown-preview li { margin: 0.25rem 0; line-height: 1.6; }
                .markdown-preview li input[type="checkbox"] { margin-right: 0.5rem; }
                .markdown-preview blockquote { margin: 1rem 0; padding: 0.5rem 1rem; border-left: 4px solid #607AFB; background: #f8fafc; color: #475569; }
                .dark .markdown-preview blockquote { background: #1e293b; color: #cbd5e1; }
                .markdown-preview code { font-family: 'Fira Code', monospace; font-size: 0.875em; background: #f1f5f9; padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
                .dark .markdown-preview code { background: #334155; }
                .markdown-preview pre { margin: 1rem 0; padding: 1rem; border-radius: 0.5rem; background: #f8fafc; overflow-x: auto; border: 1px solid #e2e8f0; }
                .dark .markdown-preview pre { background: #0f172a; border-color: #334155; }
                .markdown-preview pre code { background: transparent; padding: 0; }
                .markdown-preview table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.875rem; }
                .markdown-preview th, .markdown-preview td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: left; }
                .dark .markdown-preview th, .dark .markdown-preview td { border-color: #334155; }
                .markdown-preview th { background: #f8fafc; font-weight: 600; }
                .dark .markdown-preview th { background: #1e293b; }
                .markdown-preview a { color: #607AFB; text-decoration: underline; }
                .markdown-preview hr { margin: 1.5rem 0; border: none; border-top: 1px solid #e2e8f0; }
                .dark .markdown-preview hr { border-top-color: #334155; }
                .markdown-preview img { max-width: 100%; border-radius: 0.5rem; margin: 0.75rem 0; }
            `}</style>
        </div>
    );
};

export default MarkdownEditorTool;
